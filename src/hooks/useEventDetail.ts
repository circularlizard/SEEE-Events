import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { getEventDetails, getEventSummary } from '@/lib/api'
import { useStore } from '@/store/use-store'
import { eventDetailKeys } from '@/lib/query-keys'

interface EventDetailData {
  details: unknown
  summary: unknown
}

export function useEventDetail(eventId: number) {
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const currentApp = useStore((state) => state.currentApp)
  const app = currentApp || 'expedition'
  const queryClient = useQueryClient()

  // Note: We don't include termId in the query key because event details
  // are fetched by eventId alone and don't vary by term. Including termId
  // would cause unnecessary refetches when the section/term changes.
  const query = useQuery<EventDetailData>({
    queryKey: eventDetailKeys.detail(app, eventId),
    queryFn: async ({ signal }) => {
      const [details, summary] = await Promise.all([
        getEventDetails(eventId, signal),
        getEventSummary(eventId, signal),
      ])

      return { details, summary }
    },
    enabled: isAuthenticated && !!eventId,
  })

  // Also populate the event-summary cache so usePerPersonAttendance can aggregate across events
  useEffect(() => {
    if (query.data?.summary && eventId) {
      queryClient.setQueryData(['event-summary', eventId], query.data.summary)
    }
  }, [query.data?.summary, eventId, queryClient])

  return query
}
