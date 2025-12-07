'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { usePerPersonAttendance } from '@/hooks/usePerPersonAttendance'
import { Skeleton } from '@/components/ui/skeleton'

export default function AttendanceByPersonPage() {
  const [groupMode, setGroupMode] = useState<'single' | 'patrol'>('single')
  const { data } = usePerPersonAttendance()

  return (
    <div className={cn('p-4 md:p-6')}>
      <Card>
        <CardHeader>
          <CardTitle className={cn('text-2xl md:text-3xl font-semibold')}>Attendance by Person</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={groupMode} onValueChange={(v) => setGroupMode(v as 'single' | 'patrol')}>
            <TabsList>
              <TabsTrigger value="single">Single List</TabsTrigger>
              <TabsTrigger value="patrol">Group by Patrol</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-4">
            {data.length === 0 ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <div className="text-sm text-muted-foreground">No aggregated attendance yet. Once summaries hydrate, people with “Yes” responses will appear here.</div>
              </div>
            ) : (
            {/* Desktop table */}
            <div className="hidden md:table w-full border rounded-lg overflow-hidden text-sm">
              <div className="table-header-group bg-muted">
                <div className="table-row">
                  <div className="table-cell p-4 font-semibold text-left">Name</div>
                  <div className="table-cell p-4 font-semibold text-left">Patrol</div>
                  <div className="table-cell p-4 font-semibold text-left">Yes Events</div>
                </div>
              </div>
              <div className="table-row-group">
                {groupMode === 'single'
                  ? data.map((p) => (
                      <div key={p.memberId} className="table-row border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                        <div className="table-cell p-4">{p.name}</div>
                        <div className="table-cell p-4 text-muted-foreground">{p.patrolId ?? '—'}</div>
                        <div className="table-cell p-4">
                          <ul className="list-disc pl-5 text-muted-foreground">
                            {p.events.map((e) => (
                              <li key={`${p.memberId}-${e.id}`}>{e.name}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))
                  : // Group by patrol
                    Object.entries(
                      data.reduce<Record<string, typeof data>>( (acc, person) => {
                        const key = String(person.patrolId ?? 'Unassigned')
                        acc[key] = acc[key] ? [...acc[key], person] : [person]
                        return acc
                      }, {})
                    ).map(([patrolKey, persons]) => (
                      <>
                        <div className="table-row bg-muted/50">
                          <div className="table-cell p-4 font-semibold" colSpan={3}>Patrol: {patrolKey}</div>
                        </div>
                        {persons.map((p) => (
                          <div key={`${patrolKey}-${p.memberId}`} className="table-row border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                            <div className="table-cell p-4">{p.name}</div>
                            <div className="table-cell p-4 text-muted-foreground">{p.patrolId ?? '—'}</div>
                            <div className="table-cell p-4">
                              <ul className="list-disc pl-5 text-muted-foreground">
                                {p.events.map((e) => (
                                  <li key={`${p.memberId}-${e.id}`}>{e.name}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </>
                    ))}
              </div>
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
                        <ul className="list-disc pl-5">
                          {p.events.map((e) => (
                            <li key={`m-${p.memberId}-${e.id}`}>{e.name}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))
                : Object.entries(
                    data.reduce<Record<string, typeof data>>( (acc, person) => {
                      const key = String(person.patrolId ?? 'Unassigned')
                      acc[key] = acc[key] ? [...acc[key], person] : [person]
                      return acc
                    }, {})
                  ).map(([patrolKey, persons]) => (
                    <div key={`m-group-${patrolKey}`} className="space-y-2">
                      <div className="text-sm font-semibold">Patrol: {patrolKey}</div>
                      {persons.map((p) => (
                        <Card key={`m-${patrolKey}-${p.memberId}`} className="border">
                          <CardHeader>
                            <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            <div className="mb-2">Patrol: {p.patrolId ?? '—'}</div>
                            <ul className="list-disc pl-5">
                              {p.events.map((e) => (
                                <li key={`m-${p.memberId}-${e.id}`}>{e.name}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
            </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
