/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * React Query Events Hook Tests
 * 
 * Tests for Phase 8.5 verification:
 * - Query cancellation aborts network requests
 * - Section change does not leak old data
 * - Query keys are correctly scoped to section+term
 */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSession } from 'next-auth/react'
import { useEvents } from '../useEvents'
import { eventsKeys } from '@/lib/query-keys'

// Mock the store
const mockStore = {
  currentSection: null as any,
  selectedSections: [] as any[],
  availableSections: [] as any[],
  currentApp: 'expedition' as any,
  updateDataSourceProgress: jest.fn(),
}

jest.mock('@/store/use-store', () => ({
  useStore: (selector: (state: typeof mockStore) => any) => selector(mockStore),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock the API
const mockGetEvents = jest.fn()
jest.mock('@/lib/api', () => ({
  getEvents: (...args: any[]) => mockGetEvents(...args),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStore.currentSection = null
    mockStore.selectedSections = []
    mockStore.availableSections = []
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
  })

  describe('eventsKeys factory', () => {
    it('creates unique keys per app, section and term', () => {
      const key1 = eventsKeys.section('expedition', 'section-1', 'term-1')
      const key2 = eventsKeys.section('expedition', 'section-1', 'term-2')
      const key3 = eventsKeys.section('expedition', 'section-2', 'term-1')

      expect(key1).toEqual(['expedition', 'events', 'section-1', 'term-1'])
      expect(key2).toEqual(['expedition', 'events', 'section-1', 'term-2'])
      expect(key3).toEqual(['expedition', 'events', 'section-2', 'term-1'])

      // Keys should be different
      expect(key1).not.toEqual(key2)
      expect(key1).not.toEqual(key3)
    })

    it('all key is namespaced by app', () => {
      expect(eventsKeys.all('expedition')).toEqual(['expedition', 'events'])
      expect(eventsKeys.all('planning')).toEqual(['planning', 'events'])
    })
  })

  describe('query behavior', () => {
    it('does not fetch when unauthenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' })
      mockStore.currentSection = { sectionId: '123', termId: '456' }

      const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetEvents).not.toHaveBeenCalled()
    })

    it('does not fetch when no section selected', async () => {
      mockStore.currentSection = null

      const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetEvents).not.toHaveBeenCalled()
    })

    it('fetches events when authenticated with section selected', async () => {
      mockStore.currentSection = { sectionId: '123', termId: '456' }
      mockGetEvents.mockResolvedValue({
        identifier: 'eventid',
        items: [{ eventid: 1, name: 'Test Event' }],
      })

      const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })

      expect(mockGetEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionid: 123,
          termid: 456,
        })
      )
      expect(result.current.events).toHaveLength(1)
      expect(result.current.events[0].name).toBe('Test Event')
    })

    it('passes AbortSignal to getEvents for cancellation support', async () => {
      mockStore.currentSection = { sectionId: '123', termId: '456' }
      mockGetEvents.mockResolvedValue({ identifier: 'eventid', items: [] })

      renderHook(() => useEvents(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(mockGetEvents).toHaveBeenCalled()
      })

      // Verify signal was passed
      const callArgs = mockGetEvents.mock.calls[0][0]
      expect(callArgs).toHaveProperty('signal')
      expect(callArgs.signal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('section isolation', () => {
    it('uses different cache keys for different sections', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      // First section
      mockStore.currentSection = { sectionId: '100', termId: '200' }
      mockGetEvents.mockResolvedValue({
        identifier: 'eventid',
        items: [{ eventid: 1, name: 'Section 100 Event' }],
      })

      const { result, rerender } = renderHook(() => useEvents(), { wrapper })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })

      expect(result.current.events[0].name).toBe('Section 100 Event')

      // Change to second section
      mockStore.currentSection = { sectionId: '200', termId: '300' }
      mockGetEvents.mockResolvedValue({
        identifier: 'eventid',
        items: [{ eventid: 2, name: 'Section 200 Event' }],
      })

      rerender()

      await waitFor(() => {
        expect(result.current.events[0]?.name).toBe('Section 200 Event')
      })

      // Verify both caches exist independently
      const cache100 = queryClient.getQueryData(eventsKeys.section('expedition', '100', '200'))
      const cache200 = queryClient.getQueryData(eventsKeys.section('expedition', '200', '300'))

      expect(cache100).toBeDefined()
      expect(cache200).toBeDefined()
      expect((cache100 as any).items[0].name).toBe('Section 100 Event')
      expect((cache200 as any).items[0].name).toBe('Section 200 Event')
    })
  })

  describe('data loading tracker integration', () => {
    it('updates data source progress on loading', async () => {
      mockStore.currentSection = { sectionId: '123', termId: '456' }
      
      // Create a promise we can control
      let resolveEvents: (value: any) => void
      const eventsPromise = new Promise((resolve) => {
        resolveEvents = resolve
      })
      mockGetEvents.mockReturnValue(eventsPromise)

      renderHook(() => useEvents(), { wrapper: createWrapper() })

      // Should update progress to loading state
      await waitFor(() => {
        expect(mockStore.updateDataSourceProgress).toHaveBeenCalledWith(
          'events',
          expect.objectContaining({
            state: 'loading',
          })
        )
      })

      // Resolve the events
      act(() => {
        resolveEvents!({ identifier: 'eventid', items: [{ eventid: 1 }] })
      })

      // Should update progress to complete state
      await waitFor(() => {
        expect(mockStore.updateDataSourceProgress).toHaveBeenCalledWith(
          'events',
          expect.objectContaining({
            state: 'complete',
          })
        )
      })
    })
  })
})
