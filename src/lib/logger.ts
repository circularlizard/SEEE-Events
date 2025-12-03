import pino from 'pino'

/**
 * Logger for SEEE Expedition Dashboard
 * 
 * Structured logging with Pino for observability.
 * Captures API rate limits, errors, and circuit breaker events.
 */

// Configure logger based on environment
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  // Disable pino-pretty transport to avoid worker thread issues in Next.js server runtime.
  // Pretty printing can be enabled locally via environment if needed.
})

/**
 * Log rate limit information from API response headers
 */
export function logRateLimit(params: {
  remaining: number
  limit: number
  reset: number
  endpoint?: string
}) {
  const percentUsed = ((params.limit - params.remaining) / params.limit) * 100
  const resetDate = new Date(params.reset * 1000)

  logger.info(
    {
      rateLimit: {
        remaining: params.remaining,
        limit: params.limit,
        percentUsed: Math.round(percentUsed),
        reset: resetDate.toISOString(),
      },
      endpoint: params.endpoint,
    },
    `Rate limit: ${params.remaining}/${params.limit} (${Math.round(percentUsed)}% used)`
  )

  // Warn if quota is getting low
  if (percentUsed > 90) {
    logger.warn(
      {
        rateLimit: {
          remaining: params.remaining,
          limit: params.limit,
          percentUsed: Math.round(percentUsed),
        },
      },
      'Rate limit critically low!'
    )
  } else if (percentUsed > 75) {
    logger.warn(
      {
        rateLimit: {
          remaining: params.remaining,
          limit: params.limit,
          percentUsed: Math.round(percentUsed),
        },
      },
      'Rate limit warning - over 75% used'
    )
  }
}

/**
 * Log circuit breaker events
 */
export function logCircuitBreaker(params: {
  event: 'soft_lock' | 'hard_lock' | 'lock_cleared'
  ttl?: number
  reason?: string
}) {
  const level = params.event === 'hard_lock' ? 'error' : 'warn'

  logger[level](
    {
      circuitBreaker: {
        event: params.event,
        ttl: params.ttl,
        reason: params.reason,
      },
    },
    `Circuit breaker: ${params.event}${params.ttl ? ` (${params.ttl}s)` : ''}`
  )
}

/**
 * Log API proxy requests
 */
export function logProxyRequest(params: {
  method: string
  path: string
  status: number
  duration: number
  cached?: boolean
  error?: string
}) {
  const logData = {
    proxy: {
      method: params.method,
      path: params.path,
      status: params.status,
      duration: params.duration,
      cached: params.cached || false,
    },
    error: params.error,
  }

  if (params.status >= 500) {
    logger.error(logData, `Proxy ${params.method} ${params.path} - ${params.status}`)
  } else if (params.status >= 400) {
    logger.warn(logData, `Proxy ${params.method} ${params.path} - ${params.status}`)
  } else {
    logger.info(logData, `Proxy ${params.method} ${params.path} - ${params.status}`)
  }
}

/**
 * Log validation errors
 */
export function logValidationError(params: {
  context: string
  tier: 1 | 2
  error: unknown
  data?: unknown
}) {
  logger.warn(
    {
      validation: {
        context: params.context,
        tier: params.tier,
        error: params.error instanceof Error ? params.error.message : String(params.error),
      },
    },
    `Validation ${params.tier === 1 ? 'FAILED' : 'warning'}: ${params.context}`
  )
}

/**
 * Log Redis connection events
 */
export function logRedis(params: {
  event: 'connected' | 'error' | 'disconnected' | 'oauth_data_stored' | 'oauth_data_retrieved'
  error?: unknown
  userId?: string
  ttl?: number
}) {
  if (params.event === 'error') {
    logger.error(
      {
        redis: {
          event: params.event,
          error: params.error instanceof Error ? params.error.message : String(params.error),
        },
      },
      'Redis connection error'
    )
  } else if (params.event === 'oauth_data_stored' || params.event === 'oauth_data_retrieved') {
    logger.debug(
      {
        redis: {
          event: params.event,
          userId: params.userId,
          ttl: params.ttl,
        },
      },
      `Redis: ${params.event}`
    )
  } else {
    logger.info({ redis: { event: params.event } }, `Redis: ${params.event}`)
  }
}

/**
 * Log cache operations
 */
export function logCache(params: {
  operation: 'hit' | 'miss' | 'set'
  key: string
  ttl?: number
}) {
  logger.debug(
    {
      cache: {
        operation: params.operation,
        key: params.key,
        ttl: params.ttl,
      },
    },
    `Cache ${params.operation}: ${params.key}`
  )
}

export default logger
