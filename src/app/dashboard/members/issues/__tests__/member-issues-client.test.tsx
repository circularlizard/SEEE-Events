import { render, screen } from '@testing-library/react'
import { MemberIssuesClient } from '../MemberIssuesClient'
import { useMembers } from '@/store/use-store'
import type { NormalizedMember, NormalizedContact } from '@/lib/schemas'

jest.mock('@/store/use-store', () => ({
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
    ;(useMembers as jest.Mock).mockReturnValue([])
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
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)
    expect(screen.getByText(/No Issues Found/i)).toBeInTheDocument()
    expect(screen.getByText(/All 2 members have complete data/i)).toBeInTheDocument()
  })

  it('displays summary cards with issue counts', () => {
    const members = [
      createMember({ id: '1', emergencyContact: null }),
      createMember({ id: '2', doctorName: null, doctorPhone: null, doctorAddress: null }),
      createMember({ id: '3', consents: { photoConsent: false, medicalConsent: false } }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getAllByText(/No Emergency Contact/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Missing Doctor Info/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Missing Photo Consent/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Missing Medical Consent/i).length).toBeGreaterThan(0)
  })

  it('displays critical issues section when critical issues exist', () => {
    const members = [
      createMember({
        id: '1',
        firstName: 'Critical',
        lastName: 'Member',
        emergencyContact: null,
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getByText(/Critical Issues/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Member, Critical/i).length).toBeGreaterThan(0)
  })

  it('displays medium issues section when medium issues exist', () => {
    const members = [
      createMember({
        id: '1',
        firstName: 'Medium',
        lastName: 'Member',
        doctorName: null,
        doctorPhone: null,
        doctorAddress: null,
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getByText(/Medium Issues/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Member, Medium/i).length).toBeGreaterThan(0)
  })

  it('displays low issues section when low issues exist', () => {
    const members = [
      createMember({
        id: '1',
        firstName: 'Low',
        lastName: 'Member',
        consents: { photoConsent: false, medicalConsent: true },
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getByText(/Low Priority Issues/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Member, Low/i).length).toBeGreaterThan(0)
  })

  it('shows missing fields in issue details', () => {
    const members = [
      createMember({
        id: '1',
        firstName: 'Test',
        lastName: 'Member',
        memberContact: createContact({ email1: '', email2: '' }),
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getByText(/Missing: email/i)).toBeInTheDocument()
  })

  it('shows duplicate contact information', () => {
    const sharedEmail = 'shared@example.com'
    const members = [
      createMember({
        id: '1',
        firstName: 'Duplicate',
        lastName: 'Member',
        emergencyContact: createContact({ email1: sharedEmail }),
        primaryContact1: createContact({ email1: sharedEmail }),
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getByText(/Same as Primary Contact 1/i)).toBeInTheDocument()
  })

  it('displays patrol name for each member', () => {
    const members = [
      createMember({
        id: '1',
        firstName: 'Test',
        lastName: 'Member',
        patrolName: 'Eagles',
        emergencyContact: null,
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getByText('Eagles')).toBeInTheDocument()
  })

  it('displays other sections for members', () => {
    const members = [
      createMember({
        id: '1',
        firstName: 'Multi',
        lastName: 'Section',
        otherSections: ['Beavers', 'Cubs'],
        emergencyContact: null,
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getByText(/Beavers, Cubs/i)).toBeInTheDocument()
  })

  it('shows em dash when member has no other sections', () => {
    const members = [
      createMember({
        id: '1',
        firstName: 'Single',
        lastName: 'Section',
        otherSections: [],
        emergencyContact: null,
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('displays severity badges', () => {
    const members = [
      createMember({ id: '1', emergencyContact: null }),
      createMember({ id: '2', doctorName: null, doctorPhone: null, doctorAddress: null }),
      createMember({ id: '3', consents: { photoConsent: false, medicalConsent: true } }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Medium').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0)
  })

  it('groups members by issue type correctly', () => {
    const members = [
      createMember({ id: '1', firstName: 'Alice', lastName: 'A', emergencyContact: null }),
      createMember({ id: '2', firstName: 'Bob', lastName: 'B', emergencyContact: null }),
      createMember({
        id: '3',
        firstName: 'Charlie',
        lastName: 'C',
        doctorName: null,
        doctorPhone: null,
        doctorAddress: null,
      }),
    ]
    ;(useMembers as jest.Mock).mockReturnValue(members)
    render(<MemberIssuesClient />)

    expect(screen.getAllByText(/No Emergency Contact/i).length).toBeGreaterThan(0)

    expect(screen.getAllByText('A, Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('B, Bob').length).toBeGreaterThan(0)
    expect(screen.getAllByText('C, Charlie').length).toBeGreaterThan(0)
  })
})
