import 'server-only'
import Redis from 'ioredis'

/**
 * Redis Client for SEEE Expedition Dashboard
 * 
 * Supports both:
 * - Local Redis (via Docker Compose) for development
 * - Vercel KV (Redis) for production
 * 
 * Used for:
 * - Rate limiter state
 * - Circuit breaker locks
 * - API response caching
 */

let redis: Redis | null = null

/**
 * Get or create Redis client instance
 * Singleton pattern ensures single connection pool
 */
export function getRedisClient(): Redis {
  if (redis) {
    return redis
  }

  // Check if we're using Vercel KV (production)
  const kv_url = process.env.KV_URL
  if (kv_url) {
    redis = new Redis(kv_url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })
  } else {
    // Use local Redis (development)
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })
  }

  // Connection error handling
  redis.on('error', (error) => {
    console.error('[Redis] Connection error:', error)
  })

  redis.on('connect', () => {
    console.log('[Redis] Connected successfully')
  })

  return redis
}

/**
 * Circuit Breaker Keys
 */
export const CIRCUIT_BREAKER_KEYS = {
  SOFT_LOCK: 'circuit:soft_lock',
  HARD_LOCK: 'circuit:hard_lock',
  QUOTA_REMAINING: 'rate:quota_remaining',
  QUOTA_LIMIT: 'rate:quota_limit',
  QUOTA_RESET: 'rate:quota_reset',
} as const

/**
 * Cache Keys Helper
 */
export function getCacheKey(path: string, params?: Record<string, string>): string {
  const paramsString = params ? JSON.stringify(params) : ''
  return `cache:${path}:${paramsString}`
}

/**
 * Set circuit breaker soft lock (pause queue)
 * @param ttl Time to live in seconds (default: 60s)
 */
export async function setSoftLock(ttl: number = 60): Promise<void> {
  const client = getRedisClient()
  await client.setex(CIRCUIT_BREAKER_KEYS.SOFT_LOCK, ttl, '1')
  console.warn(`[Circuit Breaker] Soft lock enabled for ${ttl}s`)
}

/**
 * Check if soft lock is active
 */
export async function isSoftLocked(): Promise<boolean> {
  const client = getRedisClient()
  const value = await client.get(CIRCUIT_BREAKER_KEYS.SOFT_LOCK)
  return value === '1'
}

/**
 * Set circuit breaker hard lock (global halt)
 * @param ttl Time to live in seconds (default: 300s = 5 minutes)
 */
export async function setHardLock(ttl: number = 300): Promise<void> {
  const client = getRedisClient()
  await client.setex(CIRCUIT_BREAKER_KEYS.HARD_LOCK, ttl, '1')
  console.error(`[Circuit Breaker] HARD LOCK enabled for ${ttl}s`)
}

/**
 * Check if hard lock is active
 */
export async function isHardLocked(): Promise<boolean> {
  const client = getRedisClient()
  const value = await client.get(CIRCUIT_BREAKER_KEYS.HARD_LOCK)
  return value === '1'
}

/**
 * Clear all circuit breaker locks (admin override)
 */
export async function clearLocks(): Promise<void> {
  const client = getRedisClient()
  await client.del(CIRCUIT_BREAKER_KEYS.SOFT_LOCK, CIRCUIT_BREAKER_KEYS.HARD_LOCK)
  console.log('[Circuit Breaker] All locks cleared')
}

/**
 * Update rate limit quota from API response headers
 */
export async function updateQuota(
  remaining: number,
  limit: number,
  reset: number
): Promise<void> {
  const client = getRedisClient()
  const pipeline = client.pipeline()
  
  pipeline.set(CIRCUIT_BREAKER_KEYS.QUOTA_REMAINING, remaining)
  pipeline.set(CIRCUIT_BREAKER_KEYS.QUOTA_LIMIT, limit)
  pipeline.set(CIRCUIT_BREAKER_KEYS.QUOTA_RESET, reset)
  
  await pipeline.exec()
}

/**
 * Get current rate limit quota
 */
export async function getQuota(): Promise<{
  remaining: number
  limit: number
  reset: number
} | null> {
  const client = getRedisClient()
  const [remaining, limit, reset] = await Promise.all([
    client.get(CIRCUIT_BREAKER_KEYS.QUOTA_REMAINING),
    client.get(CIRCUIT_BREAKER_KEYS.QUOTA_LIMIT),
    client.get(CIRCUIT_BREAKER_KEYS.QUOTA_RESET),
  ])

  if (!remaining || !limit || !reset) {
    return null
  }

  return {
    remaining: parseInt(remaining, 10),
    limit: parseInt(limit, 10),
    reset: parseInt(reset, 10),
  }
}

/**
 * Get cached API response
 */
export async function getCachedResponse(cacheKey: string): Promise<string | null> {
  const client = getRedisClient()
  return await client.get(cacheKey)
}

/**
 * Set cached API response
 * @param ttl Time to live in seconds (default: 300s = 5 minutes)
 */
export async function setCachedResponse(
  cacheKey: string,
  data: string,
  ttl: number = 300
): Promise<void> {
  const client = getRedisClient()
  await client.setex(cacheKey, ttl, data)
}

/**
 * Close Redis connection (for cleanup in tests)
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
