import { useState, useEffect } from 'react'
import IssueCard from '../components/IssueCard'
import CreateIssue from '../components/CreateIssue'

interface Issue {
  id: string
  title: string
  description: string
  priority: 'Low' | 'Med' | 'High'
  status: 'ToDo' | 'In Progress' | 'Done'
}

const Dashboard = () => {
  const [issues, setIssues] = useState<Issue[]>([])

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
          { id: '1', title: 'Fix login bug', description: 'Users cannot log in', priority: 'High', status: 'ToDo' },
          { id: '2', title: 'Add dark mode', description: 'Implement dark theme', priority: 'Med', status: 'In Progress' },
          { id: '3', title: 'Update docs', description: 'Update user documentation', priority: 'Low', status: 'Done' },
        ]
        setIssues(mockIssues)
      })
      .catch(() => {
        // Fallback to mock data if API fails
        const mockIssues: Issue[] = [
          { id: '1', title: 'Fix login bug', description: 'Users cannot log in', priority: 'High', status: 'ToDo' },
          { id: '2', title: 'Add dark mode', description: 'Implement dark theme', priority: 'Med', status: 'In Progress' },
          { id: '3', title: 'Update docs', description: 'Update user documentation', priority: 'Low', status: 'Done' },
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

  const groupedIssues = {
    ToDo: issues.filter(i => i.status === 'ToDo'),
    'In Progress': issues.filter(i => i.status === 'In Progress'),
    Done: issues.filter(i => i.status === 'Done'),
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Issue Dashboard</h1>
      <CreateIssue onCreate={handleCreateIssue} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(groupedIssues).map(([status, statusIssues]) => (
          <div key={status} className="bg-card p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">{status}</h2>
            <div className="space-y-4">
              {statusIssues.map(issue => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard