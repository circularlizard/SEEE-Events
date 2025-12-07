import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getEventSummary, APIError } from '@/lib/api'

type QueueItem = { id: number }

/**
 * Event Summary Queue
 * - Enqueue event IDs to progressively fetch summaries
 * - Processes with limited concurrency and delay to respect rate limits
 * - Retries softly on 429 with backoff; aborts on 503 (hard lock)
 */
export function useEventSummaryQueue(options?: {
  concurrency?: number
  delayMs?: number
  retryBackoffMs?: number
}) {
  const queryClient = useQueryClient()
  const queueRef = useRef<QueueItem[]>([])
  const runningRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const concurrency = options?.concurrency ?? 2
  const delayMs = options?.delayMs ?? 800
  const retryBackoffMs = options?.retryBackoffMs ?? 5000

  const enqueue = useCallback((eventIds: Array<string | number>) => {
    const items = eventIds
      .map((e) => Number(e))
      .filter((n) => !!n)
      .map((n) => ({ id: n }))
    queueRef.current.push(...items)
    if (process.env.NODE_ENV !== 'production') {
      // Log enqueue activity
      const snapshot = queueRef.current.map((q) => q.id)
      console.debug('[SummaryQueue] Enqueued IDs count:', items.length, 'Total in queue:', snapshot.length, 'IDs:', snapshot)
    }
    start()
  }, [])

  const start = useCallback(() => {
    if (timerRef.current != null) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timerRef.current = (setInterval(tick, delayMs) as any) as number
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[SummaryQueue] Timer started with delay(ms):', delayMs, 'Concurrency:', concurrency)
    }
    // Immediate tick to avoid waiting for the first interval
    setTimeout(() => {
      // call tick without capturing it in deps to avoid init order issues
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (tick as unknown as () => Promise<void>)()
    }, 0)
  }, [delayMs, concurrency])

  const stop = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const tick = useCallback(async () => {
    // Drain up to concurrency slots in a single tick
    let started = 0
    while (runningRef.current < concurrency) {
      const next = queueRef.current.shift()
      if (!next) break
      started += 1
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[SummaryQueue] Starting fetch for event ID:', next.id, 'Running:', runningRef.current + 1)
      }
      runningRef.current += 1
      // Fire and forget; each task handles its own completion
      ;(async () => {
        try {
          await queryClient.prefetchQuery({
            queryKey: ['event-summary', next.id],
            queryFn: () => getEventSummary(next.id),
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
          })
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[SummaryQueue] Success for event ID:', next.id)
          }
        } catch (err) {
          const apiErr = err as APIError
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[SummaryQueue] Error for event ID:', next.id, 'Status:', apiErr?.status, 'Message:', (apiErr as any)?.message ?? apiErr)
          }
          if (apiErr?.status === 429) {
            // Soft lock: re-enqueue with backoff
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[SummaryQueue] Rate limited (429). Re-enqueueing with backoff ms:', retryBackoffMs, 'ID:', next.id)
            }
            setTimeout(() => {
              queueRef.current.unshift(next)
              if (process.env.NODE_ENV !== 'production') {
                const snapshot = queueRef.current.map((q) => q.id)
                console.debug('[SummaryQueue] Re-enqueued ID to front. Queue snapshot:', snapshot)
              }
              start()
            }, retryBackoffMs)
          }
          // For 503 (hard lock) or other errors, drop for now.
        } finally {
          runningRef.current -= 1
          if (process.env.NODE_ENV !== 'production') {
            const snapshot = queueRef.current.map((q) => q.id)
            console.debug('[SummaryQueue] Finished processing ID:', next.id, 'Running now:', runningRef.current, 'Remaining queue:', snapshot)
          }
          // If queue drained and no tasks running, stop timer
          if (queueRef.current.length === 0 && runningRef.current === 0) {
            stop()
          }
          // If there are still items and slots available, kick another tick immediately
          if (queueRef.current.length > 0 && runningRef.current < concurrency) {
            setTimeout(() => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              (tick as unknown as () => Promise<void>)()
            }, 0)
          }
          // If timer somehow stopped but queue still has items, restart
          if (queueRef.current.length > 0 && timerRef.current == null) {
            start()
          }
        }
      })()
    }
    if (started === 0) {
      // Nothing started in this tick; if queue empty, stop
      if (queueRef.current.length === 0) {
        stop()
      }
    }
  }, [concurrency, queryClient, retryBackoffMs, start, stop])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  const getState = useCallback(() => {
    return {
      queue: queueRef.current.map((q) => q.id),
      running: runningRef.current,
      timerActive: timerRef.current != null,
      settings: { concurrency, delayMs, retryBackoffMs },
    }
  }, [concurrency, delayMs, retryBackoffMs])

  return { enqueue, getState }
}
