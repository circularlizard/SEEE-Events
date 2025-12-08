import type { Event } from '@/lib/schemas'
import Link from 'next/link'
import { usePrefetchEventSummary } from '@/hooks/usePrefetchEventSummary'
import { useViewportPrefetchSummary } from '@/hooks/useViewportPrefetchSummary'
import { useStore } from '@/store/use-store'
import type { RefCallback } from 'react'

/** Extended event type with optional sectionid (added when merging multi-section events) */
type EventWithSection = Event & { sectionid?: string | number }

interface EventsTableProps {
  events: EventWithSection[]
}

interface EventTableRowProps {
  event: EventWithSection
  sectionNameById: Map<string, string>
  formatDate: (date: string) => string
  prefetchSummary: (eventId: string | number) => void
}

/**
 * Events Table Component (Desktop View)
 * Displays events in a table format with name, dates, location, and attendance
 */
/**
 * Individual table row component - allows hooks to be called at component level
 */
function EventTableRow({ event, sectionNameById, formatDate, prefetchSummary }: EventTableRowProps) {
  const viewportRef = useViewportPrefetchSummary(event.eventid)

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <td className="p-4 font-medium">
        <Link
          href={`/dashboard/events/${event.eventid}`}
          className="text-primary hover:underline"
          prefetch
          onMouseEnter={() => prefetchSummary(event.eventid)}
          ref={viewportRef as RefCallback<HTMLAnchorElement>}
        >
          {event.name}
        </Link>
      </td>
      <td className="p-4 text-muted-foreground">{formatDate(event.startdate)}</td>
      <td className="p-4 text-muted-foreground">{formatDate(event.enddate)}</td>
      <td className="p-4 text-muted-foreground">
        {sectionNameById.get(String(event.sectionid)) ?? '—'}
      </td>
      <td className="p-4 text-muted-foreground">{event.location || '—'}</td>
      <td className="p-4 text-muted-foreground">{event.yes}</td>
    </tr>
  )
}

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
            <EventTableRow
              key={event.eventid}
              event={event}
              sectionNameById={sectionNameById}
              formatDate={formatDate}
              prefetchSummary={prefetchSummary}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
