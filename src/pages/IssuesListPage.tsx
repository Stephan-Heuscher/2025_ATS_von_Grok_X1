import { useState } from 'react'
import { useIssues, Issue } from '../context/IssuesContext'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Search, Filter, Download, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react'

const IssuesListPage = () => {
  const { issues, deleteIssue, updateIssue } = useIssues()
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [sortField, setSortField] = useState<keyof Issue>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filter issues
  const filteredIssues = issues.filter(i => {
    if (filterPriority && i.priority !== filterPriority) return false
    if (filterStatus && i.status !== filterStatus) return false
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

  // Sort issues
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const aVal = a[sortField] ?? ''
    const bVal = b[sortField] ?? ''
    if (sortDir === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    }
    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
  })

  const handleSort = (field: keyof Issue) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const exportCSV = () => {
    const rows = filteredIssues.map(i => ({
      id: i.id,
      title: i.title,
      description: i.description,
      priority: i.priority,
      status: i.status,
      assignee: i.assignee ?? '',
      createdAt: i.createdAt ?? '',
      updatedAt: i.updatedAt ?? '',
    }))
    const header = Object.keys(rows[0] || { id: '', title: '', description: '' })
    const csv = [header.join(','), ...rows.map(r => header.map(h => `"${String((r as Record<string, unknown>)[h] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `issues-export-${(new Date()).toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'Med': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'Low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'ToDo': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const uniqueAssignees = Array.from(new Set(issues.map(i => i.assignee).filter((x): x is string => !!x)))

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          All Issues
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Showing {filteredIssues.length} of {issues.length} issues
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 p-4 mb-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600"
            />
          </div>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="h-10 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 text-sm"
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Med">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-10 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ToDo">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="h-10 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 text-sm"
          >
            <option value="">All Assignees</option>
            <option value="__unassigned__">Unassigned</option>
            {uniqueAssignees.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('title')}>
                    Title
                    {sortField === 'title' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('priority')}>
                    Priority
                    {sortField === 'priority' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('status')}>
                    Status
                    {sortField === 'status' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('assignee')}>
                    Assignee
                    {sortField === 'assignee' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sortedIssues.map((issue) => (
                <>
                  <tr
                    key={issue.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{issue.title}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{issue.description}</div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      {issue.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                            {issue.assignee[0]}
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{issue.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Simple status toggle for quick actions
                            const nextStatus = issue.status === 'ToDo' ? 'In Progress' : issue.status === 'In Progress' ? 'Done' : 'ToDo'
                            updateIssue({ id: issue.id, status: nextStatus })
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 hover:text-blue-600 transition-colors"
                          title="Change status"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Delete this issue?')) {
                              deleteIssue(issue.id)
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === issue.id && (
                    <tr key={`${issue.id}-expanded`} className="bg-slate-50 dark:bg-slate-900/50">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Description:</span>
                            <p className="mt-1 text-slate-700 dark:text-slate-300">{issue.description}</p>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Created:</span>
                              <span className="ml-2 text-slate-700 dark:text-slate-300">
                                {issue.createdAt ? new Date(issue.createdAt).toLocaleString() : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Updated:</span>
                              <span className="ml-2 text-slate-700 dark:text-slate-300">
                                {issue.updatedAt ? new Date(issue.updatedAt).toLocaleString() : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Comments:</span>
                              <span className="ml-2 text-slate-700 dark:text-slate-300">
                                {issue.comments?.length ?? 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {sortedIssues.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No issues found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default IssuesListPage
