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
const httpTrigger = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const mockIssues = [
            { id: '1', title: 'Fix login bug', description: 'Users cannot log in', priority: 'High', status: 'ToDo' },
            { id: '2', title: 'Add dark mode', description: 'Implement dark theme', priority: 'Med', status: 'In Progress' },
            { id: '3', title: 'Update docs', description: 'Update user documentation', priority: 'Low', status: 'Done' },
        ];
        if (req.method === "GET") {
            context.res = {
                status: 200,
                body: mockIssues
            };
        }
        else if (req.method === "POST") {
            const newIssue = req.body;
            // Simulate creating
            const created = Object.assign(Object.assign({}, newIssue), { id: Date.now().toString() });
            context.res = {
                status: 201,
                body: created
            };
        }
        else {
            context.res = {
                status: 405,
                body: "Method not allowed"
            };
        }
    });
};
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map