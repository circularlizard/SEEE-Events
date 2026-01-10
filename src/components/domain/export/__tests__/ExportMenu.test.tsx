/**
 * ExportMenu Component Tests (REQ-VIEW-10, REQ-VIEW-12)
 *
 * Note: Radix UI dropdown portals content outside the component tree,
 * making dropdown content testing complex. These tests focus on:
 * - Button rendering and state
 * - Accessibility attributes
 * - Props handling
 *
 * Full dropdown interaction is covered by E2E tests.
 */

import { render, screen } from '@testing-library/react'
import { ExportMenu } from '../ExportMenu'
import type { ExportViewContext } from '@/lib/export/types'

// Mock the export service
jest.mock('@/lib/export', () => ({
  executeExport: jest.fn(),
}))

describe('ExportMenu (REQ-VIEW-10, REQ-VIEW-12)', () => {
  const mockContext: ExportViewContext = {
    id: 'test-export',
    title: 'Test Export',
    subtitle: 'Test Subtitle',
    columns: [
      { id: 'name', label: 'Name', type: 'string' },
      { id: 'age', label: 'Age', type: 'number' },
    ],
    rows: [
      { name: 'Scout A', age: 14 },
      { name: 'Scout B', age: 15 },
    ],
    filters: [{ field: 'status', label: 'Status', value: 'Yes' }],
    source: '/dashboard/events/123',
    timestamp: new Date(),
  }

  it('should render export button with default label', () => {
    render(<ExportMenu context={mockContext} />)

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('should render export button with custom label', () => {
    render(<ExportMenu context={mockContext} label="Export Participants" />)

    expect(screen.getByRole('button', { name: /export participants/i })).toBeInTheDocument()
  })

  it('should be disabled when context is null', () => {
    render(<ExportMenu context={null} />)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should be disabled when rows are empty', () => {
    const emptyContext = { ...mockContext, rows: [] }
    render(<ExportMenu context={emptyContext} />)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should be enabled when context has rows', () => {
    render(<ExportMenu context={mockContext} />)

    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('should have accessible aria-label on button', () => {
    render(<ExportMenu context={mockContext} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Export data as spreadsheet or PDF')
  })

  it('should have aria-haspopup attribute for dropdown', () => {
    render(<ExportMenu context={mockContext} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('should apply custom className to button', () => {
    render(<ExportMenu context={mockContext} className="custom-class" />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('should show download icon in button', () => {
    render(<ExportMenu context={mockContext} />)

    // Lucide icons have aria-hidden="true"
    const icon = document.querySelector('svg.lucide-download')
    expect(icon).toBeInTheDocument()
  })
})
