import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface Issue {
  id: string
  title: string
  description: string
  priority: 'Low' | 'Med' | 'High'
  status: 'ToDo' | 'In Progress' | 'Done'
  assignee?: string | null
  comments?: Array<{ id: string; author: string; message: string; createdAt: string }>
  history?: Array<{ type: string; from?: string; to?: string; at: string; by?: string; message?: string }>
  createdAt?: string
  updatedAt?: string
}

interface IssueCardProps {
  issue: Issue
  onUpdate?: (update: Partial<Issue> & { id: string }) => void
}

const IssueCard = ({ issue, onUpdate }: IssueCardProps) => {
  const priorityColor = {
    Low: 'bg-green-500',
    Med: 'bg-yellow-500',
    High: 'bg-red-500',
  }

  const [editing, setEditing] = useState(false)
  const [editingAssignee, setEditingAssignee] = useState<string>(issue.assignee ?? '')

  async function saveAssignee() {
    const payload = { id: issue.id, title: issue.title, assignee: editingAssignee || null }
    try {
      const res = await fetch(`/api/issues/${issue.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      onUpdate && onUpdate({ id: issue.id, assignee: updated.assignee ?? null })
    } catch (err) {
      console.error('Failed to save assignee', err)
    } finally {
      setEditing(false)
    }
  }

  const [showComments, setShowComments] = useState(false)
  const [newCommentAuthor, setNewCommentAuthor] = useState('')
  const [newCommentMessage, setNewCommentMessage] = useState('')

  async function submitComment() {
    if (!newCommentMessage.trim()) return
    try {
      const payload = { author: newCommentAuthor || 'anonymous', message: newCommentMessage }
      const res = await fetch(`/api/issues/${issue.id}?action=comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed to post comment')
      const updated = await res.json()
      onUpdate && onUpdate({ id: issue.id, comments: updated.comments ?? updated.comments ?? [] })
      setNewCommentAuthor('')
      setNewCommentMessage('')
      setShowComments(true)
    } catch (err) {
      console.error('Comment error', err)
    }
  }
  const [showHistory, setShowHistory] = useState(false)

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-lg">{issue.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-2">{issue.description}</p>
        {editing ? (
          <div className="flex items-center gap-2 mb-2">
            <input className="input" value={editingAssignee} onChange={e => setEditingAssignee(e.target.value)} placeholder="Assignee name" />
            <button className="btn btn-primary" onClick={() => saveAssignee()}>Save</button>
            <button className="btn" onClick={() => { setEditing(false); setEditingAssignee(issue.assignee ?? '') }}>Cancel</button>
          </div>
        ) : issue.assignee ? (
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Assigned to: <strong>{issue.assignee}</strong></p>
            <button className="text-sm underline" onClick={() => setEditing(true)}>Change</button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Unassigned</p>
            <button className="text-sm underline" onClick={() => setEditing(true)}>Assign</button>
          </div>
        )}
        <Badge className={`${priorityColor[issue.priority]} text-white`}>
          {issue.priority}
        </Badge>
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground">Created: {issue.createdAt ? new Date(issue.createdAt).toLocaleString() : '—'}</div>
            <div className="text-xs text-muted-foreground">Updated: {issue.updatedAt ? new Date(issue.updatedAt).toLocaleString() : '—'}</div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <strong className="text-sm">Comments</strong>
            <button className="text-xs underline" onClick={() => setShowComments(s => !s)}>{showComments ? 'Hide' : 'Show'}</button>
          </div>

          {showComments ? (
            <div className="space-y-3">
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <strong className="text-sm">Activity</strong>
                  <button className="text-xs underline" onClick={() => setShowHistory(s => !s)}>{showHistory ? 'Hide' : 'Show'}</button>
                </div>

                {showHistory ? (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {Array.isArray(issue.history) && issue.history.length ? issue.history.slice().reverse().map((h, idx) => (
                      <div key={idx} className="border rounded p-2">
                        <div className="font-semibold">{h.type}{h.by ? ` — ${h.by}` : ''} <span className="text-[10px] text-muted-foreground">{new Date(h.at).toLocaleString()}</span></div>
                        {h.message ? <div className="text-[12px]">{h.message}</div> : null}
                        {h.from || h.to ? <div className="text-[11px] text-muted-foreground">{h.from ?? ''}{h.from && h.to ? ' → ' : ''}{h.to ?? ''}</div> : null}
                      </div>
                    )) : (<div className="text-xs text-muted-foreground">No activity yet</div>)}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                {Array.isArray(issue.comments) && issue.comments.length ? issue.comments.map(c => (
                  <div key={c.id} className="text-xs text-muted-foreground border rounded p-2">
                    <div className="font-semibold">{c.author} <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span></div>
                    <div>{c.message}</div>
                  </div>
                )) : <div className="text-xs text-muted-foreground">No comments yet</div>}

                <div className="space-y-2">
                  <input className="input w-full" placeholder="Your name" value={newCommentAuthor} onChange={e => setNewCommentAuthor(e.target.value)} />
                  <textarea className="textarea w-full" placeholder="Add a comment..." value={newCommentMessage} onChange={e => setNewCommentMessage(e.target.value)} />
                  <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={submitComment}>Add</button>
                    <button className="btn" onClick={() => { setNewCommentAuthor(''); setNewCommentMessage('') }}>Clear</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            Array.isArray(issue.comments) && issue.comments.length ? <div className="text-xs text-muted-foreground">{issue.comments.length} comment(s)</div> : <div className="text-xs text-muted-foreground">No comments</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default IssueCard