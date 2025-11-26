import { useState, useEffect } from 'react'
import IssueCard from '../components/IssueCard'
import CreateIssue from '../components/CreateIssue'

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

const Dashboard = () => {
  const [issues, setIssues] = useState<Issue[]>([])
  const [search, setSearch] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [filterAssignee, setFilterAssignee] = useState<string>('')

  useEffect(() => {
    // Fetch issues from API. Be defensive about the response shape — deployed
    // API may return an object with Documents / resources or an error object.
    fetch('/api/issues')
      .then(res => res.json())
      .then(data => {
        // If the server returned an array, use it directly
        if (Array.isArray(data)) return setIssues(data)
        // Common Cosmos responses may include Documents or resources
        if (Array.isArray(data?.Documents)) return setIssues(data.Documents)
        if (Array.isArray(data?.resources)) return setIssues(data.resources)
        // If we got an error object or something unexpected, fall back to mock data
        const mockIssues: Issue[] = [
          { id: '1', title: 'Fix login bug', description: 'Users cannot log in', priority: 'High', status: 'ToDo', assignee: 'Alice' },
          { id: '2', title: 'Add dark mode', description: 'Implement dark theme', priority: 'Med', status: 'In Progress', assignee: 'Bob' },
          { id: '3', title: 'Update docs', description: 'Update user documentation', priority: 'Low', status: 'Done', assignee: null },
        ]
        setIssues(mockIssues)
      })
      .catch(() => {
        // Fallback to mock data if API fails
        const mockIssues: Issue[] = [
          { id: '1', title: 'Fix login bug', description: 'Users cannot log in', priority: 'High', status: 'ToDo', assignee: 'Alice' },
          { id: '2', title: 'Add dark mode', description: 'Implement dark theme', priority: 'Med', status: 'In Progress', assignee: 'Bob' },
          { id: '3', title: 'Update docs', description: 'Update user documentation', priority: 'Low', status: 'Done', assignee: null },
        ]
        setIssues(mockIssues)
      })
  }, [])

  const handleCreateIssue = (newIssue: Omit<Issue, 'id'>) => {
    fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIssue)
    })
      .then(res => res.json())
      .then(issue => {
        // Defensive: server might return created resource in various shapes
        if (Array.isArray(issue)) return setIssues(prev => [...prev, ...issue])
        if (issue?.resource) return setIssues(prev => [...prev, issue.resource])
        if (issue?.id) return setIssues(prev => [...prev, issue])
        // Otherwise ignore and let fallback handle it
      })
      .catch(() => {
        // Fallback: simulate locally
        const issue: Issue = { ...newIssue, id: Date.now().toString() }
        setIssues(prev => [...prev, issue])
      })
  }

  // derive the filtered list based on search/filters
  const filteredIssues = issues.filter(i => {
    if (filterPriority && i.priority !== filterPriority) return false
    if (filterAssignee) {
      if (filterAssignee === '__unassigned__') {
        if (i.assignee) return false
      } else if (i.assignee !== filterAssignee) return false
    }
    if (search && search.trim()) {
      const s = search.toLowerCase()
      if (!(`${i.title} ${i.description} ${(i.assignee ?? '')}`.toLowerCase().includes(s))) return false
    }
    return true
  })

  const groupedIssues = {
    ToDo: filteredIssues.filter(i => i.status === 'ToDo'),
    'In Progress': filteredIssues.filter(i => i.status === 'In Progress'),
    Done: filteredIssues.filter(i => i.status === 'Done'),
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Issue Dashboard</h1>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Search</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, description or assignee" className="input w-full" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Priority</label>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="select w-full">
            <option value="">Any</option>
            <option value="High">High</option>
            <option value="Med">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Assignee</label>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="select w-full">
            <option value="">Any</option>
            <option value="__unassigned__">Unassigned</option>
            {Array.from(new Set(issues.map(i => i.assignee).filter((x): x is string => !!x))).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-4 flex gap-2">
        <button className="btn btn-outline" onClick={() => {
          // export filteredIssues to CSV
          const rows = filteredIssues.map(i => ({
            id: i.id,
            title: i.title,
            description: i.description,
            priority: i.priority,
            status: i.status,
            assignee: i.assignee ?? '',
            createdAt: i.createdAt ?? '',
            updatedAt: i.updatedAt ?? '',
            commentsCount: Array.isArray(i.comments) ? i.comments.length : 0,
            historyCount: Array.isArray(i.history) ? i.history.length : 0
          }))
          const header = Object.keys(rows[0] || { id: '', title: '', description: '' })
          const csv = [header.join(','), ...rows.map(r => header.map(h => `"${String((r as any)[h] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `issues-export-${(new Date()).toISOString().slice(0,10)}.csv`
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        }}>Export CSV</button>
      </div>
      <CreateIssue onCreate={handleCreateIssue} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(groupedIssues).map(([status, statusIssues]) => (
          <div key={status} className="bg-card p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">{status}</h2>
            <div className="space-y-4">
              {statusIssues.map(issue => (
                <IssueCard key={issue.id} issue={issue} onUpdate={(update) => {
                  setIssues(prev => prev.map(i => i.id === update.id ? { ...i, ...update } : i))
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard