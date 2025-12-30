import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getEventSummary } from '@/lib/api'
import { useStore } from '@/store/use-store'
import { eventSummaryKeys } from '@/lib/query-keys'

/**
 * Prefetch a single event summary using TanStack Query.
 * - Uses a conservative staleTime to avoid repeat calls
 * - Lets proxy safety layer enforce server-side rate limits
 */
export function usePrefetchEventSummary() {
  const queryClient = useQueryClient()
  const currentApp = useStore((state) => state.currentApp)
  const app = currentApp || 'expedition'

  return useCallback(
    async (eventId: string | number) => {
      const id = Number(eventId)
      if (!id) return
      await queryClient.prefetchQuery({
        queryKey: eventSummaryKeys.detail(app, id),
        queryFn: () => getEventSummary(id),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
      })
    },
    [queryClient, app]
  )
}
