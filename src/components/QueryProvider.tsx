'use client'

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ReactNode, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { APIError } from '@/lib/api'
import { useStore } from '@/store/use-store'

/**
 * Determines if a failed query should be retried based on error type.
 * 
 * Retry rules for APIError:
 * - 401 (UNAUTHENTICATED): No retry - user needs to re-authenticate
 * - 429 (RATE_LIMITED): No retry - system is cooling down
 * - 503 (SYSTEM_HALTED): No retry - system is halted
 * - Other errors: Retry up to 3 times with exponential backoff
 */
function shouldRetryQuery(failureCount: number, error: Error): boolean {
  // Don't retry if we've already tried 3 times
  if (failureCount >= 3) return false

  // Check for APIError with specific status codes that should not retry
  if (error instanceof APIError) {
    const noRetryStatuses = [401, 429, 503]
    if (noRetryStatuses.includes(error.status)) {
      return false
    }
  }

  // Retry other errors
  return true
}

/**
 * React Query Provider Component
 * 
 * Configures TanStack Query with appropriate defaults:
 * - staleTime: 5 minutes (data considered fresh for 5 mins)
 * - gcTime: 10 minutes (unused data kept in cache for 10 mins)
 * - refetchOnWindowFocus: false (don't refetch when user returns to tab)
 * - Custom retry logic that respects API error codes
 * 
 * Usage: Wrap your app or layout with this provider
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Create QueryClient instance once per component mount
  // This prevents creating a new client on every render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Unused data is garbage collected after 10 minutes
            gcTime: 10 * 60 * 1000,
            // Don't refetch on window focus (conserve API quota)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect (avoid burst refetches after network drops)
            refetchOnReconnect: false,
            // Custom retry logic based on error type
            retry: shouldRetryQuery,
            // Retry delay:
            // - Respect APIError.retryAfter when present (seconds)
            // - Otherwise exponential backoff: 1s, 2s, 4s...
            retryDelay: (attemptIndex, error) => {
              if (error instanceof APIError && typeof error.retryAfter === 'number') {
                return Math.min(Math.max(1000, error.retryAfter * 1000), 30000)
              }
              return Math.min(1000 * 2 ** attemptIndex, 30000)
            },
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

/**
 * Hook to perform a complete logout that clears all cached data
 * 
 * This ensures:
 * - React Query cache is cleared (no stale data for next user)
 * - Zustand session state is cleared
 * - next-auth session is ended
 * 
 * @returns logout function that clears all caches and redirects to home
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const clearSession = useStore((s) => s.clearSession)
  const clearAllDataSourceProgress = useStore((s) => s.clearAllDataSourceProgress)

  const logout = useCallback(async () => {
    // Clear React Query cache first (before redirect)
    queryClient.clear()
    
    // Clear Zustand session state
    clearSession()
    clearAllDataSourceProgress()
    
    // Sign out via next-auth (this will redirect)
    await signOut({ callbackUrl: '/' })
  }, [queryClient, clearSession, clearAllDataSourceProgress])

  return logout
}
