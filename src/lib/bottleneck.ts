import 'server-only'
import Bottleneck from 'bottleneck'
import { getQuota, updateQuota, setSoftLock, isSoftLocked } from './redis'

/**
 * Rate Limiting Engine for OSM API
 * 
 * Strategy:
 * - Cap requests at 80% of API limit to avoid hitting the hard limit
 * - Parse X-RateLimit headers from responses
 * - Trigger soft lock (pause queue) when quota runs low
 * - Respect existing soft locks
 * 
 * OSM API Limits (assumed):
 * - 1000 requests per hour
 * - Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */

// Conservative safety buffer (80% of limit)
const SAFETY_FACTOR = 0.8
const DEFAULT_LIMIT = 1000
const SAFE_LIMIT = Math.floor(DEFAULT_LIMIT * SAFETY_FACTOR) // 800 requests/hour

/**
 * Bottleneck Rate Limiter
 * 
 * Configuration:
 * - reservoir: Dynamic quota based on remaining API calls
 * - reservoirRefreshInterval: Check every 60 seconds
 * - minTime: Minimum 50ms between requests (smooth throttling)
 * - maxConcurrent: Max 5 concurrent requests
 */
let limiter: Bottleneck | null = null

export function getRateLimiter(): Bottleneck {
  if (limiter) {
    return limiter
  }

  limiter = new Bottleneck({
    reservoir: SAFE_LIMIT, // Start with safe default
    reservoirRefreshAmount: SAFE_LIMIT,
    reservoirRefreshInterval: 60 * 1000, // Refresh every minute
    minTime: 50, // Minimum 50ms between requests
    maxConcurrent: 5, // Max 5 concurrent requests
  })

  // Log when queue is processing
  limiter.on('queued', () => {
    console.log('[Rate Limiter] Request queued')
  })

  limiter.on('executing', () => {
    console.log('[Rate Limiter] Executing request')
  })

  // Update reservoir dynamically based on API quota
  limiter.on('done', async (info) => {
    try {
      const quota = await getQuota()
      if (quota) {
        const safeRemaining = Math.floor(quota.remaining * SAFETY_FACTOR)
        
        // Update reservoir to match remaining quota
        await limiter!.updateSettings({
          reservoir: safeRemaining,
        })

        console.log(
          `[Rate Limiter] Updated reservoir: ${safeRemaining}/${quota.limit} (${quota.remaining} actual remaining)`
        )

        // Trigger soft lock if quota is getting low (< 10%)
        if (quota.remaining < quota.limit * 0.1) {
          const resetTime = quota.reset - Date.now() / 1000
          await setSoftLock(Math.max(60, resetTime))
        }
      }
    } catch (error) {
      console.error('[Rate Limiter] Error updating reservoir:', error)
    }
  })

  return limiter
}

/**
 * Schedule a request through the rate limiter
 * Automatically handles queuing and respects soft locks
 */
export async function scheduleRequest<T>(
  fn: () => Promise<T>,
  priority: number = 5
): Promise<T> {
  // Check for soft lock before scheduling
  if (await isSoftLocked()) {
    throw new Error('RATE_LIMITED: System is cooling down. Please try again later.')
  }

  const limiter = getRateLimiter()
  return limiter.schedule({ priority }, fn)
}

/**
 * Parse rate limit headers from API response
 * Updates Redis with latest quota information
 */
export async function parseRateLimitHeaders(headers: Headers): Promise<void> {
  const remaining = headers.get('X-RateLimit-Remaining')
  const limit = headers.get('X-RateLimit-Limit')
  const reset = headers.get('X-RateLimit-Reset')

  if (remaining && limit && reset) {
    const remainingNum = parseInt(remaining, 10)
    const limitNum = parseInt(limit, 10)
    const resetNum = parseInt(reset, 10)

    // Update Redis with latest quota
    await updateQuota(remainingNum, limitNum, resetNum)

    // Log warning if quota is getting low
    if (remainingNum < limitNum * 0.2) {
      console.warn(
        `[Rate Limiter] WARNING: Low quota remaining: ${remainingNum}/${limitNum}`
      )
    }

    // Trigger soft lock if quota is critically low (< 10%)
    if (remainingNum < limitNum * 0.1) {
      const ttl = Math.max(60, resetNum - Date.now() / 1000)
      await setSoftLock(ttl)
    }
  }
}

/**
 * Get current rate limiter statistics
 */
export async function getRateLimiterStats() {
  const limiter = getRateLimiter()
  const counts = limiter.counts()
  const quota = await getQuota()

  return {
    queued: counts.QUEUED,
    running: counts.RUNNING,
    executing: counts.EXECUTING,
    done: counts.DONE,
    quota: quota
      ? {
          remaining: quota.remaining,
          limit: quota.limit,
          reset: new Date(quota.reset * 1000).toISOString(),
          percentUsed: ((quota.limit - quota.remaining) / quota.limit) * 100,
        }
      : null,
  }
}

/**
 * Stop the rate limiter (for cleanup)
 */
export async function stopRateLimiter(): Promise<void> {
  if (limiter) {
    await limiter.stop()
    limiter = null
  }
}
