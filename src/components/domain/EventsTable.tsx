import type { Event } from '@/lib/schemas'

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

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr className="border-b">
            <th className="text-left p-4 font-semibold">Event Name</th>
            <th className="text-left p-4 font-semibold">Start Date</th>
            <th className="text-left p-4 font-semibold">End Date</th>
            <th className="text-left p-4 font-semibold">Location</th>
            <th className="text-left p-4 font-semibold">Attending</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.eventid}
              className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <td className="p-4 font-medium">{event.name}</td>
              <td className="p-4 text-muted-foreground">{formatDate(event.startdate)}</td>
              <td className="p-4 text-muted-foreground">{formatDate(event.enddate)}</td>
              <td className="p-4 text-muted-foreground">{event.location || '—'}</td>
              <td className="p-4 text-muted-foreground">{event.yes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
