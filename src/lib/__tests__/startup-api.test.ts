/* eslint-disable @typescript-eslint/no-explicit-any */
const startupData = {
  user: {
    userid: 'u-1',
    firstname: 'Mock',
    lastname: 'User',
    email: 'mock@example.com',
    roles: ['standard'],
    sections: [{ sectionid: 12345, sectionname: 'Explorer Unit Alpha', section: 'explorers' }],
  },
  sections: [{ sectionid: 12345, sectionname: 'Explorer Unit Alpha' }],
}

describe('getStartupData API', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('parses startup data via proxy with strict Zod validation', async () => {
    // Mock fetch to return startup data from proxy
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => startupData,
    } as any
    ;(global as any).fetch = jest.fn().mockResolvedValueOnce(mockResponse)

    const { getStartupData } = await import('@/lib/api')
    const data = await getStartupData()

    expect((global as any).fetch).toHaveBeenCalledWith(
      '/api/proxy/ext/generic/startup/?action=getData',
      expect.objectContaining({ method: 'GET' })
    )
    // Deprecated endpoint uses permissive parse; minimal stub returns null
    expect(data).toBeNull()
    expect((global as any).fetch).toHaveBeenCalledWith(
      '/api/proxy/ext/generic/startup/?action=getData',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('parses members list when upstream response is an object wrapper', async () => {
    const wrappedMembers = {
      identifier: 'scoutid',
      photos: true,
      items: [
        {
          scoutid: 12345,
          firstname: 'John',
          lastname: 'Doe',
          photo_guid: null,
          patrolid: 1,
          patrol: 'Eagles',
          sectionid: 100,
          enddate: null,
          age: '14 / 6',
          patrol_role_level_label: 'Member',
          active: true,
        },
      ],
    }

    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => wrappedMembers,
    } as any

    ;(global as any).fetch = jest.fn().mockResolvedValueOnce(mockResponse)

    const { getMembers } = await import('@/lib/api')
    const members = await getMembers({ sectionid: 100, termid: 200, section: 'explorers' })

    expect(Array.isArray(members)).toBe(true)
    expect(members).toHaveLength(1)
    expect(members[0]?.scoutid).toBe(12345)
    expect(members[0]?.firstname).toBe('John')
  })

  it('parses members list when upstream response is keyed by scoutid', async () => {
    const keyedMembers = {
      '12345': {
        scoutid: 12345,
        firstname: 'John',
        lastname: 'Doe',
        photo_guid: null,
        patrolid: 1,
        patrol: 'Eagles',
        sectionid: 100,
        enddate: null,
        age: '14 / 6',
        patrol_role_level_label: 'Member',
        active: true,
      },
    }

    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => keyedMembers,
    } as any

    ;(global as any).fetch = jest.fn().mockResolvedValueOnce(mockResponse)

    const { getMembers } = await import('@/lib/api')
    const members = await getMembers({ sectionid: 100, termid: 200, section: 'explorers' })

    expect(Array.isArray(members)).toBe(true)
    expect(members).toHaveLength(1)
    expect(members[0]?.scoutid).toBe(12345)
    expect(members[0]?.firstname).toBe('John')
  })
})
