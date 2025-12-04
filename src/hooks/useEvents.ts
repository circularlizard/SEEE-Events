import { useQuery } from '@tanstack/react-query'
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

  return useQuery<EventsResponse>({
    queryKey: ['events', currentSection?.sectionId, currentSection?.termId],
    queryFn: async () => {
      if (!currentSection?.sectionId) {
        throw new Error('No section selected')
      }

      // TODO: Get actual termId from OAuth data
      // For now, use a placeholder termid (will be populated from OAuth resource)
      const termId = currentSection.termId || '0'

      return getEvents({
        sectionid: Number(currentSection.sectionId),
        termid: Number(termId),
      })
    },
    enabled: !!currentSection?.sectionId,
  })
}
