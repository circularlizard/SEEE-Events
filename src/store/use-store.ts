import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NormalizedMember } from '@/lib/schemas'

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

  // User role (determined from startup data)
  userRole: UserRole | null
  setUserRole: (role: UserRole | null) => void

  // Available sections for the user
  availableSections: Section[]
  setAvailableSections: (sections: Section[]) => void

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
 * Members Loading State
 */
export type MembersLoadingState = 
  | 'idle' 
  | 'loading-summary' 
  | 'loading-individual' 
  | 'loading-custom' 
  | 'complete' 
  | 'error'

/**
 * Members Progress
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
 * Combined Store State
 */
type StoreState = SessionState & ConfigState & ThemeState & QueueState & MembersState

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

      userRole: null,
      setUserRole: (role) => set({ userRole: role }),

      availableSections: [],
      setAvailableSections: (sections) => set({ availableSections: sections }),

      clearSession: () =>
        set({
          currentSection: null,
          selectedSections: [],
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
    }),
    {
      name: 'seee-storage',
      // Only persist session and theme, not configuration (config comes from Redis)
      partialize: (state) => ({
        currentSection: state.currentSection,
        selectedSections: state.selectedSections,
        userRole: state.userRole,
        accessControlStrategy: state.accessControlStrategy,
        allowedPatrolIds: state.allowedPatrolIds,
        allowedEventIds: state.allowedEventIds,
        theme: state.theme,
      }),
    }
  )
)

/**
 * Selector Hooks for convenience
 */

export const useCurrentSection = () => useStore((state) => state.currentSection)
export const useUserRole = () => useStore((state) => state.userRole)
export const useTheme = () => useStore((state) => state.theme)
export const useBadgeMappings = () => useStore((state) => state.badgeMappings)
export const useFlexiColumnMappings = () => useStore((state) => state.flexiColumnMappings)

// Members selectors
export const useMembers = () => useStore((state) => state.members)
export const useMembersLoadingState = () => useStore((state) => state.membersLoadingState)
export const useMembersProgress = () => useStore((state) => state.membersProgress)
export const useMembersLastUpdated = () => useStore((state) => state.membersLastUpdated)

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
