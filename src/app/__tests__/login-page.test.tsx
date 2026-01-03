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
    process.env.NEXT_PUBLIC_MOCK_AUTH_ENABLED = 'false'
    process.env.MOCK_AUTH_ENABLED = 'false'
    process.env.NEXT_PUBLIC_VISIBLE_APPS = 'expedition,planning'
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('renders app cards and hides mock panel when disabled', () => {
    render(<Home />)
    expect(screen.getByText('Expedition Viewer')).toBeInTheDocument()
    expect(screen.getByText('Expedition Planner')).toBeInTheDocument()
    expect(screen.queryByText('OSM Data Quality')).not.toBeInTheDocument()
    expect(screen.queryByText('Development Mode')).toBeNull()
  })

  test('renders mock panel when enabled', () => {
    process.env.NEXT_PUBLIC_MOCK_AUTH_ENABLED = 'true'
    render(<Home />)
    expect(screen.getByText('Development Mode')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expedition Viewer' })).toBeInTheDocument()
    expect(screen.getByLabelText('Mock persona (optional)')).toBeInTheDocument()
  })

  test('calls signIn with providers', () => {
    process.env.NEXT_PUBLIC_MOCK_AUTH_ENABLED = 'true'
    const spy = jest.spyOn(nextAuthReact, 'signIn').mockResolvedValue(undefined as any)
    render(<Home />)

    // OAuth flow: click expedition card
    fireEvent.click(screen.getByRole('heading', { name: 'Expedition Viewer' }))
    expect(spy).toHaveBeenCalledWith(
      'osm-standard',
      expect.objectContaining({ callbackUrl: '/dashboard?appSelection=expedition' })
    )

    // Mock flow: click expedition mock button in dev panel
    fireEvent.click(screen.getByRole('button', { name: 'Expedition Viewer' }))
    expect(spy).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({
        callbackUrl: '/dashboard?appSelection=expedition',
        username: 'standard',
        roleSelection: 'standard',
        appSelection: 'expedition',
      })
    )
  })

  test('shows configured apps from environment variable', () => {
    process.env.NEXT_PUBLIC_VISIBLE_APPS = 'expedition,planning,data-quality'
    render(<Home />)
    expect(screen.getByText('Expedition Viewer')).toBeInTheDocument()
    expect(screen.getByText('Expedition Planner')).toBeInTheDocument()
    expect(screen.getByText('OSM Data Quality')).toBeInTheDocument()
  })
})
