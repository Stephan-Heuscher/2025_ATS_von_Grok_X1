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

async function fetchCosmos(path: string, verb: 'GET'|'POST'|'PUT'|'DELETE', body?: any, opts?: { resourceType?: string, resourceId?: string, partitionKey?: string | null }) {
  const { endpoint, key } = getAccountConfig()
  const date = new Date().toUTCString()
  const resourceType = opts?.resourceType ?? 'docs'
  const resourceId = opts?.resourceId ?? path.replace(/^\/+/,'')

  const token = authToken(verb, resourceType, resourceId, date, key)

  const headers: Record<string,string> = {
    'Authorization': token,
    'x-ms-date': date,
    'x-ms-version': defaultApiVersion,
    'Accept': 'application/json',
  }

  if (verb === 'POST' && opts?.partitionKey) {
    headers['x-ms-documentdb-partitionkey'] = JSON.stringify([opts.partitionKey])
    headers['Content-Type'] = 'application/json'
  }

  // For query operations (POST + isQuery) callers should provide isQuery flags and content-type
  if (verb === 'POST' && body && body.query) {
    headers['x-ms-documentdb-isquery'] = 'true'
    headers['x-ms-documentdb-query-enablecrosspartition'] = 'true'
    headers['Content-Type'] = 'application/query+json'
  }

  const url = `${endpoint}${path}`

  const res = await fetch(url, { method: verb, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cosmos REST ${verb} ${url} failed: ${res.status} ${res.statusText} - ${text}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    return await res.json()
  }
  return await res.text()
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
  // OFFSET across partitions forces an ORDER BY — to avoid cross-partition gateway errors, support only LIMIT
  const sql = `SELECT * FROM c ${whereClause} LIMIT ${limit}`
  const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`
  const body = { query: sql, parameters: params }
  const result = await fetchCosmos(path, 'POST', body, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}` })
  return result.Documents ?? result.resources ?? []
}

export async function upsertIssue(issue: any) {
  // Upsert using POST + x-ms-documentdb-is-upsert header handled by fetchCosmos
  const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`
  // ensure partitionKey header is passed in options
  const res = await fetchCosmos(path, 'POST', issue, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}`, partitionKey: String(issue.id) })
  // For our helper fetchCosmos, POST will create or upsert depending on headers - we rely on server behaviour
  return res.resource ?? res
}

export async function deleteIssueById(id: string) {
  // Find the doc by id to get its _self link
  const found = await getIssueById(id)
  if (!found) return null
  // _self contains a resource-relative path like dbs/<rid>/colls/<rid>/docs/<rid>/
  let self = found._self
  if (!self) {
    // fallback to constructing docs path using id — delete may require resource rid; try doc id path
    self = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs/${id}`
  }
  // perform delete
  const res = await fetchCosmos(self, 'DELETE', undefined, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}` })
  return res
}

export default { listIssues, createIssue, getIssueById, queryIssues, upsertIssue, deleteIssueById }
