import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PlanningNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <FileQuestion className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist in the Event Planning app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You may have followed an outdated link or the page may have been moved.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/planning">
              <Button className="w-full">View Planning Dashboard</Button>
            </Link>
            <Link href="/dashboard/members">
              <Button variant="outline" className="w-full">View Members</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">Back to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
