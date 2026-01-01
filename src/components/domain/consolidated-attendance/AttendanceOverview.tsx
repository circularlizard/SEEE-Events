'use client'

import { Loader2, RefreshCw, Users as UsersIcon } from 'lucide-react'
import { useConsolidatedAttendance } from './useConsolidatedAttendance'
import { useEvents } from '@/hooks/useEvents'
import { useAttendanceHydration } from '@/hooks/useAttendanceHydration'
import { UnitSummaryGrid } from './UnitSummaryGrid'

const defaultUnitHref = (unitId: string) => `/dashboard/events/attendance/${encodeURIComponent(unitId)}`

interface AttendanceOverviewProps {
  title?: string
  buildUnitHref?: (unitId: string) => string
}

export function AttendanceOverview({ title = 'Attendance Overview', buildUnitHref }: AttendanceOverviewProps) {
  const { attendees, getPatrolName } = useConsolidatedAttendance()
  const { isLoading: eventsLoading } = useEvents()
  const { hydratedCount, totalEvents, isHydrating, failedCount, retryFailed } = useAttendanceHydration()

  const totalPeople = attendees.length
  const uniqueEventCount = new Set(attendees.flatMap((a) => a.events.map((e) => e.id))).size
  const unitHrefBuilder = buildUnitHref ?? defaultUnitHref

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-3">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UsersIcon className="h-6 w-6" aria-hidden />
          <span>{title}</span>
        </h1>
        <div className="text-sm mt-1 opacity-90 flex flex-wrap items-center gap-3">
          {eventsLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading events...</span>
            </>
          ) : isHydrating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                Loading attendance ({hydratedCount}/{totalEvents} events)...
              </span>
            </>
          ) : (
            <span>
              {totalPeople} {totalPeople === 1 ? 'person' : 'people'} across {uniqueEventCount}{' '}
              {uniqueEventCount === 1 ? 'event' : 'events'}
            </span>
          )}

          {!isHydrating && failedCount > 0 && (
            <button
              type="button"
              onClick={retryFailed}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-white/20 hover:bg-white/30 text-primary-foreground px-3 py-1 rounded"
            >
              <RefreshCw className="h-3 w-3" />
              Retry {failedCount} failed {failedCount === 1 ? 'event' : 'events'}
            </button>
          )}
        </div>
      </div>

      <UnitSummaryGrid attendees={attendees} getPatrolName={getPatrolName} buildUnitHref={unitHrefBuilder} />
    </div>
  )
}
