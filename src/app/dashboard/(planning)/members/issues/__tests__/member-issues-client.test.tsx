import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberIssuesClient } from '../MemberIssuesClient'
import { useMembers } from '@/hooks/useMembers'
import type { NormalizedMember, NormalizedContact } from '@/lib/schemas'

jest.mock('@/hooks/useMembers', () => ({
  useMembers: jest.fn(),
}))

let contactCounter = 0
const createContact = (overrides?: Partial<NormalizedContact>): NormalizedContact => {
  contactCounter++
  return {
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Main St',
    address2: '',
    address3: '',
    address4: '',
    postcode: 'AB12 3CD',
    phone1: `0123456789${contactCounter}`,
    phone2: '',
    email1: `contact${contactCounter}@example.com`,
    email2: '',
    ...overrides,
  }
}

const createMember = (overrides?: Partial<NormalizedMember>): NormalizedMember => ({
  id: '123',
  firstName: 'Test',
  lastName: 'Member',
  fullName: 'Test Member',
  photoGuid: null,
  sectionId: 1,
  patrolId: 1,
  patrolName: 'Test Patrol',
  active: true,
  age: '14 / 6',
  dateOfBirth: '2010-01-01',
  started: '2020-01-01',
  startedSection: '2022-01-01',
  endDate: null,
  otherSections: [],
  memberContact: createContact(),
  primaryContact1: createContact({ firstName: 'Parent', lastName: 'One' }),
  primaryContact2: createContact({ firstName: 'Parent', lastName: 'Two' }),
  emergencyContact: createContact({ firstName: 'Emergency', lastName: 'Contact' }),
  doctorName: 'Dr. Smith',
  doctorPhone: '01234567890',
  doctorAddress: '123 Medical Centre',
  medicalNotes: null,
  dietaryNotes: null,
  allergyNotes: null,
  consents: {
    photoConsent: true,
    medicalConsent: true,
  },
  loadingState: 'complete',
  errorMessage: null,
  ...overrides,
})

describe('MemberIssuesClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    contactCounter = 0
  })

  it('shows empty state when no members loaded', () => {
    ;(useMembers as jest.Mock).mockReturnValue({ members: [], isLoading: false, isFetched: true, isError: false, error: null, isAdmin: true, refresh: jest.fn() })
    render(<MemberIssuesClient />)
    expect(
      screen.getByText(/No members loaded. Please select a section to view member data issues./i)
    ).toBeInTheDocument()
  })

  it('shows no issues state when all members have complete data', () => {
    const members = [
      createMember({ id: '1', firstName: 'Alice', lastName: 'Smith' }),
      createMember({ id: '2', firstName: 'Bob', lastName: 'Jones' }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue({ members, isLoading: false, isFetched: true, isError: false, error: null, isAdmin: true, refresh: jest.fn() })
    render(<MemberIssuesClient />)
    expect(screen.getByText(/No Issues Found/i)).toBeInTheDocument()
    expect(screen.getByText(/All 2 members have complete data/i)).toBeInTheDocument()
  })

  it('displays critical issues in accordion sections', async () => {
    const user = userEvent.setup()
    const members = [
      createMember({ id: '1', firstName: 'Alice', lastName: 'A', emergencyContact: null }),
      createMember({ id: '2', firstName: 'Bob', lastName: 'B', emergencyContact: null }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue({ members, isLoading: false, isFetched: true, isError: false, error: null, isAdmin: true, refresh: jest.fn() })
    render(<MemberIssuesClient />)

    expect(screen.getByText(/Critical/i)).toBeInTheDocument()
    expect(screen.getByText(/No Emergency Contact/i)).toBeInTheDocument()
    expect(screen.getByText('2 members')).toBeInTheDocument()

    const accordionTrigger = screen.getByText(/No Emergency Contact/i).closest('button')
    await user.click(accordionTrigger!)

    expect(screen.getByText('A, Alice')).toBeInTheDocument()
    expect(screen.getByText('B, Bob')).toBeInTheDocument()
  })

  it('displays medium priority issues in accordion sections', () => {
    const members = [
      createMember({ id: '1', doctorName: null, doctorPhone: null, doctorAddress: null }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue({ members, isLoading: false, isFetched: true, isError: false, error: null, isAdmin: true, refresh: jest.fn() })
    render(<MemberIssuesClient />)

    expect(screen.getByText(/Medium/i)).toBeInTheDocument()
    expect(screen.getByText(/Missing Doctor Info/i)).toBeInTheDocument()
    expect(screen.getByText('1 member')).toBeInTheDocument()
  })

  it('displays low priority issues in accordion sections', () => {
    const members = [
      createMember({ id: '1', consents: { photoConsent: false, medicalConsent: false } }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue({ members, isLoading: false, isFetched: true, isError: false, error: null, isAdmin: true, refresh: jest.fn() })
    render(<MemberIssuesClient />)

    expect(screen.getAllByText(/Low/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Missing Photo Consent/i)).toBeInTheDocument()
  })

  it('shows correct issue details for each member when expanded', async () => {
    const user = userEvent.setup()
    const members = [
      createMember({
        id: '1',
        firstName: 'Alice',
        lastName: 'A',
        memberContact: createContact({ email1: '', phone1: '' }),
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue({ members, isLoading: false, isFetched: true, isError: false, error: null, isAdmin: true, refresh: jest.fn() })
    render(<MemberIssuesClient />)

    const accordionTrigger = screen.getByText(/Missing Member Contact/i).closest('button')
    await user.click(accordionTrigger!)

    expect(screen.getByText('A, Alice')).toBeInTheDocument()
  })

  it('displays member details in sortable tables when expanded', async () => {
    const user = userEvent.setup()
    const members = [
      createMember({ id: '1', firstName: 'Alice', lastName: 'A', emergencyContact: null }),
      createMember({ id: '2', firstName: 'Bob', lastName: 'B', emergencyContact: null }),
      createMember({ id: '3', firstName: 'Charlie', lastName: 'C', emergencyContact: null }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue({ members, isLoading: false, isFetched: true, isError: false, error: null, isAdmin: true, refresh: jest.fn() })
    render(<MemberIssuesClient />)

    const accordionTrigger = screen.getByText(/No Emergency Contact/i).closest('button')
    expect(accordionTrigger).toBeInTheDocument()

    await user.click(accordionTrigger!)

    expect(screen.getByText('A, Alice')).toBeInTheDocument()
    expect(screen.getByText('B, Bob')).toBeInTheDocument()
    expect(screen.getByText('C, Charlie')).toBeInTheDocument()
  })
})
