import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store/use-store'
import { getEventSummary, APIError } from '@/lib/api'

/**
 * Central Queue Processor Hook
 * 
 * Manages the event summary prefetch queue with concurrency control.
 * Should be mounted once in the application (typically in ClientShell or layout).
 * 
 * Features:
 * - Processes queue items with configurable concurrency
 * - Handles rate limiting (429) with backoff and retry
 * - Stops processing when queue is empty
 * - Integrates with TanStack Query for caching
 */
export function useQueueProcessor(options?: {
  concurrency?: number
  delayMs?: number
  retryBackoffMs?: number
}) {
  const queryClient = useQueryClient()
  const queueItems = useStore((s) => s.queueItems)
  const queueRunning = useStore((s) => s.queueRunning)
  const queueTimerActive = useStore((s) => s.queueTimerActive)
  const dequeueItem = useStore((s) => s.dequeueItem)
  const setQueueRunning = useStore((s) => s.setQueueRunning)
  const setQueueTimerActive = useStore((s) => s.setQueueTimerActive)
  const enqueueItems = useStore((s) => s.enqueueItems)

  const concurrency = options?.concurrency ?? 2
  const delayMs = options?.delayMs ?? 800
  const retryBackoffMs = options?.retryBackoffMs ?? 5000

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const runningCountRef = useRef(0)

  const processItem = async (id: number) => {
    runningCountRef.current += 1
    setQueueRunning(runningCountRef.current)

    if (process.env.NODE_ENV !== 'production') {
      console.log('[QueueProcessor] Starting fetch for event ID:', id, 'Running:', runningCountRef.current)
    }

    try {
      await queryClient.prefetchQuery({
        queryKey: ['event-summary', id],
        queryFn: () => getEventSummary(id),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
      })

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[QueueProcessor] Success for event ID:', id)
      }
    } catch (err) {
      const apiErr = err as APIError

      if (process.env.NODE_ENV !== 'production') {
        console.warn('[QueueProcessor] Error for event ID:', id, 'Status:', apiErr?.status, 'Message:', apiErr?.message ?? String(apiErr))
      }

      if (apiErr?.status === 429) {
        // Soft lock: re-enqueue with backoff
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[QueueProcessor] Rate limited (429). Re-enqueueing with backoff ms:', retryBackoffMs, 'ID:', id)
        }
        setTimeout(() => {
          enqueueItems([id])
        }, retryBackoffMs)
      }
      // For 503 (hard lock) or other errors, drop for now
    } finally {
      runningCountRef.current -= 1
      setQueueRunning(runningCountRef.current)

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[QueueProcessor] Finished processing ID:', id, 'Running now:', runningCountRef.current, 'Queue length:', useStore.getState().queueItems.length)
      }
    }
  }

  const tick = useCallback(() => {
    const currentState = useStore.getState()
    if (process.env.NODE_ENV !== 'production') {
      console.log('[QueueProcessor] Tick - Queue:', currentState.queueItems.length, 'Running:', runningCountRef.current, 'Capacity:', concurrency)
    }
    
    // Start new items up to concurrency limit
    while (runningCountRef.current < concurrency) {
      const state = useStore.getState() // Fresh state on each iteration
      if (state.queueItems.length === 0) break
      
      const id = dequeueItem()
      if (id === null) break
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[QueueProcessor] Dequeued ID:', id, 'Now starting fetch')
      }
      
      // Fire and forget
      processItem(id)
    }

    // Stop timer if queue is empty and nothing running
    const finalState = useStore.getState()
    if (finalState.queueItems.length === 0 && runningCountRef.current === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
        setQueueTimerActive(false)
        
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[QueueProcessor] Queue empty, timer stopped')
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- processItem uses refs and stable store functions
  }, [concurrency, dequeueItem, setQueueTimerActive])

  // Effect: Start timer when queue gets items
  useEffect(() => {
    const hasItems = queueItems.length > 0
    const hasTimer = !!timerRef.current

    if (process.env.NODE_ENV !== 'production') {
      console.log('[QueueProcessor] Effect triggered. Queue:', queueItems.length, 'Timer active:', hasTimer)
    }

    // Only start timer if we have items and no timer running
    if (hasItems && !hasTimer) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[QueueProcessor] Starting timer. Queue length:', queueItems.length, 'Delay(ms):', delayMs, 'Concurrency:', concurrency)
      }

      timerRef.current = setInterval(tick, delayMs)
      setQueueTimerActive(true)

      // Immediate first tick
      tick()
    }
    // Note: We do NOT clear the timer here on re-render
    // The timer manages its own lifecycle in the tick() function
  }, [queueItems.length, concurrency, delayMs, setQueueTimerActive, tick])

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[QueueProcessor] Component unmounting, cleaning up timer')
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
        setQueueTimerActive(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setQueueTimerActive is stable from Zustand
  }, [])

  // Return queue state for debugging
  return {
    queueLength: queueItems.length,
    running: queueRunning,
    timerActive: queueTimerActive,
  }
}
