import cosmos from '../lib/cosmosRest'

const httpTrigger = async function (context: any, req: any): Promise<void> {
    try {
        // Extract route id if provided (route: issues/{id?})
        const routeId = req?.params?.id || req?.query?.id

        if (req.method === 'GET') {
            if (routeId) {
                const item = await cosmos.getIssueById(routeId)
                if (!item) {
                    context.res = { status: 404, body: { error: 'Not found' } }
                } else {
                    context.res = { status: 200, body: item }
                }
                return
            }

            // List with optional status + pagination
            const status = req.query?.status || null
            const limit = req.query?.limit ? parseInt(req.query.limit, 10) : undefined
            const offset = req.query?.offset ? parseInt(req.query.offset, 10) : undefined
            const issues = await cosmos.queryIssues({ status: status ?? null, limit: limit ?? null, offset: offset ?? null })
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
                // Add createdAt/updatedAt + default status
                const now = new Date().toISOString()
                issue.createdAt = issue.createdAt ?? now
                issue.updatedAt = now
                issue.status = issue.status ?? 'open'
            const created = await cosmos.createIssue(issue)
            context.res = { status: 201, body: created }
        } else if (req.method === 'PUT') {
            // Update / upsert via id in route or body
            const idToUpdate = routeId || (req.body && req.body.id)
            if (!idToUpdate) {
                context.res = { status: 400, body: { error: 'Missing id' } }
                return
            }
            let payload = req.body
            if (!payload || typeof payload !== 'object') payload = {}
            // Enforce id
            payload.id = idToUpdate
            // Validate at least title
            if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
                context.res = { status: 400, body: { error: 'title is required' } }
                return
            }
            const now = new Date().toISOString()
            // keep createdAt if exists, else set
            payload.updatedAt = now
            payload.createdAt = payload.createdAt ?? now
            payload.status = payload.status ?? 'open'
            const updated = await cosmos.upsertIssue(payload)
            context.res = { status: 200, body: updated }
        } else if (req.method === 'DELETE') {
            const idToDelete = routeId || (req.body && req.body.id)
            if (!idToDelete) {
                context.res = { status: 400, body: { error: 'Missing id' } }
                return
            }
            try {
                const deleted = await cosmos.deleteIssueById(idToDelete)
                if (!deleted) {
                    // Return some diagnostic info to help debug cross-environment cases
                    context.res = { status: 404, body: { error: 'Not found', id: idToDelete, note: 'no document found to delete' } }
                } else {
                    context.res = { status: 204, body: '' }
                }
            } catch (err: any) {
                // expose a compact error message for debugging (not the keys)
                context.log && context.log.error && context.log.error('delete error', err?.message ?? String(err))
                context.res = { status: 500, body: { error: 'Server error', detail: err?.message ?? String(err) } }
            }
        } else {
            context.res = { status: 405, body: 'Method not allowed' }
        }
    } catch (err: any) {
        context.log && context.log.error && context.log.error('API error', err.message ?? err)
        context.res = { status: 500, body: { error: 'Server error', detail: err.message ?? String(err) } }
    }
}

export default httpTrigger