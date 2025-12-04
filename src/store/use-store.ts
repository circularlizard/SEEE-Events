import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
 * Combined Store State
 */
type StoreState = SessionState & ConfigState & ThemeState

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
    (set) => ({
      // Session State
      currentSection: null,
      setCurrentSection: (section) => set({ currentSection: section }),

      userRole: null,
      setUserRole: (role) => set({ userRole: role }),

      availableSections: [],
      setAvailableSections: (sections) => set({ availableSections: sections }),

      clearSession: () =>
        set({
          currentSection: null,
          userRole: null,
          availableSections: [],
        }),

      // Configuration State
      badgeMappings: {},
      setBadgeMappings: (mappings) => set({ badgeMappings: mappings }),

      flexiColumnMappings: {},
      setFlexiColumnMappings: (mappings) => set({ flexiColumnMappings: mappings }),

      configLoaded: false,
      setConfigLoaded: (loaded) => set({ configLoaded: loaded }),

      clearConfig: () =>
        set({
          badgeMappings: {},
          flexiColumnMappings: {},
          configLoaded: false,
        }),

      // Theme State
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'seee-storage',
      // Only persist session and theme, not configuration (config comes from Redis)
      partialize: (state) => ({
        currentSection: state.currentSection,
        userRole: state.userRole,
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
