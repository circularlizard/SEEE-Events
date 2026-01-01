'use client'

import { useMemo, useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { PersonAttendance } from '@/hooks/usePerPersonAttendance'
import { groupByPatrol, groupByPatrolAndEvent, sortByName } from '@/components/domain/consolidated-attendance/grouping'

type GroupMode = 'single' | 'patrol' | 'patrolEvent'

interface ConsolidatedAttendancePanelProps {
  attendees: PersonAttendance[]
  getPatrolName: (patrolId: number | string | null | undefined) => string
}

export function ConsolidatedAttendancePanel({ attendees, getPatrolName }: ConsolidatedAttendancePanelProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>('patrol')
  const [openPatrols, setOpenPatrols] = useState<Set<string>>(new Set())
  const [openEvents, setOpenEvents] = useState<Set<string>>(new Set())

  const sortedData = useMemo(() => sortByName(attendees), [attendees])
  const patrolGroups = useMemo(() => groupByPatrol(attendees), [attendees])
  const patrolEventGroups = useMemo(() => groupByPatrolAndEvent(attendees), [attendees])

  const togglePatrol = (patrolKey: string) => {
    setOpenPatrols((prev) => {
      const next = new Set(prev)
      if (next.has(patrolKey)) {
        next.delete(patrolKey)
      } else {
        next.add(patrolKey)
      }
      return next
    })
  }

  const toggleEvent = (eventKey: string) => {
    setOpenEvents((prev) => {
      const next = new Set(prev)
      if (next.has(eventKey)) {
        next.delete(eventKey)
      } else {
        next.add(eventKey)
      }
      return next
    })
  }

  const expandAll = () => {
    const allPatrolKeys = patrolGroups.map(([key]) => key)
    setOpenPatrols(new Set(allPatrolKeys))

    if (groupMode === 'patrolEvent') {
      const allEventKeys = patrolEventGroups.flatMap((pg) => pg.events.map((e) => `${pg.patrolKey}-${e.eventId}`))
      setOpenEvents(new Set(allEventKeys))
    }
  }

  const collapseAll = () => {
    setOpenPatrols(new Set())
    setOpenEvents(new Set())
  }

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <RadioGroup
            value={groupMode}
            onValueChange={(value) => setGroupMode(value as GroupMode)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="group-single" />
              <Label htmlFor="group-single">Single List</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="patrol" id="group-patrol" />
              <Label htmlFor="group-patrol">By Unit</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="patrolEvent" id="group-patrol-event" />
              <Label htmlFor="group-patrol-event">By Unit &amp; Event</Label>
            </div>
          </RadioGroup>
          {(groupMode === 'patrol' || groupMode === 'patrolEvent') && attendees.length > 0 && (
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
        <div className="mt-4">
          {attendees.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <div className="text-sm text-muted-foreground">
                No aggregated attendance yet. Once summaries hydrate, people with “Yes” responses will appear here.
              </div>
            </div>
          ) : (
            <>
              {/* Desktop view */}
              <div className="hidden md:block">
                {groupMode === 'single' && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr className="border-b">
                          <th className="p-4 font-semibold text-left">Name</th>
                          <th className="p-4 font-semibold text-left">Unit</th>
                          <th className="p-4 font-semibold text-left">Yes Events</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedData.map((p) => (
                          <tr key={p.memberId} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                            <td className="p-4">{p.name}</td>
                            <td className="p-4 text-muted-foreground">{getPatrolName(p.patrolId)}</td>
                            <td className="p-4">
                              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                {p.events.map((e) => (
                                  <li key={`${p.memberId}-${e.id}`}>
                                    <div className="font-medium text-foreground">{e.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {e.startDate && e.endDate ? (
                                        <span>
                                          {new Date(e.startDate).toLocaleDateString()} —{' '}
                                          {new Date(e.endDate).toLocaleDateString()}
                                        </span>
                                      ) : null}
                                      {e.location ? <span> • {e.location}</span> : null}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {groupMode === 'patrol' && (
                  <div className="space-y-3">
                    {patrolGroups.map(([patrolKey, persons]) => (
                      <Collapsible
                        key={`patrol-${patrolKey}`}
                        open={openPatrols.has(patrolKey)}
                        onOpenChange={() => togglePatrol(patrolKey)}
                      >
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-2xl border border-border/80 bg-card text-left font-semibold text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-colors hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          {openPatrols.has(patrolKey) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span>Unit: {getPatrolName(patrolKey)}</span>
                          <span className="text-muted-foreground font-normal text-sm ml-auto">
                            {persons.length} {persons.length === 1 ? 'person' : 'people'}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border rounded-lg overflow-hidden text-sm mt-2">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/30">
                                <tr className="border-b">
                                  <th className="p-4 font-semibold text-left">Name</th>
                                  <th className="p-4 font-semibold text-left">Yes Events</th>
                                </tr>
                              </thead>
                              <tbody>
                                {persons.map((p) => (
                                  <tr
                                    key={`${patrolKey}-${p.memberId}`}
                                    className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                                  >
                                    <td className="p-4">{p.name}</td>
                                    <td className="p-4">
                                      <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                        {p.events.map((e) => (
                                          <li key={`${p.memberId}-${e.id}`}>
                                            <div className="font-medium text-foreground">{e.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {e.startDate && e.endDate ? (
                                                <span>
                                                  {new Date(e.startDate).toLocaleDateString()} —{' '}
                                                  {new Date(e.endDate).toLocaleDateString()}
                                                </span>
                                              ) : null}
                                              {e.location ? <span> • {e.location}</span> : null}
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}

                {groupMode === 'patrolEvent' && (
                  <div className="space-y-3">
                    {patrolEventGroups.map(({ patrolKey, events }) => (
                      <Collapsible
                        key={`patrol-event-${patrolKey}`}
                        open={openPatrols.has(patrolKey)}
                        onOpenChange={() => togglePatrol(patrolKey)}
                      >
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-2xl border border-border/80 bg-card text-left font-semibold text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-colors hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          {openPatrols.has(patrolKey) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span>Unit: {getPatrolName(patrolKey)}</span>
                          <span className="text-muted-foreground font-normal text-sm ml-auto">
                            {events.length} {events.length === 1 ? 'event' : 'events'}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-2 space-y-3 mt-2">
                          {events.map((event) => {
                            const eventKey = `${patrolKey}-${event.eventId}`
                            return (
                              <Collapsible
                                key={eventKey}
                                open={openEvents.has(eventKey)}
                                onOpenChange={() => toggleEvent(eventKey)}
                              >
                                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-xl border border-primary/30 bg-primary/5 text-left font-medium text-sm text-foreground shadow-[0_6px_18px_rgba(30,64,175,0.18)] transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                  {openEvents.has(eventKey) ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span>{event.eventName}</span>
                                  {event.startDate && (
                                    <span className="text-muted-foreground font-normal text-xs">
                                      {new Date(event.startDate).toLocaleDateString()}
                                    </span>
                                  )}
                                  <span className="text-muted-foreground font-normal text-xs ml-auto">
                                    {event.people.length} {event.people.length === 1 ? 'person' : 'people'}
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="border rounded-lg overflow-hidden text-sm mt-1 ml-4">
                                    <table className="w-full text-sm">
                                      <thead className="bg-muted/30">
                                        <tr className="border-b">
                                          <th className="p-4 font-semibold text-left">Name</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {event.people.map((p) => (
                                          <tr
                                            key={`${eventKey}-${p.memberId}`}
                                            className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                                          >
                                            <td className="p-4">{p.name}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {groupMode === 'single' &&
                  sortedData.map((p) => (
                    <Card key={`m-${p.memberId}`} className="border">
                      <CardContent className="pt-4">
                        <div className="text-base font-semibold">{p.name}</div>
                        <div className="text-sm text-muted-foreground mb-2">Unit: {getPatrolName(p.patrolId)}</div>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                          {p.events.map((e) => (
                            <li key={`m-${p.memberId}-${e.id}`}>
                              <div className="font-medium text-foreground">{e.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {e.startDate && e.endDate ? (
                                  <span>
                                    {new Date(e.startDate).toLocaleDateString()} —{' '}
                                    {new Date(e.endDate).toLocaleDateString()}
                                  </span>
                                ) : null}
                                {e.location ? <span> • {e.location}</span> : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}

                {groupMode === 'patrol' &&
                  patrolGroups.map(([patrolKey, persons]) => (
                    <Collapsible
                      key={`m-group-${patrolKey}`}
                      open={openPatrols.has(patrolKey)}
                      onOpenChange={() => togglePatrol(patrolKey)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 hover:bg-muted rounded-lg font-semibold text-left">
                        {openPatrols.has(patrolKey) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>Unit: {getPatrolName(patrolKey)}</span>
                        <span className="text-muted-foreground font-normal text-sm ml-auto">{persons.length}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {persons.map((p) => (
                          <Card key={`m-${patrolKey}-${p.memberId}`} className="border">
                            <CardContent className="pt-4">
                              <div className="text-base font-semibold">{p.name}</div>
                              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                {p.events.map((e) => (
                                  <li key={`m-${p.memberId}-${e.id}`}>
                                    <div className="font-medium text-foreground">{e.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {e.startDate && e.endDate ? (
                                        <span>
                                          {new Date(e.startDate).toLocaleDateString()} —{' '}
                                          {new Date(e.endDate).toLocaleDateString()}
                                        </span>
                                      ) : null}
                                      {e.location ? <span> • {e.location}</span> : null}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}

                {groupMode === 'patrolEvent' &&
                  patrolEventGroups.map(({ patrolKey, events }) => (
                    <Collapsible
                      key={`m-group-${patrolKey}`}
                      open={openPatrols.has(patrolKey)}
                      onOpenChange={() => togglePatrol(patrolKey)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 hover:bg-muted rounded-lg font-semibold text-left">
                        {openPatrols.has(patrolKey) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>Unit: {getPatrolName(patrolKey)}</span>
                        <span className="text-muted-foreground font-normal text-sm ml-auto">
                          {events.length} {events.length === 1 ? 'event' : 'events'}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2 pl-2">
                        {events.map((event) => {
                          const eventKey = `${patrolKey}-${event.eventId}`
                          return (
                            <Collapsible
                              key={eventKey}
                              open={openEvents.has(eventKey)}
                              onOpenChange={() => toggleEvent(eventKey)}
                            >
                              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 bg-primary/10 hover:bg-primary/20 rounded-md font-medium text-left text-sm">
                                {openEvents.has(eventKey) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                <span className="truncate">{event.eventName}</span>
                                <span className="text-muted-foreground font-normal text-xs ml-auto shrink-0">
                                  {event.people.length}
                                </span>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-1 mt-1 pl-2">
                                {event.people.map((p) => (
                                  <div key={`m-${eventKey}-${p.memberId}`} className="text-sm p-2 bg-muted/30 rounded">
                                    {p.name}
                                  </div>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          )
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
