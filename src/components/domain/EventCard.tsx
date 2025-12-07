import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, MapPin, Users } from 'lucide-react'
import type { Event } from '@/lib/schemas'
import Link from 'next/link'
import { usePrefetchEventSummary } from '@/hooks/usePrefetchEventSummary'

interface EventCardProps {
  event: Event
}

/**
 * Event Card Component (Mobile View)
 * Displays event name, dates, location, and attendance count
 */
export function EventCard({ event }: EventCardProps) {
    const prefetchSummary = usePrefetchEventSummary()
  // Calculate total attendance (yes responses)
  const totalAttendance = event.yes

  // Format date for display (DD/MM/YYYY)
  const formatDate = (date: string) => {
    return date // OSM already provides DD/MM/YYYY format
  }

  const dateRange =
    event.startdate === event.enddate
      ? formatDate(event.startdate)
      : `${formatDate(event.startdate)} - ${formatDate(event.enddate)}`

  return (
    <Link
      href={`/dashboard/events/${event.eventid}`}
      className="block"
      prefetch
      onMouseEnter={() => prefetchSummary(event.eventid)}
    >
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg">{event.name}</CardTitle>
          <CardDescription className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4" />
            {dateRange}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {event.location && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{totalAttendance} attending</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
