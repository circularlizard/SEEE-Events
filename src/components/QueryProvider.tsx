'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

/**
 * React Query Provider Component
 * 
 * Configures TanStack Query with appropriate defaults:
 * - staleTime: 5 minutes (data considered fresh for 5 mins)
 * - gcTime: 10 minutes (unused data kept in cache for 10 mins)
 * - refetchOnWindowFocus: false (don't refetch when user returns to tab)
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
            // Retry failed requests up to 3 times
            retry: 3,
            // Exponential backoff: 1s, 2s, 4s
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
