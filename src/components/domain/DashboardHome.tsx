'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CalendarDays, Users, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useEvents } from '@/hooks/useEvents'
import { useConsolidatedAttendance } from '@/components/domain/consolidated-attendance/useConsolidatedAttendance'
import { useAttendanceHydration } from '@/hooks/useAttendanceHydration'
import type { Event } from '@/lib/schemas'

const MAX_PREVIEW_ITEMS = 5

interface EventPreviewProps {
  event: Event
}

function EventPreview({ event }: EventPreviewProps) {
  const formatDateRange = () => {
    if (!event.startdate) return 'Date TBC'
    const sameDay = event.startdate === event.enddate || !event.enddate
    return sameDay ? event.startdate : `${event.startdate} — ${event.enddate}`
  }

  return (
    <Link
      href={`/dashboard/events/${event.eventid}`}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{event.name}</p>
        <p className="text-sm text-muted-foreground">{formatDateRange()}</p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{event.yes ?? 0} attending</span>
        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

interface UnitPreviewProps {
  unitId: string
  unitName: string
  memberCount: number
  eventCount: number
}

function UnitPreview({ unitId, unitName, memberCount, eventCount }: UnitPreviewProps) {
  return (
    <Link
      href={`/dashboard/events/units/${encodeURIComponent(unitId)}`}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{unitName}</p>
        <p className="text-sm text-muted-foreground">
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{eventCount} {eventCount === 1 ? 'event' : 'events'}</span>
        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

function EventsTile() {
  const { events, isLoading, isPending } = useEvents()
  const loading = isLoading || isPending

  const topEvents = useMemo(() => {
    if (!events.length) return []
    
    return [...events]
      .sort((a, b) => (b.yes ?? 0) - (a.yes ?? 0))
      .slice(0, MAX_PREVIEW_ITEMS)
  }, [events])

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Events</CardTitle>
            <CardDescription>
              {loading ? 'Loading...' : `${events.length} ${events.length === 1 ? 'event' : 'events'}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : topEvents.length > 0 ? (
          <div className="space-y-1 -mx-3">
            {topEvents.map((event) => (
              <EventPreview key={event.eventid} event={event} />
            ))}
          </div>
        ) : events.length > 0 ? (
          <p className="text-sm text-muted-foreground py-4">No events with attendance data</p>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No events found</p>
        )}
        <div className="mt-auto pt-4">
          <Link
            href="/dashboard/events"
            className={cn(
              'inline-flex items-center justify-center w-full h-9 px-4 text-sm font-medium rounded-md',
              'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            View all events
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function UnitsTile() {
  const { attendees, getPatrolName } = useConsolidatedAttendance()
  const { events, isLoading: eventsLoading, isPending: eventsPending } = useEvents()
  const { isHydrating, hydratedCount, totalEvents } = useAttendanceHydration()

  const loading = eventsLoading || eventsPending || isHydrating

  const unitSummaries = useMemo(() => {
    if (!attendees.length) return []
    
    const unitMap = new Map<string, { memberIds: Set<number>; eventIds: Set<number> }>()
    
    for (const person of attendees) {
      const unitId = String(person.patrolId ?? 'unassigned')
      if (!unitMap.has(unitId)) {
        unitMap.set(unitId, { memberIds: new Set(), eventIds: new Set() })
      }
      const unit = unitMap.get(unitId)!
      unit.memberIds.add(person.memberId)
      for (const event of person.events) {
        unit.eventIds.add(Number(event.id))
      }
    }

    return Array.from(unitMap.entries())
      .map(([unitId, data]) => ({
        unitId,
        unitName: getPatrolName(unitId === 'unassigned' ? null : unitId),
        memberCount: data.memberIds.size,
        eventCount: data.eventIds.size,
      }))
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, MAX_PREVIEW_ITEMS)
  }, [attendees, getPatrolName])

  const totalPeople = attendees.length
  const uniqueUnits = new Set(attendees.map((a) => a.patrolId)).size

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Unit Details</CardTitle>
            <CardDescription>
              {loading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {isHydrating ? `Loading ${hydratedCount}/${totalEvents}...` : 'Loading...'}
                </span>
              ) : (
                `${totalPeople} people in ${uniqueUnits} ${uniqueUnits === 1 ? 'unit' : 'units'}`
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : unitSummaries.length > 0 ? (
          <div className="space-y-1 -mx-3">
            {unitSummaries.map((unit) => (
              <UnitPreview
                key={unit.unitId}
                unitId={unit.unitId}
                unitName={unit.unitName}
                memberCount={unit.memberCount}
                eventCount={unit.eventCount}
              />
            ))}
          </div>
        ) : events.length > 0 ? (
          <p className="text-sm text-muted-foreground py-4">No attendance data yet</p>
        ) : (
          <p className="text-sm text-muted-foreground py-4">Load events to see unit details</p>
        )}
        <div className="mt-auto pt-4">
          <Link
            href="/dashboard/events/units"
            className={cn(
              'inline-flex items-center justify-center w-full h-9 px-4 text-sm font-medium rounded-md',
              'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            View all units
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardHome() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Expedition Viewer</h1>
        <p className="text-muted-foreground mt-1">
          View events and attendance for your section
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <EventsTile />
        <UnitsTile />
      </div>
    </div>
  )
}
