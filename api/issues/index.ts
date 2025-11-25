import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const mockIssues = [
        { id: '1', title: 'Fix login bug', description: 'Users cannot log in', priority: 'High', status: 'ToDo' },
        { id: '2', title: 'Add dark mode', description: 'Implement dark theme', priority: 'Med', status: 'In Progress' },
        { id: '3', title: 'Update docs', description: 'Update user documentation', priority: 'Low', status: 'Done' },
    ]

    if (req.method === "GET") {
        context.res = {
            status: 200,
            body: mockIssues
        }
    } else if (req.method === "POST") {
        const newIssue = req.body
        // Simulate creating
        const created = { ...newIssue, id: Date.now().toString() }
        context.res = {
            status: 201,
            body: created
        }
    } else {
        context.res = {
            status: 405,
            body: "Method not allowed"
        }
    }
}

export default httpTrigger