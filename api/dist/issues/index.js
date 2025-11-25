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
const cosmosRest_1 = require("../lib/cosmosRest");
const httpTrigger = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        try {
            // Extract route id if provided (route: issues/{id?})
            const routeId = ((_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req === null || req === void 0 ? void 0 : req.query) === null || _b === void 0 ? void 0 : _b.id);
            if (req.method === 'GET') {
                if (routeId) {
                    const item = yield cosmosRest_1.default.getIssueById(routeId);
                    if (!item) {
                        context.res = { status: 404, body: { error: 'Not found' } };
                    }
                    else {
                        context.res = { status: 200, body: item };
                    }
                    return;
                }
                // List with optional status + pagination
                const status = ((_c = req.query) === null || _c === void 0 ? void 0 : _c.status) || null;
                const limit = ((_d = req.query) === null || _d === void 0 ? void 0 : _d.limit) ? parseInt(req.query.limit, 10) : undefined;
                const offset = ((_e = req.query) === null || _e === void 0 ? void 0 : _e.offset) ? parseInt(req.query.offset, 10) : undefined;
                const issues = yield cosmosRest_1.default.queryIssues({ status: status !== null && status !== void 0 ? status : null, limit: limit !== null && limit !== void 0 ? limit : null, offset: offset !== null && offset !== void 0 ? offset : null });
                context.res = { status: 200, body: issues };
            }
            else if (req.method === 'POST') {
                // Normalize body — some runtimes supply a rawBody string/stream
                let issue = req.body;
                if (!issue || typeof issue !== 'object') {
                    try {
                        issue = JSON.parse(req.rawBody || issue || '{}');
                    }
                    catch (_m) {
                        issue = req.body;
                    }
                }
                if (!(issue === null || issue === void 0 ? void 0 : issue.id))
                    issue.id = Date.now().toString();
                // Add createdAt/updatedAt + default status
                const now = new Date().toISOString();
                issue.createdAt = (_f = issue.createdAt) !== null && _f !== void 0 ? _f : now;
                issue.updatedAt = now;
                issue.status = (_g = issue.status) !== null && _g !== void 0 ? _g : 'open';
                const created = yield cosmosRest_1.default.createIssue(issue);
                context.res = { status: 201, body: created };
            }
            else if (req.method === 'PUT') {
                // Update / upsert via id in route or body
                const idToUpdate = routeId || (req.body && req.body.id);
                if (!idToUpdate) {
                    context.res = { status: 400, body: { error: 'Missing id' } };
                    return;
                }
                let payload = req.body;
                if (!payload || typeof payload !== 'object')
                    payload = {};
                // Enforce id
                payload.id = idToUpdate;
                // Validate at least title
                if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
                    context.res = { status: 400, body: { error: 'title is required' } };
                    return;
                }
                const now = new Date().toISOString();
                // keep createdAt if exists, else set
                payload.updatedAt = now;
                payload.createdAt = (_h = payload.createdAt) !== null && _h !== void 0 ? _h : now;
                payload.status = (_j = payload.status) !== null && _j !== void 0 ? _j : 'open';
                const updated = yield cosmosRest_1.default.upsertIssue(payload);
                context.res = { status: 200, body: updated };
            }
            else if (req.method === 'DELETE') {
                const idToDelete = routeId || (req.body && req.body.id);
                if (!idToDelete) {
                    context.res = { status: 400, body: { error: 'Missing id' } };
                    return;
                }
                const deleted = yield cosmosRest_1.default.deleteIssueById(idToDelete);
                if (!deleted) {
                    context.res = { status: 404, body: { error: 'Not found' } };
                }
                else {
                    context.res = { status: 204, body: '' };
                }
            }
            else {
                context.res = { status: 405, body: 'Method not allowed' };
            }
        }
        catch (err) {
            context.log && context.log.error && context.log.error('API error', (_k = err.message) !== null && _k !== void 0 ? _k : err);
            context.res = { status: 500, body: { error: 'Server error', detail: (_l = err.message) !== null && _l !== void 0 ? _l : String(err) } };
        }
    });
};
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map