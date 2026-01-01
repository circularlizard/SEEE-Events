jest.mock('pino', () => {
  return jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }))
})

import pino from 'pino'
import {
  logRateLimit,
  logCircuitBreaker,
  logProxyRequest,
  logValidationError,
  logRedis,
  logCache,
} from '../logger'

const mockedPino = pino as unknown as jest.Mock
const getLogger = () => mockedPino.mock.results[0].value as Record<string, jest.Mock>

describe('logger utilities', () => {
  beforeEach(() => {
    const logger = getLogger()
    Object.values(logger).forEach((fn) => fn.mockClear())
  })

  it('logs info and warnings for rate limit usage', () => {
    logRateLimit({ remaining: 10, limit: 100, reset: 1_700_000_000, endpoint: '/v3/events' })

    const logger = getLogger()
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ rateLimit: expect.objectContaining({ remaining: 10 }) }),
      expect.stringContaining('Rate limit:')
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(Object),
      'Rate limit warning - over 75% used'
    )
  })

  it('logs critical warning when usage exceeds 90%', () => {
    logRateLimit({ remaining: 4, limit: 50, reset: 1_700_000_000 })
    const logger = getLogger()
    expect(logger.warn).toHaveBeenCalledWith(expect.any(Object), 'Rate limit critically low!')
  })

  it('logs circuit breaker events at appropriate levels', () => {
    logCircuitBreaker({ event: 'hard_lock', ttl: 120, reason: 'X-Blocked' })
    logCircuitBreaker({ event: 'lock_cleared' })

    const logger = getLogger()
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ circuitBreaker: expect.objectContaining({ event: 'hard_lock' }) }),
      expect.stringContaining('hard_lock')
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ circuitBreaker: expect.objectContaining({ event: 'lock_cleared' }) }),
      expect.stringContaining('lock_cleared')
    )
  })

  it('logs proxy requests at correct severity', () => {
    logProxyRequest({ method: 'GET', path: '/api', status: 200, duration: 50 })
    logProxyRequest({ method: 'GET', path: '/api', status: 404, duration: 50 })
    logProxyRequest({ method: 'POST', path: '/api', status: 502, duration: 120, error: 'Upstream error' })

    const logger = getLogger()
    expect(logger.info).toHaveBeenCalledWith(expect.any(Object), expect.stringContaining('200'))
    expect(logger.warn).toHaveBeenCalledWith(expect.any(Object), expect.stringContaining('404'))
    expect(logger.error).toHaveBeenCalledWith(expect.any(Object), expect.stringContaining('502'))
  })

  it('logs validation warnings with tier info', () => {
    logValidationError({ context: 'TestSchema', tier: 1, error: new Error('boom') })
    const logger = getLogger()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ validation: expect.objectContaining({ context: 'TestSchema', tier: 1 }) }),
      'Validation FAILED: TestSchema'
    )
  })

  it('logs redis events at correct levels', () => {
    logRedis({ event: 'error', error: new Error('redis') })
    logRedis({ event: 'oauth_data_stored', userId: '123', ttl: 60 })
    logRedis({ event: 'connected' })

    const logger = getLogger()
    expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'Redis connection error')
    expect(logger.debug).toHaveBeenCalledWith(expect.any(Object), 'Redis: oauth_data_stored')
    expect(logger.info).toHaveBeenCalledWith({ redis: { event: 'connected' } }, 'Redis: connected')
  })

  it('logs cache operations via debug level', () => {
    logCache({ operation: 'hit', key: 'cache:test', ttl: 60 })
    const logger = getLogger()
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ cache: expect.objectContaining({ operation: 'hit', key: 'cache:test' }) }),
      'Cache hit: cache:test'
    )
  })
})
