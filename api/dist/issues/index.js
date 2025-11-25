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
const cosmos_1 = require("@azure/cosmos");
// Read connection string from the deployment setting (set by SWA in the portal or via az)
const connectionString = process.env.COSMOS_CONNECTION_STRING;
const client = connectionString ? new cosmos_1.CosmosClient(connectionString) : null;
const database = client ? client.database('IssueTrackerDB') : null;
const container = database ? database.container('Issues') : null;
const httpTrigger = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            if (req.method === 'GET') {
                if (!container)
                    throw new Error('Cosmos DB not configured');
                const { resources: issues } = yield container.items.readAll().fetchAll();
                context.res = { status: 200, body: issues };
            }
            else if (req.method === 'POST') {
                if (!container)
                    throw new Error('Cosmos DB not configured');
                // Normalize body — some runtimes supply a rawBody string/stream
                let issue = req.body;
                if (!issue || typeof issue !== 'object') {
                    try {
                        issue = JSON.parse(req.rawBody || issue || '{}');
                    }
                    catch (_c) {
                        issue = req.body;
                    }
                }
                if (!(issue === null || issue === void 0 ? void 0 : issue.id))
                    issue.id = Date.now().toString();
                const { resource: created } = yield container.items.create(issue);
                context.res = { status: 201, body: created };
            }
            else {
                context.res = { status: 405, body: 'Method not allowed' };
            }
        }
        catch (err) {
            context.log && context.log.error && context.log.error('API error', (_a = err.message) !== null && _a !== void 0 ? _a : err);
            context.res = { status: 500, body: { error: 'Server error', detail: (_b = err.message) !== null && _b !== void 0 ? _b : String(err) } };
        }
    });
};
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map