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
exports.issues = issues;
const functions_1 = require("@azure/functions");
const cosmos_1 = require("@azure/cosmos");
const cosmosClient = new cosmos_1.CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = cosmosClient.database("IssueTrackerDB");
const container = database.container("Issues");
function issues(req, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.method === "GET") {
            const { resources: issues } = yield container.items.readAll().fetchAll();
            return {
                status: 200,
                jsonBody: issues
            };
        }
        else if (req.method === "POST") {
            const issue = yield req.json();
            const { resource: createdItem } = yield container.items.create(issue);
            return {
                status: 201,
                jsonBody: createdItem
            };
        }
        else {
            return {
                status: 405,
                body: "Method not allowed"
            };
        }
    });
}
functions_1.app.http('issues', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: issues
});
//# sourceMappingURL=index.js.map