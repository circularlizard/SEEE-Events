'use client'

import { ExpeditionEventsView } from '@/components/domain/expedition-events/ExpeditionEventsView'
import { useEvents } from '@/hooks/useEvents'
import { getFilteredEvents } from '@/store/use-store'

export default function PlannerEventsPage() {
  const { events, isLoading, isError, error } = useEvents()

  const filteredIds = new Set(
    getFilteredEvents(
      events.map((e) => ({
        eventId: String(e.eventid),
        patrolId: null,
      }))
    ).map((e) => e.eventId)
  )
  const visibleEvents = events.filter((e) => filteredIds.has(String(e.eventid)))

  return (
    <ExpeditionEventsView
      title="Events"
      description={`${visibleEvents.length} ${visibleEvents.length === 1 ? 'event' : 'events'} available`}
      events={visibleEvents}
      isLoading={isLoading}
      isError={isError}
      error={error as Error | null}
    />
  )
}
