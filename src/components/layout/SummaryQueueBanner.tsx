'use client'

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useEvents } from '@/hooks/useEvents'
import { useStore } from '@/store/use-store'
import type { Event } from '@/lib/schemas'

export default function SummaryQueueBanner() {
  const qc = useQueryClient()
  const currentSection = useStore((s) => s.currentSection)
  const selectedSections = useStore((s) => s.selectedSections)
  const { data } = useEvents()

  const { total, completed, pending } = useMemo(() => {
    const events: Event[] = data?.items ?? []
    const eventIds = events.map((e) => Number(e?.eventid)).filter(Boolean)

    const summaries = qc.getQueryCache().findAll({ queryKey: ['event-summary'] })
    
    const completedIds = new Set(
      summaries
        .filter(q => q.state.status === 'success' && q.state.data) // Only count successful queries with data
        .map((q) => {
          const stateData = q.state.data as { meta?: { event?: { id?: number } } } | undefined
          const fromData = stateData?.meta?.event?.id
          const fromKey = Array.isArray(q.queryKey) ? q.queryKey[1] : undefined
          // Convert to number if it's a string
          const idFromData = typeof fromData === 'number' ? fromData : undefined
          const idFromKey = typeof fromKey === 'number' ? fromKey : 
                           (typeof fromKey === 'string' ? parseInt(fromKey, 10) : undefined)
          return idFromData ?? idFromKey
        })
        .filter((id): id is number => typeof id === 'number' && !isNaN(id))
    )
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Banner] Completed IDs:', Array.from(completedIds), 'from', summaries.length, 'queries')
    }

    const completed = eventIds.filter((id) => completedIds.has(id)).length
    const total = eventIds.length
    const pending = Math.max(total - completed, 0)
    if (process.env.NODE_ENV !== 'production') {
      const loadingIds = qc.getQueryCache()
        .findAll({ queryKey: ['event-summary'] })
        .filter((q) => q.state.status === 'pending')
        .map((q) => (q.queryKey?.[1] as number))
        .filter(Boolean)
      console.debug('[SummaryQueueBanner] Totals -> total:', total, 'completed:', completed, 'pending:', pending, 'eventIds:', eventIds)
      console.debug('[SummaryQueueBanner] Loading IDs:', loadingIds)
    }
    return { total, completed, pending }
  }, [qc, data])

  const loadingCount = useMemo(() => {
    const loading = qc.getQueryCache()
      .findAll({ queryKey: ['event-summary'] })
      .filter((q) => q.state.status === 'pending').length
    return loading
  }, [qc])

  const isComplete = total > 0 && pending === 0

  return (
    <div
      className={cn(
        'w-full px-4 py-2 text-sm flex items-center justify-between',
        isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      )}
    >
      <div className="flex items-center gap-2">
        {!isComplete && (
          <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-label="Loading" />
        )}
        <span>
          {(currentSection?.sectionName || (selectedSections && selectedSections.length > 0)) ? (
            <>Event summaries: {completed}/{total} completed</>
          ) : (
            <>Select a section to start hydration</>
          )}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>Pending: {pending}</span>
        {loadingCount > 0 && <span>Fetching: {loadingCount}</span>}
        <span className="text-muted-foreground">Events: {data?.items?.length ?? 0}</span>
      </div>
    </div>
  )
}