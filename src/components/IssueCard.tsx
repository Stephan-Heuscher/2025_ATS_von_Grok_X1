import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface Issue {
  id: string
  title: string
  description: string
  priority: 'Low' | 'Med' | 'High'
  status: 'ToDo' | 'In Progress' | 'Done'
}

interface IssueCardProps {
  issue: Issue
}

const IssueCard = ({ issue }: IssueCardProps) => {
  const priorityColor = {
    Low: 'bg-green-500',
    Med: 'bg-yellow-500',
    High: 'bg-red-500',
  }

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-lg">{issue.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-2">{issue.description}</p>
        <Badge className={`${priorityColor[issue.priority]} text-white`}>
          {issue.priority}
        </Badge>
      </CardContent>
    </Card>
  )
}

export default IssueCard