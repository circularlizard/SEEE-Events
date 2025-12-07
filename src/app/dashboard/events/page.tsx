'use client'

import { useEvents } from '@/hooks/useEvents'
import { EventsListSkeleton } from '@/components/domain/EventsListSkeleton'
import { EventCard } from '@/components/domain/EventCard'
import { EventsTable } from '@/components/domain/EventsTable'
import { AlertCircle } from 'lucide-react'
import type { Event } from '@/lib/schemas'
import { getFilteredEvents } from '@/store/use-store'
import { useEventSummaryQueue } from '@/hooks/useEventSummaryQueue'

/**
 * Events List Page
 * Displays all events for the selected section with progressive hydration
 */
export default function EventsPage() {
  const { data, isLoading, error } = useEvents()
  const { enqueue } = useEventSummaryQueue({ concurrency: 2, delayMs: 800, retryBackoffMs: 5000 })

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">Loading events...</p>
        </div>
        <EventsListSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Events</h1>
        </div>
        <div className="flex items-center gap-3 p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Failed to load events</p>
            <p className="text-sm">{error instanceof Error ? error.message : 'An error occurred'}</p>
          </div>
        </div>
      </div>
    )
  }

  const events = data?.items || []
  const filteredIds = new Set(
    getFilteredEvents(
      events.map((e) => ({
        eventId: String(e.eventid),
        // Some datasets may include patrolid tying event to patrol
        patrolId: (e as any).patrolid ? String((e as any).patrolid) : null,
      }))
    ).map((e) => e.eventId)
  )
  const visibleEvents = events.filter((e) => filteredIds.has(String(e.eventid)))

  // Enqueue summaries for all visible events when list loads
  if (visibleEvents.length) {
    enqueue(visibleEvents.map((e) => e.eventid))
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground mt-1">
          {visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'} found
        </p>
      </div>

      {visibleEvents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No events found for this section.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden grid gap-4">
            {visibleEvents.map((event: Event) => (
              <EventCard key={event.eventid} event={event} />
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <EventsTable events={visibleEvents} />
          </div>
        </>
      )}
    </div>
  )
}
