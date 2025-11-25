import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos"

const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING!)
const database = cosmosClient.database("IssueTrackerDB")
const container = database.container("Issues")

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    if (req.method === "GET") {
        const { resources: issues } = await container.items.readAll().fetchAll()
        context.res = {
            status: 200,
            body: issues
        }
    } else if (req.method === "POST") {
        const issue = req.body
        const { resource: createdItem } = await container.items.create(issue)
        context.res = {
            status: 201,
            body: createdItem
        }
    } else {
        context.res = {
            status: 405,
            body: "Method not allowed"
        }
    }
}

export default httpTrigger