import { CosmosClient } from "@azure/cosmos"

// Read connection string from the deployment setting (set by SWA in the portal or via az)
const connectionString = process.env.COSMOS_CONNECTION_STRING
const client = connectionString ? new CosmosClient(connectionString) : null
const database = client ? client.database('IssueTrackerDB') : null
const container = database ? database.container('Issues') : null

const httpTrigger = async function (context: any, req: any): Promise<void> {
    try {
        if (req.method === 'GET') {
            if (!container) throw new Error('Cosmos DB not configured')
            const { resources: issues } = await container.items.readAll().fetchAll()
            context.res = { status: 200, body: issues }
        } else if (req.method === 'POST') {
            if (!container) throw new Error('Cosmos DB not configured')
                // Normalize body — some runtimes supply a rawBody string/stream
                let issue: any = req.body
                if (!issue || typeof issue !== 'object') {
                    try {
                        issue = JSON.parse(req.rawBody || issue || '{}')
                    } catch {
                        issue = req.body
                    }
                }
                if (!issue?.id) issue.id = Date.now().toString()
            const { resource: created } = await container.items.create(issue)
            context.res = { status: 201, body: created }
        } else {
            context.res = { status: 405, body: 'Method not allowed' }
        }
    } catch (err: any) {
        context.log && context.log.error && context.log.error('API error', err.message ?? err)
        context.res = { status: 500, body: { error: 'Server error', detail: err.message ?? String(err) } }
    }
}

export default httpTrigger