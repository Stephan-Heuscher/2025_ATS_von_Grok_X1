import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos"

const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING!)
const database = cosmosClient.database("IssueTrackerDB")
const container = database.container("Issues")

export async function issues(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    if (req.method === "GET") {
        const { resources: issues } = await container.items.readAll().fetchAll()
        return {
            status: 200,
            jsonBody: issues
        }
    } else if (req.method === "POST") {
        const issue = await req.json()
        const { resource: createdItem } = await container.items.create(issue)
        return {
            status: 201,
            jsonBody: createdItem
        }
    } else {
        return {
            status: 405,
            body: "Method not allowed"
        }
    }
}

app.http('issues', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: issues
})