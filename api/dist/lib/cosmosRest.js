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
        const resourceId = (_b = opts === null || opts === void 0 ? void 0 : opts.resourceId) !== null && _b !== void 0 ? _b : path.replace(/^\/+/, '');
        const token = authToken(verb, resourceType, resourceId, date, key);
        const headers = {
            'Authorization': token,
            'x-ms-date': date,
            'x-ms-version': defaultApiVersion,
            'Accept': 'application/json',
        };
        if (verb === 'POST' && (opts === null || opts === void 0 ? void 0 : opts.partitionKey)) {
            headers['x-ms-documentdb-partitionkey'] = JSON.stringify([opts.partitionKey]);
            headers['Content-Type'] = 'application/json';
        }
        // For query operations (POST + isQuery) callers should provide isQuery flags and content-type
        if (verb === 'POST' && body && body.query) {
            headers['x-ms-documentdb-isquery'] = 'true';
            headers['x-ms-documentdb-query-enablecrosspartition'] = 'true';
            headers['Content-Type'] = 'application/query+json';
        }
        const url = `${endpoint}${path}`;
        const res = yield fetch(url, { method: verb, headers, body: body ? JSON.stringify(body) : undefined });
        if (!res.ok) {
            const text = yield res.text();
            throw new Error(`Cosmos REST ${verb} ${url} failed: ${res.status} ${res.statusText} - ${text}`);
        }
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            return yield res.json();
        }
        return yield res.text();
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
exports.default = { listIssues, createIssue };
//# sourceMappingURL=cosmosRest.js.map