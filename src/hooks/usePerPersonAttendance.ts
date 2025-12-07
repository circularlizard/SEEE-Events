import { useMemo } from 'react'

// TODO: Replace with actual cache access from useEventSummaryCache and store selectors
interface EventMeta {
  id: number
  name: string
  startDate?: string
  endDate?: string
  location?: string
}

interface PersonAttendance {
  memberId: number
  name: string
  patrolId?: number | null
  events: EventMeta[]
}

export function usePerPersonAttendance() {
  // TODO: Read hydrated summaries and aggregate: meta.event.members where attending === 'yes'
  // Respect access control selectors (admin vs standard)
  const data: PersonAttendance[] = useMemo(() => {
    return []
  }, [])

  return { data }
}
