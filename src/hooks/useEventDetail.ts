import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getEventDetails, getEventSummary } from '@/lib/api'
import { useStore } from '@/store/use-store'
import { eventDetailKeys } from '@/lib/query-keys'

interface EventDetailData {
  details: unknown
  summary: unknown
}

export function useEventDetail(eventId: number) {
  const currentSection = useStore((state) => state.currentSection)
  const currentApp = useStore((state) => state.currentApp)
  const app = currentApp || 'expedition'
  const queryClient = useQueryClient()

  const query = useQuery<EventDetailData>({
    queryKey: eventDetailKeys.detail(app, eventId, currentSection?.termId),
    queryFn: async ({ signal }) => {
      const [details, summary] = await Promise.all([
        getEventDetails(eventId, signal),
        getEventSummary(eventId, signal),
      ])

      return { details, summary }
    },
    enabled: !!eventId,
  })

  // Also populate the event-summary cache so usePerPersonAttendance can aggregate across events
  useEffect(() => {
    if (query.data?.summary && eventId) {
      queryClient.setQueryData(['event-summary', eventId], query.data.summary)
    }
  }, [query.data?.summary, eventId, queryClient])

  return query
}
