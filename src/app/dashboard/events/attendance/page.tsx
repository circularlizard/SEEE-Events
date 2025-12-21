'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { usePerPersonAttendance } from '@/hooks/usePerPersonAttendance'
import { usePatrolMap } from '@/hooks/usePatrolMap'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronRight, Users as UsersIcon } from 'lucide-react'

type PersonAttendance = ReturnType<typeof usePerPersonAttendance>['data'][number]

/** Sort data alphabetically by name (case-insensitive) */
function sortByName<T extends { name: string }>(data: T[]): T[] {
  return [...data].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

/** Helper to group data by patrol (Patrol → Person → Events) */
function groupByPatrol(data: PersonAttendance[]) {
  const sorted = sortByName(data)
  const groups = sorted.reduce<Record<string, PersonAttendance[]>>((acc, person) => {
    const key = String(person.patrolId ?? 'Unassigned')
    acc[key] = acc[key] ? [...acc[key], person] : [person]
    return acc
  }, {})
  // Sort patrol keys alphabetically
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

/** Helper to group data by patrol and event (Patrol → Event → People) */
function groupByPatrolAndEvent(data: PersonAttendance[]) {
  const sorted = sortByName(data)
  
  // First group by patrol
  const patrolGroups: Record<string, Record<string, { eventName: string; startDate?: string; people: PersonAttendance[] }>> = {}
  
  for (const person of sorted) {
    const patrolKey = String(person.patrolId ?? 'Unassigned')
    if (!patrolGroups[patrolKey]) {
      patrolGroups[patrolKey] = {}
    }
    
    for (const event of person.events) {
      const eventKey = event.id
      if (!patrolGroups[patrolKey][eventKey]) {
        patrolGroups[patrolKey][eventKey] = {
          eventName: event.name,
          startDate: event.startDate,
          people: []
        }
      }
      patrolGroups[patrolKey][eventKey].people.push(person)
    }
  }
  
  // Convert to sorted array structure
  return Object.entries(patrolGroups)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([patrolKey, events]) => ({
      patrolKey,
      events: Object.entries(events)
        .map(([eventId, eventData]) => ({
          eventId,
          ...eventData
        }))
        // Sort events by start date (soonest first)
        .sort((a, b) => {
          if (!a.startDate && !b.startDate) return 0
          if (!a.startDate) return 1
          if (!b.startDate) return -1
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        })
    }))
}

type GroupMode = 'single' | 'patrol' | 'patrolEvent'

export default function AttendanceByPersonPage() {
  const [groupMode, setGroupMode] = useState<GroupMode>('patrol')
  const [openPatrols, setOpenPatrols] = useState<Set<string>>(new Set())
  const [openEvents, setOpenEvents] = useState<Set<string>>(new Set())
  const { data } = usePerPersonAttendance()
  const { getPatrolName } = usePatrolMap()
  
  const togglePatrol = (patrolKey: string) => {
    setOpenPatrols(prev => {
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
    setOpenEvents(prev => {
      const next = new Set(prev)
      if (next.has(eventKey)) {
        next.delete(eventKey)
      } else {
        next.add(eventKey)
      }
      return next
    })
  }
  
  // Memoize grouped data
  const sortedData = useMemo(() => sortByName(data), [data])
  const patrolGroups = useMemo(() => groupByPatrol(data), [data])
  const patrolEventGroups = useMemo(() => groupByPatrolAndEvent(data), [data])
  
  const expandAll = () => {
    const allPatrolKeys = patrolGroups.map(([key]) => key)
    setOpenPatrols(new Set(allPatrolKeys))
    
    if (groupMode === 'patrolEvent') {
      const allEventKeys = patrolEventGroups.flatMap(pg => 
        pg.events.map(e => `${pg.patrolKey}-${e.eventId}`)
      )
      setOpenEvents(new Set(allEventKeys))
    }
  }
  
  const collapseAll = () => {
    setOpenPatrols(new Set())
    setOpenEvents(new Set())
  }

  return (
    <div className={cn('p-4 md:p-6')}>
      <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" aria-hidden />
            <span>Attendance by Person</span>
          </h1>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <RadioGroup value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)} className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="group-single" />
                <Label htmlFor="group-single">Single List</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="patrol" id="group-patrol" />
                <Label htmlFor="group-patrol">By Patrol</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="patrolEvent" id="group-patrol-event" />
                <Label htmlFor="group-patrol-event">By Patrol &amp; Event</Label>
              </div>
            </RadioGroup>
            {(groupMode === 'patrol' || groupMode === 'patrolEvent') && data.length > 0 && (
              <div className="flex gap-2 text-sm">
                <button onClick={expandAll} className="text-primary hover:underline">Expand All</button>
                <span className="text-muted-foreground">|</span>
                <button onClick={collapseAll} className="text-primary hover:underline">Collapse All</button>
              </div>
            )}
          </div>
          <div className="mt-4">
            {data.length === 0 ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <div className="text-sm text-muted-foreground">No aggregated attendance yet. Once summaries hydrate, people with “Yes” responses will appear here.</div>
              </div>
            ) : (
            <>
            {/* Desktop view */}
            <div className="hidden md:block">
              {groupMode === 'single' && (
                // Single list - table layout
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr className="border-b">
                        <th className="p-4 font-semibold text-left">Name</th>
                        <th className="p-4 font-semibold text-left">Patrol</th>
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
                                        {new Date(e.startDate).toLocaleDateString()} — {new Date(e.endDate).toLocaleDateString()}
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
                // Group by patrol - collapsible sections (Patrol → Person → Events)
                <div className="space-y-2">
                  {patrolGroups.map(([patrolKey, persons]) => (
                    <Collapsible
                      key={`patrol-${patrolKey}`}
                      open={openPatrols.has(patrolKey)}
                      onOpenChange={() => togglePatrol(patrolKey)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 hover:bg-muted rounded-lg font-semibold text-left">
                        {openPatrols.has(patrolKey) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>Patrol: {getPatrolName(patrolKey)}</span>
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
                                <tr key={`${patrolKey}-${p.memberId}`} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                                  <td className="p-4">{p.name}</td>
                                  <td className="p-4">
                                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                      {p.events.map((e) => (
                                        <li key={`${p.memberId}-${e.id}`}>
                                          <div className="font-medium text-foreground">{e.name}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {e.startDate && e.endDate ? (
                                              <span>
                                                {new Date(e.startDate).toLocaleDateString()} — {new Date(e.endDate).toLocaleDateString()}
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
                // Group by patrol and event - nested collapsible sections (Patrol → Event → People)
                <div className="space-y-2">
                  {patrolEventGroups.map(({ patrolKey, events }) => (
                    <Collapsible
                      key={`patrol-${patrolKey}`}
                      open={openPatrols.has(patrolKey)}
                      onOpenChange={() => togglePatrol(patrolKey)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 hover:bg-muted rounded-lg font-semibold text-left">
                        {openPatrols.has(patrolKey) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>Patrol: {getPatrolName(patrolKey)}</span>
                        <span className="text-muted-foreground font-normal text-sm ml-auto">
                          {events.length} {events.length === 1 ? 'event' : 'events'}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 space-y-2 mt-2">
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
                                <div className="border rounded-lg overflow-hidden text-sm mt-1 ml-2">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted/30">
                                      <tr className="border-b">
                                        <th className="p-4 font-semibold text-left">Name</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {event.people.map((p) => (
                                        <tr key={`${eventKey}-${p.memberId}`} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
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
              {groupMode === 'single' && sortedData.map((p) => (
                <Card key={`m-${p.memberId}`} className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <div className="mb-2">Patrol: {getPatrolName(p.patrolId)}</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {p.events.map((e) => (
                        <li key={`m-${p.memberId}-${e.id}`}>
                          <div className="font-medium text-foreground">{e.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.startDate && e.endDate ? (
                              <span>
                                {new Date(e.startDate).toLocaleDateString()} — {new Date(e.endDate).toLocaleDateString()}
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
              
              {groupMode === 'patrol' && patrolGroups.map(([patrolKey, persons]) => (
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
                    <span>Patrol: {getPatrolName(patrolKey)}</span>
                    <span className="text-muted-foreground font-normal text-sm ml-auto">
                      {persons.length}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {persons.map((p) => (
                      <Card key={`m-${patrolKey}-${p.memberId}`} className="border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground pt-0">
                          <ul className="list-disc pl-5 space-y-1">
                            {p.events.map((e) => (
                              <li key={`m-${p.memberId}-${e.id}`}>
                                <div className="font-medium text-foreground">{e.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {e.startDate && e.endDate ? (
                                    <span>
                                      {new Date(e.startDate).toLocaleDateString()} — {new Date(e.endDate).toLocaleDateString()}
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
              
              {groupMode === 'patrolEvent' && patrolEventGroups.map(({ patrolKey, events }) => (
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
                    <span>Patrol: {getPatrolName(patrolKey)}</span>
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
    </div>
  )
}
