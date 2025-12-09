import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

/**
 * Cached patrol data from the server
 */
export interface CachedPatrol {
  patrolId: number
  patrolName: string
  sectionId: string
  sectionName: string
  memberCount: number
}

export interface PatrolCacheMeta {
  lastUpdated: string
  updatedBy: string
  sectionCount: number
  patrolCount: number
}

interface PatrolsResponse {
  meta: PatrolCacheMeta | null
  patrols: CachedPatrol[]
  errors?: string[]
}

interface RefreshResponse extends PatrolsResponse {
  success: boolean
}

/**
 * Fetch patrol data from the API
 */
async function fetchPatrols(): Promise<PatrolsResponse> {
  const response = await fetch('/api/admin/patrols')
  if (!response.ok) {
    throw new Error('Failed to fetch patrol data')
  }
  return response.json()
}

/**
 * Refresh patrol data (admin only)
 */
async function refreshPatrols(): Promise<RefreshResponse> {
  const response = await fetch('/api/admin/patrols', {
    method: 'POST',
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to refresh patrol data')
  }
  return response.json()
}

/**
 * Hook to access patrol data and name mapping
 * 
 * Returns:
 * - patrols: Array of all cached patrols
 * - meta: Cache metadata (last updated, etc.)
 * - getPatrolName: Function to get patrol name by ID (with fallback)
 * - isLoading: Loading state
 * - error: Error state
 */
export function usePatrolMap() {
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'

  const { data, isLoading, error } = useQuery({
    queryKey: ['patrols'],
    queryFn: fetchPatrols,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  /**
   * Get patrol name by ID, with fallback to ID string
   * @param patrolId Patrol ID (number or string)
   * @returns Patrol name or ID string if not found
   */
  const getPatrolName = (patrolId: number | string | null | undefined): string => {
    if (patrolId === null || patrolId === undefined) {
      return 'Unassigned'
    }
    
    const id = typeof patrolId === 'string' ? parseInt(patrolId, 10) : patrolId
    
    if (isNaN(id)) {
      // If it's already a name string, return it
      return String(patrolId)
    }
    
    const patrol = data?.patrols.find((p) => p.patrolId === id)
    return patrol?.patrolName || String(patrolId)
  }

  return {
    patrols: data?.patrols ?? [],
    meta: data?.meta ?? null,
    getPatrolName,
    isLoading,
    error,
  }
}

/**
 * Hook for admin patrol refresh functionality
 */
export function usePatrolRefresh() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: refreshPatrols,
    onSuccess: (data) => {
      // Update the cache with fresh data
      queryClient.setQueryData(['patrols'], {
        meta: data.meta,
        patrols: data.patrols,
      })
    },
  })

  return {
    refresh: mutation.mutate,
    isRefreshing: mutation.isPending,
    error: mutation.error,
    lastResult: mutation.data,
  }
}
