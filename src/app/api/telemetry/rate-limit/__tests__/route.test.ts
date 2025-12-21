/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => ({ user: { id: 'u1' } })),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/auth', () => ({
  getAuthConfig: () => ({}),
}))

jest.mock('@/lib/redis', () => ({
  isHardLocked: jest.fn(async () => false),
  isSoftLocked: jest.fn(async () => false),
  getQuota: jest.fn(async () => ({ remaining: 100, limit: 1000, reset: 12345 })),
}))

jest.mock('@/lib/bottleneck', () => ({
  getRateLimiterStats: jest.fn(async () => ({
    queued: 1,
    running: 2,
    executing: 3,
    done: 4,
    quota: null,
  })),
}))

const route = require('../route')

describe('GET /api/telemetry/rate-limit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns telemetry for authenticated user', async () => {
    const res = await route.GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual({
      hardLocked: false,
      softLocked: false,
      quota: { remaining: 100, limit: 1000, reset: 12345 },
      queue: { queued: 1, running: 2, executing: 3, done: 4 },
    })
  })

  it('returns 401 when unauthenticated', async () => {
    const { getServerSession } = jest.requireMock('next-auth/next')
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const res = await route.GET()
    expect(res.status).toBe(401)
  })
})
