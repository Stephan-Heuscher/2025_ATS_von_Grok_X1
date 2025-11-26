import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIssues } from '../context/IssuesContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import { ArrowLeft, Sparkles } from 'lucide-react'

const CreateIssuePage = () => {
  const navigate = useNavigate()
  const { createIssue } = useIssues()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'Low' | 'Med' | 'High'>('Med')
  const [status, setStatus] = useState<'ToDo' | 'In Progress' | 'Done'>('ToDo')
  const [assignee, setAssignee] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    await createIssue({
      title,
      description,
      priority,
      status,
      assignee: assignee || undefined
    })
    
    setIsSubmitting(false)
    navigate('/')
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Create New Issue
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Add a new issue to your tracker
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-6 space-y-6 border border-slate-200 dark:border-slate-700">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title..."
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-slate-700 dark:text-slate-300">
                Priority
              </Label>
              <Select value={priority} onValueChange={(value: 'Low' | 'Med' | 'High') => setPriority(value)}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="Med">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="High">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      High
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-700 dark:text-slate-300">
                Status
              </Label>
              <Select value={status} onValueChange={(value: 'ToDo' | 'In Progress' | 'Done') => setStatus(value)}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ToDo">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee" className="text-slate-700 dark:text-slate-300">
              Assignee
            </Label>
            <Input
              id="assignee"
              placeholder="Enter assignee name (optional)"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/25"
          >
            {isSubmitting ? 'Creating...' : 'Create Issue'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateIssuePage
