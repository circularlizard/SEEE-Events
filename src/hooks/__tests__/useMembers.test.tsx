/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * React Query Members Hook Tests
 * 
 * Tests for Phase 8.5 verification:
 * - Query cancellation aborts network requests
 * - Section change does not leak old data
 * - Query keys are correctly scoped to section+term
 * - 3-phase progressive enrichment works correctly
 */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock the store
const mockStore = {
  currentSection: null as any,
  currentApp: 'planning' as any,
  userRole: null as string | null,
  updateDataSourceProgress: jest.fn(),
}

jest.mock('@/store/use-store', () => ({
  useStore: (selector: (state: typeof mockStore) => any) => selector(mockStore),
}))

// Mock the API
const mockGetMembers = jest.fn()
const mockGetMemberIndividual = jest.fn()
const mockGetMemberCustomData = jest.fn()

jest.mock('@/lib/api', () => ({
  getMembers: (...args: any[]) => mockGetMembers(...args),
  getMemberIndividual: (...args: any[]) => mockGetMemberIndividual(...args),
  getMemberCustomData: (...args: any[]) => mockGetMemberCustomData(...args),
}))

// Mock member-data-parser
jest.mock('@/lib/member-data-parser', () => ({
  createNormalizedMemberFromSummary: (member: any) => ({
    id: String(member.scoutid),
    firstName: member.firstname,
    lastName: member.lastname,
    fullName: `${member.firstname} ${member.lastname}`,
    photoGuid: null,
    sectionId: member.sectionid,
    patrolId: member.patrolid,
    patrolName: member.patrol,
    active: member.active,
    age: member.age,
    dateOfBirth: null,
    started: null,
    startedSection: null,
    endDate: null,
    otherSections: [],
    memberContact: null,
    primaryContact1: null,
    primaryContact2: null,
    emergencyContact: null,
    doctorName: null,
    doctorPhone: null,
    doctorAddress: null,
    medicalNotes: null,
    dietaryNotes: null,
    allergyNotes: null,
    consents: null,
    loadingState: 'summary' as const,
    errorMessage: null,
  }),
  updateMemberWithIndividualData: (member: any, data: any) => ({
    ...member,
    dateOfBirth: data?.date_of_birth || null,
    loadingState: 'individual' as const,
  }),
  updateMemberWithCustomData: (member: any, parsed: any) => ({
    ...member,
    ...parsed,
    loadingState: 'complete' as const,
  }),
  parseCustomDataGroups: (data: any) => ({
    medicalNotes: data?.medical || null,
  }),
  markMemberError: (member: any, error: string) => ({
    ...member,
    loadingState: 'error' as const,
    errorMessage: error,
  }),
}))

import { useSession } from 'next-auth/react'
import { useMembers } from '../useMembers'
import { membersKeys } from '@/lib/query-keys'

function createWrapper(queryClient?: QueryClient) {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStore.currentSection = null
    mockStore.userRole = null
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated' })
  })

  describe('membersKeys factory', () => {
    it('creates unique keys per app, section and term', () => {
      const key1 = membersKeys.section('planning', 'section-1', 'term-1')
      const key2 = membersKeys.section('planning', 'section-1', 'term-2')
      const key3 = membersKeys.section('planning', 'section-2', 'term-1')

      expect(key1).toEqual(['planning', 'members', 'section-1', 'term-1'])
      expect(key2).toEqual(['planning', 'members', 'section-1', 'term-2'])
      expect(key3).toEqual(['planning', 'members', 'section-2', 'term-1'])

      // Keys should be different
      expect(key1).not.toEqual(key2)
      expect(key1).not.toEqual(key3)
    })

    it('all key is namespaced by app', () => {
      expect(membersKeys.all('planning')).toEqual(['planning', 'members'])
      expect(membersKeys.all('expedition')).toEqual(['expedition', 'members'])
    })
  })

  describe('query behavior', () => {
    it('does not fetch when unauthenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' })
      mockStore.currentSection = { sectionId: '123', termId: '456' }
      mockStore.userRole = 'admin'

      const { result } = renderHook(() => useMembers(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetMembers).not.toHaveBeenCalled()
    })

    it('does not fetch when not admin', async () => {
      mockStore.currentSection = { sectionId: '123', termId: '456' }
      mockStore.userRole = 'user' // Not admin

      const { result } = renderHook(() => useMembers(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetMembers).not.toHaveBeenCalled()
      expect(result.current.isAdmin).toBe(false)
    })

    it('does not fetch when no section selected', async () => {
      mockStore.currentSection = null
      mockStore.userRole = 'admin'

      const { result } = renderHook(() => useMembers(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetMembers).not.toHaveBeenCalled()
    })

    it('fetches members when authenticated admin with section selected', async () => {
      mockStore.currentSection = { sectionId: '123', termId: '456' }
      mockStore.userRole = 'admin'
      mockGetMembers.mockResolvedValue([
        { scoutid: 1, firstname: 'Alice', lastname: 'Smith', sectionid: 123, patrolid: 1, patrol: 'Eagles', active: true, age: '12' },
      ])
      // Mock enrichment calls to resolve immediately
      mockGetMemberIndividual.mockResolvedValue({ data: { date_of_birth: '2012-01-01' } })
      mockGetMemberCustomData.mockResolvedValue({ data: { medical: 'None' } })

      const { result } = renderHook(() => useMembers(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })

      expect(mockGetMembers).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionid: 123,
          termid: 456,
        })
      )
      expect(result.current.members).toHaveLength(1)
      expect(result.current.members[0].firstName).toBe('Alice')
      expect(result.current.isAdmin).toBe(true)
    })

    it('passes AbortSignal to getMembers for cancellation support', async () => {
      mockStore.currentSection = { sectionId: '123', termId: '456' }
      mockStore.userRole = 'admin'
      mockGetMembers.mockResolvedValue([])

      renderHook(() => useMembers(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(mockGetMembers).toHaveBeenCalled()
      })

      // Verify signal was passed
      const callArgs = mockGetMembers.mock.calls[0][0]
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

      mockStore.userRole = 'admin'

      // First section
      mockStore.currentSection = { sectionId: '100', termId: '200' }
      mockGetMembers.mockResolvedValue([
        { scoutid: 1, firstname: 'Alice', lastname: 'A', sectionid: 100, patrolid: 1, patrol: 'Eagles', active: true, age: '12' },
      ])

      const { result, rerender } = renderHook(() => useMembers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })

      expect(result.current.members[0].firstName).toBe('Alice')

      // Change to second section
      mockStore.currentSection = { sectionId: '200', termId: '300' }
      mockGetMembers.mockResolvedValue([
        { scoutid: 2, firstname: 'Bob', lastname: 'B', sectionid: 200, patrolid: 2, patrol: 'Foxes', active: true, age: '13' },
      ])

      rerender()

      await waitFor(() => {
        expect(result.current.members[0]?.firstName).toBe('Bob')
      })

      // Verify both caches exist independently
      const cache100 = queryClient.getQueryData(membersKeys.section('planning', '100', '200'))
      const cache200 = queryClient.getQueryData(membersKeys.section('planning', '200', '300'))

      expect(cache100).toBeDefined()
      expect(cache200).toBeDefined()
      expect((cache100 as any)[0].firstName).toBe('Alice')
      expect((cache200 as any)[0].firstName).toBe('Bob')
    })
  })

  describe('data loading tracker integration', () => {
    it('updates data source progress on loading', async () => {
      mockStore.currentSection = { sectionId: '123', termId: '456' }
      mockStore.userRole = 'admin'
      
      // Create a promise we can control
      let resolveMembers: (value: any) => void
      const membersPromise = new Promise((resolve) => {
        resolveMembers = resolve
      })
      mockGetMembers.mockReturnValue(membersPromise)

      renderHook(() => useMembers(), { wrapper: createWrapper() })

      // Should update progress to loading state
      await waitFor(() => {
        expect(mockStore.updateDataSourceProgress).toHaveBeenCalledWith(
          'members',
          expect.objectContaining({
            state: 'loading',
          })
        )
      })

      // Resolve the members
      act(() => {
        resolveMembers!([])
      })

      // Wait for the hook to process
      await waitFor(() => {
        expect(mockStore.updateDataSourceProgress).toHaveBeenCalled()
      })
    })
  })

  describe('refresh functionality', () => {
    it('provides a refresh function that invalidates the query', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      mockStore.currentSection = { sectionId: '123', termId: '456' }
      mockStore.userRole = 'admin'
      mockGetMembers.mockResolvedValue([])

      const { result } = renderHook(() => useMembers(), { 
        wrapper: createWrapper(queryClient) 
      })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })

      expect(typeof result.current.refresh).toBe('function')

      // Call refresh
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
      
      act(() => {
        result.current.refresh()
      })

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: membersKeys.section('planning', '123', '456'),
      })
    })
  })

  describe('custom data loaders', () => {
    beforeEach(() => {
      mockStore.currentSection = { sectionId: '123', termId: '456' }
      mockStore.userRole = 'admin'
      mockGetMembers.mockResolvedValue([
        {
          scoutid: 1,
          firstname: 'Alice',
          lastname: 'Smith',
          sectionid: 123,
          patrolid: 1,
          patrol: 'Eagles',
          active: true,
          age: '12',
        },
        {
          scoutid: 2,
          firstname: 'Bob',
          lastname: 'Brown',
          sectionid: 123,
          patrolid: 2,
          patrol: 'Foxes',
          active: true,
          age: '13',
        },
      ])
      mockGetMemberIndividual.mockResolvedValue({ data: { date_of_birth: '2012-01-01' } })
      mockGetMemberCustomData.mockResolvedValue({ data: { medical: 'None' } })
    })

    it('hydrates custom data when requested for a single member', async () => {
      const { result } = renderHook(() => useMembers(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.members[0]?.loadingState).toBe('individual')
      })

      await act(async () => {
        await result.current.loadMemberCustomData('1')
      })

      expect(mockGetMemberCustomData).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionid: 123,
          scoutid: 1,
        })
      )

      const updatedMember = result.current.members.find((m) => m.id === '1')
      expect(updatedMember?.loadingState).toBe('complete')
      expect(updatedMember?.medicalNotes).toBe('None')
    })

    it('skips custom data fetch if member already complete', async () => {
      const { result } = renderHook(() => useMembers(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.members[0]?.loadingState).toBe('individual')
      })

      await act(async () => {
        await result.current.loadMemberCustomData('1')
      })
      mockGetMemberCustomData.mockClear()

      const status = await result.current.loadMemberCustomData('1')
      expect(status).toEqual({ status: 'skipped' })
      expect(mockGetMemberCustomData).not.toHaveBeenCalled()
    })

    it('loads missing member custom data with progress callback', async () => {
      const { result } = renderHook(() => useMembers(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.members.every((m) => m.loadingState === 'individual')).toBe(true)
      })

      const progressSpy = jest.fn()

      await act(async () => {
        await result.current.loadMissingMemberCustomData({ onProgress: progressSpy })
      })

      expect(mockGetMemberCustomData).toHaveBeenCalledTimes(2)
      expect(progressSpy).toHaveBeenCalledWith({ total: 2, completed: 0 })
      expect(progressSpy).toHaveBeenCalledWith({ total: 2, completed: 1 })
      expect(progressSpy).toHaveBeenLastCalledWith({ total: 2, completed: 2 })

      const members = result.current.members
      expect(members.every((m) => m.loadingState === 'complete')).toBe(true)
    })
  })
})
