export type AppKey = 'planning' | 'expedition' | 'platform-admin' | 'multi' | 'data-quality'

export const APP_LABELS: Record<AppKey, string> = {
  planning: 'Expedition Planner',
  expedition: 'Expedition Viewer',
  'platform-admin': 'Platform Admin',
  multi: 'Multi-Section Viewer',
  'data-quality': 'OSM Data Quality',
}

export const APP_DESCRIPTIONS: Record<AppKey, string> = {
  expedition: 'Read-only dashboard for SEEE expedition events and attendance.',
  planning: 'Plan and manage SEEE expeditions, refresh patrol data, and review member details.',
  'data-quality': 'Identify and resolve OSM data quality issues across multiple sections.',
  'platform-admin': 'System administration, cache management, and developer tools.',
  multi: 'View expedition data across multiple sections.',
}

/** OAuth scopes required by each app */
export const APP_SCOPES: Record<AppKey, string[]> = {
  expedition: ['section:event:read'],
  planning: ['section:event:read', 'section:member:read', 'section:programme:read', 'section:flexirecord:read'],
  'data-quality': ['section:member:read'],
  'platform-admin': ['section:event:read', 'section:member:read', 'section:programme:read', 'section:flexirecord:read'],
  multi: ['section:event:read', 'section:member:read', 'section:programme:read', 'section:flexirecord:read'],
}

/** Whether the app requires admin-level scopes */
export const APP_REQUIRES_ADMIN: Record<AppKey, boolean> = {
  expedition: false,
  planning: true,
  'data-quality': false,
  'platform-admin': true,
  multi: true,
}

/** Apps shown on the main login cards (primary apps) */
const ALL_APP_KEYS: AppKey[] = ['planning', 'expedition', 'platform-admin', 'multi', 'data-quality']

const DEFAULT_VISIBLE_APPS: AppKey[] = ['expedition', 'planning']

const isAppKey = (value: string): value is AppKey => {
  return (ALL_APP_KEYS as string[]).includes(value)
}

export const getPrimaryApps = (): AppKey[] => {
  const raw = process.env.NEXT_PUBLIC_VISIBLE_APPS ?? process.env.VISIBLE_APPS
  if (!raw) {
    return DEFAULT_VISIBLE_APPS
  }
  const apps = raw
    .split(',')
    .map((app) => app.trim())
    .filter(Boolean)
    .filter(isAppKey)
  return apps.length > 0 ? apps : DEFAULT_VISIBLE_APPS
}

export const DEFAULT_APP_FOR_ROLE: Record<'admin' | 'standard' | 'data-quality', AppKey> = {
  admin: 'planning',
  standard: 'expedition',
  'data-quality': 'data-quality',
}
