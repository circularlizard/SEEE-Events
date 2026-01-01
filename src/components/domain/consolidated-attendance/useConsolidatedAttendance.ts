import { usePerPersonAttendance } from '@/hooks/usePerPersonAttendance'
import { usePatrolMap } from '@/hooks/usePatrolMap'

/**
 * Shared hook that combines aggregated per-person attendance with patrol metadata.
 * Keeps Expedition Viewer and Expedition Planner aligned on the same datasource.
 */
export function useConsolidatedAttendance() {
  const { data: attendees } = usePerPersonAttendance()
  const { getPatrolName, isLoading: patrolsLoading, error: patrolsError } = usePatrolMap()

  return {
    attendees,
    getPatrolName,
    patrolsLoading,
    patrolsError,
  }
}
