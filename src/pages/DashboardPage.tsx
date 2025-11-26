import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useIssues, Issue } from '../context/IssuesContext'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { 
  LayoutDashboard, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  MessageSquare,
  User
} from 'lucide-react'

const DashboardPage = () => {
  const { issues, loading, updateIssue } = useIssues()
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null)

  const columns = [
    { id: 'ToDo', title: 'To Do', icon: Clock, color: 'from-slate-500 to-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'In Progress', title: 'In Progress', icon: AlertCircle, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'Done', title: 'Done', icon: CheckCircle2, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  ]

  const getIssuesByStatus = (status: string) => issues.filter(i => i.status === status)

  const handleDragStart = (issue: Issue) => {
    setDraggedIssue(issue)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (status: 'ToDo' | 'In Progress' | 'Done') => {
    if (draggedIssue && draggedIssue.status !== status) {
      updateIssue({ id: draggedIssue.id, status })
    }
    setDraggedIssue(null)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-500'
      case 'Med': return 'bg-yellow-500'
      case 'Low': return 'bg-green-500'
      default: return 'bg-slate-500'
    }
  }

  const stats = {
    total: issues.length,
    todo: issues.filter(i => i.status === 'ToDo').length,
    inProgress: issues.filter(i => i.status === 'In Progress').length,
    done: issues.filter(i => i.status === 'Done').length,
    highPriority: issues.filter(i => i.priority === 'High' && i.status !== 'Done').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Overview of all issues
            </p>
          </div>
        </div>
        <Link to="/create">
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/25">
            <Plus className="h-4 w-4 mr-2" />
            New Issue
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Total Issues</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
          <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">In Progress</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
          <div className="text-3xl font-bold text-green-600">{stats.done}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Completed</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
          <div className="text-3xl font-bold text-red-600">{stats.highPriority}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">High Priority</div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`${column.bgColor} rounded-2xl p-4 min-h-[500px]`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id as 'ToDo' | 'In Progress' | 'Done')}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${column.color}`}>
                  <column.icon className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{column.title}</h2>
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm">
                  {getIssuesByStatus(column.id).length}
                </span>
              </div>
            </div>

            {/* Issue Cards */}
            <div className="space-y-3">
              {getIssuesByStatus(column.id).map((issue) => (
                <div
                  key={issue.id}
                  draggable
                  onDragStart={() => handleDragStart(issue)}
                  className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all cursor-grab active:cursor-grabbing border border-slate-200 dark:border-slate-700 ${
                    draggedIssue?.id === issue.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  {/* Priority indicator */}
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(issue.priority)}`}></div>
                    <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                    {issue.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {issue.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        issue.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        issue.priority === 'Med' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {issue.priority}
                      </Badge>
                      {issue.comments && issue.comments.length > 0 && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <MessageSquare className="h-3 w-3" />
                          <span className="text-xs">{issue.comments.length}</span>
                        </div>
                      )}
                    </div>
                    {issue.assignee ? (
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium" title={issue.assignee}>
                        {issue.assignee[0]}
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-400">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {getIssuesByStatus(column.id).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400 dark:text-slate-500">No issues</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
