import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ status: 'authenticated' })),
}))

jest.mock('@/lib/api', () => ({
  getEventDetails: jest.fn(async () => ({ details: true })),
  getEventSummary: jest.fn(async () => ({ summary: true })),
}))

jest.mock('@/store/use-store', () => ({
  useStore: <T,>(selector: (s: { currentApp: string | null }) => T) =>
    selector({ currentApp: 'expedition' }),
}))

import { useSession } from 'next-auth/react'
import { getEventDetails, getEventSummary } from '@/lib/api'
import { useEventDetail } from '../useEventDetail'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useEventDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
  })

  it('passes AbortSignal to getEventDetails/getEventSummary', async () => {
    renderHook(() => useEventDetail(123), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(getEventDetails).toHaveBeenCalled()
      expect(getEventSummary).toHaveBeenCalled()
    })

    const detailArgs = (getEventDetails as jest.Mock).mock.calls[0]
    const summaryArgs = (getEventSummary as jest.Mock).mock.calls[0]

    expect(detailArgs[1]).toBeInstanceOf(AbortSignal)
    expect(summaryArgs[1]).toBeInstanceOf(AbortSignal)
  })

  it('does not fetch when unauthenticated', async () => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' })

    renderHook(() => useEventDetail(123), { wrapper: createWrapper() })

    // Wait a tick to ensure no fetch is triggered
    await new Promise((r) => setTimeout(r, 50))

    expect(getEventDetails).not.toHaveBeenCalled()
    expect(getEventSummary).not.toHaveBeenCalled()
  })
})
