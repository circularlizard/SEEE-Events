import 'server-only'
import Redis from 'ioredis'
import { logRedis, logCircuitBreaker } from './logger'

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
    logRedis({ event: 'error', error })
  })

  redis.on('connect', () => {
    logRedis({ event: 'connected' })
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
 * OAuth Data Keys
 */
export function getOAuthDataKey(userId: string): string {
  return `oauth:${userId}:data`
}

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
  logCircuitBreaker({ event: 'soft_lock', ttl, reason: 'Quota low or exhausted' })
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
  logCircuitBreaker({ event: 'hard_lock', ttl, reason: 'X-Blocked header detected' })
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
  logCircuitBreaker({ event: 'lock_cleared', reason: 'Manual override' })
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
 * OAuth resource data stored in Redis
 */
export interface OAuthData {
  sections: Array<{ section_id: number; section_name?: string; [key: string]: unknown }>
  scopes: string[]
  has_parent_access?: boolean
  has_section_access?: boolean
}

/**
 * Store OAuth resource data in Redis
 * @param userId User ID from OAuth provider
 * @param data OAuth resource data (sections, scopes, etc.)
 * @param ttl Time to live in seconds (default: 24 hours)
 */
export async function setOAuthData(
  userId: string,
  data: OAuthData,
  ttl: number = 86400
): Promise<void> {
  const client = getRedisClient()
  const key = getOAuthDataKey(userId)
  await client.setex(key, ttl, JSON.stringify(data))
  logRedis({ event: 'oauth_data_stored', userId, ttl })
}

/**
 * Get OAuth resource data from Redis
 * @param userId User ID from OAuth provider
 * @returns OAuth resource data or null if not found
 */
export async function getOAuthData(userId: string): Promise<OAuthData | null> {
  const client = getRedisClient()
  const key = getOAuthDataKey(userId)
  const data = await client.get(key)
  if (data) {
    logRedis({ event: 'oauth_data_retrieved', userId })
    return JSON.parse(data)
  }
  return null
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

/**
 * Check if Redis is reachable and healthy.
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient()
    const pong = await client.ping()
    return pong === 'PONG'
  } catch {
    return false
  }
}

// ============================================================================
// PATROL REFERENCE CACHE
// ============================================================================

/**
 * Patrol cache key for a section
 */
export function getPatrolCacheKey(sectionId: string): string {
  return `patrols:${sectionId}`
}

/**
 * Patrol cache metadata key (stores last updated timestamp)
 */
export const PATROL_CACHE_META_KEY = 'patrols:meta'

/**
 * Cached patrol data structure
 */
export interface CachedPatrol {
  patrolId: number
  patrolName: string
  sectionId: string
  sectionName: string
  memberCount: number
}

export interface PatrolCacheMeta {
  lastUpdated: string
  updatedBy: string
  sectionCount: number
  patrolCount: number
}

/**
 * Store patrol data in Redis cache
 * @param sectionId Section ID
 * @param patrols Array of cached patrol data
 * @param ttl Time to live in seconds (default: 90 days per ARCHITECTURE.md)
 */
export async function setPatrolCache(
  sectionId: string,
  patrols: CachedPatrol[],
  ttl: number = 90 * 24 * 60 * 60 // 90 days
): Promise<void> {
  const client = getRedisClient()
  const key = getPatrolCacheKey(sectionId)
  await client.setex(key, ttl, JSON.stringify(patrols))
  logRedis({ event: 'patrol_cache_stored', sectionId, patrolCount: patrols.length, ttl })
}

/**
 * Get patrol data from Redis cache
 * @param sectionId Section ID
 * @returns Array of cached patrol data or null if not found
 */
export async function getPatrolCache(sectionId: string): Promise<CachedPatrol[] | null> {
  const client = getRedisClient()
  const key = getPatrolCacheKey(sectionId)
  const data = await client.get(key)
  if (data) {
    logRedis({ event: 'patrol_cache_retrieved', sectionId })
    return JSON.parse(data)
  }
  return null
}

/**
 * Get all cached patrols across all sections
 * @returns Map of sectionId -> patrols
 */
export async function getAllPatrolCaches(): Promise<Map<string, CachedPatrol[]>> {
  const client = getRedisClient()
  const keys = await client.keys('patrols:*')
  const patrolKeys = keys.filter(k => k !== PATROL_CACHE_META_KEY && k.startsWith('patrols:'))
  
  const result = new Map<string, CachedPatrol[]>()
  
  for (const key of patrolKeys) {
    const data = await client.get(key)
    if (data) {
      const sectionId = key.replace('patrols:', '')
      result.set(sectionId, JSON.parse(data))
    }
  }
  
  return result
}

/**
 * Update patrol cache metadata
 */
export async function setPatrolCacheMeta(meta: PatrolCacheMeta): Promise<void> {
  const client = getRedisClient()
  await client.set(PATROL_CACHE_META_KEY, JSON.stringify(meta))
  logRedis({ event: 'patrol_cache_meta_updated', ...meta })
}

/**
 * Get patrol cache metadata
 */
export async function getPatrolCacheMeta(): Promise<PatrolCacheMeta | null> {
  const client = getRedisClient()
  const data = await client.get(PATROL_CACHE_META_KEY)
  if (data) {
    return JSON.parse(data)
  }
  return null
}

/**
 * Clear all patrol caches
 */
export async function clearPatrolCaches(): Promise<void> {
  const client = getRedisClient()
  const keys = await client.keys('patrols:*')
  if (keys.length > 0) {
    await client.del(...keys)
  }
  logRedis({ event: 'patrol_caches_cleared', keyCount: keys.length })
}
