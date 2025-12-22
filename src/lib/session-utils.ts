'use server'

import { getSessionVersion, incrementSessionVersion } from './redis'

/**
 * Invalidate all active sessions by incrementing the session version
 * This will force all users to sign in again on their next request
 */
export async function invalidateAllSessions(): Promise<{ success: boolean; version: number }> {
  try {
    const newVersion = await incrementSessionVersion()
    return { success: true, version: newVersion }
  } catch (error) {
    console.error('Failed to invalidate sessions:', error)
    return { success: false, version: 0 }
  }
}

/**
 * Get the current session version
 */
export async function getCurrentSessionVersion(): Promise<number> {
  return getSessionVersion()
}
