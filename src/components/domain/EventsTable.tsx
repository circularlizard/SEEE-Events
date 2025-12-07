import type { Event } from '@/lib/schemas'
import Link from 'next/link'
import { usePrefetchEventSummary } from '@/hooks/usePrefetchEventSummary'
import { useViewportPrefetchSummary } from '@/hooks/useViewportPrefetchSummary'
import { useStore } from '@/store/use-store'

interface EventsTableProps {
  events: Event[]
}

/**
 * Events Table Component (Desktop View)
 * Displays events in a table format with name, dates, location, and attendance
 */
export function EventsTable({ events }: EventsTableProps) {
  const formatDate = (date: string) => {
    return date // OSM already provides DD/MM/YYYY format
  }

  const prefetchSummary = usePrefetchEventSummary()
  const selectedSections = useStore((s) => s.selectedSections)
  const currentSection = useStore((s) => s.currentSection)
  const sectionNameById = new Map<string, string>([
    ...selectedSections.map(s => [s.sectionId, s.sectionName] as const),
    ...(currentSection ? [[currentSection.sectionId, currentSection.sectionName] as const] : [])
  ])

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr className="border-b">
            <th className="text-left p-4 font-semibold">Event Name</th>
            <th className="text-left p-4 font-semibold">Start Date</th>
            <th className="text-left p-4 font-semibold">End Date</th>
            <th className="text-left p-4 font-semibold">Section</th>
            <th className="text-left p-4 font-semibold">Location</th>
            <th className="text-left p-4 font-semibold">Attending</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.eventid}
              className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
            >
              <td className="p-4 font-medium">
                <Link
                  href={`/dashboard/events/${event.eventid}`}
                  className="text-primary hover:underline"
                  prefetch
                  onMouseEnter={() => prefetchSummary(event.eventid)}
                  ref={useViewportPrefetchSummary(event.eventid) as any}
                >
                  {event.name}
                </Link>
              </td>
              <td className="p-4 text-muted-foreground">{formatDate(event.startdate)}</td>
              <td className="p-4 text-muted-foreground">{formatDate(event.enddate)}</td>
              <td className="p-4 text-muted-foreground">
                {sectionNameById.get(String((event as any).sectionid)) ?? '—'}
              </td>
              <td className="p-4 text-muted-foreground">{event.location || '—'}</td>
              <td className="p-4 text-muted-foreground">{event.yes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
