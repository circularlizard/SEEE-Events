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

    expect(data).toBeTruthy()
    expect(Array.isArray(data.sections)).toBe(true)
    expect((global as any).fetch).toHaveBeenCalledWith(
      '/api/proxy/ext/generic/startup/?action=getData',
      expect.objectContaining({ method: 'GET' })
    )
  })
})
