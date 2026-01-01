'use client'

import { Users as UsersIcon, Loader2, RefreshCw } from 'lucide-react'
import { useConsolidatedAttendance } from '@/components/domain/consolidated-attendance/useConsolidatedAttendance'
import { UnitSummaryGrid } from '@/components/domain/consolidated-attendance/UnitSummaryGrid'
import { useAttendanceHydration } from '@/hooks/useAttendanceHydration'
import { useEvents } from '@/hooks/useEvents'

export default function AttendanceByPersonPage() {
  const { attendees, getPatrolName } = useConsolidatedAttendance()
  const { events, isLoading: eventsLoading } = useEvents()
  const {
    hydratedCount,
    totalEvents: hydrationEventTotal,
    isHydrating,
    failedCount,
    retryFailed,
  } = useAttendanceHydration()

  const totalPeople = attendees.length
  const uniqueEventCount = new Set(attendees.flatMap((a) => a.events.map((e) => e.id))).size

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 rounded-lg bg-primary text-primary-foreground px-4 py-3">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UsersIcon className="h-6 w-6" aria-hidden />
          <span>Attendance Overview</span>
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
                Loading attendance ({hydratedCount}/{hydrationEventTotal} events)...
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

      <UnitSummaryGrid attendees={attendees} getPatrolName={getPatrolName} />
    </div>
  )
}
