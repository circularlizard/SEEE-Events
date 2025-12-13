/**
 * Events Hydration Hook
 * 
 * Eagerly fetches events data when a section is selected.
 * Similar to useMembersHydration but for events data.
 * 
 * Triggers on section selection and stores data in Zustand.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useStore, type Section } from '@/store/use-store'
import { getEvents } from '@/lib/api'
import type { Event } from '@/lib/schemas'

// Cache TTL: 5 minutes in milliseconds (events change more frequently than members)
const CACHE_TTL_MS = 5 * 60 * 1000

interface HydrationState {
  isHydrating: boolean
  abortController: AbortController | null
  currentSectionIds: string[] | null
}

/**
 * Hook to hydrate events data eagerly on section selection
 * 
 * Automatically starts hydration when:
 * - User is authenticated
 * - A section is selected
 * - Data is not already loaded for this section
 */
export function useEventsHydration() {
  const { status } = useSession()
  
  // Store state
  const currentSection = useStore((s) => s.currentSection)
  const selectedSections = useStore((s) => s.selectedSections)
  const availableSections = useStore((s) => s.availableSections)
  const events = useStore((s) => s.events)
  const eventsLoadingState = useStore((s) => s.eventsLoadingState)
  const eventsSectionIds = useStore((s) => s.eventsSectionIds)
  const eventsLastUpdated = useStore((s) => s.eventsLastUpdated)
  
  // Store actions
  const setEvents = useStore((s) => s.setEvents)
  const setEventsLoadingState = useStore((s) => s.setEventsLoadingState)
  const setEventsProgress = useStore((s) => s.setEventsProgress)
  const setEventsLastUpdated = useStore((s) => s.setEventsLastUpdated)
  const setEventsSectionIds = useStore((s) => s.setEventsSectionIds)
  const clearEvents = useStore((s) => s.clearEvents)
  const updateDataSourceProgress = useStore((s) => s.updateDataSourceProgress)
  
  // Hydration state ref
  const hydrationRef = useRef<HydrationState>({
    isHydrating: false,
    abortController: null,
    currentSectionIds: null,
  })

  /**
   * Get target sections for hydration
   */
  const getTargetSections = useCallback((): Section[] => {
    if (selectedSections && selectedSections.length > 0) {
      return selectedSections
    }
    if (currentSection?.sectionId) {
      return [currentSection]
    }
    return []
  }, [currentSection, selectedSections])

  /**
   * Get section IDs as sorted string for comparison
   */
  const getSectionIdsKey = useCallback((sections: Section[]): string[] => {
    return sections.map(s => s.sectionId).sort()
  }, [])

  /**
   * Check if cached data is still fresh
   */
  const isCacheFresh = useCallback(() => {
    if (!eventsLastUpdated || !eventsSectionIds) return false
    
    const targetIds = getSectionIdsKey(getTargetSections())
    if (JSON.stringify(targetIds) !== JSON.stringify(eventsSectionIds)) return false
    
    const age = Date.now() - eventsLastUpdated.getTime()
    return age < CACHE_TTL_MS
  }, [eventsLastUpdated, eventsSectionIds, getTargetSections, getSectionIdsKey])

  /**
   * Abort any in-flight hydration
   */
  const abortHydration = useCallback(() => {
    if (hydrationRef.current.abortController) {
      hydrationRef.current.abortController.abort()
      hydrationRef.current.abortController = null
    }
    hydrationRef.current.isHydrating = false
  }, [])

  /**
   * Main hydration function
   */
  const hydrateEvents = useCallback(async () => {
    const targets = getTargetSections()
    
    // Guard: must have sections selected
    if (targets.length === 0) {
      return
    }

    const targetIds = getSectionIdsKey(targets)
    
    // Guard: check if already hydrating these sections
    if (hydrationRef.current.isHydrating && 
        JSON.stringify(hydrationRef.current.currentSectionIds) === JSON.stringify(targetIds)) {
      return
    }

    // Guard: check if cache is fresh
    if (isCacheFresh() && events.length > 0) {
      // Still update the data source progress to show complete
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'complete',
        total: events.length,
        completed: events.length,
        phase: 'Events loaded',
      })
      return
    }

    // Abort any previous hydration
    abortHydration()

    // Set up new hydration
    const abortController = new AbortController()
    hydrationRef.current = {
      isHydrating: true,
      abortController,
      currentSectionIds: targetIds,
    }

    try {
      // Update loading state
      setEventsLoadingState('loading')
      setEventsProgress({ total: targets.length, completed: 0, phase: 'Loading events...' })
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'loading',
        total: targets.length,
        completed: 0,
        phase: 'Loading events...',
      })

      const allEvents: Event[] = []
      let completed = 0

      // Fetch events for each section
      for (const section of targets) {
        if (abortController.signal.aborted) return

        // Derive termId: prefer section.termId, otherwise look up in availableSections
        const fromStore = availableSections.find((s) => s.sectionId === section.sectionId)
        const termId = section.termId || fromStore?.termId || '0'

        try {
          const response = await getEvents({
            sectionid: Number(section.sectionId),
            termid: Number(termId),
          })

          if (abortController.signal.aborted) return

          if (response.items) {
            allEvents.push(...response.items)
          }
        } catch (error) {
          console.error(`Failed to fetch events for section ${section.sectionId}:`, error)
          // Continue with other sections
        }

        completed++
        const phase = targets.length > 1 
          ? `Loading events (${completed}/${targets.length} sections)...`
          : 'Loading events...'
        setEventsProgress({ total: targets.length, completed, phase })
        updateDataSourceProgress('events', {
          completed,
          phase,
        })
      }

      if (abortController.signal.aborted) return

      // Deduplicate events by eventid
      const uniqueEvents = Array.from(
        new Map(allEvents.map(e => [e.eventid, e])).values()
      )

      // Update store
      setEvents(uniqueEvents)
      setEventsSectionIds(targetIds)
      setEventsLastUpdated(new Date())
      setEventsLoadingState('complete')
      setEventsProgress({ 
        total: uniqueEvents.length, 
        completed: uniqueEvents.length, 
        phase: 'Events loaded' 
      })
      updateDataSourceProgress('events', {
        state: 'complete',
        total: uniqueEvents.length,
        completed: uniqueEvents.length,
        phase: `${uniqueEvents.length} events loaded`,
      })

    } catch (error) {
      console.error('Events hydration failed:', error)
      if (!abortController.signal.aborted) {
        setEventsLoadingState('error')
        setEventsProgress({ total: 0, completed: 0, phase: 'Error loading events' })
        updateDataSourceProgress('events', {
          state: 'error',
          phase: 'Error loading events',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    } finally {
      hydrationRef.current.isHydrating = false
    }
  }, [
    getTargetSections,
    getSectionIdsKey,
    events.length,
    isCacheFresh,
    abortHydration,
    availableSections,
    setEvents,
    setEventsLoadingState,
    setEventsProgress,
    setEventsLastUpdated,
    setEventsSectionIds,
    updateDataSourceProgress,
  ])

  /**
   * Handle section changes - clear data and re-hydrate
   */
  useEffect(() => {
    const targetIds = getSectionIdsKey(getTargetSections())
    
    // If sections changed, abort current hydration
    if (JSON.stringify(targetIds) !== JSON.stringify(hydrationRef.current.currentSectionIds)) {
      abortHydration()
      
      // Only clear if we had data for different sections
      if (eventsSectionIds && JSON.stringify(targetIds) !== JSON.stringify(eventsSectionIds)) {
        clearEvents()
      }
    }
  }, [currentSection?.sectionId, selectedSections, eventsSectionIds, abortHydration, clearEvents, getTargetSections, getSectionIdsKey])

  /**
   * Trigger hydration when conditions are met
   */
  useEffect(() => {
    if (status !== 'authenticated') return
    
    const targets = getTargetSections()
    if (targets.length === 0) return

    // Start hydration
    hydrateEvents()
  }, [status, currentSection?.sectionId, selectedSections, hydrateEvents, getTargetSections])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      abortHydration()
    }
  }, [abortHydration])

  /**
   * Manual refresh function
   */
  const refreshEvents = useCallback(() => {
    clearEvents()
    hydrationRef.current.currentSectionIds = null
    hydrateEvents()
  }, [clearEvents, hydrateEvents])

  return {
    events,
    loadingState: eventsLoadingState,
    progress: useStore.getState().eventsProgress,
    lastUpdated: eventsLastUpdated,
    refresh: refreshEvents,
  }
}
