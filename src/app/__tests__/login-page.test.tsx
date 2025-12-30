/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react'
import Home from '@/app/page'

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(() => Promise.resolve(undefined)),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}))
import * as nextAuthReact from 'next-auth/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn(() => null) }),
}))

describe('Login Page', () => {
  beforeEach(() => {
    jest.spyOn(nextAuthReact, 'signIn').mockResolvedValueOnce(undefined as any)
    jest.spyOn(nextAuthReact, 'useSession' as any).mockReturnValue({ data: null, status: 'unauthenticated' })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('renders only OSM button when mock disabled', () => {
    process.env.NEXT_PUBLIC_MOCK_AUTH_ENABLED = 'false'
    process.env.MOCK_AUTH_ENABLED = 'false'
    render(<Home />)
    expect(screen.getByText('Sign in with OSM')).toBeInTheDocument()
    expect(screen.queryByText('Dev: Mock Login')).toBeNull()
  })

  test('renders mock button when enabled', () => {
    process.env.NEXT_PUBLIC_MOCK_AUTH_ENABLED = 'true'
    render(<Home />)
    expect(screen.getByText('Sign in with OSM')).toBeInTheDocument()
    expect(screen.getByText('Dev: Mock Login')).toBeInTheDocument()
  })

  test('calls signIn with providers', () => {
    process.env.NEXT_PUBLIC_MOCK_AUTH_ENABLED = 'true'
    const spy = jest.spyOn(nextAuthReact, 'signIn').mockResolvedValueOnce(undefined as any)
    render(<Home />)
    fireEvent.click(screen.getByText('Sign in with OSM'))
    expect(spy).toHaveBeenCalledWith('osm-standard', expect.objectContaining({ callbackUrl: '/dashboard?appSelection=expedition' }))
    fireEvent.click(screen.getByText('Dev: Mock Login'))
    expect(spy).toHaveBeenCalledWith('credentials', expect.objectContaining({ 
      callbackUrl: '/dashboard?appSelection=expedition',
      username: 'standard',
      roleSelection: 'standard',
      appSelection: 'expedition'
    }))
  })
})
