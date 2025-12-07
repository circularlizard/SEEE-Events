'use client'

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useEvents } from '@/hooks/useEvents'
import { useStore } from '@/store/use-store'

export default function SummaryQueueBanner() {
  const qc = useQueryClient()
  const currentSection = useStore((s) => s.currentSection)
  const selectedSections = useStore((s) => s.selectedSections)
  const { data } = useEvents()

  const { total, completed, pending } = useMemo(() => {
    const events = (data?.items as any[]) ?? []
    const eventIds = events.map((e) => Number(e?.eventid)).filter(Boolean)

    const summaries = qc.getQueryCache().findAll({ queryKey: ['event-summary'] })
    const completedIds = new Set(
      summaries
        .map((q) => (q.state.data as any)?.meta?.event?.id)
        .filter((id) => typeof id === 'number')
    )

    const completed = eventIds.filter((id) => completedIds.has(id)).length
    const total = eventIds.length
    const pending = Math.max(total - completed, 0)
    return { total, completed, pending }
  }, [qc, data])

  const loadingCount = useMemo(() => {
    const loading = qc.getQueryCache()
      .findAll({ queryKey: ['event-summary'] })
      .filter((q) => q.state.status === 'loading').length
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