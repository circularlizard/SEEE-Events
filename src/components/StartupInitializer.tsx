'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useStore } from '@/store/use-store'

/**
 * StartupInitializer
 *
 * Client component that initializes the Zustand store with user data.
 * Fetches full section data from Redis via API endpoint.
 *
 * SAFETY: Only fetches data once when user is authenticated.
 * Uses a ref to prevent duplicate requests.
 *
 * Render at app layout level under SessionProvider and QueryProvider.
 */
export default function StartupInitializer() {
  const { data: session, status } = useSession()
  const setUserRole = useStore((s) => s.setUserRole)
  const setAvailableSections = useStore((s) => s.setAvailableSections)
  const setCurrentSection = useStore((s) => s.setCurrentSection)
  const setAccessControlStrategy = useStore((s) => s.setAccessControlStrategy)
  const setAllowedPatrolIds = useStore((s) => s.setAllowedPatrolIds)
  const setAllowedEventIds = useStore((s) => s.setAllowedEventIds)
  const sectionPickerOpen = useStore((s) => s.sectionPickerOpen)
  const setSectionPickerOpen = useStore((s) => s.setSectionPickerOpen)
  const currentSection = useStore((s) => s.currentSection)
  const selectedSections = useStore((s) => s.selectedSections)
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Safety checks: only fetch once when authenticated
    if (status !== 'authenticated' || !session?.user || hasInitialized.current) {
      return
    }

    const userId = (session.user as any).id
    if (!userId) {
      return
    }

    hasInitialized.current = true

    async function fetchSections() {
      try {
        // Fetch full section data from Redis
        const response = await fetch('/api/auth/oauth-data')
        if (!response.ok) {
          if (response.status === 503) {
            const { message } = await response.json().catch(() => ({ message: 'Redis unavailable' }))
            console.warn('[StartupInitializer] OAuth cache unavailable (Redis).', message)
          } else {
            console.error('[StartupInitializer] Failed to fetch OAuth data:', response.status, response.statusText)
          }
          return
        }
        
        const data = await response.json()
        const sections = data.sections || []
        
        // Determine role based on permissions
        const hasEventsAccess = sections.some((s: any) => s.upgrades?.events)
        const hasProgrammeAccess = sections.some((s: any) => s.upgrades?.programme)
        
        // Role heuristic: events + programme = standard, events only = readonly
        const role = hasEventsAccess && hasProgrammeAccess ? 'standard' : 'readonly'
        setUserRole(role)

        // Transform OAuth sections to store format
        const storeSections = sections.map((s: any) => {
          const terms = Array.isArray(s.terms) ? s.terms : []
          const latestTerm = terms.length > 0 ? terms[terms.length - 1] : null
          const termId = latestTerm?.term_id ? String(latestTerm.term_id) : undefined
          return {
            sectionId: String(s.section_id),
            sectionName: s.section_name,
            sectionType: s.section_type,
            termId,
          }
        })
        setAvailableSections(storeSections)

        // Auto-select when exactly one section is available and none selected yet
        if (storeSections.length === 1) {
          setCurrentSection({
            sectionId: storeSections[0].sectionId,
            sectionName: storeSections[0].sectionName,
            sectionType: storeSections[0].sectionType,
            termId: storeSections[0].termId,
          })
        }

        // Force-open the Section Picker if there are sections and none are selected yet,
        // even if something is cached from a previous session.
        const state = useStore.getState()
        const noneSelected = !state.currentSection && (!state.selectedSections || state.selectedSections.length === 0)
        if (storeSections.length > 0 && noneSelected && !state.sectionPickerOpen) {
          setSectionPickerOpen(true)
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[StartupInitializer] Forcing Section Picker open on login (sections available, none selected)')
          }
        }

        // Fetch access control config (placeholder values for now)
        try {
          const acResp = await fetch('/api/config/access')
          if (acResp.ok) {
            const ac = await acResp.json()
            setAccessControlStrategy(ac.accessControlStrategy)
            setAllowedPatrolIds(new Set<string>(ac.allowedPatrolIds || []))
            setAllowedEventIds(new Set<string>(ac.allowedEventIds || []))
          }
        } catch (e) {
          console.warn('[StartupInitializer] Failed to fetch access control config')
        }
      } catch (error) {
        console.error('[StartupInitializer] Error fetching OAuth data:', error)
        hasInitialized.current = false // Allow retry on error
      }
    }

    fetchSections()
  }, [status, session, setUserRole, setAvailableSections, setCurrentSection, setSectionPickerOpen])

  return null
}
