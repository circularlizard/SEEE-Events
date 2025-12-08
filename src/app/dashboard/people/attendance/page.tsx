'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { usePerPersonAttendance } from '@/hooks/usePerPersonAttendance'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronRight } from 'lucide-react'

/** Helper to group data by patrol */
function groupByPatrol(data: ReturnType<typeof usePerPersonAttendance>['data']) {
  return Object.entries(
    data.reduce<Record<string, typeof data>>((acc, person) => {
      const key = String(person.patrolId ?? 'Unassigned')
      acc[key] = acc[key] ? [...acc[key], person] : [person]
      return acc
    }, {})
  )
}

export default function AttendanceByPersonPage() {
  const [groupMode, setGroupMode] = useState<'single' | 'patrol'>('single')
  const [openPatrols, setOpenPatrols] = useState<Set<string>>(new Set())
  const { data } = usePerPersonAttendance()
  
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
  
  const expandAll = () => {
    const allKeys = groupByPatrol(data).map(([key]) => key)
    setOpenPatrols(new Set(allKeys))
  }
  
  const collapseAll = () => {
    setOpenPatrols(new Set())
  }

  return (
    <div className={cn('p-4 md:p-6')}>
      <Card>
        <CardHeader>
          <CardTitle className={cn('text-2xl md:text-3xl font-semibold')}>Attendance by Person</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <RadioGroup value={groupMode} onValueChange={(v) => setGroupMode(v as 'single' | 'patrol')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="group-single" />
                <Label htmlFor="group-single">Single List</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="patrol" id="group-patrol" />
                <Label htmlFor="group-patrol">Group by Patrol</Label>
              </div>
            </RadioGroup>
            {groupMode === 'patrol' && data.length > 0 && (
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
              {groupMode === 'single' ? (
                // Single list - table layout
                <div className="table w-full border rounded-lg overflow-hidden text-sm">
                  <div className="table-header-group bg-muted">
                    <div className="table-row">
                      <div className="table-cell p-4 font-semibold text-left">Name</div>
                      <div className="table-cell p-4 font-semibold text-left">Patrol</div>
                      <div className="table-cell p-4 font-semibold text-left">Yes Events</div>
                    </div>
                  </div>
                  <div className="table-row-group">
                    {data.map((p) => (
                      <div key={p.memberId} className="table-row border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                        <div className="table-cell p-4">{p.name}</div>
                        <div className="table-cell p-4 text-muted-foreground">{p.patrolId ?? '—'}</div>
                        <div className="table-cell p-4">
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Group by patrol - collapsible sections
                <div className="space-y-2">
                  {groupByPatrol(data).map(([patrolKey, persons]) => (
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
                        <span>Patrol: {patrolKey}</span>
                        <span className="text-muted-foreground font-normal text-sm ml-auto">
                          {persons.length} {persons.length === 1 ? 'person' : 'people'}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="table w-full border rounded-lg overflow-hidden text-sm mt-2">
                          <div className="table-header-group bg-muted/30">
                            <div className="table-row">
                              <div className="table-cell p-3 font-semibold text-left">Name</div>
                              <div className="table-cell p-3 font-semibold text-left">Yes Events</div>
                            </div>
                          </div>
                          <div className="table-row-group">
                            {persons.map((p) => (
                              <div key={`${patrolKey}-${p.memberId}`} className="table-row border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                                <div className="table-cell p-3">{p.name}</div>
                                <div className="table-cell p-3">
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
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {groupMode === 'single'
                ? data.map((p) => (
                    <Card key={`m-${p.memberId}`} className="border">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        <div className="mb-2">Patrol: {p.patrolId ?? '—'}</div>
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
                  ))
                : groupByPatrol(data).map(([patrolKey, persons]) => (
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
                        <span>Patrol: {patrolKey}</span>
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
            </div>
            </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
