/**
 * Auth config provider selection tests
 */

// Mock ESM credentials provider to avoid Jest ESM parsing issues
jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: () => ({ id: 'credentials' }),
}))

describe('authConfig providers', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete (process as any).env.MOCK_AUTH_ENABLED
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('uses OSM OAuth provider by default', async () => {
    const { authConfig } = await import('@/lib/auth')
    expect(authConfig.providers[0]).toHaveProperty('id', 'osm')
  })

  it('uses credentials provider when MOCK_AUTH_ENABLED=true', async () => {
    process.env.MOCK_AUTH_ENABLED = 'true'
    const { authConfig } = await import('@/lib/auth')
    expect(authConfig.providers[0]).toHaveProperty('id', 'credentials')
  })
})
