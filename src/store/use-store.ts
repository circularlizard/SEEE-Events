import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NormalizedMember, Event } from '@/lib/schemas'
import type { AppKey } from '@/types/app'

/**
 * User Role Types
 * - admin: Full access including configuration management
 * - standard: Standard leader with patrol/event-based access
 * - readonly: View-only access
 */
export type UserRole = 'admin' | 'standard' | 'readonly'

/**
 * Theme Mode
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Section Information
 */
export interface Section {
  sectionId: string
  sectionName: string
  sectionType: string
  termId?: string
}

/**
 * Session State
 * Stores user's current session information including selected section and role
 */
interface SessionState {
  // Current selected section
  currentSection: Section | null
  setCurrentSection: (section: Section | null) => void

  // Multiple selected sections
  selectedSections: Section[]
  setSelectedSections: (sections: Section[]) => void

  // Current app context (planning, expedition, platform-admin, multi)
  currentApp: AppKey | null
  setCurrentApp: (app: AppKey | null) => void

  // User role (determined from startup data)
  userRole: UserRole | null
  setUserRole: (role: UserRole | null) => void

  // Available sections for the user
  availableSections: Section[]
  setAvailableSections: (sections: Section[]) => void

  // Hydration state (true after persisted state is loaded from localStorage)
  _hasHydrated: boolean
  setHasHydrated: (hydrated: boolean) => void

  // Clear all session data (for logout)
  clearSession: () => void
}

/**
 * Configuration State
 * Stores application configuration loaded from Redis
 */
interface ConfigState {
  // Badge ID mappings (e.g., First Aid badge ID)
  badgeMappings: Record<string, string>
  setBadgeMappings: (mappings: Record<string, string>) => void

  // Flexi column mappings (user-defined column to system field)
  flexiColumnMappings: Record<string, string>
  setFlexiColumnMappings: (mappings: Record<string, string>) => void

  // Access control strategy and mappings
  // Strategy A: Patrol-based filtering (members/events tied to patrols)
  // Strategy B: Event-based filtering (explicit event allowlists per role)
  accessControlStrategy: 'A' | 'B'
  setAccessControlStrategy: (strategy: 'A' | 'B') => void
  // Map of patrolId -> allowed (for Strategy A)
  allowedPatrolIds: Set<string>
  setAllowedPatrolIds: (ids: Set<string>) => void
  // Map of eventId -> allowed (for Strategy B)
  allowedEventIds: Set<string>
  setAllowedEventIds: (ids: Set<string>) => void

  // Configuration loaded flag
  configLoaded: boolean
  setConfigLoaded: (loaded: boolean) => void

  // Clear configuration (for factory reset)
  clearConfig: () => void
}

/**
 * Theme State
 * Stores user's theme preference
 */
interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

/**
 * Queue State
 * Manages event summary prefetch queue
 */
interface QueueState {
  // Queue items (event IDs to fetch)
  queueItems: number[]
  // Currently running fetch count
  queueRunning: number
  // Timer active flag
  queueTimerActive: boolean
  
  // Actions
  enqueueItems: (ids: number[]) => void
  dequeueItem: () => number | null
  setQueueRunning: (count: number) => void
  setQueueTimerActive: (active: boolean) => void
  clearQueue: () => void
}

/**
 * Generic Data Loading State
 * Used for tracking loading progress of any data source
 */
export type DataLoadingState = 
  | 'idle' 
  | 'loading' 
  | 'complete' 
  | 'error'

/**
 * Data Source Progress
 * Tracks loading progress for a single data source
 */
export interface DataSourceProgress {
  id: string           // Unique identifier (e.g., 'members', 'events')
  label: string        // Display label (e.g., 'Members', 'Events')
  state: DataLoadingState
  total: number
  completed: number
  phase: string        // Current phase description
  error?: string       // Error message if state is 'error'
}

/**
 * Members Loading State (legacy, kept for compatibility)
 */
export type MembersLoadingState = 
  | 'idle' 
  | 'loading-summary' 
  | 'loading-individual' 
  | 'loading-custom' 
  | 'complete' 
  | 'error'

/**
 * Members Progress (legacy, kept for compatibility)
 */
export interface MembersProgress {
  total: number
  completed: number
  phase: string
}

/**
 * Members State
 * Stores normalized member data for admin users
 */
interface MembersState {
  // Normalized member data
  members: NormalizedMember[]
  
  // Overall loading state
  membersLoadingState: MembersLoadingState
  
  // Progress tracking
  membersProgress: MembersProgress
  
  // Last updated timestamp
  membersLastUpdated: Date | null
  
  // Section ID for which members are loaded (to detect stale data)
  membersSectionId: string | null
  
  // Actions
  setMembers: (members: NormalizedMember[]) => void
  updateMember: (id: string, updates: Partial<NormalizedMember>) => void
  setMembersLoadingState: (state: MembersLoadingState) => void
  setMembersProgress: (progress: MembersProgress) => void
  setMembersLastUpdated: (date: Date | null) => void
  setMembersSectionId: (sectionId: string | null) => void
  clearMembers: () => void
}

/**
 * Events State
 * Stores events data with eager loading
 */
interface EventsState {
  // Events data
  events: Event[]
  
  // Loading state
  eventsLoadingState: DataLoadingState
  
  // Progress tracking
  eventsProgress: { total: number; completed: number; phase: string }
  
  // Last updated timestamp
  eventsLastUpdated: Date | null
  
  // Section ID(s) for which events are loaded
  eventsSectionIds: string[] | null
  
  // Actions
  setEvents: (events: Event[]) => void
  setEventsLoadingState: (state: DataLoadingState) => void
  setEventsProgress: (progress: { total: number; completed: number; phase: string }) => void
  setEventsLastUpdated: (date: Date | null) => void
  setEventsSectionIds: (sectionIds: string[] | null) => void
  clearEvents: () => void
}

/**
 * Unified Data Loading State
 * Tracks all data sources for the global progress banner
 */
interface DataLoadingTrackerState {
  // Map of data source ID to progress
  dataSourceProgress: Record<string, DataSourceProgress>
  
  // Actions
  updateDataSourceProgress: (id: string, progress: Partial<DataSourceProgress>) => void
  clearDataSourceProgress: (id: string) => void
  clearAllDataSourceProgress: () => void
}

/**
 * Combined Store State
 */
type StoreState = SessionState & ConfigState & ThemeState & QueueState & MembersState & EventsState & DataLoadingTrackerState

/**
 * Main Application Store
 * 
 * Combines session, configuration, and theme state using Zustand.
 * Session and theme are persisted to localStorage.
 * 
 * Usage:
 * ```tsx
 * import { useStore } from '@/store/use-store'
 * 
 * function MyComponent() {
 *   const currentSection = useStore((state) => state.currentSection)
 *   const setCurrentSection = useStore((state) => state.setCurrentSection)
 *   
 *   return <div>{currentSection?.sectionName}</div>
 * }
 * ```
 */
export const useStore = create<StoreState>()(
  persist(
    (set): StoreState => ({
      // Session State
      currentSection: null,
      setCurrentSection: (section) => set({ currentSection: section }),

      selectedSections: [],
      setSelectedSections: (sections) => set({ selectedSections: sections }),

      currentApp: null,
      setCurrentApp: (currentApp) => set({ currentApp }),

      userRole: null,
      setUserRole: (role) => set({ userRole: role }),

      availableSections: [],
      setAvailableSections: (sections) => set({ availableSections: sections }),

      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

      clearSession: () =>
        set({
          currentSection: null,
          selectedSections: [],
          currentApp: null,
          userRole: null,
          availableSections: [],
        }),

      // Configuration State
      badgeMappings: {},
      setBadgeMappings: (mappings) => set({ badgeMappings: mappings }),

      flexiColumnMappings: {},
      setFlexiColumnMappings: (mappings) => set({ flexiColumnMappings: mappings }),

      accessControlStrategy: 'A',
      setAccessControlStrategy: (strategy) => set({ accessControlStrategy: strategy }),
      allowedPatrolIds: new Set<string>(),
      setAllowedPatrolIds: (ids) => set({ allowedPatrolIds: ids }),
      allowedEventIds: new Set<string>(),
      setAllowedEventIds: (ids) => set({ allowedEventIds: ids }),

      configLoaded: false,
      setConfigLoaded: (loaded) => set({ configLoaded: loaded }),

      clearConfig: () =>
        set({
          badgeMappings: {},
          flexiColumnMappings: {},
          accessControlStrategy: 'A',
          allowedPatrolIds: new Set<string>(),
          allowedEventIds: new Set<string>(),
          configLoaded: false,
        }),

      // Theme State
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Queue State
      queueItems: [],
      queueRunning: 0,
      queueTimerActive: false,
      enqueueItems: (ids) => set((state) => {
        const existing = new Set(state.queueItems)
        const newItems = ids.filter(id => !existing.has(id))
        if (newItems.length === 0) return state
        return { queueItems: [...state.queueItems, ...newItems] }
      }),
      dequeueItem: () => {
        const item = useStore.getState().queueItems[0]
        if (item !== undefined) {
          set((state) => ({ queueItems: state.queueItems.slice(1) }))
          return item
        }
        return null
      },
      setQueueRunning: (count) => set({ queueRunning: count }),
      setQueueTimerActive: (active) => set({ queueTimerActive: active }),
      clearQueue: () => set({ queueItems: [], queueRunning: 0, queueTimerActive: false }),

      // Members State (not persisted - sensitive data)
      members: [],
      membersLoadingState: 'idle',
      membersProgress: { total: 0, completed: 0, phase: '' },
      membersLastUpdated: null,
      membersSectionId: null,
      
      setMembers: (members) => set({ members }),
      updateMember: (id, updates) => set((state) => ({
        members: state.members.map((m) => 
          m.id === id ? { ...m, ...updates } : m
        ),
      })),
      setMembersLoadingState: (membersLoadingState) => set({ membersLoadingState }),
      setMembersProgress: (membersProgress) => set({ membersProgress }),
      setMembersLastUpdated: (membersLastUpdated) => set({ membersLastUpdated }),
      setMembersSectionId: (membersSectionId) => set({ membersSectionId }),
      clearMembers: () => set({
        members: [],
        membersLoadingState: 'idle',
        membersProgress: { total: 0, completed: 0, phase: '' },
        membersLastUpdated: null,
        membersSectionId: null,
      }),

      // Events State (not persisted)
      events: [],
      eventsLoadingState: 'idle',
      eventsProgress: { total: 0, completed: 0, phase: '' },
      eventsLastUpdated: null,
      eventsSectionIds: null,
      
      setEvents: (events) => set({ events }),
      setEventsLoadingState: (eventsLoadingState) => set({ eventsLoadingState }),
      setEventsProgress: (eventsProgress) => set({ eventsProgress }),
      setEventsLastUpdated: (eventsLastUpdated) => set({ eventsLastUpdated }),
      setEventsSectionIds: (eventsSectionIds) => set({ eventsSectionIds }),
      clearEvents: () => set({
        events: [],
        eventsLoadingState: 'idle',
        eventsProgress: { total: 0, completed: 0, phase: '' },
        eventsLastUpdated: null,
        eventsSectionIds: null,
      }),

      // Unified Data Loading Tracker
      dataSourceProgress: {},
      
      updateDataSourceProgress: (id, progress) => set((state) => ({
        dataSourceProgress: {
          ...state.dataSourceProgress,
          [id]: {
            ...state.dataSourceProgress[id],
            id,
            label: progress.label ?? state.dataSourceProgress[id]?.label ?? id,
            state: progress.state ?? state.dataSourceProgress[id]?.state ?? 'idle',
            total: progress.total ?? state.dataSourceProgress[id]?.total ?? 0,
            completed: progress.completed ?? state.dataSourceProgress[id]?.completed ?? 0,
            phase: progress.phase ?? state.dataSourceProgress[id]?.phase ?? '',
            error: progress.error,
          },
        },
      })),
      
      clearDataSourceProgress: (id) => set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _removed, ...rest } = state.dataSourceProgress
        return { dataSourceProgress: rest }
      }),
      
      clearAllDataSourceProgress: () => set({ dataSourceProgress: {} }),
    }),
    {
      name: 'seee-storage',
      // Only persist session and theme, not configuration (config comes from Redis)
      partialize: (state) => ({
        currentSection: state.currentSection,
        selectedSections: state.selectedSections,
        currentApp: state.currentApp,
        userRole: state.userRole,
        accessControlStrategy: state.accessControlStrategy,
        allowedPatrolIds: state.allowedPatrolIds,
        allowedEventIds: state.allowedEventIds,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

/**
 * Selector Hooks for convenience
 */

export const useCurrentSection = () => useStore((state) => state.currentSection)
export const useCurrentApp = () => useStore((state) => state.currentApp)
export const useUserRole = () => useStore((state) => state.userRole)
export const useTheme = () => useStore((state) => state.theme)
export const useBadgeMappings = () => useStore((state) => state.badgeMappings)
export const useFlexiColumnMappings = () => useStore((state) => state.flexiColumnMappings)

export const useIsPlanningApp = () => useStore((state) => state.currentApp === 'planning')
export const useIsExpeditionApp = () => useStore((state) => state.currentApp === 'expedition')
export const useIsPlatformAdminApp = () =>
  useStore((state) => state.currentApp === 'platform-admin')
export const useIsMultiApp = () => useStore((state) => state.currentApp === 'multi')

export const getCurrentApp = () => useStore.getState().currentApp

/**
 * @deprecated Use `useMembers` from `@/hooks/useMembers` instead.
 * React Query is now the single source of truth for members data.
 */
export const useMembersZustand = () => useStore((state) => state.members)
/** @deprecated Use `useMembers` from `@/hooks/useMembers` instead. */
export const useMembersLoadingState = () => useStore((state) => state.membersLoadingState)
/** @deprecated Use `useMembers` from `@/hooks/useMembers` instead. */
export const useMembersProgress = () => useStore((state) => state.membersProgress)
/** @deprecated Use `useMembers` from `@/hooks/useMembers` instead. */
export const useMembersLastUpdated = () => useStore((state) => state.membersLastUpdated)

/**
 * @deprecated Use `useEvents` from `@/hooks/useEvents` instead.
 * React Query is now the single source of truth for events data.
 */
export const useEventsData = () => useStore((state) => state.events)
/** @deprecated Use `useEvents` from `@/hooks/useEvents` instead. */
export const useEventsLoadingState = () => useStore((state) => state.eventsLoadingState)
/** @deprecated Use `useEvents` from `@/hooks/useEvents` instead. */
export const useEventsProgress = () => useStore((state) => state.eventsProgress)
/** @deprecated Use `useEvents` from `@/hooks/useEvents` instead. */
export const useEventsLastUpdated = () => useStore((state) => state.eventsLastUpdated)

// Unified data loading selectors
export const useDataSourceProgress = () => useStore((state) => state.dataSourceProgress)
export const useDataSourceProgressById = (id: string) => useStore((state) => state.dataSourceProgress[id])

/**
 * Access Control Selectors (Phase 2.8.1)
 *
 * These helpers filter domain arrays based on `userRole` and configured
 * Strategy A/B plus allowed IDs. Admin role bypasses filters.
 */

type Member = {
  memberId: string
  patrolId?: string | null
}

type EventSummary = {
  eventId: string
  patrolId?: string | null
}

type LogisticsItem = {
  id: string
  eventId?: string | null
  patrolId?: string | null
}

export function getFilteredMembers(members: Member[]): Member[] {
  const { userRole, accessControlStrategy, allowedPatrolIds } = useStore.getState()
  if (!userRole || userRole === 'admin') return members

  if (accessControlStrategy === 'A') {
    return members.filter((m) => !m.patrolId || allowedPatrolIds.has(m.patrolId))
  }
  // Strategy B does not constrain members directly
  return members
}

export function getFilteredEvents(events: EventSummary[]): EventSummary[] {
  const { userRole, accessControlStrategy, allowedPatrolIds, allowedEventIds } = useStore.getState()
  if (!userRole || userRole === 'admin') return events

  if (accessControlStrategy === 'A') {
    return events.filter((e) => !e.patrolId || allowedPatrolIds.has(e.patrolId))
  }
  return events.filter((e) => allowedEventIds.has(e.eventId))
}

export function getFilteredLogistics(items: LogisticsItem[]): LogisticsItem[] {
  const { userRole, accessControlStrategy, allowedPatrolIds, allowedEventIds } = useStore.getState()
  if (!userRole || userRole === 'admin') return items

  if (accessControlStrategy === 'A') {
    return items.filter((i) => !i.patrolId || allowedPatrolIds.has(i.patrolId))
  }
  return items.filter((i) => (i.eventId ? allowedEventIds.has(i.eventId) : true))
}
