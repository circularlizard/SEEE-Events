/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => ({ accessToken: 'test-access-token', user: { id: 'u1' } })),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
      headers: new Map(Object.entries(init?.headers || {})),
    }),
  },
}))
// Mock authConfig to avoid importing ESM providers in tests
jest.mock('@/lib/auth', () => ({
  authConfig: {},
  getAuthConfig: () => ({}),
}))
const { GET, POST, PUT, DELETE, PATCH } = require('../[...path]/route')

// Mock redis helpers to control circuit breaker and cache behavior
jest.mock('@/lib/redis', () => ({
  isHardLocked: jest.fn(async () => false),
  isSoftLocked: jest.fn(async () => false),
  setSoftLock: jest.fn(async () => undefined),
  setHardLock: jest.fn(async () => undefined),
  clearLocks: jest.fn(async () => undefined),
  getCachedResponse: jest.fn(async () => null),
  setCachedResponse: jest.fn(async () => undefined),
  updateQuota: jest.fn(async () => undefined),
  getQuota: jest.fn(async () => ({ remaining: 800, limit: 1000, reset: Math.floor(Date.now()/1000) + 3600 })),
}))

// Mock rate limiter schedule to simply execute immediately
jest.mock('@/lib/bottleneck', () => ({
  scheduleRequest: jest.fn(async (fn: (...args: any[]) => any, ...args: any[]) => fn(...args)),
  parseRateLimitHeaders: jest.fn(async () => undefined),
}))

// Helper to create a NextRequest targeting our proxy route
function makeRequest(method: string, url: string, init?: RequestInit) {
  const nextUrl = new URL(url, 'http://localhost')
  return { 
    method, 
    nextUrl: {
      ...nextUrl,
      pathname: nextUrl.pathname,
      searchParams: nextUrl.searchParams,
      toString: () => nextUrl.toString(),
    },
    headers: new Headers(init?.headers || {}) 
  } as any
}

describe('Proxy Route Integration', () => {
  const base = '/api/proxy'

  const cachableUrl = `${base}/ext/events/summary/?action=get&sectionid=37458&termid=1`
  const cachableParams = { params: Promise.resolve({ path: ['ext', 'events', 'summary'] }) }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = (global as any).fetch || jest.fn()
  })

  it('blocks mutation methods with 403', async () => {
    const postReq = makeRequest('POST', `${base}/osmc/members`)
    const putReq = makeRequest('PUT', `${base}/osmc/members/1`)
    const delReq = makeRequest('DELETE', `${base}/osmc/members/1`)
    const patchReq = makeRequest('PATCH', `${base}/osmc/members/1`)

    const postRes = await POST(postReq)
    const putRes = await PUT(putReq)
    const delRes = await DELETE(delReq)
    const patchRes = await PATCH(patchReq)

    expect(postRes.status).toBe(403)
    expect(putRes.status).toBe(403)
    expect(delRes.status).toBe(403)
    expect(patchRes.status).toBe(403)
  })

  it('returns cached response when present', async () => {
    const { getCachedResponse, setCachedResponse } = jest.requireMock('@/lib/redis')
    ;(getCachedResponse as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ ok: true, source: 'cache' })
    )

    const res = await GET(makeRequest('GET', cachableUrl), cachableParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('cache')
    expect(res.headers.get('X-Cache')).toBe('HIT')
    expect(res.headers.get('X-Upstream-URL')).toBeTruthy()
    expect(res.headers.get('X-RateLimit-Remaining')).toBeTruthy()
    expect(res.headers.get('X-RateLimit-Limit')).toBeTruthy()
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy()
    expect(setCachedResponse).not.toHaveBeenCalled()
  })

  it('proxies GET and sets cache on miss', async () => {
    const { getCachedResponse, setCachedResponse } = jest.requireMock('@/lib/redis')
    ;(getCachedResponse as jest.Mock).mockResolvedValueOnce(null)

    // Mock global fetch to simulate upstream response with rate limit headers
    const mockBody = { ok: true, source: 'upstream' }
    const headers = new Headers({
      'content-type': 'application/json',
      'x-ratelimit-remaining': '799',
      'x-ratelimit-limit': '1000',
      'x-ratelimit-reset': String(Math.floor(Date.now()/1000) + 3600),
    })
    const mockResponse = {
      ok: true,
      status: 200,
      headers,
      json: async () => mockBody,
    } as any
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce(mockResponse)

    const res = await GET(makeRequest('GET', cachableUrl), cachableParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('upstream')
    expect(res.headers.get('X-Cache')).toBe('MISS')
    expect(res.headers.get('X-Upstream-URL')).toBeTruthy()
    // Prefer upstream headers when present
    expect(res.headers.get('X-RateLimit-Remaining')).toBeTruthy()
    expect(res.headers.get('X-RateLimit-Limit')).toBeTruthy()
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy()
    expect(fetchSpy).toHaveBeenCalled()
    expect(setCachedResponse).toHaveBeenCalled()
    const setCall = (setCachedResponse as jest.Mock).mock.calls[0]
    expect(setCall?.[2]).toBe(60 * 60)
  })

  it('treats corrupted cache as MISS and fetches from upstream', async () => {
    const { getCachedResponse, setCachedResponse } = jest.requireMock('@/lib/redis')
    ;(getCachedResponse as jest.Mock).mockResolvedValueOnce('<html>not json</html>')

    const mockBody = { ok: true, source: 'upstream-after-corrupt-cache' }
    const headers = new Headers({
      'content-type': 'application/json',
      'x-ratelimit-remaining': '500',
      'x-ratelimit-limit': '1000',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    })
    const mockResponse = {
      ok: true,
      status: 200,
      headers,
      json: async () => mockBody,
    } as any
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce(mockResponse)

    const res = await GET(makeRequest('GET', cachableUrl), cachableParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('upstream-after-corrupt-cache')
    expect(res.headers.get('X-Cache')).toBe('MISS')
    expect(fetchSpy).toHaveBeenCalled()
    expect(setCachedResponse).toHaveBeenCalled()
  })

  it('bypasses cache when X-Cache-Bypass header is set', async () => {
    const { getCachedResponse, setCachedResponse } = jest.requireMock('@/lib/redis')
    ;(getCachedResponse as jest.Mock).mockResolvedValueOnce(JSON.stringify({ ok: true, source: 'cache' }))

    const mockBody = { ok: true, source: 'upstream-bypass' }
    const headers = new Headers({
      'content-type': 'application/json',
      'x-ratelimit-remaining': '700',
      'x-ratelimit-limit': '1000',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    })
    const mockResponse = {
      ok: true,
      status: 200,
      headers,
      json: async () => mockBody,
    } as any
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce(mockResponse)

    const res = await GET(
      makeRequest('GET', cachableUrl, { headers: { 'X-Cache-Bypass': '1' } }),
      cachableParams
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('upstream-bypass')
    expect(res.headers.get('X-Cache')).toBe('BYPASS')
    expect(fetchSpy).toHaveBeenCalled()
    expect(getCachedResponse).not.toHaveBeenCalled()
    expect(setCachedResponse).not.toHaveBeenCalled()
  })

  it('propagates Retry-After on upstream error responses', async () => {
    const { getCachedResponse } = jest.requireMock('@/lib/redis')
    ;(getCachedResponse as jest.Mock).mockResolvedValueOnce(null)

    const headers = new Headers({
      'retry-after': '12',
      'x-ratelimit-remaining': '400',
      'x-ratelimit-limit': '1000',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    })
    const mockResponse = {
      ok: false,
      status: 503,
      headers,
      text: async () => 'service unavailable',
    } as any
    jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce(mockResponse)

    const res = await GET(makeRequest('GET', `${base}/osmc/members`), {
      params: Promise.resolve({ path: ['osmc', 'members'] }),
    })
    expect(res.status).toBe(503)
    expect(res.headers.get('Retry-After')).toBe('12')
    expect(res.headers.get('X-Cache')).toBe('MISS')
    const body = await res.json()
    expect(body.retryAfter).toBe(12)
  })

  it('triggers hard lock when upstream sends X-Blocked', async () => {
    const { setHardLock } = jest.requireMock('@/lib/redis')
    const headers = new Headers({ 'x-blocked': 'true' })
    const mockResponse = {
      ok: false,
      status: 429,
      headers,
      text: async () => 'blocked',
    } as any
    jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce(mockResponse)

    const res = await GET(makeRequest('GET', `${base}/osmc/members`), { params: Promise.resolve({ path: ['osmc','members'] }) })
    expect(res.status).toBe(503)
    expect(setHardLock).toHaveBeenCalled()
    expect(res.headers.get('Retry-After')).toBe('300')
    expect(res.headers.get('X-Upstream-URL')).toBeTruthy()
  })

  it('returns 429 when soft locked', async () => {
    const { isSoftLocked } = jest.requireMock('@/lib/redis')
    ;(isSoftLocked as jest.Mock).mockResolvedValueOnce(true)
    const res = await GET(makeRequest('GET', `${base}/osmc/members`), { params: Promise.resolve({ path: ['osmc','members'] }) })
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    expect(res.headers.get('X-Cache')).toBe('BYPASS')
  })

  it('sets soft lock and returns 429 when upstream rate limits (Retry-After)', async () => {
    const { getCachedResponse, setSoftLock } = jest.requireMock('@/lib/redis')
    ;(getCachedResponse as jest.Mock).mockResolvedValueOnce(null)

    const headers = new Headers({
      'retry-after': '12',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-limit': '1000',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    })
    const mockResponse = {
      ok: false,
      status: 429,
      headers,
      text: async () => 'rate limited',
    } as any
    jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce(mockResponse)

    const res = await GET(makeRequest('GET', `${base}/osmc/members`), {
      params: Promise.resolve({ path: ['osmc', 'members'] }),
    })
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('12')
    const body = await res.json()
    expect(body.error).toBe('RATE_LIMITED')
    expect(body.retryAfter).toBe(12)
    expect(setSoftLock).toHaveBeenCalledWith(12)
  })

  it('returns 503 when hard locked', async () => {
    const { isHardLocked } = jest.requireMock('@/lib/redis')
    ;(isHardLocked as jest.Mock).mockResolvedValueOnce(true)
    const res = await GET(makeRequest('GET', `${base}/osmc/members`), { params: Promise.resolve({ path: ['osmc','members'] }) })
    expect(res.status).toBe(503)
    expect(res.headers.get('Retry-After')).toBe('300')
    expect(res.headers.get('X-Cache')).toBe('BYPASS')
  })
})
