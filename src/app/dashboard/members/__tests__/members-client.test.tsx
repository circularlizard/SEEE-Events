/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, within, fireEvent } from '@testing-library/react'

import { MembersClient } from '../MembersClient'
import type { NormalizedMember } from '@/lib/schemas'
import { useMembers } from '@/hooks/useMembers'

jest.mock('@/hooks/useMembers', () => ({
  useMembers: jest.fn(),
}))

const mockUseMembers = useMembers as jest.Mock

function createMember(overrides: Partial<NormalizedMember> = {}): NormalizedMember {
  const base: NormalizedMember = {
    id: 'member-1',
    firstName: 'Alice',
    lastName: 'Zeta',
    fullName: 'Alice Zeta',
    photoGuid: null,
    sectionId: 1,
    patrolId: 10,
    patrolName: 'Eagle',
    active: true,
    age: '12 / 3',
    dateOfBirth: '2013-01-01',
    started: null,
    startedSection: null,
    endDate: null,
    otherSections: [],
    memberContact: null,
    primaryContact1: null,
    primaryContact2: null,
    emergencyContact: null,
    doctorName: null,
    doctorPhone: null,
    doctorAddress: null,
    medicalNotes: null,
    dietaryNotes: null,
    allergyNotes: null,
    consents: null,
    loadingState: 'complete',
    errorMessage: null,
  }

  return { ...base, ...overrides }
}

// Helper to create mock return value for useMembers hook
function createMockUseMembersReturn(members: NormalizedMember[], overrides: Partial<ReturnType<typeof useMembers>> = {}) {
  return {
    members,
    isLoading: false,
    isFetching: false,
    isFetched: true,
    isError: false,
    error: null,
    isAdmin: true,
    refresh: jest.fn(),
    ...overrides,
  }
}

describe('MembersClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders members table with sections and icon legend', () => {
    const members: NormalizedMember[] = [
      createMember({
        id: 'member-1',
        firstName: 'Alice',
        lastName: 'Zeta',
        patrolName: 'Eagle',
        otherSections: ['Scouts', 'Explorers'],
        consents: { photoConsent: true, medicalConsent: true },
        medicalNotes: 'Asthma',
        allergyNotes: 'Peanuts',
      }),
      createMember({
        id: 'member-2',
        firstName: 'Bob',
        lastName: 'Young',
        patrolName: 'Foxes',
        otherSections: [],
        consents: { photoConsent: false, medicalConsent: false },
        medicalNotes: null,
        allergyNotes: null,
      }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    // Legend should be visible
    expect(screen.getByText('Key:')).toBeInTheDocument()
    expect(screen.getByText('Loaded')).toBeInTheDocument()
    expect(screen.getByText('Loading')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Photo consent')).toBeInTheDocument()
    expect(screen.getByText('Medical notes')).toBeInTheDocument()
    expect(screen.getByText('Allergies')).toBeInTheDocument()

    // Table headers
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /age/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /dob/i })).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Sections')).toBeInTheDocument()

    // Row content
    const rows = screen.getAllByRole('row').slice(1) // skip header

    // Find the row for Alice by matching the Name cell text
    const aliceRowElement = rows.find((row) =>
      within(row).queryByText(/Zeta,\s*Alice/) !== null
    )

    expect(aliceRowElement).toBeDefined()

    const aliceRow = within(aliceRowElement as HTMLElement)

    expect(aliceRow.getByText(/Zeta,\s*Alice/)).toBeInTheDocument()
    // Sections column should show only otherSections for Alice
    expect(aliceRow.getByText('Scouts, Explorers')).toBeInTheDocument()
  })

  test('sorts by status with complete members first', () => {
    const members: NormalizedMember[] = [
      createMember({
        id: 'pending-member',
        firstName: 'Charlie',
        lastName: 'Alpha',
        loadingState: 'pending',
      }),
      createMember({
        id: 'complete-member',
        firstName: 'Dana',
        lastName: 'Bravo',
        loadingState: 'complete',
      }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    // Click Status header to sort by status
    const statusHeader = screen.getByRole('button', { name: /sort by status/i })
    fireEvent.click(statusHeader)

    const rows = screen.getAllByRole('row').slice(1)
    const firstRow = within(rows[0])
    const secondRow = within(rows[1])

    // complete member should be first when sorted ascending by status
    expect(firstRow.getByText('Bravo, Dana')).toBeInTheDocument()
    expect(secondRow.getByText('Alpha, Charlie')).toBeInTheDocument()
  })

  test('shows a dash when member has no other sections', () => {
    const members: NormalizedMember[] = [
      createMember({
        id: 'no-sections',
        firstName: 'Erin',
        lastName: 'Delta',
        otherSections: [],
      }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    const rows = screen.getAllByRole('row').slice(1)
    const row = within(rows[0])

    expect(row.getByText('—')).toBeInTheDocument()
  })

  test('shows empty state when no members and not loading', () => {
    mockUseMembers.mockReturnValue(createMockUseMembersReturn([], { isLoading: false, isFetched: false }))

    render(<MembersClient />)

    expect(screen.getByText('No members loaded')).toBeInTheDocument()
    expect(
      screen.getByText(/select a section to load member data/i)
    ).toBeInTheDocument()
  })

  test('renders per-member loading icons for complete, error, and in-progress states', () => {
    const members: NormalizedMember[] = [
      createMember({ id: 'complete', loadingState: 'complete' }),
      createMember({ id: 'error', loadingState: 'error' }),
      createMember({ id: 'pending', loadingState: 'pending' as any }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    // At least one of each labeled icon should be present
    expect(screen.getAllByLabelText(/data fully loaded/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/error loading data/i).length).toBeGreaterThan(0)
    // Pending state uses the label "Pending" in MemberLoadingState
    expect(screen.getAllByLabelText(/pending/i).length).toBeGreaterThan(0)
  })

  test('details icons reflect photo consent, medical notes, and allergies', () => {
    const members: NormalizedMember[] = [
      createMember({
        id: 'all-details',
        consents: { photoConsent: true, medicalConsent: true },
        medicalNotes: 'Asthma',
        allergyNotes: 'Peanuts',
      }),
      createMember({
        id: 'no-details',
        consents: { photoConsent: false, medicalConsent: false },
        medicalNotes: null,
        allergyNotes: null,
      }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    // Positive states (at least one of each)
    expect(screen.getAllByLabelText(/photo consent given/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/has medical notes/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/has allergy information/i).length).toBeGreaterThan(0)

    // Negative states (at least one of each)
    expect(screen.getAllByLabelText(/no photo consent/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/no medical notes/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/no allergies recorded/i).length).toBeGreaterThan(0)
  })

  test('sorts by name using last name then first name', () => {
    const members: NormalizedMember[] = [
      createMember({ id: 'smith-bob', firstName: 'Bob', lastName: 'Smith' }),
      createMember({ id: 'smith-alice', firstName: 'Alice', lastName: 'Smith' }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    // Default sort is by name ascending
    const rows = screen.getAllByRole('row').slice(1)
    const firstRow = within(rows[0])
    const secondRow = within(rows[1])

    expect(firstRow.getByText(/smith, alice/i)).toBeInTheDocument()
    expect(secondRow.getByText(/smith, bob/i)).toBeInTheDocument()
  })

  test('sorts by age with members missing DOB ordered last', () => {
    const members: NormalizedMember[] = [
      createMember({
        id: 'no-dob',
        firstName: 'NoDob',
        lastName: 'Member',
        dateOfBirth: null,
      }),
      createMember({
        id: 'with-dob',
        firstName: 'WithDob',
        lastName: 'Member',
        dateOfBirth: '2013-01-01',
      }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    const ageHeader = screen.getByRole('button', { name: /sort by age/i })
    fireEvent.click(ageHeader)

    const rows = screen.getAllByRole('row').slice(1)
    const firstRow = within(rows[0])
    const secondRow = within(rows[1])

    // Member with DOB should appear before member without DOB
    expect(firstRow.getByText(/member, withdob/i)).toBeInTheDocument()
    expect(secondRow.getByText(/member, nodob/i)).toBeInTheDocument()
  })

  test('sorts by DOB ascending and descending', () => {
    const members: NormalizedMember[] = [
      createMember({
        id: 'older',
        firstName: 'Older',
        lastName: 'Member',
        dateOfBirth: '2010-01-01',
      }),
      createMember({
        id: 'younger',
        firstName: 'Younger',
        lastName: 'Member',
        dateOfBirth: '2015-01-01',
      }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    const dobHeader = screen.getByRole('button', { name: /sort by dob/i })

    // Ascending
    fireEvent.click(dobHeader)
    let rows = screen.getAllByRole('row').slice(1)
    let firstRow = within(rows[0])
    let secondRow = within(rows[1])
    expect(firstRow.getByText(/member, older/i)).toBeInTheDocument()
    expect(secondRow.getByText(/member, younger/i)).toBeInTheDocument()

    // Descending
    fireEvent.click(dobHeader)
    rows = screen.getAllByRole('row').slice(1)
    firstRow = within(rows[0])
    secondRow = within(rows[1])
    expect(firstRow.getByText(/member, younger/i)).toBeInTheDocument()
    expect(secondRow.getByText(/member, older/i)).toBeInTheDocument()
  })

  test('status header has accessible sort button label', () => {
    const members: NormalizedMember[] = [
      createMember({ id: 'one' }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    expect(
      screen.getByRole('button', { name: /sort by status/i })
    ).toBeInTheDocument()
  })

  test('mobile card shows patrol, age, DOB and other sections cleanly', () => {
    const members: NormalizedMember[] = [
      createMember({
        id: 'mobile-1',
        firstName: 'Mobile',
        lastName: 'User',
        patrolName: 'Foxes',
        dateOfBirth: '2014-05-01',
        otherSections: ['', 'Explorers'],
      }),
    ]

    mockUseMembers.mockReturnValue(createMockUseMembersReturn(members))

    render(<MembersClient />)

    // Name in card (heading in mobile card, not table cell)
    const cardHeading = screen.getByRole('heading', { name: 'User, Mobile' })
    expect(cardHeading).toBeInTheDocument()

    // Scope patrol + age check to the card containing the heading to avoid matching the table cell
    const card = cardHeading.closest('div')?.parentElement?.parentElement as HTMLElement
    expect(card).toBeTruthy()

    const cardQueries = within(card)

    // Patrol and age summary line
    expect(cardQueries.getByText(/foxes/i)).toBeInTheDocument()

    // DOB label in card
    expect(screen.getByText(/dob:/i)).toBeInTheDocument()

    // Other sections should be formatted by formatSections helper (filters empty)
    expect(screen.getByText(/also in: explorers/i)).toBeInTheDocument()
  })
})
