'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useStore } from '@/store/use-store'
import { validateAppPermissions } from '@/lib/permissions'
import type { OAuthData } from '@/lib/redis'
import type { OsmPermissions } from '@/lib/permissions'
import type { AppKey } from '@/types/app'

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

/** Role from startup data with permissions */
interface StartupRole {
  sectionid: string
  sectionname: string
  section?: string
  permissions?: OsmPermissions
  [key: string]: unknown
}

const SEEE_SECTION_ID = '43105'

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
        
        // Use roleSelection from session (set during OAuth login based on provider choice)
        // Falls back to permission-based heuristic if not available
        const { roleSelection: sessionRole, appSelection: sessionApp } = session as {
          roleSelection?: 'admin' | 'standard'
          appSelection?: AppKey
        }

        let role: 'admin' | 'standard' | 'readonly'
        
        if (sessionRole === 'admin') {
          role = 'admin'
        } else if (sessionRole === 'standard') {
          role = 'standard'
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

        // Determine app type for section model + permission validation.
        // SEEE-specific apps are locked to the SEEE section.
        const currentApp = appToSet || sessionApp
        const seeeApps: AppKey[] = ['planning', 'expedition']
        const isSEEEApp = Boolean(currentApp && seeeApps.includes(currentApp))
        
        // Validate permissions for the selected app (REQ-AUTH-16)
        // Fetch startup data to get permissions from globals.roles
        if (currentApp) {
          try {
            const startupResponse = await fetch('/api/proxy/ext/generic/startup/?action=getData')
            if (startupResponse.ok) {
              const startupData = await startupResponse.json()
              const roles = startupData?.globals?.roles as StartupRole[] | undefined

              const rolesWithPermissions = (roles || []).filter((r) => Boolean(r?.permissions))
              const permissionsBySectionId = new Map<string, OsmPermissions>()
              for (const r of rolesWithPermissions) {
                permissionsBySectionId.set(String(r.sectionid), r.permissions as OsmPermissions)
              }

              // Filter sections to those that are usable for the current app.
              // - SEEE apps: only SEEE section is usable.
              // - Multi-section apps: any section where permissions satisfy the app is usable.
              const permittedSections = (() => {
                if (isSEEEApp) {
                  const seeeSection = storeSections.find((s: { sectionId: string }) => s.sectionId === SEEE_SECTION_ID)
                  return seeeSection ? [seeeSection] : []
                }
                return storeSections.filter((s: { sectionId: string }) => {
                  const perms = permissionsBySectionId.get(s.sectionId)
                  return validateAppPermissions(currentApp, perms).length === 0
                })
              })()

              // Decide permission validation outcome.
              if (isSEEEApp) {
                const seeePerms = permissionsBySectionId.get(SEEE_SECTION_ID)
                const missing = validateAppPermissions(currentApp, seeePerms)
                if (missing.length > 0) {
                  console.warn('[StartupInitializer] Missing SEEE permissions for app:', currentApp, missing)
                  setMissingPermissions(missing)
                  setPermissionValidated(false)
                  return
                }
              } else {
                if (permittedSections.length === 0) {
                  // Compute a helpful missing list using the "best" candidate section (fewest missing perms)
                  const candidates = Array.from(permissionsBySectionId.entries())
                  let bestMissing: string[] | null = null
                  for (const [, perms] of candidates) {
                    const missing = validateAppPermissions(currentApp, perms)
                    if (!bestMissing || missing.length < bestMissing.length) {
                      bestMissing = missing
                    }
                  }
                  const missingToShow = bestMissing ?? validateAppPermissions(currentApp, null)
                  console.warn('[StartupInitializer] Missing permissions on all sections for app:', currentApp, missingToShow)
                  setMissingPermissions(missingToShow)
                  setPermissionValidated(false)
                  return
                }
              }

              // Permissions OK: publish filtered sections.
              setAvailableSections(permittedSections)
              setPermissionValidated(true)
              setMissingPermissions([])
              if (process.env.NODE_ENV !== 'production') {
                console.debug('[StartupInitializer] Permission validation passed for app:', currentApp, 'permittedSections:', permittedSections.length)
              }
            } else {
              // If we cannot load startup data, fail open (do not block the user).
              // This keeps behaviour consistent with the catch branch.
              setAvailableSections(storeSections)
              setPermissionValidated(true)
              setMissingPermissions([])
            }
          } catch (error) {
            console.error('[StartupInitializer] Failed to fetch startup data for permission validation:', error)
            // Continue without permission validation on error - fail open for now
            setAvailableSections(storeSections)
            setPermissionValidated(true)
            setMissingPermissions([])
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
          // Try to find SEEE section (ID 43105) in available sections
          const seeeSection = currentAvailable.find((s: { sectionId: string }) => s.sectionId === SEEE_SECTION_ID)
          if (seeeSection) {
            setCurrentSection({
              sectionId: seeeSection.sectionId,
              sectionName: seeeSection.sectionName,
              sectionType: seeeSection.sectionType,
              termId: seeeSection.termId,
            })
            if (process.env.NODE_ENV !== 'production') {
              console.debug('[StartupInitializer] Auto-selected SEEE section for app:', currentApp)
            }
            return // Skip section picker for SEEE apps
          }
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
        // Skip if already on the section picker page
        if (currentAvailable.length > 1 && !rememberedValid && pathname !== '/dashboard/section-picker') {
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
