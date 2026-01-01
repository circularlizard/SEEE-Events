'use client'

import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { PersonAttendance } from '@/hooks/usePerPersonAttendance'
import { UnitSummaryCard } from './UnitSummaryCard'

interface UnitSummary {
  unitId: string
  unitName: string
  peopleCount: number
  eventCount: number
  eventIds: Set<number>
}

interface UnitSummaryGridProps {
  attendees: PersonAttendance[]
  getPatrolName: (patrolId: number | string | null | undefined) => string
}

export function UnitSummaryGrid({ attendees, getPatrolName }: UnitSummaryGridProps) {
  const unitSummaries = useMemo(() => {
    const summaryMap = new Map<string, UnitSummary>()

    for (const person of attendees) {
      const unitId = String(person.patrolId ?? 'unassigned')
      const unitName = getPatrolName(person.patrolId)

      if (!summaryMap.has(unitId)) {
        summaryMap.set(unitId, {
          unitId,
          unitName,
          peopleCount: 0,
          eventCount: 0,
          eventIds: new Set(),
        })
      }

      const summary = summaryMap.get(unitId)!
      summary.peopleCount += 1

      for (const event of person.events) {
        summary.eventIds.add(event.id)
      }
    }

    // Convert eventIds Set to eventCount
    const results = Array.from(summaryMap.values()).map((s) => ({
      unitId: s.unitId,
      unitName: s.unitName,
      peopleCount: s.peopleCount,
      eventCount: s.eventIds.size,
    }))

    // Sort: Unassigned last, then alphabetically by name
    return results.sort((a, b) => {
      if (a.unitId === 'unassigned') return 1
      if (b.unitId === 'unassigned') return -1
      return a.unitName.localeCompare(b.unitName, undefined, { sensitivity: 'base' })
    })
  }, [attendees, getPatrolName])

  if (attendees.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          No attendance data yet. Visit event detail pages to populate the cache.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {unitSummaries.map((unit) => (
        <UnitSummaryCard
          key={unit.unitId}
          unitId={unit.unitId}
          unitName={unit.unitName}
          peopleCount={unit.peopleCount}
          eventCount={unit.eventCount}
        />
      ))}
    </div>
  )
}
