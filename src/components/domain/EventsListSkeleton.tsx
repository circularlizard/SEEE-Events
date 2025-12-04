import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Loading skeleton for Events List
 * Shows both mobile card view and desktop table view placeholders
 */
export function EventsListSkeleton() {
  return (
    <>
      {/* Mobile Card View Skeleton */}
      <div className="md:hidden grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View Skeleton */}
      <div className="hidden md:block">
        <div className="border rounded-lg">
          <div className="border-b bg-muted p-4">
            <div className="flex gap-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/6" />
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b p-4 last:border-b-0">
              <div className="flex gap-4">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
