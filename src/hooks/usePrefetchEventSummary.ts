import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getEventSummary } from '@/lib/api'
import { useStore } from '@/store/use-store'
import { eventSummaryKeys } from '@/lib/query-keys'

/**
 * Prefetch a single event summary using TanStack Query.
 * - Uses a conservative staleTime to avoid repeat calls
 * - Lets proxy safety layer enforce server-side rate limits
 * - Also populates legacy ['event-summary', id] key for usePerPersonAttendance
 */
export function usePrefetchEventSummary() {
  const queryClient = useQueryClient()
  const currentApp = useStore((state) => state.currentApp)
  const app = currentApp || 'expedition'

  return useCallback(
    async (eventId: string | number) => {
      const id = Number(eventId)
      if (!id) return

      const summary = await queryClient.fetchQuery({
        queryKey: eventSummaryKeys.detail(app, id),
        queryFn: () => getEventSummary(id),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
      })

      const normalized = ensureEventId(summary, id)

      queryClient.setQueryData(eventSummaryKeys.detail(app, id), normalized)
      queryClient.setQueryData(['event-summary', id], normalized)
    },
    [queryClient, app]
  )
}

function ensureEventId(summary: unknown, eventId: number) {
  if (!summary || typeof summary !== 'object') {
    return summary
  }

  const meta = (summary as Record<string, any>).meta ?? {}
  const event = meta.event ?? {}

  return {
    ...(summary as Record<string, any>),
    meta: {
      ...meta,
      event: {
        ...event,
        eventid: eventId,
        id: eventId,
      },
    },
  }
}
