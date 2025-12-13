/**
 * Members Hydration Hook
 * 
 * Fetches and hydrates member data for admin users.
 * Uses a three-phase approach:
 * 1. getMembers - fetch member summaries for the section
 * 2. getIndividual - fetch DOB and membership history per member
 * 3. getCustomData - fetch contacts, medical, consents per member
 * 
 * All calls go through the proxy which handles rate limiting.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store/use-store'
import { getMembers, getMemberIndividual, getMemberCustomData } from '@/lib/api'
import {
  createNormalizedMemberFromSummary,
  updateMemberWithIndividualData,
  updateMemberWithCustomData,
  parseCustomDataGroups,
  markMemberError,
} from '@/lib/member-data-parser'
import type { NormalizedMember } from '@/lib/schemas'

// Cache TTL: 12 hours in milliseconds
const CACHE_TTL_MS = 12 * 60 * 60 * 1000

interface HydrationState {
  isHydrating: boolean
  abortController: AbortController | null
  currentSectionId: string | null
}

/**
 * Hook to hydrate member data for admin users
 * 
 * Automatically starts hydration when:
 * - User is authenticated as admin
 * - A section is selected
 * - Data is not already loaded for this section
 */
export function useMembersHydration() {
  const { status } = useSession()
  // queryClient reserved for future cache invalidation
  useQueryClient()
  
  // Store state
  const currentSection = useStore((s) => s.currentSection)
  const userRole = useStore((s) => s.userRole)
  const members = useStore((s) => s.members)
  const membersLoadingState = useStore((s) => s.membersLoadingState)
  const membersSectionId = useStore((s) => s.membersSectionId)
  const membersLastUpdated = useStore((s) => s.membersLastUpdated)
  
  // Store actions
  const setMembers = useStore((s) => s.setMembers)
  const updateMember = useStore((s) => s.updateMember)
  const setMembersLoadingState = useStore((s) => s.setMembersLoadingState)
  const setMembersProgress = useStore((s) => s.setMembersProgress)
  const setMembersLastUpdated = useStore((s) => s.setMembersLastUpdated)
  const setMembersSectionId = useStore((s) => s.setMembersSectionId)
  const clearMembers = useStore((s) => s.clearMembers)
  const updateDataSourceProgress = useStore((s) => s.updateDataSourceProgress)
  
  // Hydration state ref (to track across renders without causing re-renders)
  const hydrationRef = useRef<HydrationState>({
    isHydrating: false,
    abortController: null,
    currentSectionId: null,
  })

  /**
   * Check if cached data is still fresh
   */
  const isCacheFresh = useCallback(() => {
    if (!membersLastUpdated || !membersSectionId) return false
    if (membersSectionId !== currentSection?.sectionId) return false
    
    const age = Date.now() - membersLastUpdated.getTime()
    return age < CACHE_TTL_MS
  }, [membersLastUpdated, membersSectionId, currentSection?.sectionId])

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
  const hydrateMembers = useCallback(async () => {
    // Guard: must be admin
    if (userRole !== 'admin') {
      return
    }

    // Guard: must have a section selected
    if (!currentSection?.sectionId || !currentSection?.termId) {
      return
    }

    // Guard: check if already hydrating this section
    if (hydrationRef.current.isHydrating && 
        hydrationRef.current.currentSectionId === currentSection.sectionId) {
      return
    }

    // Guard: check if cache is fresh
    if (isCacheFresh() && members.length > 0) {
      // Still update the data source progress to show complete
      updateDataSourceProgress('members', {
        label: 'Members',
        state: 'complete',
        total: members.length,
        completed: members.length,
        phase: `${members.length} members loaded`,
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
      currentSectionId: currentSection.sectionId,
    }

    const sectionId = parseInt(currentSection.sectionId, 10)
    const termId = parseInt(currentSection.termId, 10)

    try {
      // Phase 1: Fetch member summaries
      setMembersLoadingState('loading-summary')
      setMembersProgress({ total: 0, completed: 0, phase: 'Loading members...' })
      updateDataSourceProgress('members', {
        label: 'Members',
        state: 'loading',
        total: 0,
        completed: 0,
        phase: 'Loading member list...',
      })

      const membersList = await getMembers({
        sectionid: sectionId,
        termid: termId,
        section: currentSection.sectionType,
      })

      // Check if aborted
      if (abortController.signal.aborted) return

      // Create normalized members from summaries
      const normalizedMembers: NormalizedMember[] = membersList.map(
        createNormalizedMemberFromSummary
      )

      setMembers(normalizedMembers)
      setMembersSectionId(currentSection.sectionId)

      const total = normalizedMembers.length
      let completed = 0

      // Phase 2: Fetch individual data (DOB) for each member
      setMembersLoadingState('loading-individual')
      setMembersProgress({ total, completed: 0, phase: 'Loading member info...' })

      for (const member of normalizedMembers) {
        if (abortController.signal.aborted) return

        try {
          const individual = await getMemberIndividual({
            sectionid: sectionId,
            scoutid: parseInt(member.id, 10),
            termid: termId,
          })

          if (abortController.signal.aborted) return

          const updated = updateMemberWithIndividualData(member, individual.data)
          updateMember(member.id, updated)
        } catch (error) {
          // Log error but continue with other members
          console.error(`Failed to fetch individual data for member ${member.id}:`, error)
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          updateMember(member.id, markMemberError(member, errorMsg))
        }

        completed++
        setMembersProgress({ total, completed, phase: 'Loading member info...' })
        updateDataSourceProgress('members', {
          completed,
          phase: `Loading member info (${completed}/${total})...`,
        })
      }

      // Phase 3: Fetch custom data (contacts, medical, consents) for each member
      setMembersLoadingState('loading-custom')
      completed = 0
      setMembersProgress({ total, completed: 0, phase: 'Loading member details...' })

      // Get fresh member list from store (with individual data)
      const membersWithIndividual = useStore.getState().members

      for (const member of membersWithIndividual) {
        if (abortController.signal.aborted) return

        // Skip members that errored in phase 2
        if (member.loadingState === 'error') {
          completed++
          setMembersProgress({ total, completed, phase: 'Loading member details...' })
          continue
        }

        try {
          const customData = await getMemberCustomData({
            sectionid: sectionId,
            scoutid: parseInt(member.id, 10),
          })

          if (abortController.signal.aborted) return

          const parsed = parseCustomDataGroups(customData.data)
          const updated = updateMemberWithCustomData(member, parsed)
          updateMember(member.id, updated)
        } catch (error) {
          // Log error but continue with other members
          console.error(`Failed to fetch custom data for member ${member.id}:`, error)
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          updateMember(member.id, { loadingState: 'error', errorMessage: errorMsg })
        }

        completed++
        setMembersProgress({ total, completed, phase: 'Loading member details...' })
        updateDataSourceProgress('members', {
          completed,
          phase: `Loading member details (${completed}/${total})...`,
        })
      }

      // Mark hydration complete
      if (!abortController.signal.aborted) {
        setMembersLoadingState('complete')
        setMembersLastUpdated(new Date())
        setMembersProgress({ total, completed: total, phase: 'Complete' })
        updateDataSourceProgress('members', {
          state: 'complete',
          total,
          completed: total,
          phase: `${total} members loaded`,
        })
      }

    } catch (error) {
      console.error('Member hydration failed:', error)
      if (!abortController.signal.aborted) {
        setMembersLoadingState('error')
        setMembersProgress({ total: 0, completed: 0, phase: 'Error loading members' })
        updateDataSourceProgress('members', {
          state: 'error',
          phase: 'Error loading members',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    } finally {
      hydrationRef.current.isHydrating = false
    }
  }, [
    userRole,
    currentSection,
    members.length,
    isCacheFresh,
    abortHydration,
    setMembers,
    updateMember,
    setMembersLoadingState,
    setMembersProgress,
    setMembersLastUpdated,
    setMembersSectionId,
    updateDataSourceProgress,
  ])

  /**
   * Handle section changes - clear data and re-hydrate
   */
  useEffect(() => {
    // If section changed, abort current hydration and clear data
    if (currentSection?.sectionId !== hydrationRef.current.currentSectionId) {
      abortHydration()
      
      // Only clear if we had data for a different section
      if (membersSectionId && membersSectionId !== currentSection?.sectionId) {
        clearMembers()
      }
    }
  }, [currentSection?.sectionId, membersSectionId, abortHydration, clearMembers])

  /**
   * Trigger hydration when conditions are met
   */
  useEffect(() => {
    if (status !== 'authenticated') return
    if (userRole !== 'admin') return
    if (!currentSection?.sectionId) return

    // Start hydration
    hydrateMembers()
  }, [status, userRole, currentSection?.sectionId, hydrateMembers])

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
  const refreshMembers = useCallback(() => {
    clearMembers()
    // Reset the current section ID to force re-hydration
    hydrationRef.current.currentSectionId = null
    hydrateMembers()
  }, [clearMembers, hydrateMembers])

  return {
    members,
    loadingState: membersLoadingState,
    progress: useStore.getState().membersProgress,
    lastUpdated: membersLastUpdated,
    refresh: refreshMembers,
    isAdmin: userRole === 'admin',
  }
}
