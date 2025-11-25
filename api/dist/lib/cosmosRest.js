"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listIssues = listIssues;
exports.createIssue = createIssue;
exports.getIssueById = getIssueById;
exports.queryIssues = queryIssues;
exports.upsertIssue = upsertIssue;
exports.deleteIssueById = deleteIssueById;
const crypto = require("crypto");
const defaultApiVersion = '2018-12-31';
function parseConnectionString(conn) {
    var _a;
    if (!conn)
        return null;
    const parts = conn.split(';').reduce((acc, p) => {
        const [k, v] = p.split('=');
        if (k && v)
            acc[k.trim()] = v.trim();
        return acc;
    }, {});
    return {
        endpoint: ((_a = parts['AccountEndpoint']) === null || _a === void 0 ? void 0 : _a.replace(/\/+$/, '')) || null,
        key: parts['AccountKey'] || null
    };
}
function decodeKey(rawKey) {
    return Buffer.from(rawKey, 'base64');
}
function buildStringToSign(verb, resourceType, resourceId, date) {
    // stringToSign format required by Cosmos DB: verb + '\n' + resourceType + '\n' + resourceId + '\n' + date.toLowerCase() + '\n' + '\n'
    // Use the resourceId exactly as provided by callers. For document-level
    // operations the caller should pass the doc rid (lower-cased) if required;
    // collection-level resource ids must preserve their case.
    return `${verb.toLowerCase()}\n${resourceType.toLowerCase()}\n${resourceId}\n${date.toLowerCase()}\n\n`;
}
function authToken(verb, resourceType, resourceId, date, key) {
    const stringToSign = buildStringToSign(verb, resourceType, resourceId, date);
    const keyBuffer = decodeKey(key);
    const signature = crypto.createHmac('sha256', keyBuffer).update(stringToSign, 'utf8').digest('base64');
    const auth = encodeURIComponent(`type=master&ver=1.0&sig=${signature}`);
    return auth;
}
function getAccountConfig() {
    const cs = process.env.COSMOS_CONNECTION_STRING || process.env.COSMOS_CONN;
    const parsed = parseConnectionString(cs) || { endpoint: process.env.COSMOS_ACCOUNT_ENDPOINT, key: process.env.COSMOS_ACCOUNT_KEY };
    if (!(parsed === null || parsed === void 0 ? void 0 : parsed.endpoint) || !(parsed === null || parsed === void 0 ? void 0 : parsed.key))
        throw new Error('Missing Cosmos DB endpoint/key. Set COSMOS_CONNECTION_STRING or COSMOS_ACCOUNT_ENDPOINT + COSMOS_ACCOUNT_KEY');
    return parsed;
}
function fetchCosmos(path, verb, body, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { endpoint, key } = getAccountConfig();
        const date = new Date().toUTCString();
        const resourceType = (_a = opts === null || opts === void 0 ? void 0 : opts.resourceType) !== null && _a !== void 0 ? _a : 'docs';
        // derive a raw resourceId (trim any leading slashes)
        const resourceIdRaw = ((_b = opts === null || opts === void 0 ? void 0 : opts.resourceId) !== null && _b !== void 0 ? _b : path.replace(/^\/+/, '')).replace(/\/+$/, '');
        // For doc-level ops (DELETE/PUT on a specific document), the service often
        // uses the document's resource id (last path segment) when building the
        // auth signature. For create (POST on docs) or queries, the collection-level
        // resourceId is used. Compute a canonical resourceId used for signing.
        let resourceIdForSigning = resourceIdRaw;
        if ((verb === 'DELETE' || verb === 'PUT')) {
            // If the resourceId refers to a document path, use the doc's rid for signing.
            if (/\/docs\/[^\/]+$/.test(resourceIdRaw)) {
                const parts = resourceIdRaw.split('/').filter(Boolean);
                resourceIdForSigning = parts.length ? parts[parts.length - 1].toLowerCase() : resourceIdRaw;
            }
            else if (!resourceIdRaw.includes('/')) {
                // If resourceIdRaw looks like a doc rid already (no slashes), lowercase it
                // for signing — the server often lower-cases rids when computing the signature.
                resourceIdForSigning = resourceIdRaw.toLowerCase();
            }
        }
        const token = authToken(verb, resourceType, resourceIdForSigning, date, key);
        const headers = {
            'Authorization': token,
            'x-ms-date': date,
            'x-ms-version': defaultApiVersion,
            'Accept': 'application/json',
        };
        // Include partition key header for operations when provided (reads/deletes/writes)
        if (opts === null || opts === void 0 ? void 0 : opts.partitionKey) {
            headers['x-ms-documentdb-partitionkey'] = JSON.stringify([opts.partitionKey]);
            // ensure content-type when we have a body
            if (verb === 'POST' || verb === 'PUT')
                headers['Content-Type'] = 'application/json';
        }
        if (verb === 'POST' && (opts === null || opts === void 0 ? void 0 : opts.isUpsert)) {
            headers['x-ms-documentdb-is-upsert'] = 'true';
            // ensure content-type for an upsert
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        }
        // For query operations (POST + isQuery) callers should provide isQuery flags and content-type
        if (verb === 'POST' && body && body.query) {
            headers['x-ms-documentdb-isquery'] = 'true';
            headers['x-ms-documentdb-query-enablecrosspartition'] = 'true';
            headers['Content-Type'] = 'application/query+json';
        }
        // Support either a resource-relative path (eg. /dbs/... or dbs/...) or a full URL
        let url;
        if (/^https?:\/\//i.test(path)) {
            // Normalize paths where some server responses return an absolute URL but
            // accidentally omit the slash after the port part, e.g. https://host:443dbs/...
            let normalized = path;
            normalized = normalized.replace(/^(https?:\/\/[^\/]+:\d+)(dbs\/)/i, '$1/$2');
            url = normalized;
        }
        else {
            // ensure single slash between endpoint and resource path
            url = `${endpoint.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
        }
        const res = yield fetch(url, { method: verb, headers, body: body ? JSON.stringify(body) : undefined });
        if (!res.ok) {
            const text = yield res.text();
            throw new Error(`Cosmos REST ${verb} ${url} failed: ${res.status} ${res.statusText} - ${text}`);
        }
        const ct = res.headers.get('content-type') || '';
        // read raw text once and return appropriate type; some successful operations
        // (e.g., DELETE) can return empty bodies which cause res.json() to throw.
        const raw = yield res.text();
        if (!raw || raw.trim().length === 0)
            return null;
        if (ct.includes('application/json')) {
            try {
                return JSON.parse(raw);
            }
            catch (_c) {
                // fall back to returning raw if parsing fails
                return raw;
            }
        }
        return raw;
    });
}
// API helper methods for the Issues container
const DB_NAME = process.env.COSMOS_DB_NAME || 'IssueTrackerDB';
const CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || 'Issues';
function listIssues() {
    return __awaiter(this, void 0, void 0, function* () {
        const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`;
        // We need to POST a SQL query to enumerate all docs across partitions
        const body = { query: 'SELECT * FROM c' };
        const result = yield fetchCosmos(path, 'POST', body, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}` });
        // new-style return is { _rid, _count, Documents: [...] } or resources in 'Documents' / 'resources'
        if (result.Documents)
            return result.Documents;
        if (result.resources)
            return result.resources;
        if (result.length)
            return result;
        return [];
    });
}
function createIssue(issue) {
    return __awaiter(this, void 0, void 0, function* () {
        const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`;
        // Partition key configured as /id in the container. Provide it for write.
        const res = yield fetchCosmos(path, 'POST', issue, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}`, partitionKey: String(issue.id) });
        // resource is usually returned as created document
        if (res.resource)
            return res.resource;
        return res;
    });
}
function getIssueById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        if (!id)
            return null;
        const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`;
        const body = { query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] };
        const result = yield fetchCosmos(path, 'POST', body, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}` });
        const docs = (_b = (_a = result.Documents) !== null && _a !== void 0 ? _a : result.resources) !== null && _b !== void 0 ? _b : [];
        return (_c = docs[0]) !== null && _c !== void 0 ? _c : null;
    });
}
function queryIssues(filter) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        // For small datasets: avoid cross-partition ORDER BY/OFFSET queries which can fail in gateway.
        // If a status filter is provided, fetch all and filter locally (acceptable for small demos)
        const limit = (filter === null || filter === void 0 ? void 0 : filter.limit) && Number.isInteger(filter.limit) ? filter.limit : 100;
        if (filter === null || filter === void 0 ? void 0 : filter.status) {
            const all = yield listIssues();
            const filtered = all.filter((d) => String(d.status) === String(filter.status));
            return filtered.slice(0, limit);
        }
        const where = [];
        const params = [];
        if (filter === null || filter === void 0 ? void 0 : filter.status) {
            where.push('c.status = @status');
            params.push({ name: '@status', value: filter.status });
        }
        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        // OFFSET across partitions forces an ORDER BY — to avoid cross-partition gateway errors, support only a TOP-style limit
        // Cosmos SQL uses TOP to limit results across partitions without requiring ORDER BY.
        const sql = `SELECT TOP ${limit} * FROM c ${whereClause}`;
        const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`;
        const body = { query: sql, parameters: params };
        const result = yield fetchCosmos(path, 'POST', body, { resourceType: 'docs', resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}` });
        return (_b = (_a = result.Documents) !== null && _a !== void 0 ? _a : result.resources) !== null && _b !== void 0 ? _b : [];
    });
}
function upsertIssue(issue) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!(issue === null || issue === void 0 ? void 0 : issue.id))
            throw new Error('upsertIssue requires issue.id');
        // Use Cosmos REST upsert semantics via POST + x-ms-documentdb-is-upsert
        // This is simpler and avoids relying on _self links returned from queries.
        const path = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs`;
        const res = yield fetchCosmos(path, 'POST', issue, {
            resourceType: 'docs',
            resourceId: `dbs/${DB_NAME}/colls/${CONTAINER_NAME}`,
            partitionKey: String(issue.id),
            isUpsert: true
        });
        // POST with is-upsert commonly returns resource in `resource`
        return (_a = res.resource) !== null && _a !== void 0 ? _a : res;
    });
}
function deleteIssueById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Find the doc by id to get its _self link
        const found = yield getIssueById(id);
        if (!found)
            return null;
        // Prefer the server-supplied _self path (resource-relative, using rids)
        // which is the most reliable addressable path. If _self is missing, fall
        // back to using the document's _rid to construct a resource path using
        // the database/container names.
        let self = (_a = found._self) !== null && _a !== void 0 ? _a : (found._rid ? `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs/${found._rid}` : null);
        if (!self) {
            // fallback to constructing docs path using id — delete may require resource rid; try doc id path
            self = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs/${id}`;
        }
        // Normalize any absolute URL returned in _self to a resource-relative path
        // (some Cosmos responses include either absolute or resource-relative values).
        // Convert e.g. https://host:443dbs/... or https://host:443/dbs/... -> /dbs/...
        if (typeof self === 'string' && /^https?:\/\//i.test(self)) {
            self = self.replace(/^https?:\/\/[^\/]+\/?/, '/');
        }
        // perform delete. For correct signing, prefer passing the document's resource id
        // (rid) itself — the server commonly signs doc-level operations using the
        // document rid. Extract it either from found._rid or from the tail of the
        // resource path.
        let docRid = undefined;
        if (found._rid)
            docRid = found._rid;
        else if (typeof self === 'string') {
            const parts = self.split('/').filter(Boolean);
            docRid = parts.length ? parts[parts.length - 1] : undefined;
        }
        try {
            const res = yield fetchCosmos(self, 'DELETE', undefined, { resourceType: 'docs', resourceId: docRid, partitionKey: String(id) });
            return res;
        }
        catch (err) {
            // If the document isn't found by the rid path (404), try a fallback
            // delete using the doc id path (dbs/<db>/colls/<container>/docs/<id>). Some
            // server-side configurations / query/index timing can make rid-based deletes
            // not resolvable from the same rid. This fallback attempts to delete using
            // the id path and the partition-key to ensure eventual deletion.
            const msg = String(err.message || err);
            if (msg.includes('404') || msg.includes('NotFound')) {
                const fallbackPath = `/dbs/${DB_NAME}/colls/${CONTAINER_NAME}/docs/${id}`;
                try {
                    const fallback = yield fetchCosmos(fallbackPath, 'DELETE', undefined, { resourceType: 'docs', resourceId: id, partitionKey: String(id) });
                    return fallback;
                }
                catch (err2) {
                    // bubble up the original error if fallback also fails
                    throw err2 || err;
                }
            }
            throw err;
        }
    });
}
exports.default = { listIssues, createIssue, getIssueById, queryIssues, upsertIssue, deleteIssueById };
//# sourceMappingURL=cosmosRest.js.map