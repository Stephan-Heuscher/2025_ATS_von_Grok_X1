import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Issue {
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

interface IssuesContextType {
  issues: Issue[]
  loading: boolean
  error: string | null
  createIssue: (issue: Omit<Issue, 'id'>) => Promise<void>
  updateIssue: (update: Partial<Issue> & { id: string }) => void
  deleteIssue: (id: string) => Promise<void>
  refreshIssues: () => void
}

const IssuesContext = createContext<IssuesContextType | undefined>(undefined)

const mockIssues: Issue[] = [
  { id: '1', title: 'Fix login bug', description: 'Users cannot log in with SSO', priority: 'High', status: 'ToDo', assignee: 'Alice', createdAt: new Date().toISOString() },
  { id: '2', title: 'Add dark mode', description: 'Implement dark theme toggle', priority: 'Med', status: 'In Progress', assignee: 'Bob', createdAt: new Date().toISOString() },
  { id: '3', title: 'Update documentation', description: 'Update user documentation for v2.0', priority: 'Low', status: 'Done', assignee: null, createdAt: new Date().toISOString() },
  { id: '4', title: 'Performance optimization', description: 'Reduce bundle size and improve load times', priority: 'High', status: 'ToDo', assignee: 'Charlie', createdAt: new Date().toISOString() },
  { id: '5', title: 'Mobile responsive design', description: 'Fix layout issues on mobile devices', priority: 'Med', status: 'In Progress', assignee: 'Alice', createdAt: new Date().toISOString() },
]

export const IssuesProvider = ({ children }: { children: ReactNode }) => {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIssues = () => {
    setLoading(true)
    fetch('/api/issues')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setIssues(data)
        } else if (Array.isArray(data?.Documents)) {
          setIssues(data.Documents)
        } else if (Array.isArray(data?.resources)) {
          setIssues(data.resources)
        } else {
          setIssues(mockIssues)
        }
        setError(null)
      })
      .catch(() => {
        setIssues(mockIssues)
        setError(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchIssues()
  }, [])

  const createIssue = async (newIssue: Omit<Issue, 'id'>) => {
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIssue)
      })
      const issue = await res.json()
      
      if (Array.isArray(issue)) {
        setIssues(prev => [...prev, ...issue])
      } else if (issue?.resource) {
        setIssues(prev => [...prev, issue.resource])
      } else if (issue?.id) {
        setIssues(prev => [...prev, issue])
      } else {
        throw new Error('Invalid response')
      }
    } catch {
      // Fallback: simulate locally
      const issue: Issue = { 
        ...newIssue, 
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }
      setIssues(prev => [...prev, issue])
    }
  }

  const updateIssue = (update: Partial<Issue> & { id: string }) => {
    setIssues(prev => prev.map(i => i.id === update.id ? { ...i, ...update } : i))
  }

  const deleteIssue = async (id: string) => {
    try {
      await fetch(`/api/issues/${id}`, { method: 'DELETE' })
      setIssues(prev => prev.filter(i => i.id !== id))
    } catch {
      setIssues(prev => prev.filter(i => i.id !== id))
    }
  }

  return (
    <IssuesContext.Provider value={{ 
      issues, 
      loading, 
      error, 
      createIssue, 
      updateIssue, 
      deleteIssue,
      refreshIssues: fetchIssues 
    }}>
      {children}
    </IssuesContext.Provider>
  )
}

export const useIssues = () => {
  const context = useContext(IssuesContext)
  if (context === undefined) {
    throw new Error('useIssues must be used within an IssuesProvider')
  }
  return context
}
