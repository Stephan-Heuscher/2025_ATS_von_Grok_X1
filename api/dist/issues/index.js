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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
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
                // Support adding comments to an existing issue via POST /api/issues/{id}?action=comment
                if (routeId && ((_f = req.query) === null || _f === void 0 ? void 0 : _f.action) === 'comment') {
                    let payload = req.body;
                    if (!payload || typeof payload !== 'object') {
                        try {
                            payload = JSON.parse(req.rawBody || '{}');
                        }
                        catch (_x) {
                            payload = {};
                        }
                    }
                    const author = String((_g = payload.author) !== null && _g !== void 0 ? _g : 'anonymous');
                    const message = String((_h = payload.message) !== null && _h !== void 0 ? _h : '');
                    if (!message.trim()) {
                        context.res = { status: 400, body: { error: 'message is required' } };
                        return;
                    }
                    // fetch existing issue
                    const existing = yield cosmosRest_1.default.getIssueById(routeId);
                    if (!existing) {
                        context.res = { status: 404, body: { error: 'Not found' } };
                        return;
                    }
                    const now = new Date().toISOString();
                    const comment = { id: Date.now().toString(), author, message, createdAt: now };
                    const comments = Array.isArray(existing.comments) ? existing.comments.concat(comment) : [comment];
                    // append an activity entry as well
                    const activityEntry = { type: 'comment', by: author, message, at: now };
                    const history = Array.isArray(existing.history) ? existing.history.concat(activityEntry) : [activityEntry];
                    const updated = Object.assign(Object.assign({}, existing), { comments, history, updatedAt: now });
                    const up = yield cosmosRest_1.default.upsertIssue(updated);
                    context.res = { status: 200, body: up };
                    return;
                }
                // Normalize body — some runtimes supply a rawBody string/stream
                let issue = req.body;
                if (!issue || typeof issue !== 'object') {
                    try {
                        issue = JSON.parse(req.rawBody || issue || '{}');
                    }
                    catch (_y) {
                        issue = req.body;
                    }
                }
                if (!(issue === null || issue === void 0 ? void 0 : issue.id))
                    issue.id = Date.now().toString();
                // Add createdAt/updatedAt + default status (align with UI)
                const now = new Date().toISOString();
                issue.createdAt = (_j = issue.createdAt) !== null && _j !== void 0 ? _j : now;
                issue.updatedAt = now;
                issue.status = (_k = issue.status) !== null && _k !== void 0 ? _k : 'ToDo';
                // ensure assignee field exists (can be null or string)
                issue.assignee = (_l = issue.assignee) !== null && _l !== void 0 ? _l : null;
                // ensure comments/history exist
                issue.comments = Array.isArray(issue.comments) ? issue.comments : [];
                issue.history = Array.isArray(issue.history) ? issue.history : [{ type: 'created', by: (_m = issue.assignee) !== null && _m !== void 0 ? _m : null, at: now }];
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
                payload.createdAt = (_o = payload.createdAt) !== null && _o !== void 0 ? _o : now;
                payload.status = (_p = payload.status) !== null && _p !== void 0 ? _p : 'ToDo';
                // normalize assignee if not present
                if (!Object.prototype.hasOwnProperty.call(payload, 'assignee'))
                    payload.assignee = null;
                // maintain history when status has changed
                try {
                    const stored = yield cosmosRest_1.default.getIssueById(idToUpdate);
                    if (stored) {
                        const prevStatus = stored.status;
                        const tnow = new Date().toISOString();
                        // initialize history from stored history
                        payload.history = Array.isArray(stored.history) ? stored.history.slice() : [];
                        // track status changes
                        if (payload.status && payload.status !== prevStatus) {
                            payload.history = payload.history.concat({ type: 'status', from: prevStatus, to: payload.status, at: tnow });
                        }
                        // track assignee changes
                        if (Object.prototype.hasOwnProperty.call(payload, 'assignee') && payload.assignee !== stored.assignee) {
                            payload.history = payload.history.concat({ type: 'assign', from: (_q = stored.assignee) !== null && _q !== void 0 ? _q : null, to: (_r = payload.assignee) !== null && _r !== void 0 ? _r : null, at: tnow, by: (_s = payload.assignee) !== null && _s !== void 0 ? _s : null });
                        }
                        // preserve comments from stored item when available
                        payload.comments = Array.isArray(stored.comments) ? stored.comments.slice() : [];
                    }
                    else {
                        // no stored item found — keep any provided history/comments, or initialize empty arrays
                        payload.history = Array.isArray(payload.history) ? payload.history : [];
                        payload.comments = Array.isArray(payload.comments) ? payload.comments : [];
                    }
                }
                catch (_z) {
                    // ignore failures to enrich history
                }
                const updated = yield cosmosRest_1.default.upsertIssue(payload);
                context.res = { status: 200, body: updated };
            }
            else if (req.method === 'DELETE') {
                const idToDelete = routeId || (req.body && req.body.id);
                if (!idToDelete) {
                    context.res = { status: 400, body: { error: 'Missing id' } };
                    return;
                }
                try {
                    const deleted = yield cosmosRest_1.default.deleteIssueById(idToDelete);
                    if (!deleted) {
                        // Return some diagnostic info to help debug cross-environment cases
                        context.res = { status: 404, body: { error: 'Not found', id: idToDelete, note: 'no document found to delete' } };
                    }
                    else {
                        context.res = { status: 204, body: '' };
                    }
                }
                catch (err) {
                    // expose a compact error message for debugging (not the keys)
                    context.log && context.log.error && context.log.error('delete error', (_t = err === null || err === void 0 ? void 0 : err.message) !== null && _t !== void 0 ? _t : String(err));
                    context.res = { status: 500, body: { error: 'Server error', detail: (_u = err === null || err === void 0 ? void 0 : err.message) !== null && _u !== void 0 ? _u : String(err) } };
                }
            }
            else {
                context.res = { status: 405, body: 'Method not allowed' };
            }
        }
        catch (err) {
            context.log && context.log.error && context.log.error('API error', (_v = err.message) !== null && _v !== void 0 ? _v : err);
            context.res = { status: 500, body: { error: 'Server error', detail: (_w = err.message) !== null && _w !== void 0 ? _w : String(err) } };
        }
    });
};
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map