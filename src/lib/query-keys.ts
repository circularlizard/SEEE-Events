/**
 * Query Key Factories
 * 
 * Centralized query key management with app-level namespacing.
 * Each app (planning, expedition, platform-admin, multi) gets its own namespace
 * to prevent cache collisions and enable app-specific invalidation.
 * 
 * Pattern: [app, domain, ...params]
 * Examples:
 *   - ['planning', 'events', sectionId, termId]
 *   - ['expedition', 'event-summary', eventId]
 *   - ['platform-admin', 'patrols']
 */

import type { AppKey } from '@/types/app'

/**
 * Events query keys
 */
export const eventsKeys = {
  all: (app: AppKey) => [app, 'events'] as const,
  section: (app: AppKey, sectionId: string, termId: string) => 
    [app, 'events', sectionId, termId] as const,
}

/**
 * Event summary query keys
 */
export const eventSummaryKeys = {
  all: (app: AppKey) => [app, 'event-summary'] as const,
  detail: (app: AppKey, eventId: number) => 
    [app, 'event-summary', eventId] as const,
}

/**
 * Event detail query keys
 */
export const eventDetailKeys = {
  all: (app: AppKey) => [app, 'event-detail'] as const,
  detail: (app: AppKey, eventId: number, termId?: string) => 
    [app, 'event-detail', eventId, termId] as const,
}

/**
 * Members query keys
 */
export const membersKeys = {
  all: (app: AppKey) => [app, 'members'] as const,
  section: (app: AppKey, sectionId: string, termId: string) => 
    [app, 'members', sectionId, termId] as const,
}

/**
 * Attendance query keys
 */
export const attendanceKeys = {
  all: (app: AppKey) => [app, 'attendance'] as const,
}

/**
 * Per-person attendance query keys
 */
export const perPersonAttendanceKeys = {
  all: (app: AppKey) => [app, 'per-person-attendance'] as const,
}

/**
 * Patrol query keys (platform-admin only)
 */
export const patrolKeys = {
  all: (app: AppKey) => [app, 'patrols'] as const,
}

/**
 * Platform telemetry query keys (platform-admin only)
 */
export const telemetryKeys = {
  rateLimit: (app: AppKey) => [app, 'rate-limit-telemetry'] as const,
  cacheStatus: (app: AppKey) => [app, 'platform-cache-status'] as const,
}

/**
 * Legacy query keys (for backward compatibility during migration)
 * These will be deprecated once all hooks are updated to use app-namespaced keys
 */
export const legacyKeys = {
  events: {
    all: ['events'] as const,
    section: (sectionId: string, termId: string) => ['events', sectionId, termId] as const,
  },
  members: {
    all: ['members'] as const,
    section: (sectionId: string, termId: string) => ['members', sectionId, termId] as const,
  },
}
