import { useQueries, useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { getEvents } from '@/lib/api'
import { useStore } from '@/store/use-store'
import type { EventsResponse, Event } from '@/lib/schemas'
import { eventsKeys } from '@/lib/query-keys'

/**
 * @deprecated Use eventsKeys from @/lib/query-keys instead
 * Kept for backward compatibility during migration
 */
export const legacyEventsKeys = {
  all: ['events'] as const,
  section: (sectionId: string, termId: string) => ['events', sectionId, termId] as const,
}

/**
 * TanStack Query hook for fetching events list
 * 
 * This is the **single source of truth** for events data.
 * React Query manages caching, deduplication, and background refetching.
 * 
 * Features:
 * - Supports multiple section selection with parallel queries
 * - Integrates with data loading tracker for progress banner
 * - Uses AbortSignal for request cancellation
 * - Conservative staleTime to minimize API calls
 * 
 * Requires a section to be selected in the store.
 * Uses the latest term (or falls back to a default termid).
 */
export function useEvents() {
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  
  const currentSection = useStore((state) => state.currentSection)
  const selectedSections = useStore((state) => state.selectedSections)
  const availableSections = useStore((state) => state.availableSections)
  const currentApp = useStore((state) => state.currentApp)
  const updateDataSourceProgress = useStore((state) => state.updateDataSourceProgress)
  
  // Default to 'expedition' if no app is set (backward compatibility)
  const app = currentApp || 'expedition'
  const appSupportsEvents = app === 'expedition' || app === 'planning' || app === 'multi'

  // If multiple sections are selected, issue parallel queries per section to avoid
  // combining into a single request and to ensure distinct section IDs/terms.
  const targets = appSupportsEvents
    ? (selectedSections && selectedSections.length > 0
        ? selectedSections
        : currentSection?.sectionId
          ? [currentSection]
          : [])
    : []

  // Only enable queries if user is authenticated AND has sections selected
  const multiEnabled = appSupportsEvents && isAuthenticated && targets.length > 0

  const queries = useQueries({
    queries: targets.map((sec) => {
      // Derive latest termId per section: prefer `sec.termId`, otherwise look up in availableSections
      const fromStore = availableSections.find((s) => s.sectionId === sec.sectionId)
      const termId = sec.termId || fromStore?.termId || '0'
      return {
        queryKey: eventsKeys.section(app, sec.sectionId, termId),
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          return getEvents({ 
            sectionid: Number(sec.sectionId), 
            termid: Number(termId),
            signal,
          })
        },
        enabled: multiEnabled,
        // Events data is expensive - keep it fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Don't refetch on window focus (conserve API quota)
        refetchOnWindowFocus: false,
      }
    })
  })

  // Compute loading state
  const isLoading = queries.some((q) => q.isLoading)
  const isFetching = queries.some((q) => q.isFetching)
  const isFetched = queries.length > 0 && queries.every((q) => q.isFetched)
  const hasError = queries.some((q) => q.isError)
  const error = queries.find((q) => q.error)?.error

  // Merge all events from parallel queries, deduplicating by eventid
  const events: Event[] = (() => {
    if (!multiEnabled) return []
    const allItems = queries
      .map((q) => (q.data?.items ?? []))
      .flat()
    // Deduplicate by eventid
    return Array.from(
      new Map(allItems.map(e => [e.eventid, e])).values()
    )
  })()

  // When only one section is targeted, we can still return a merged shape for consistency
  const merged: EventsResponse | undefined = (() => {
    if (!multiEnabled) return undefined
    if (events.length === 0 && !isFetched) {
      return undefined
    }
    return {
      identifier: 'eventid' as const,
      items: events,
    }
  })()

  // Fallback to single-section behavior using useQuery if nothing selected yet
  const single = useQuery<EventsResponse>({
    queryKey: eventsKeys.section(
      app,
      currentSection?.sectionId ?? '', 
      currentSection?.termId ?? ''
    ),
    queryFn: async ({ signal }) => {
      if (!currentSection?.sectionId) {
        throw new Error('No section selected')
      }
      const termId = currentSection.termId || '0'
      return getEvents({ 
        sectionid: Number(currentSection.sectionId), 
        termid: Number(termId),
        signal,
      })
    },
    enabled: appSupportsEvents && isAuthenticated && !!currentSection?.sectionId && !(selectedSections && selectedSections.length > 0),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Update data loading tracker for progress banner
  useEffect(() => {
    if (!appSupportsEvents) return
    if (!multiEnabled && !single.isLoading) return

    const totalEvents = merged?.items.length ?? single.data?.items.length ?? 0
    
    if (isLoading || single.isLoading) {
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'loading',
        total: targets.length,
        completed: queries.filter(q => q.isFetched).length,
        phase: 'Loading events...',
      })
    } else if (hasError || single.isError) {
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'error',
        phase: 'Error loading events',
        error: error?.message ?? single.error?.message ?? 'Unknown error',
      })
    } else if (isFetched || single.isFetched) {
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'complete',
        total: totalEvents,
        completed: totalEvents,
        phase: `${totalEvents} events loaded`,
      })
    }
  }, [
    appSupportsEvents,
    multiEnabled,
    isLoading,
    isFetched,
    hasError,
    error,
    targets.length,
    queries,
    merged?.items.length,
    single.isLoading,
    single.isFetched,
    single.isError,
    single.error,
    single.data?.items.length,
    updateDataSourceProgress,
  ])

  // Unified return shape
  const useMulti = multiEnabled && targets.length > 0

  if (!appSupportsEvents) {
    return {
      data: undefined,
      events: [] as Event[],
      isLoading: false,
      isFetching: false,
      isFetched: false,
      isError: false,
      error: null,
    }
  }

  return {
    data: merged ?? single.data,
    events: events.length > 0 ? events : (single.data?.items ?? []),
    isLoading: useMulti ? isLoading : single.isLoading,
    isFetching: useMulti ? isFetching : single.isFetching,
    isFetched: useMulti ? isFetched : single.isFetched,
    isError: useMulti ? hasError : single.isError,
    error: useMulti ? error : single.error,
  }
}
