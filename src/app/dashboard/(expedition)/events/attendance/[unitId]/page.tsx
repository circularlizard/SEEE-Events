'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useConsolidatedAttendance } from '@/components/domain/consolidated-attendance/useConsolidatedAttendance'

type ViewMode = 'byEvent' | 'byAttendee'

interface EventGroup {
  eventId: number
  eventName: string
  startDate?: string
  endDate?: string
  location?: string
  attendees: { memberId: number; name: string }[]
}

interface AttendeeGroup {
  memberId: number
  name: string
  events: { id: number; name: string; startDate?: string; endDate?: string; location?: string }[]
}

export default function UnitDetailPage() {
  const params = useParams()
  const unitId = decodeURIComponent(params.unitId as string)
  const { attendees, getPatrolName } = useConsolidatedAttendance()
  const [viewMode, setViewMode] = useState<ViewMode>('byEvent')
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  // Filter attendees for this unit and compute both groupings
  const { unitName, peopleCount, eventGroups, attendeeGroups } = useMemo(() => {
    const unitAttendees = attendees.filter((a) => String(a.patrolId ?? 'unassigned') === unitId)
    const name = unitAttendees.length > 0 ? getPatrolName(unitAttendees[0].patrolId) : getPatrolName(unitId)

    // Group by event
    const eventMap = new Map<number, EventGroup>()
    for (const person of unitAttendees) {
      for (const event of person.events) {
        if (!eventMap.has(event.id)) {
          eventMap.set(event.id, {
            eventId: event.id,
            eventName: event.name,
            startDate: event.startDate,
            endDate: event.endDate,
            location: event.location,
            attendees: [],
          })
        }
        const group = eventMap.get(event.id)!
        if (!group.attendees.some((a) => a.memberId === person.memberId)) {
          group.attendees.push({ memberId: person.memberId, name: person.name })
        }
      }
    }

    // Sort events by start date
    const eventList = Array.from(eventMap.values()).sort((a, b) => {
      if (a.startDate && b.startDate) {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      }
      if (a.startDate) return -1
      if (b.startDate) return 1
      return a.eventName.localeCompare(b.eventName)
    })
    for (const group of eventList) {
      group.attendees.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    }

    // Group by attendee
    const attendeeList: AttendeeGroup[] = unitAttendees
      .map((p) => ({
        memberId: p.memberId,
        name: p.name,
        events: [...p.events].sort((a, b) => {
          if (a.startDate && b.startDate) {
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          }
          return 0
        }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

    return {
      unitName: name,
      peopleCount: unitAttendees.length,
      eventGroups: eventList,
      attendeeGroups: attendeeList,
    }
  }, [attendees, unitId, getPatrolName])

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const expandAll = () => {
    if (viewMode === 'byEvent') {
      setOpenItems(new Set(eventGroups.map((e) => `event-${e.eventId}`)))
    } else {
      setOpenItems(new Set(attendeeGroups.map((a) => `attendee-${a.memberId}`)))
    }
  }

  const collapseAll = () => {
    setOpenItems(new Set())
  }

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate) return null
    const start = new Date(startDate).toLocaleDateString()
    if (!endDate || startDate === endDate) return start
    const end = new Date(endDate).toLocaleDateString()
    return `${start} — ${end}`
  }

  if (attendees.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <Link href="/dashboard/events/attendance">
          <Button variant="ghost" className="mb-4 pl-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance Overview
          </Button>
        </Link>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          No attendance data yet. Visit event detail pages to populate the cache.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <Link href="/dashboard/events/attendance">
        <Button variant="ghost" className="mb-4 pl-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Attendance Overview
        </Button>
      </Link>

      <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-3">
        <h1 className="text-3xl font-bold">{unitName}</h1>
        <div className="flex items-center gap-4 text-sm mt-1 opacity-90">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" aria-hidden />
            {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" aria-hidden />
            {eventGroups.length} {eventGroups.length === 1 ? 'event' : 'events'}
          </span>
        </div>
      </div>

      {/* View mode toggle and controls */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <RadioGroup
              value={viewMode}
              onValueChange={(value) => {
                setViewMode(value as ViewMode)
                setOpenItems(new Set())
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="byEvent" id="view-by-event" />
                <Label htmlFor="view-by-event">By Event</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="byAttendee" id="view-by-attendee" />
                <Label htmlFor="view-by-attendee">By Attendee</Label>
              </div>
            </RadioGroup>

            {(eventGroups.length > 0 || attendeeGroups.length > 0) && (
              <div className="flex gap-2 text-sm">
                <button onClick={expandAll} className="text-primary hover:underline" type="button">
                  Expand All
                </button>
                <span className="text-muted-foreground">|</span>
                <button onClick={collapseAll} className="text-primary hover:underline" type="button">
                  Collapse All
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* By Event View */}
      {viewMode === 'byEvent' && (
        eventGroups.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No events found for this unit.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {eventGroups.map((event) => {
              const key = `event-${event.eventId}`
              return (
                <Collapsible
                  key={key}
                  open={openItems.has(key)}
                  onOpenChange={() => toggleItem(key)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 rounded-2xl border border-border/80 bg-card text-left font-semibold text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-colors hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {openItems.has(key) ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{event.eventName}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {[formatDateRange(event.startDate, event.endDate), event.location]
                          .filter(Boolean)
                          .join(' • ')}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-normal text-sm shrink-0">
                      {event.attendees.length}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="mt-3 ml-6 space-y-2">
                      {event.attendees.map((attendee) => (
                        <div
                          key={attendee.memberId}
                          className="p-3 rounded-xl border border-border/70 bg-secondary/60 text-sm shadow-sm"
                        >
                          {attendee.name}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )
      )}

      {/* By Attendee View */}
      {viewMode === 'byAttendee' && (
        attendeeGroups.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No attendees found for this unit.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {attendeeGroups.map((person) => {
              const key = `attendee-${person.memberId}`
              return (
                <Collapsible
                  key={key}
                  open={openItems.has(key)}
                  onOpenChange={() => toggleItem(key)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 rounded-2xl border border-border/80 bg-card text-left font-semibold text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-colors hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {openItems.has(key) ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{person.name}</span>
                    <span className="text-muted-foreground font-normal text-sm shrink-0">
                      {person.events.length} {person.events.length === 1 ? 'event' : 'events'}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="mt-3 ml-6 space-y-2">
                      {person.events.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 rounded-xl border border-border/70 bg-secondary/60 text-sm shadow-sm"
                        >
                          <div className="font-medium">{event.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[formatDateRange(event.startDate, event.endDate), event.location]
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
