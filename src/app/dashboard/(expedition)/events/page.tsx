'use client'

import { ExpeditionEventsView } from '@/components/domain/expedition-events/ExpeditionEventsView'
import { getFilteredEvents } from '@/store/use-store'
import { useEvents } from '@/hooks/useEvents'

/**
 * Events List Page
 * Displays all events for the selected section using React Query as the single source of truth
 */
export default function EventsPage() {
  const { events, isLoading, isPending, isError, error } = useEvents()

  const filteredIds = new Set(
    getFilteredEvents(
      events.map((e) => ({
        eventId: String(e.eventid),
        patrolId: null,
      }))
    ).map((e) => e.eventId)
  )
  const visibleEvents = events.filter((e) => filteredIds.has(String(e.eventid)))

  // Show loading state when query is loading OR when it's pending (waiting for section to be set)
  return (
    <ExpeditionEventsView
      events={visibleEvents}
      isLoading={isLoading || isPending}
      isError={isError}
      error={error as Error | null}
    />
  )
}
