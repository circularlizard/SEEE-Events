/**
 * App Route Guards Tests
 * 
 * Tests for Stage 9 verification:
 * - getRequiredAppForPath - path-to-app mapping
 * - isPathAllowedForApp - authorization checks
 * - getDefaultPathForApp - app-specific defaults
 * - isRoleAllowed - role-based access control
 */

import {
  getRequiredAppForPath,
  isPathAllowedForApp,
  getDefaultPathForApp,
  getRequiredRoleForPath,
  isRoleAllowed,
} from '../app-route-guards'
import type { AppKey } from '@/types/app'

describe('app-route-guards', () => {
  describe('getRequiredAppForPath', () => {
    describe('platform-admin routes', () => {
      it('detects /dashboard/admin routes', () => {
        expect(getRequiredAppForPath('/dashboard/admin')).toBe('platform-admin')
        expect(getRequiredAppForPath('/dashboard/admin/config')).toBe('platform-admin')
      })

      it('detects /dashboard/api-browser routes', () => {
        expect(getRequiredAppForPath('/dashboard/api-browser')).toBe('platform-admin')
      })

      it('detects /dashboard/debug routes', () => {
        expect(getRequiredAppForPath('/dashboard/debug/oauth')).toBe('platform-admin')
        expect(getRequiredAppForPath('/dashboard/debug/queue')).toBe('platform-admin')
      })

      it('detects /dashboard/platform routes', () => {
        expect(getRequiredAppForPath('/dashboard/platform')).toBe('platform-admin')
      })
    })

    describe('multi-section viewer routes', () => {
      it('detects /dashboard/members routes', () => {
        expect(getRequiredAppForPath('/dashboard/members')).toBe('multi')
        expect(getRequiredAppForPath('/dashboard/members/issues')).toBe('multi')
      })

      it('detects /dashboard/section-picker routes as app-agnostic', () => {
        // Section picker is app-agnostic (accessible from any app)
        expect(getRequiredAppForPath('/dashboard/section-picker')).toBeNull()
      })
    })

    describe('data-quality routes', () => {
      it('detects /dashboard/data-quality routes', () => {
        expect(getRequiredAppForPath('/dashboard/data-quality')).toBe('data-quality')
        expect(getRequiredAppForPath('/dashboard/data-quality/members')).toBe('data-quality')
        expect(getRequiredAppForPath('/dashboard/data-quality/members/issues')).toBe('data-quality')
      })
    })

    describe('planning routes', () => {
      it('detects /dashboard/planning routes', () => {
        expect(getRequiredAppForPath('/dashboard/planning')).toBe('planning')
      })

      it('detects /dashboard/people routes', () => {
        expect(getRequiredAppForPath('/dashboard/people')).toBe('planning')
      })
    })

    describe('expedition routes', () => {
      it('detects /dashboard root', () => {
        expect(getRequiredAppForPath('/dashboard')).toBe('expedition')
      })

      it('detects /dashboard/events routes', () => {
        expect(getRequiredAppForPath('/dashboard/events')).toBe('expedition')
        expect(getRequiredAppForPath('/dashboard/events/123')).toBe('expedition')
        expect(getRequiredAppForPath('/dashboard/events/attendance')).toBe('expedition')
      })
    })

    describe('unmatched routes', () => {
      it('returns null for non-dashboard routes', () => {
        expect(getRequiredAppForPath('/')).toBeNull()
        expect(getRequiredAppForPath('/login')).toBeNull()
      })

      it('returns null for unknown dashboard routes', () => {
        expect(getRequiredAppForPath('/dashboard/unknown')).toBeNull()
      })
    })

    describe('trailing slash handling', () => {
      it('normalizes paths with trailing slashes', () => {
        expect(getRequiredAppForPath('/dashboard/')).toBe('expedition')
        expect(getRequiredAppForPath('/dashboard/events/')).toBe('expedition')
        expect(getRequiredAppForPath('/dashboard/admin/')).toBe('platform-admin')
      })
    })
  })

  describe('isPathAllowedForApp', () => {
    it('allows matching app and path', () => {
      expect(isPathAllowedForApp('/dashboard/events', 'expedition')).toBe(true)
      expect(isPathAllowedForApp('/dashboard/admin', 'platform-admin')).toBe(true)
      expect(isPathAllowedForApp('/dashboard/planning', 'planning')).toBe(true)
      expect(isPathAllowedForApp('/dashboard/members', 'multi')).toBe(true)
      expect(isPathAllowedForApp('/dashboard/data-quality', 'data-quality')).toBe(true)
      expect(isPathAllowedForApp('/dashboard/data-quality/members', 'data-quality')).toBe(true)
    })

    it('blocks mismatched app and path', () => {
      expect(isPathAllowedForApp('/dashboard/events', 'planning')).toBe(false)
      expect(isPathAllowedForApp('/dashboard/admin', 'expedition')).toBe(false)
      expect(isPathAllowedForApp('/dashboard/planning', 'expedition')).toBe(false)
      expect(isPathAllowedForApp('/dashboard/members', 'expedition')).toBe(false)
      expect(isPathAllowedForApp('/dashboard/data-quality', 'multi')).toBe(false)
    })

    it('allows paths with no required app', () => {
      expect(isPathAllowedForApp('/dashboard/unknown', 'expedition')).toBe(true)
      expect(isPathAllowedForApp('/', 'expedition')).toBe(true)
    })

    it('allows paths when app is null', () => {
      expect(isPathAllowedForApp('/dashboard/events', null)).toBe(true)
      expect(isPathAllowedForApp('/dashboard/admin', null)).toBe(true)
    })
  })

  describe('getDefaultPathForApp', () => {
    it('returns correct default path for expedition', () => {
      expect(getDefaultPathForApp('expedition')).toBe('/dashboard')
    })

    it('returns correct default path for planning', () => {
      expect(getDefaultPathForApp('planning')).toBe('/dashboard/planning')
    })

    it('returns correct default path for platform-admin', () => {
      expect(getDefaultPathForApp('platform-admin')).toBe('/dashboard/admin')
    })

    it('returns correct default path for multi', () => {
      expect(getDefaultPathForApp('multi')).toBe('/dashboard/members')
    })

    it('returns fallback for unknown app', () => {
      expect(getDefaultPathForApp('unknown' as AppKey)).toBe('/dashboard')
    })
  })

  describe('getRequiredRoleForPath', () => {
    it('requires admin role for /dashboard/admin', () => {
      expect(getRequiredRoleForPath('/dashboard/admin')).toBe('admin')
      expect(getRequiredRoleForPath('/dashboard/admin/config')).toBe('admin')
    })

    it('requires admin role for /dashboard/api-browser', () => {
      expect(getRequiredRoleForPath('/dashboard/api-browser')).toBe('admin')
    })

    it('requires admin role for /dashboard/debug', () => {
      expect(getRequiredRoleForPath('/dashboard/debug/oauth')).toBe('admin')
      expect(getRequiredRoleForPath('/dashboard/debug/queue')).toBe('admin')
    })

    it('requires admin role for /dashboard/platform', () => {
      expect(getRequiredRoleForPath('/dashboard/platform')).toBe('admin')
    })

    it('requires admin role for /dashboard/members', () => {
      expect(getRequiredRoleForPath('/dashboard/members')).toBe('admin')
      expect(getRequiredRoleForPath('/dashboard/members/issues')).toBe('admin')
    })

    it('returns null for non-admin routes', () => {
      expect(getRequiredRoleForPath('/dashboard')).toBeNull()
      expect(getRequiredRoleForPath('/dashboard/events')).toBeNull()
      expect(getRequiredRoleForPath('/dashboard/planning')).toBeNull()
    })
  })

  describe('isRoleAllowed', () => {
    it('allows access when no role is required', () => {
      expect(isRoleAllowed(null, 'standard')).toBe(true)
      expect(isRoleAllowed(null, 'admin')).toBe(true)
      expect(isRoleAllowed(null, 'readonly')).toBe(true)
    })

    it('blocks access when user has no role', () => {
      expect(isRoleAllowed('admin', null)).toBe(false)
      expect(isRoleAllowed('standard', null)).toBe(false)
    })

    it('allows admin to access admin routes', () => {
      expect(isRoleAllowed('admin', 'admin')).toBe(true)
    })

    it('blocks standard users from admin routes', () => {
      expect(isRoleAllowed('admin', 'standard')).toBe(false)
    })

    it('blocks readonly users from admin routes', () => {
      expect(isRoleAllowed('admin', 'readonly')).toBe(false)
    })

    it('allows admin to access standard routes', () => {
      expect(isRoleAllowed('standard', 'admin')).toBe(true)
    })

    it('allows standard users to access standard routes', () => {
      expect(isRoleAllowed('standard', 'standard')).toBe(true)
    })

    it('blocks readonly users from standard routes', () => {
      expect(isRoleAllowed('standard', 'readonly')).toBe(false)
    })

    it('allows all roles to access readonly routes', () => {
      expect(isRoleAllowed('readonly', 'admin')).toBe(true)
      expect(isRoleAllowed('readonly', 'standard')).toBe(true)
      expect(isRoleAllowed('readonly', 'readonly')).toBe(true)
    })
  })

  describe('multi-app routing scenarios', () => {
    it('correctly routes all apps to their default paths', () => {
      const apps: AppKey[] = ['expedition', 'planning', 'platform-admin', 'multi']
      
      apps.forEach(app => {
        const defaultPath = getDefaultPathForApp(app)
        const requiredApp = getRequiredAppForPath(defaultPath)
        
        // Default path should match the app (or be allowed for expedition at /dashboard)
        if (app === 'expedition') {
          expect(requiredApp).toBe('expedition')
        } else {
          expect(requiredApp).toBe(app)
        }
        
        // App should be allowed to access its default path
        expect(isPathAllowedForApp(defaultPath, app)).toBe(true)
      })
    })

    it('blocks cross-app navigation', () => {
      expect(isPathAllowedForApp('/dashboard/events', 'planning')).toBe(false)
      expect(isPathAllowedForApp('/dashboard/planning', 'expedition')).toBe(false)
      expect(isPathAllowedForApp('/dashboard/admin', 'expedition')).toBe(false)
      expect(isPathAllowedForApp('/dashboard/members', 'planning')).toBe(false)
    })

    it('allows admin role to access all admin-required routes', () => {
      const adminPaths = [
        '/dashboard/admin',
        '/dashboard/api-browser',
        '/dashboard/debug/oauth',
        '/dashboard/members',
      ]

      adminPaths.forEach(path => {
        const requiredRole = getRequiredRoleForPath(path)
        expect(requiredRole).toBe('admin')
        expect(isRoleAllowed(requiredRole, 'admin')).toBe(true)
        expect(isRoleAllowed(requiredRole, 'standard')).toBe(false)
      })
    })
  })
})
