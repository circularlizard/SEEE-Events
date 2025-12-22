export type AppKey = 'planning' | 'expedition' | 'platform-admin' | 'multi'

export const APP_LABELS: Record<AppKey, string> = {
  planning: 'Event Planning',
  expedition: 'Expedition Viewer',
  'platform-admin': 'Platform Admin Console',
  multi: 'Multi-Section Viewer',
}

export const DEFAULT_APP_FOR_ROLE: Record<'admin' | 'standard', AppKey> = {
  admin: 'planning',
  standard: 'expedition',
}
