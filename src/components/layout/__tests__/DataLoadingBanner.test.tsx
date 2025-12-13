import { render, screen } from '@testing-library/react'
import { DataLoadingBanner } from '../DataLoadingBanner'
import { useDataSourceProgress } from '@/store/use-store'

// Mock the store selector
jest.mock('@/store/use-store', () => ({
  useDataSourceProgress: jest.fn(),
}))

const mockUseDataSourceProgress = useDataSourceProgress as jest.Mock

describe('DataLoadingBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when no data sources are registered', () => {
    mockUseDataSourceProgress.mockReturnValue({})
    
    const { container } = render(<DataLoadingBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('shows loading state with spinner when a source is loading', () => {
    mockUseDataSourceProgress.mockReturnValue({
      events: {
        id: 'events',
        label: 'Events',
        state: 'loading',
        total: 10,
        completed: 3,
        phase: 'Loading events...',
      },
    })
    
    render(<DataLoadingBanner />)
    
    expect(screen.getByText('Data Loading')).toBeInTheDocument()
    expect(screen.getByText('Loading events...')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
  })

  it('shows "All data loaded" when all sources are complete', () => {
    mockUseDataSourceProgress.mockReturnValue({
      events: {
        id: 'events',
        label: 'Events',
        state: 'complete',
        total: 10,
        completed: 10,
        phase: '10 events loaded',
      },
      members: {
        id: 'members',
        label: 'Members',
        state: 'complete',
        total: 25,
        completed: 25,
        phase: '25 members loaded',
      },
    })
    
    render(<DataLoadingBanner />)
    
    expect(screen.getByText('All data loaded')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('shows error state when a source has an error', () => {
    mockUseDataSourceProgress.mockReturnValue({
      events: {
        id: 'events',
        label: 'Events',
        state: 'error',
        total: 0,
        completed: 0,
        phase: 'Error loading events',
        error: 'Network error',
      },
    })
    
    render(<DataLoadingBanner />)
    
    expect(screen.getByText('Events: Network error')).toBeInTheDocument()
  })

  it('shows combined progress from multiple sources', () => {
    mockUseDataSourceProgress.mockReturnValue({
      events: {
        id: 'events',
        label: 'Events',
        state: 'complete',
        total: 10,
        completed: 10,
        phase: '10 events loaded',
      },
      members: {
        id: 'members',
        label: 'Members',
        state: 'loading',
        total: 20,
        completed: 5,
        phase: 'Loading member info (5/20)...',
      },
    })
    
    render(<DataLoadingBanner />)
    
    // Total: 30, Completed: 15 = 50%
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    // Should show the loading source's phase
    expect(screen.getByText('Loading member info (5/20)...')).toBeInTheDocument()
  })

  it('displays source summary on desktop', () => {
    mockUseDataSourceProgress.mockReturnValue({
      events: {
        id: 'events',
        label: 'Events',
        state: 'complete',
        total: 12,
        completed: 12,
        phase: '12 events loaded',
      },
    })
    
    render(<DataLoadingBanner />)
    
    expect(screen.getByText('Events: 12')).toBeInTheDocument()
  })
})
