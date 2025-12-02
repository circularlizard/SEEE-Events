/**
 * Config loader tests with mocked Redis client
 */

jest.mock('@/lib/redis', () => {
  const store = new Map<string, string>()
  return {
    getRedisClient: () => ({
      get: async (key: string) => store.get(key) ?? null,
      set: async (key: string, value: string) => {
        store.set(key, value)
      },
      keys: async (pattern: string) => {
        const prefix = pattern.replace('*', '')
        return Array.from(store.keys()).filter((k) => k.startsWith(prefix))
      },
      del: async (...keys: string[]) => {
        keys.forEach((k) => store.delete(k))
      },
    }),
  }
})

describe('config-loader', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('seeds defaults on first load and returns config', async () => {
    const { isConfigInitialized, loadConfig } = await import('@/lib/config-loader')
    const before = await isConfigInitialized()
    expect(before).toBe(false)

    const config = await loadConfig()
    expect(config).toHaveProperty('version')
    expect(config).toHaveProperty('userRoles')
    expect(config).toHaveProperty('badgeMappings')

    const after = await isConfigInitialized()
    expect(after).toBe(true)
  })

  it('updates a config section and retrieves it', async () => {
    const { updateConfigSection, getConfigSection } = await import('@/lib/config-loader')
    await updateConfigSection('badgeMappings', { firstAid: 'FA-001' })
    const badgeMappings = await getConfigSection('badgeMappings')
    expect(badgeMappings).toEqual({ firstAid: 'FA-001' })
  })
})
