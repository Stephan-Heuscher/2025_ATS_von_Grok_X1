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
            // Support adding comments to an existing issue via POST /api/issues/{id}?action=comment
            if (routeId && req.query?.action === 'comment') {
                let payload: any = req.body
                if (!payload || typeof payload !== 'object') {
                    try { payload = JSON.parse(req.rawBody || '{}') } catch { payload = {} }
                }
                const author = String(payload.author ?? 'anonymous')
                const message = String(payload.message ?? '')
                if (!message.trim()) {
                    context.res = { status: 400, body: { error: 'message is required' } }
                    return
                }
                // fetch existing issue
                const existing = await cosmos.getIssueById(routeId)
                if (!existing) {
                    context.res = { status: 404, body: { error: 'Not found' } }
                    return
                }
                const now = new Date().toISOString()
                const comment = { id: Date.now().toString(), author, message, createdAt: now }
                const comments = Array.isArray(existing.comments) ? existing.comments.concat(comment) : [comment]
                // append an activity entry as well
                const activityEntry = { type: 'comment', by: author, message, at: now }
                const history = Array.isArray(existing.history) ? existing.history.concat(activityEntry) : [activityEntry]
                const updated = { ...existing, comments, history, updatedAt: now }
                const up = await cosmos.upsertIssue(updated)
                context.res = { status: 200, body: up }
                return
            }
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
                // Add createdAt/updatedAt + default status (align with UI)
                const now = new Date().toISOString()
                issue.createdAt = issue.createdAt ?? now
                issue.updatedAt = now
                issue.status = issue.status ?? 'ToDo'
                // ensure assignee field exists (can be null or string)
                issue.assignee = issue.assignee ?? null
            // ensure comments/history exist
            issue.comments = Array.isArray(issue.comments) ? issue.comments : []
            issue.history = Array.isArray(issue.history) ? issue.history : [{ type: 'created', by: issue.assignee ?? null, at: now }]
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
            payload.status = payload.status ?? 'ToDo'
            // normalize assignee if not present
            if (!Object.prototype.hasOwnProperty.call(payload, 'assignee')) payload.assignee = null
            // maintain history when status has changed
            try {
                const stored = await cosmos.getIssueById(idToUpdate)
                if (stored) {
                    const prevStatus = stored.status
                    const tnow = new Date().toISOString()

                    // initialize history from stored history
                    payload.history = Array.isArray(stored.history) ? stored.history.slice() : []

                    // track status changes
                    if (payload.status && payload.status !== prevStatus) {
                        payload.history = payload.history.concat({ type: 'status', from: prevStatus, to: payload.status, at: tnow })
                    }

                    // track assignee changes
                    if (Object.prototype.hasOwnProperty.call(payload, 'assignee') && payload.assignee !== stored.assignee) {
                        payload.history = payload.history.concat({ type: 'assign', from: stored.assignee ?? null, to: payload.assignee ?? null, at: tnow, by: payload.assignee ?? null })
                    }

                    // preserve comments from stored item when available
                    payload.comments = Array.isArray(stored.comments) ? stored.comments.slice() : []
                } else {
                    // no stored item found — keep any provided history/comments, or initialize empty arrays
                    payload.history = Array.isArray(payload.history) ? payload.history : []
                    payload.comments = Array.isArray(payload.comments) ? payload.comments : []
                }
            } catch {
                // ignore failures to enrich history
            }
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