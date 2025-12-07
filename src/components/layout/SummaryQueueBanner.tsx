'use client'

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export default function SummaryQueueBanner() {
  const qc = useQueryClient()

  const { total, completed, pending } = useMemo(() => {
    const allEventListQuery = qc.getQueryCache().find({ queryKey: ['events'] })
    const events = (allEventListQuery?.state.data as any[]) ?? []
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
  }, [qc])

  const isComplete = total > 0 && pending === 0

  return (
    <div
      className={cn(
        'w-full px-4 py-2 text-sm flex items-center justify-between',
        isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      )}
    >
      <span>
        Event summaries: {completed}/{total} completed
      </span>
      <span>
        Queue pending: {pending}
      </span>
    </div>
  )
}