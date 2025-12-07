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
    start()
  }, [])

  const start = useCallback(() => {
    if (timerRef.current != null) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timerRef.current = (setInterval(tick, delayMs) as any) as number
  }, [delayMs])

  const stop = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const tick = useCallback(async () => {
    if (runningRef.current >= concurrency) return
    const next = queueRef.current.shift()
    if (!next) {
      stop()
      return
    }
    runningRef.current += 1
    try {
      await queryClient.prefetchQuery({
        queryKey: ['event-summary', next.id],
        queryFn: () => getEventSummary(next.id),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
      })
    } catch (err) {
      const apiErr = err as APIError
      if (apiErr?.status === 429) {
        // Soft lock: re-enqueue with backoff
        setTimeout(() => {
          queueRef.current.unshift(next)
          start()
        }, retryBackoffMs)
      }
      // For 503 (hard lock) or other errors, drop for now.
    } finally {
      runningRef.current -= 1
    }
  }, [concurrency, queryClient, retryBackoffMs, start, stop])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return { enqueue }
}
