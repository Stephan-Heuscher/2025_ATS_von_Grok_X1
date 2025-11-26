import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

interface Issue {
  id: string
  title: string
  description: string
  priority: 'Low' | 'Med' | 'High'
  status: 'ToDo' | 'In Progress' | 'Done'
  // optional assignee (technician / owner)
  assignee?: string | null
}

interface CreateIssueProps {
  onCreate: (issue: Omit<Issue, 'id'>) => void
}

const CreateIssue = ({ onCreate }: CreateIssueProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'Low' | 'Med' | 'High'>('Med')
  const [status, setStatus] = useState<'ToDo' | 'In Progress' | 'Done'>('ToDo')
  const [assignee, setAssignee] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // pass assignee if provided
    onCreate({ title, description, priority, status, assignee: assignee || undefined })
    setTitle('')
    setDescription('')
    setPriority('Med')
    setStatus('ToDo')
    setAssignee('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4">Create New Issue</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={(value: 'Low' | 'Med' | 'High') => setPriority(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Med">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value: 'ToDo' | 'In Progress' | 'Done') => setStatus(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ToDo">To Do</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="assignee">Assignee</Label>
          <Input
            id="assignee"
            placeholder="(unassigned) e.g. Technician name"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
        </div>
        <Button type="submit">Create Issue</Button>
      </div>
    </form>
  )
}

export default CreateIssue