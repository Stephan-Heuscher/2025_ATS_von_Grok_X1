import * as crypto from 'crypto'

const defaultApiVersion = '2018-12-31'

function parseConnectionString(conn?: string) {
  if (!conn) return null
  const parts = conn.split(';').reduce<Record<string,string>>((acc, p) => {
    const [k,v] = p.split('=')
    if (k && v) acc[k.trim()] = v.trim()
    return acc
  }, {})
  return {
    endpoint: parts['AccountEndpoint']?.replace(/\/+$/,'') || null,
    key: parts['AccountKey'] || null
  }
}

function decodeKey(rawKey: string) {
  return Buffer.from(rawKey, 'base64')
}

function buildStringToSign(verb: string, resourceType: string, resourceId: string, date: string) {
  // stringToSign format required by Cosmos DB: verb + '\n' + resourceType + '\n' + resourceId + '\n' + date.toLowerCase() + '\n' + '\n'
  // Use the resourceId exactly as provided by callers. For document-level
  // operations the caller should pass the doc rid (lower-cased) if required;
  // collection-level resource ids must preserve their case.
  return `${verb.toLowerCase()}\n${resourceType.toLowerCase()}\n${resourceId}\n${date.toLowerCase()}\n\n`
}

function authToken(verb: string, resourceType: string, resourceId: string, date: string, key: string) {
  const stringToSign = buildStringToSign(verb, resourceType, resourceId, date)
  const keyBuffer = decodeKey(key)
  const signature = crypto.createHmac('sha256', keyBuffer).update(stringToSign, 'utf8').digest('base64')
  const auth = encodeURIComponent(`type=master&ver=1.0&sig=${signature}`)
  return auth
}

function getAccountConfig() {
  const cs = process.env.COSMOS_CONNECTION_STRING || process.env.COSMOS_CONN
  const parsed = parseConnectionString(cs) || { endpoint: process.env.COSMOS_ACCOUNT_ENDPOINT, key: process.env.COSMOS_ACCOUNT_KEY }
  if (!parsed?.endpoint || !parsed?.key) throw new Error('Missing Cosmos DB endpoint/key. Set COSMOS_CONNECTION_STRING or COSMOS_ACCOUNT_ENDPOINT + COSMOS_ACCOUNT_KEY')
  return parsed as { endpoint: string, key: string }
}

async function fetchCosmos(path: string, verb: 'GET'|'POST'|'PUT'|'DELETE', body?: any, opts?: { resourceType?: string, resourceId?: string, partitionKey?: string | null, isUpsert?: boolean }) {
  const { endpoint, key } = getAccountConfig()
  const date = new Date().toUTCString()
  const resourceType = opts?.resourceType ?? 'docs'
  // derive a raw resourceId (trim any leading slashes)
  const resourceIdRaw = (opts?.resourceId ?? path.replace(/^\/+/,'')).replace(/\/+$/,'')

  // For doc-level ops (DELETE/PUT on a specific document), the service often
  // uses the document's resource id (last path segment) when building the
  // auth signature. For create (POST on docs) or queries, the collection-level
  // resourceId is used. Compute a canonical resourceId used for signing.
  let resourceIdForSigning = resourceIdRaw
  if ((verb === 'DELETE' || verb === 'PUT')) {
    // If the resourceId refers to a document path, use the doc's rid for signing.
    if (/\/docs\/[^\/]+$/.test(resourceIdRaw)) {
      const parts = resourceIdRaw.split('/').filter(Boolean)
      resourceIdForSigning = parts.length ? parts[parts.length - 1].toLowerCase() : resourceIdRaw
    } else if (!resourceIdRaw.includes('/')) {
      // If resourceIdRaw looks like a doc rid already (no slashes), lowercase it
      // for signing — the server often lower-cases rids when computing the signature.
      resourceIdForSigning = resourceIdRaw.toLowerCase()
    }
  }

  const token = authToken(verb, resourceType, resourceIdForSigning, date, key)

  const headers: Record<string,string> = {
    'Authorization': token,
    'x-ms-date': date,
    'x-ms-version': defaultApiVersion,
    'Accept': 'application/json',
  }

  // Include partition key header for operations when provided (reads/deletes/writes)
  if (opts?.partitionKey) {
    headers['x-ms-documentdb-partitionkey'] = JSON.stringify([opts.partitionKey])
    // ensure content-type when we have a body
    if (verb === 'POST' || verb === 'PUT') headers['Content-Type'] = 'application/json'
  }

  if (verb === 'POST' && opts?.isUpsert) {
    headers['x-ms-documentdb-is-upsert'] = 'true'
    // ensure content-type for an upsert
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  // For query operations (POST + isQuery) callers should provide isQuery flags and content-type
  if (verb === 'POST' && body && body.query) {
    headers['x-ms-documentdb-isquery'] = 'true'
    headers['x-ms-documentdb-query-enablecrosspartition'] = 'true'
    headers['Content-Type'] = 'application/query+json'
  }

  // Support either a resource-relative path (eg. /dbs/... or dbs/...) or a full URL
  let url: string
  if (/^https?:\/\//i.test(path)) {
    // Normalize paths where some server responses return an absolute URL but
    // accidentally omit the slash after the port part, e.g. https://host:443dbs/...
    let normalized = path
    normalized = normalized.replace(/^(https?:\/\/[^\/]+:\d+)(dbs\/)/i, '$1/$2')
    url = normalized
  } else {
    // ensure single slash between endpoint and resource path
    url = `${endpoint.replace(/\/+$/,'')}/${path.replace(/^\/+/,'')}`
  }

  const res = await fetch(url, { method: verb, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cosmos REST ${verb} ${url} failed: ${res.status} ${res.statusText} - ${text}`)
  }
  const ct = res.headers.get('content-type') || ''
  // read raw text once and return appropriate type; some successful operations
  // (e.g., DELETE) can return empty bodies which cause res.json() to throw.
  const raw = await res.text()
  if (!raw || raw.trim().length === 0) return null
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(raw)
    } catch {
      // fall back to returning raw if parsing fails
      return raw
    }
  }
  return raw
}

// API helper methods for the Issues container
const DB_NAME = process.env.COSMOS_DB_NAME || 'IssueTrackerDB'
const CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || 'Issues'

export async function listIssues() {
  const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`
  // We need to POST a SQL query to enumerate all docs across partitions
  const body = { query: 'SELECT * FROM c' }
  const result = await fetchCosmos(path, 'POST', body, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}` })
  // new-style return is { _rid, _count, Documents: [...] } or resources in 'Documents' / 'resources'
  if (result.Documents) return result.Documents
  if (result.resources) return result.resources
  if (result.length) return result
  return []
}

export async function createIssue(issue: any) {
  const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`
  // Partition key configured as /id in the container. Provide it for write.
  const res = await fetchCosmos(path, 'POST', issue, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}`, partitionKey: String(issue.id) })
  // resource is usually returned as created document
  if (res.resource) return res.resource
  return res
}

export async function getIssueById(id: string) {
  if (!id) return null
  const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`
  const body = { query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] }
  const result = await fetchCosmos(path, 'POST', body, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}` })
  const docs = result.Documents ?? result.resources ?? []
  return docs[0] ?? null
}

export async function queryIssues(filter: { status?: string | null, limit?: number | null, offset?: number | null }) {
  // For small datasets: avoid cross-partition ORDER BY/OFFSET queries which can fail in gateway.
  // If a status filter is provided, fetch all and filter locally (acceptable for small demos)
  const limit = filter?.limit && Number.isInteger(filter.limit) ? filter.limit : 100
  if (filter?.status) {
    const all = await listIssues()
    const filtered = all.filter((d: any) => String(d.status) === String(filter.status))
    return filtered.slice(0, limit)
  }
  const where: string[] = []
  const params: any[] = []
  if (filter?.status) {
    where.push('c.status = @status')
    params.push({ name: '@status', value: filter.status })
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  // OFFSET across partitions forces an ORDER BY — to avoid cross-partition gateway errors, support only a TOP-style limit
  // Cosmos SQL uses TOP to limit results across partitions without requiring ORDER BY.
  const sql = `SELECT TOP ${limit} * FROM c ${whereClause}`
  const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`
  const body = { query: sql, parameters: params }
  const result = await fetchCosmos(path, 'POST', body, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}` })
  return result.Documents ?? result.resources ?? []
}

export async function upsertIssue(issue: any) {
  if (!issue?.id) throw new Error('upsertIssue requires issue.id')
  // Use Cosmos REST upsert semantics via POST + x-ms-documentdb-is-upsert
  // This is simpler and avoids relying on _self links returned from queries.
  const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`
  const res = await fetchCosmos(path, 'POST', issue, {
    resourceType: 'docs',
    resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}`,
    partitionKey: String(issue.id),
    isUpsert: true
  })
  // POST with is-upsert commonly returns resource in `resource`
  return res.resource ?? res
}

export async function deleteIssueById(id: string) {
  // Find the doc by id to get its _self link. Some gateway/config
  // situations can cause the SELECT query to return no results right
  // after an upsert; to make deletes more robust we'll attempt a
  // conservative id-based delete if the query returns nothing.
  const found = await getIssueById(id)
  if (!found) {
    // Attempt a best-effort id-based delete (dbs/<db>/colls/<container>/docs/<id>)
    // using the id as the resourceId for signing and partition-key header.
    try {
      const pathIdFallback = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs/${id}`
      const fallbackRes = await fetchCosmos(pathIdFallback, 'DELETE', undefined, { resourceType: 'docs', resourceId: id, partitionKey: String(id) })
      return fallbackRes
    } catch (err) {
      // If the fallback fails we continue and return null to indicate nothing deleted
      // so callers can surface diagnostics.
      // keep going to later code-path that would attempt rid-based delete if it existed.
      // (we don't rethrow here since upstream error handling expects null when not found)
      // log in-memory (no direct FS logging here) and fall-through to return null below.
      void err
    }
    return null
  }
  // Prefer the server-supplied _self path (resource-relative, using rids)
  // which is the most reliable addressable path. If _self is missing, fall
  // back to using the document's _rid to construct a resource path using
  // the database/container names.
  let self = found._self ?? (found._rid ? `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs/${found._rid}` : null)
  if (!self) {
    // fallback to constructing docs path using id — delete may require resource rid; try doc id path
    self = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs/${id}`
  }
  // Normalize any absolute URL returned in _self to a resource-relative path
  // (some Cosmos responses include either absolute or resource-relative values).
  // Convert e.g. https://host:443dbs/... or https://host:443/dbs/... -> /dbs/...
  if (typeof self === 'string' && /^https?:\/\//i.test(self)) {
    self = self.replace(/^https?:\/\/[^\/]+\/?/, '/')
  }

  // perform delete. For correct signing, prefer passing the document's resource id
  // (rid) itself — the server commonly signs doc-level operations using the
  // document rid. Extract it either from found._rid or from the tail of the
  // resource path.
  let docRid: string | undefined = undefined
  if (found._rid) docRid = found._rid
  else if (typeof self === 'string') {
    const parts = self.split('/').filter(Boolean)
    docRid = parts.length ? parts[parts.length - 1] : undefined
  }

  try {
    const res = await fetchCosmos(self, 'DELETE', undefined, { resourceType: 'docs', resourceId: docRid, partitionKey: String(id) })
    // fetchCosmos returns null for successful operations that return no body
    // (DELETE commonly returns empty body). Treat an OK delete as truthy.
    return res ?? true
  } catch (err: any) {
    // If the document isn't found by the rid path (404), try a fallback
    // delete using the doc id path (dbs/<db>/colls/<container>/docs/<id>). Some
    // server-side configurations / query/index timing can make rid-based deletes
    // not resolvable from the same rid. This fallback attempts to delete using
    // the id path and the partition-key to ensure eventual deletion.
    const msg = String(err.message || err)
    if (msg.includes('404') || msg.includes('NotFound')) {
      const fallbackPath = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs/${id}`
      try {
        const fallback = await fetchCosmos(fallbackPath, 'DELETE', undefined, { resourceType: 'docs', resourceId: id, partitionKey: String(id) })
        return fallback ?? true
      } catch (err2: any) {
        // bubble up the original error if fallback also fails
        throw err2 || err
      }
    }
    throw err
  }
}

export default { listIssues, createIssue, getIssueById, queryIssues, upsertIssue, deleteIssueById }
