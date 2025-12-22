/**
 * Members Query Hook
 * 
 * TanStack Query hook for fetching and caching member data.
 * This is the **single source of truth** for members data.
 * 
 * Implements a 3-phase progressive enrichment pipeline:
 * 1. Phase 1: Fetch member summaries (list) - appears immediately
 * 2. Phase 2: Fetch individual data (DOB, history) - enriches rows
 * 3. Phase 3: Fetch custom data (contacts, medical) - enriches rows
 * 
 * Uses React Query cache for incremental updates during enrichment.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useCallback, useMemo } from 'react'
import { getMembers, getMemberIndividual, getMemberCustomData } from '@/lib/api'
import { useStore } from '@/store/use-store'
import {
  createNormalizedMemberFromSummary,
  updateMemberWithIndividualData,
  updateMemberWithCustomData,
  parseCustomDataGroups,
  markMemberError,
} from '@/lib/member-data-parser'
import type { NormalizedMember } from '@/lib/schemas'

/**
 * Members query key factory
 * Provides consistent query keys for members data
 */
export const membersKeys = {
  all: ['members'] as const,
  section: (sectionId: string, termId: string) => ['members', sectionId, termId] as const,
}

/**
 * Enrichment state for tracking progressive loading
 */
interface EnrichmentState {
  isEnriching: boolean
  abortController: AbortController | null
  currentSectionId: string | null
}

/**
 * TanStack Query hook for fetching members list with progressive enrichment
 * 
 * This hook:
 * - Fetches Phase 1 (member list) via React Query
 * - Runs Phase 2/3 enrichment in background, updating cache incrementally
 * - Integrates with data loading tracker for progress banner
 * - Only runs for admin users
 * 
 * @returns Members data, loading states, and control functions
 */
export function useMembers() {
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const queryClient = useQueryClient()
  
  const currentSection = useStore((state) => state.currentSection)
  const userRole = useStore((state) => state.userRole)
  const updateDataSourceProgress = useStore((state) => state.updateDataSourceProgress)
  
  const isAdmin = userRole === 'admin'
  const sectionId = currentSection?.sectionId ?? ''
  const termId = currentSection?.termId ?? ''
  const sectionType = currentSection?.sectionType
  
  // Enrichment state ref (to track across renders without causing re-renders)
  const enrichmentRef = useRef<EnrichmentState>({
    isEnriching: false,
    abortController: null,
    currentSectionId: null,
  })

  // Phase 1: Fetch member summaries
  const query = useQuery({
    queryKey: membersKeys.section(sectionId, termId),
    queryFn: async ({ signal }): Promise<NormalizedMember[]> => {
      if (!sectionId || !termId) {
        return []
      }
      
      const membersList = await getMembers({
        sectionid: Number(sectionId),
        termid: Number(termId),
        section: sectionType,
        signal,
      })
      
      // Create normalized members from summaries (Phase 1 complete)
      return membersList.map(createNormalizedMemberFromSummary)
    },
    enabled: isAuthenticated && isAdmin && !!sectionId && !!termId,
    // Members data is expensive - keep it fresh for 12 hours
    staleTime: 12 * 60 * 60 * 1000,
    // Keep in cache for 24 hours
    gcTime: 24 * 60 * 60 * 1000,
    // Don't refetch on window focus (conserve API quota)
    refetchOnWindowFocus: false,
  })

  const members = useMemo(() => query.data ?? [], [query.data])

  /**
   * Abort any in-flight enrichment
   */
  const abortEnrichment = useCallback(() => {
    if (enrichmentRef.current.abortController) {
      enrichmentRef.current.abortController.abort()
      enrichmentRef.current.abortController = null
    }
    enrichmentRef.current.isEnriching = false
  }, [])

  /**
   * Run Phase 2 & 3 enrichment in background
   * Updates React Query cache incrementally for progressive UI updates
   */
  const runEnrichment = useCallback(async (initialMembers: NormalizedMember[]) => {
    if (!sectionId || !termId) return
    if (initialMembers.length === 0) return
    
    // Check if already enriching this section
    if (enrichmentRef.current.isEnriching && 
        enrichmentRef.current.currentSectionId === sectionId) {
      return
    }

    // Check if members are already fully enriched
    const allEnriched = initialMembers.every(m => m.loadingState === 'complete')
    if (allEnriched) {
      updateDataSourceProgress('members', {
        label: 'Members',
        state: 'complete',
        total: initialMembers.length,
        completed: initialMembers.length,
        phase: `${initialMembers.length} members loaded`,
      })
      return
    }

    // Abort any previous enrichment
    abortEnrichment()

    // Set up new enrichment
    const abortController = new AbortController()
    enrichmentRef.current = {
      isEnriching: true,
      abortController,
      currentSectionId: sectionId,
    }

    const total = initialMembers.length
    let completed = 0
    const queryKey = membersKeys.section(sectionId, termId)

    try {
      // Phase 2: Fetch individual data (DOB, history) for each member
      updateDataSourceProgress('members', {
        label: 'Members',
        state: 'loading',
        total,
        completed: 0,
        phase: 'Loading member info...',
      })

      for (const member of initialMembers) {
        if (abortController.signal.aborted) return

        // Skip if already has individual data
        if (member.dateOfBirth || member.loadingState === 'error') {
          completed++
          continue
        }

        try {
          const individual = await getMemberIndividual({
            sectionid: Number(sectionId),
            scoutid: Number(member.id),
            termid: Number(termId),
            signal: abortController.signal,
          })

          if (abortController.signal.aborted) return

          // Update cache with enriched member
          queryClient.setQueryData<NormalizedMember[]>(queryKey, (old) => {
            if (!old) return old
            return old.map(m => 
              m.id === member.id 
                ? updateMemberWithIndividualData(m, individual.data)
                : m
            )
          })
        } catch (error) {
          if (abortController.signal.aborted) return
          console.error(`Failed to fetch individual data for member ${member.id}:`, error)
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          
          queryClient.setQueryData<NormalizedMember[]>(queryKey, (old) => {
            if (!old) return old
            return old.map(m => 
              m.id === member.id ? markMemberError(m, errorMsg) : m
            )
          })
        }

        completed++
        updateDataSourceProgress('members', {
          completed,
          phase: `Loading member info (${completed}/${total})...`,
        })
      }

      // Phase 3: Fetch custom data (contacts, medical, consents) for each member
      completed = 0
      updateDataSourceProgress('members', {
        completed: 0,
        phase: 'Loading member details...',
      })

      // Get fresh member list from cache (with individual data)
      const membersWithIndividual = queryClient.getQueryData<NormalizedMember[]>(queryKey) ?? []

      for (const member of membersWithIndividual) {
        if (abortController.signal.aborted) return

        // Skip members that errored or already have custom data
        if (member.loadingState === 'error' || member.loadingState === 'complete') {
          completed++
          continue
        }

        try {
          const customData = await getMemberCustomData({
            sectionid: Number(sectionId),
            scoutid: Number(member.id),
            signal: abortController.signal,
          })

          if (abortController.signal.aborted) return

          const parsed = parseCustomDataGroups(customData.data)
          
          // Update cache with fully enriched member
          queryClient.setQueryData<NormalizedMember[]>(queryKey, (old) => {
            if (!old) return old
            return old.map(m => 
              m.id === member.id 
                ? updateMemberWithCustomData(m, parsed)
                : m
            )
          })
        } catch (error) {
          if (abortController.signal.aborted) return
          console.error(`Failed to fetch custom data for member ${member.id}:`, error)
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          
          queryClient.setQueryData<NormalizedMember[]>(queryKey, (old) => {
            if (!old) return old
            return old.map(m => 
              m.id === member.id 
                ? { ...m, loadingState: 'error' as const, errorMessage: errorMsg }
                : m
            )
          })
        }

        completed++
        updateDataSourceProgress('members', {
          completed,
          phase: `Loading member details (${completed}/${total})...`,
        })
      }

      // Mark enrichment complete
      if (!abortController.signal.aborted) {
        updateDataSourceProgress('members', {
          state: 'complete',
          total,
          completed: total,
          phase: `${total} members loaded`,
        })
      }

    } catch (error) {
      console.error('Member enrichment failed:', error)
      if (!abortController.signal.aborted) {
        updateDataSourceProgress('members', {
          state: 'error',
          phase: 'Error loading members',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    } finally {
      enrichmentRef.current.isEnriching = false
    }
  }, [sectionId, termId, queryClient, abortEnrichment, updateDataSourceProgress])

  // Start enrichment when Phase 1 data is available
  useEffect(() => {
    if (query.isFetched && members.length > 0) {
      runEnrichment(members)
    }
  }, [query.isFetched, members, runEnrichment])

  // Abort enrichment on section change
  useEffect(() => {
    if (sectionId !== enrichmentRef.current.currentSectionId) {
      abortEnrichment()
    }
  }, [sectionId, abortEnrichment])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortEnrichment()
    }
  }, [abortEnrichment])

  // Update data loading tracker for initial loading state
  useEffect(() => {
    if (!isAdmin || !sectionId) return

    if (query.isLoading) {
      updateDataSourceProgress('members', {
        label: 'Members',
        state: 'loading',
        total: 0,
        completed: 0,
        phase: 'Loading member list...',
      })
    } else if (query.isError) {
      updateDataSourceProgress('members', {
        label: 'Members',
        state: 'error',
        phase: 'Error loading members',
        error: query.error?.message ?? 'Unknown error',
      })
    }
  }, [isAdmin, sectionId, query.isLoading, query.isError, query.error, updateDataSourceProgress])

  /**
   * Manual refresh function - invalidates cache and re-fetches
   */
  const refresh = useCallback(() => {
    abortEnrichment()
    queryClient.invalidateQueries({ queryKey: membersKeys.section(sectionId, termId) })
  }, [queryClient, sectionId, termId, abortEnrichment])

  return {
    members,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetched: query.isFetched,
    isError: query.isError,
    error: query.error,
    isAdmin,
    refresh,
  }
}
