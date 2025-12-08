import { useQueries, useQuery } from '@tanstack/react-query'
import { getEvents } from '@/lib/api'
import { useStore } from '@/store/use-store'
import type { EventsResponse } from '@/lib/schemas'

/**
 * TanStack Query hook for fetching events list
 * Returns loading state, error state, and events data
 * 
 * Requires a section to be selected in the store.
 * Uses the latest term (or falls back to a default termid).
 */
export function useEvents() {
  const currentSection = useStore((state) => state.currentSection)
  const selectedSections = useStore((state) => state.selectedSections)
  const availableSections = useStore((state) => state.availableSections)

  // If multiple sections are selected, issue parallel queries per section to avoid
  // combining into a single request and to ensure distinct section IDs/terms.
  const targets = (selectedSections && selectedSections.length > 0)
    ? selectedSections
    : currentSection?.sectionId
      ? [currentSection]
      : []

  const multiEnabled = targets.length > 0

  const queries = useQueries({
    queries: targets.map((sec) => {
      // Derive latest termId per section: prefer `sec.termId`, otherwise look up in availableSections
      const fromStore = availableSections.find((s) => s.sectionId === sec.sectionId)
      const termId = sec.termId || fromStore?.termId || '0'
      return {
        queryKey: ['events', sec.sectionId, termId],
        queryFn: async () => {
          return getEvents({ sectionid: Number(sec.sectionId), termid: Number(termId) })
        },
        enabled: multiEnabled,
      }
    })
  })

  // When only one section is targeted, we can still return a merged shape for consistency
  const merged: EventsResponse | undefined = (() => {
    if (!multiEnabled) return undefined
    const allItems = queries
      .map((q) => (q.data?.items ?? []))
      .flat()
    if (allItems.length === 0 && queries.every((q) => !q.isFetched)) {
      return undefined
    }
    return {
      identifier: 'eventid' as const,
      items: allItems,
    }
  })()

  // Fallback to single-section behavior using useQuery if nothing selected yet
  const single = useQuery<EventsResponse>({
    queryKey: ['events', currentSection?.sectionId, currentSection?.termId],
    queryFn: async () => {
      if (!currentSection?.sectionId) {
        throw new Error('No section selected')
      }
      const termId = currentSection.termId || '0'
      return getEvents({ sectionid: Number(currentSection.sectionId), termid: Number(termId) })
    },
    enabled: !!currentSection?.sectionId && !(selectedSections && selectedSections.length > 0),
  })

  // Unified return shape
  return {
    data: merged ?? single.data,
    isLoading: (merged === undefined ? single.isLoading : queries.some((q) => q.isLoading)),
    isFetched: (merged === undefined ? single.isFetched : queries.every((q) => q.isFetched)),
    error: (merged === undefined ? single.error : undefined),
  }
}
