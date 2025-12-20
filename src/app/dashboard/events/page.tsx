'use client'

import { EventsListSkeleton } from '@/components/domain/EventsListSkeleton'
import { EventCard } from '@/components/domain/EventCard'
import { EventsTable } from '@/components/domain/EventsTable'
import { AlertCircle, CalendarDays } from 'lucide-react'
import type { Event } from '@/lib/schemas'
import { getFilteredEvents } from '@/store/use-store'
import { useEvents } from '@/hooks/useEvents'

/**
 * Events List Page
 * Displays all events for the selected section using React Query as the single source of truth
 */
export default function EventsPage() {
  // Use React Query hook - single source of truth for events data
  const { events, isLoading, isError, error } = useEvents()

  // Compute visible events with access control filtering
  const filteredIds = new Set(
    getFilteredEvents(
      events.map((e) => ({
        eventId: String(e.eventid),
        patrolId: null,
      }))
    ).map((e) => e.eventId)
  )
  const visibleEvents = events.filter((e) => filteredIds.has(String(e.eventid)))

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6" aria-hidden />
              <span>Events</span>
            </h1>
            <p className="mt-1 text-sm md:text-base opacity-90">
              Loading events...
            </p>
          </div>
        </div>
        <EventsListSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6" aria-hidden />
              <span>Events</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Failed to load events</p>
            <p className="text-sm">{error?.message || 'An error occurred'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" aria-hidden />
            <span>Events</span>
          </h1>
          <p className="mt-1 text-sm md:text-base opacity-90">
            {visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'} found
          </p>
        </div>
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
