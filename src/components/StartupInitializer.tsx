'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useStore } from '@/store/use-store'
import { validateAppPermissions } from '@/lib/permissions'
import type { OAuthData } from '@/lib/redis'
import type { AppKey } from '@/types/app'
import { SEEE_FALLBACK_SECTION, SEEE_SECTION_ID } from '@/lib/seee'

const REMEMBER_KEY = 'seee.sectionSelection.v1'

interface RememberedSelection {
  userId: string
  selectedSectionIds: string[]
  timestamp: string
}

/** Section from OAuth data with optional upgrades and terms */
type OAuthSection = OAuthData['sections'][number] & {
  upgrades?: { events?: boolean; programme?: boolean }
  terms?: Array<{ term_id?: string | number }>
  section_type?: string
}

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
  const router = useRouter()
  const pathname = usePathname()
  const currentSection = useStore((s) => s.currentSection)
  const setUserRole = useStore((s) => s.setUserRole)
  const setAvailableSections = useStore((s) => s.setAvailableSections)
  const setCurrentSection = useStore((s) => s.setCurrentSection)
  const setCurrentApp = useStore((s) => s.setCurrentApp)
  const setSelectedSections = useStore((s) => s.setSelectedSections)
  const setAccessControlStrategy = useStore((s) => s.setAccessControlStrategy)
  const setAllowedPatrolIds = useStore((s) => s.setAllowedPatrolIds)
  const setAllowedEventIds = useStore((s) => s.setAllowedEventIds)
  const setPermissionValidated = useStore((s) => s.setPermissionValidated)
  const setMissingPermissions = useStore((s) => s.setMissingPermissions)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!pathname?.startsWith('/dashboard')) return

    const sessionError = (session as { error?: string } | null)?.error
    if (status === 'unauthenticated' || sessionError === 'SessionExpired') {
      hasInitialized.current = false
      const callbackUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/dashboard'
      router.replace(`/?callbackUrl=${encodeURIComponent(callbackUrl)}`)
    }
  }, [pathname, router, session, status])

  useEffect(() => {
    // Safety checks: only fetch once when authenticated
    if (status !== 'authenticated' || !session?.user || hasInitialized.current) {
      return
    }

    const userId = session.user && 'id' in session.user ? (session.user as { id: string }).id : undefined
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
        const sectionTerms: Record<string, Array<{ term_id?: string | number; termid?: string | number }>> = data.terms || {}
        
        // Use roleSelection from session (set during OAuth login based on provider choice)
        // Falls back to permission-based heuristic if not available
        const { roleSelection: sessionRole, appSelection: sessionApp } = session as {
          roleSelection?: 'admin' | 'standard' | 'data-quality'
          appSelection?: AppKey
        }

        let role: 'admin' | 'standard' | 'data-quality' | 'readonly'
        
        if (sessionRole === 'admin') {
          role = 'admin'
        } else if (sessionRole === 'standard') {
          role = 'standard'
        } else if (sessionRole === 'data-quality') {
          role = 'data-quality'
        } else {
          // Fallback: determine role based on permissions
          const hasEventsAccess = sections.some((s: OAuthSection) => s.upgrades?.events)
          const hasProgrammeAccess = sections.some((s: OAuthSection) => s.upgrades?.programme)
          role = hasEventsAccess && hasProgrammeAccess ? 'standard' : 'readonly'
        }
        
        setUserRole(role)

        // Check for appSelection in URL query params (from OAuth callback)
        // or use session value
        let appToSet: AppKey | null = null
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const urlApp = urlParams.get('appSelection') as AppKey | null
          if (urlApp) {
            appToSet = urlApp
            // Clean up URL after extracting app selection
            urlParams.delete('appSelection')
            const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`
            window.history.replaceState({}, '', newUrl)
          }
        }
        
        if (appToSet) {
          setCurrentApp(appToSet)
        } else if (sessionApp) {
          setCurrentApp(sessionApp)
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[StartupInitializer] User role set to:', role, '(from session:', sessionRole, '), app:', appToSet || sessionApp)
        }

        // Transform OAuth sections to store format
        const storeSections = sections.map((s: OAuthSection) => {
          const sectionId = String(s.section_id)
          const termsArray = Array.isArray(s.terms) && s.terms.length > 0
            ? s.terms
            : Array.isArray(sectionTerms[sectionId])
              ? sectionTerms[sectionId]
              : []
          const latestTerm = termsArray.length > 0 ? termsArray[termsArray.length - 1] : null
          const latestTermId = latestTerm && ('term_id' in latestTerm ? latestTerm.term_id : (latestTerm as { termid?: string | number }).termid)
          const termId = latestTermId !== undefined ? String(latestTermId) : undefined
          return {
            sectionId,
            sectionName: s.section_name,
            sectionType: s.section_type,
            termId,
          }
        })

        // Determine app type for section model + permission validation.
        // SEEE-specific apps are locked to the SEEE section.
        const currentApp = appToSet || sessionApp
        const seeeApps: AppKey[] = ['planning', 'expedition']
        const isSEEEApp = Boolean(currentApp && seeeApps.includes(currentApp))
        
        // Validate permissions for the selected app (REQ-AUTH-16)
        // For SEEE apps, we only need to check if user has access to the SEEE section
        // (available from OAuth data). For other apps, we'd need startup data for
        // detailed permissions, but that endpoint returns JSONP not JSON.
        if (isSEEEApp) {
          // SEEE apps: validate access to SEEE section from OAuth data
          const seeeSection = storeSections.find((s: { sectionId: string }) => s.sectionId === SEEE_SECTION_ID)
          if (seeeSection) {
            setAvailableSections([seeeSection])
            setPermissionValidated(true)
            setMissingPermissions([])
            if (process.env.NODE_ENV !== 'production') {
              console.debug('[StartupInitializer] SEEE section access validated for app:', currentApp)
            }
          } else {
            const missing = validateAppPermissions(currentApp as AppKey, null)
            console.warn('[StartupInitializer] SEEE section not present in accessible sections for app:', currentApp, missing)
            setMissingPermissions(missing)
            setPermissionValidated(false)
            return
          }
        } else if (currentApp) {
          // Non-SEEE apps: use all available sections from OAuth data
          // Note: The ext/generic/startup endpoint returns JSONP (JavaScript), not JSON,
          // so we cannot use it for detailed permission validation. Fall back to OAuth sections.
          setAvailableSections(storeSections)
          setPermissionValidated(true)
          setMissingPermissions([])
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[StartupInitializer] Using OAuth sections for app:', currentApp, 'sections:', storeSections.length)
          }
        } else {
          // No app selected yet - skip permission validation
          setAvailableSections(storeSections)
          setPermissionValidated(true)
          setMissingPermissions([])
        }

        // If permissions are still pending (no missing list, not validated yet), don't proceed.
        // (ClientShell will show the gating UI.)
        // This is defensive; in normal flow, the branches above set validated/denied.
        
        // Build a set of valid section IDs for validation (post-filtering)
        const currentAvailable = useStore.getState().availableSections
        const sectionIds = new Set(currentAvailable.map((s: { sectionId: string }) => s.sectionId))
        
        if (isSEEEApp) {
          // Try to find SEEE section (ID 43105) in available sections, fall back to static metadata.
          const seeeSection = currentAvailable.find((s: { sectionId: string }) => s.sectionId === SEEE_SECTION_ID) ?? {
            ...SEEE_FALLBACK_SECTION,
            termId: undefined,
          }
          setCurrentSection(seeeSection)
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[StartupInitializer] Auto-selected SEEE section for app:', currentApp, 'using', seeeSection.sectionName)
          }
          return // Skip section picker for SEEE apps
        }
        
        // Auto-select when exactly one section is available
        if (currentAvailable.length === 1) {
          setCurrentSection({
            sectionId: currentAvailable[0].sectionId,
            sectionName: currentAvailable[0].sectionName,
            sectionType: currentAvailable[0].sectionType,
            termId: currentAvailable[0].termId,
          })
          return // No need to check remembered selection or redirect
        }
        
        // For multi-section users, check for remembered selection in localStorage
        let rememberedValid = false
        try {
          const stored = localStorage.getItem(REMEMBER_KEY)
          if (stored) {
            const remembered: RememberedSelection = JSON.parse(stored)
            
            // Validate userId matches current user (prevents cross-user issues on shared devices)
            if (remembered.userId !== userId) {
              if (process.env.NODE_ENV !== 'production') {
                console.debug('[StartupInitializer] Remembered selection userId mismatch, clearing')
              }
              localStorage.removeItem(REMEMBER_KEY)
            } else {
              const validIds = remembered.selectedSectionIds.filter(id => sectionIds.has(id))
              
              if (validIds.length > 0) {
                // Hydrate store with remembered selection
                const selected = currentAvailable.filter((s: { sectionId: string }) => validIds.includes(s.sectionId))
                if (selected.length === 1) {
                  setCurrentSection(selected[0])
                  setSelectedSections([])
                } else {
                  setCurrentSection(null)
                  setSelectedSections(selected)
                }
                rememberedValid = true
                if (process.env.NODE_ENV !== 'production') {
                  console.debug('[StartupInitializer] Restored remembered section selection:', validIds)
                }
              } else {
                // Remembered selection is stale (sections no longer available), clear it
                localStorage.removeItem(REMEMBER_KEY)
              }
            }
          }
        } catch {
          // localStorage unavailable or invalid JSON
        }
        
        // Only skip section picker if user explicitly chose "remember my selection"
        // Zustand persistence keeps the selection during the session, but doesn't skip the picker on new login
        // The rememberedValid flag is set only when the explicit localStorage key exists
        
        // Redirect to section picker if multi-section user without remembered selection
        // Skip if already on the section picker page OR if a section is already selected in the store
        if (currentAvailable.length > 1 && !rememberedValid && !currentSection && pathname !== '/dashboard/section-picker') {
          const redirectTo = pathname?.startsWith('/dashboard') ? pathname : '/dashboard'
          router.replace(`/dashboard/section-picker?redirect=${encodeURIComponent(redirectTo)}`)
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[StartupInitializer] Redirecting to section picker (multiple sections, no remembered selection)')
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
        } catch {
          console.warn('[StartupInitializer] Failed to fetch access control config')
        }
      } catch (error) {
        console.error('[StartupInitializer] Error fetching OAuth data:', error)
        hasInitialized.current = false // Allow retry on error
      }
    }

    fetchSections()
  }, [
    status,
    session,
    pathname,
    router,
    currentSection,
    setUserRole,
    setAvailableSections,
    setCurrentSection,
    setCurrentApp,
    setSelectedSections,
    setAccessControlStrategy,
    setAllowedPatrolIds,
    setAllowedEventIds,
    setPermissionValidated,
    setMissingPermissions,
  ])

  return null
}
