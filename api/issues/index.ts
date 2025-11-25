import cosmos from '../lib/cosmosRest'

const httpTrigger = async function (context: any, req: any): Promise<void> {
    try {
        if (req.method === 'GET') {
            const issues = await cosmos.listIssues()
            context.res = { status: 200, body: issues }
        } else if (req.method === 'POST') {
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
            const created = await cosmos.createIssue(issue)
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