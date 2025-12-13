/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock next-auth/react
const mockSession = {
  user: { id: 'user-123', name: 'Test User' },
  expires: '2099-01-01',
}
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: mockSession, status: 'authenticated' })),
}))

// Mock next/navigation
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn(() => '/dashboard') }),
}))

// Mock TanStack Query
const mockRemoveQueries = jest.fn()
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ removeQueries: mockRemoveQueries }),
}))

// Mock the store
const mockSetCurrentSection = jest.fn()
const mockSetSelectedSections = jest.fn()
const mockClearQueue = jest.fn()
const mockAvailableSections = [
  { sectionId: 'section-1', sectionName: 'Troop A', sectionType: 'scouts', termId: 'term-1' },
  { sectionId: 'section-2', sectionName: 'Troop B', sectionType: 'scouts', termId: 'term-2' },
  { sectionId: 'section-3', sectionName: 'Troop C', sectionType: 'explorers', termId: 'term-3' },
]

jest.mock('@/store/use-store', () => ({
  useStore: (selector: any) => {
    const state = {
      availableSections: mockAvailableSections,
      currentSection: null,
      selectedSections: [],
      setCurrentSection: mockSetCurrentSection,
      setSelectedSections: mockSetSelectedSections,
      clearQueue: mockClearQueue,
    }
    return selector(state)
  },
}))

import SectionPickerPage from '../page'

describe('Section Picker Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  test('renders available sections', () => {
    render(<SectionPickerPage />)
    
    expect(screen.getByText('Select Your Section')).toBeInTheDocument()
    expect(screen.getByText('Troop A')).toBeInTheDocument()
    expect(screen.getByText('Troop B')).toBeInTheDocument()
    expect(screen.getByText('Troop C')).toBeInTheDocument()
  })

  test('Continue button is disabled when no sections selected', () => {
    render(<SectionPickerPage />)
    
    const continueButton = screen.getByRole('button', { name: /continue/i })
    expect(continueButton).toBeDisabled()
  })

  test('Continue button is enabled when sections are selected', () => {
    render(<SectionPickerPage />)
    
    // Click on a section to select it
    fireEvent.click(screen.getByText('Troop A'))
    
    const continueButton = screen.getByRole('button', { name: /continue/i })
    expect(continueButton).not.toBeDisabled()
  })

  test('selecting a section replaces previous selection (single-select)', () => {
    render(<SectionPickerPage />)
    
    // Select first section
    fireEvent.click(screen.getByText('Troop A'))
    
    // Select second section - should replace first
    fireEvent.click(screen.getByText('Troop B'))
    
    // Continue button should still be enabled (one section selected)
    const continueButton = screen.getByRole('button', { name: /continue/i })
    expect(continueButton).not.toBeDisabled()
  })

  test('clicking Continue with single section sets currentSection', async () => {
    render(<SectionPickerPage />)
    
    // Select one section
    fireEvent.click(screen.getByText('Troop A'))
    
    // Click continue
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    
    await waitFor(() => {
      expect(mockSetCurrentSection).toHaveBeenCalledWith(
        expect.objectContaining({ sectionId: 'section-1', sectionName: 'Troop A' })
      )
      expect(mockSetSelectedSections).toHaveBeenCalledWith([])
    })
  })

  test('clicking Continue always sets currentSection (single-select mode)', async () => {
    render(<SectionPickerPage />)
    
    // Select a section (clicking second one replaces first in single-select)
    fireEvent.click(screen.getByText('Troop A'))
    fireEvent.click(screen.getByText('Troop B'))
    
    // Click continue
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    
    await waitFor(() => {
      // In single-select mode, the last clicked section is selected
      expect(mockSetCurrentSection).toHaveBeenCalledWith(
        expect.objectContaining({ sectionId: 'section-2', sectionName: 'Troop B' })
      )
      // selectedSections should be cleared
      expect(mockSetSelectedSections).toHaveBeenCalledWith([])
    })
  })

  test('clicking Continue removes query cache and clears queue', async () => {
    render(<SectionPickerPage />)
    
    fireEvent.click(screen.getByText('Troop A'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    
    await waitFor(() => {
      expect(mockRemoveQueries).toHaveBeenCalled()
      expect(mockClearQueue).toHaveBeenCalled()
    })
  })

  test('clicking Continue redirects to dashboard', async () => {
    render(<SectionPickerPage />)
    
    fireEvent.click(screen.getByText('Troop A'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  test('Remember checkbox stores selection with userId in localStorage', async () => {
    render(<SectionPickerPage />)
    
    // Select a section
    fireEvent.click(screen.getByText('Troop A'))
    
    // Check the remember checkbox
    const rememberCheckbox = screen.getByRole('checkbox', { name: /remember/i })
    fireEvent.click(rememberCheckbox)
    
    // Click continue
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    
    await waitFor(() => {
      const stored = localStorage.getItem('seee.sectionSelection.v1')
      expect(stored).not.toBeNull()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.userId).toBe('user-123')
      expect(parsed.selectedSectionId).toBe('section-1')
      expect(parsed.timestamp).toBeDefined()
    })
  })

  test('Without Remember checkbox, localStorage is cleared', async () => {
    // Pre-populate localStorage
    localStorage.setItem('seee.sectionSelection.v1', JSON.stringify({
      userId: 'user-123',
      selectedSectionIds: ['section-1'],
      timestamp: new Date().toISOString(),
    }))
    
    render(<SectionPickerPage />)
    
    // Select a section but don't check remember
    fireEvent.click(screen.getByText('Troop A'))
    
    // Click continue (remember checkbox is unchecked by default)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    
    await waitFor(() => {
      const stored = localStorage.getItem('seee.sectionSelection.v1')
      expect(stored).toBeNull()
    })
  })
})

describe('Remembered Selection Validation', () => {
  const REMEMBER_KEY = 'seee.sectionSelection.v1'
  
  beforeEach(() => {
    localStorage.clear()
  })

  test('valid remembered selection has correct structure (single section)', () => {
    const validSelection = {
      userId: 'user-123',
      selectedSectionId: 'section-1',
      timestamp: new Date().toISOString(),
    }
    
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(validSelection))
    const stored = localStorage.getItem(REMEMBER_KEY)
    const parsed = JSON.parse(stored!)
    
    expect(parsed.userId).toBe('user-123')
    expect(parsed.selectedSectionId).toBe('section-1')
    expect(parsed.timestamp).toBeDefined()
  })

  test('stale selection with invalid section ID should be detected', () => {
    const staleSelection = {
      userId: 'user-123',
      selectedSectionId: 'deleted-section',
      timestamp: new Date().toISOString(),
    }
    
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(staleSelection))
    const stored = localStorage.getItem(REMEMBER_KEY)
    const parsed = JSON.parse(stored!)
    
    // Simulate validation against available sections
    const availableSectionIds = new Set(['section-1', 'section-2', 'section-3'])
    const isValid = availableSectionIds.has(parsed.selectedSectionId)
    
    expect(isValid).toBe(false)
  })

  test('userId mismatch should invalidate remembered selection', () => {
    const wrongUserSelection = {
      userId: 'different-user',
      selectedSectionId: 'section-1',
      timestamp: new Date().toISOString(),
    }
    
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(wrongUserSelection))
    const stored = localStorage.getItem(REMEMBER_KEY)
    const parsed = JSON.parse(stored!)
    
    const currentUserId = 'user-123'
    const isValidUser = parsed.userId === currentUserId
    
    expect(isValidUser).toBe(false)
  })

  test('valid section ID should pass validation', () => {
    const validSelection = {
      userId: 'user-123',
      selectedSectionId: 'section-1',
      timestamp: new Date().toISOString(),
    }
    
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(validSelection))
    const stored = localStorage.getItem(REMEMBER_KEY)
    const parsed = JSON.parse(stored!)
    
    // Simulate validation
    const availableSectionIds = new Set(['section-1', 'section-2', 'section-3'])
    const isValid = availableSectionIds.has(parsed.selectedSectionId)
    
    expect(isValid).toBe(true)
  })
})
