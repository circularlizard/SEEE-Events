'use client'

import { useEffect, useState } from 'react'

/**
 * MSW Provider
 * 
 * Conditionally initializes Mock Service Worker in development mode.
 * This allows the app to use mock data during development/testing
 * without affecting production builds.
 */
export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(false)

  useEffect(() => {
    const initMSW = async () => {
      // Only enable MSW in development or when explicitly enabled
      if (
        process.env.NODE_ENV === 'development' ||
        process.env.NEXT_PUBLIC_USE_MSW === 'true'
      ) {
        const { worker } = await import('@/mocks/browser')
        await worker.start({
          onUnhandledRequest: 'bypass',
        })
      }
      setMswReady(true)
    }

    initMSW()
  }, [])

  // Show loading state until MSW is ready in development
  if (!mswReady && process.env.NODE_ENV === 'development') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Initializing mock service worker...</p>
      </div>
    )
  }

  return <>{children}</>
}
