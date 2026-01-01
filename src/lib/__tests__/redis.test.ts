jest.mock('ioredis')

type RedisMockModule = {
  __resetRedisMock: () => void
}

let redisModule: typeof import('../redis')

describe('redis utilities', () => {
  beforeEach(async () => {
    jest.resetModules()
    const mockModule = jest.requireMock('ioredis') as RedisMockModule
    mockModule.__resetRedisMock()
    redisModule = await import('../redis')
  })

  it('sets and checks soft locks', async () => {
    const { setSoftLock, isSoftLocked, getSoftLockTtlSeconds } = redisModule
    await setSoftLock(5)
    expect(await isSoftLocked()).toBe(true)
    const ttl = await getSoftLockTtlSeconds()
    expect(ttl).not.toBeNull()
    expect(ttl).toBeLessThanOrEqual(5)
  })

  it('sets and clears hard locks', async () => {
    const { setHardLock, isHardLocked, clearLocks } = redisModule
    await setHardLock(5)
    expect(await isHardLocked()).toBe(true)
    await clearLocks()
    expect(await isHardLocked()).toBe(false)
  })

  it('updates and retrieves quota values', async () => {
    const { updateQuota, getQuota } = redisModule
    await updateQuota(10, 100, 123456)
    const quota = await getQuota()
    expect(quota).toEqual({ remaining: 10, limit: 100, reset: 123456 })
  })

  it('stores and reads OAuth data with JSON', async () => {
    const { setOAuthData, getOAuthData } = redisModule
    await setOAuthData('user-1', { sections: [], scopes: ['events'] })
    const data = await getOAuthData('user-1')
    expect(data).toEqual({ sections: [], scopes: ['events'] })
  })

  it('stores and retrieves patrol cache data', async () => {
    const { setPatrolCache, getPatrolCache, getPatrolCacheKey } = redisModule
    const sectionId = '42'
    await setPatrolCache(sectionId, [
      { patrolId: 1, patrolName: 'Raptors', sectionId, sectionName: 'Explorers', memberCount: 5 },
    ])
    const cached = await getPatrolCache(sectionId)
    expect(cached).toHaveLength(1)
    expect(cached?.[0].patrolName).toBe('Raptors')
    expect(getPatrolCacheKey(sectionId)).toBe('patrols:42')
  })

  it('increments session version and logs via redis helper', async () => {
    const { incrementSessionVersion, getSessionVersion } = redisModule
    const version1 = await incrementSessionVersion()
    const version2 = await incrementSessionVersion()
    expect(version2).toBe(version1 + 1)
    const version3 = await incrementSessionVersion()
    expect(version3).toBe(version2 + 1)
    expect(await getSessionVersion()).toBe(version3)
  })
})
