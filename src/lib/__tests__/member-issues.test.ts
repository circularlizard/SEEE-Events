import {
  hasNoContactInformation,
  hasNoEmailOrPhone,
  hasNoEmergencyContact,
  hasMissingDoctorInfo,
  hasDuplicateEmergencyContact,
  hasMissingMemberContactDetails,
  hasMissingPhotoConsent,
  hasMissingMedicalConsent,
  getMemberIssues,
  getMembersWithIssues,
  getIssueCounts,
} from '../member-issues'
import type { NormalizedMember, NormalizedContact } from '../schemas'

const baseContact: NormalizedContact = {
  firstName: 'Contact',
  lastName: 'Person',
  address1: '',
  address2: '',
  address3: '',
  address4: '',
  postcode: '',
  phone1: '',
  phone2: '',
  email1: '',
  email2: '',
}

const createContact = (
  overrides?: Partial<NormalizedContact>,
  label = 'contact'
): NormalizedContact => ({
  ...baseContact,
  firstName: `${label}-first`,
  lastName: `${label}-last`,
  phone1: `${label}-phone1`,
  email1: `${label}@example.test`,
  ...overrides,
})

const createMember = (overrides?: Partial<NormalizedMember>): NormalizedMember => ({
  id: 'member-id',
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
  memberContact: createContact({}, 'member'),
  primaryContact1: createContact({ firstName: 'Parent', lastName: 'One' }, 'primary1'),
  primaryContact2: createContact({ firstName: 'Parent', lastName: 'Two' }, 'primary2'),
  emergencyContact: createContact(
    { firstName: 'Emergency', lastName: 'Contact' },
    'emergency'
  ),
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

describe('member-issues', () => {
  beforeEach(() => {
    // no per-test contact state currently required
  })

  describe('hasNoContactInformation', () => {
    it('returns true when all contacts are null', () => {
      const member = createMember({
        memberContact: null,
        primaryContact1: null,
        primaryContact2: null,
        emergencyContact: null,
      })
      expect(hasNoContactInformation(member)).toBe(true)
    })

    it('returns false when member contact has data', () => {
      const member = createMember()
      expect(hasNoContactInformation(member)).toBe(false)
    })

    it('returns false when member contact is the only populated contact', () => {
      const member = createMember({
        primaryContact1: null,
        primaryContact2: null,
        emergencyContact: null,
      })
      expect(hasNoContactInformation(member)).toBe(false)
    })

    it('returns false when member contact only supplies phone2', () => {
      const member = createMember({
        primaryContact1: null,
        primaryContact2: null,
        emergencyContact: null,
        memberContact: createContact(
          { phone1: '', phone2: 'alt-phone', email1: '', email2: '', address1: '' },
          'member'
        ),
      })
      expect(hasNoContactInformation(member)).toBe(false)
    })

    it('returns false when member contact only supplies email2', () => {
      const member = createMember({
        primaryContact1: null,
        primaryContact2: null,
        emergencyContact: null,
        memberContact: createContact(
          { phone1: '', phone2: '', email1: '', email2: 'secondary@example.test', address1: '' },
          'member'
        ),
      })
      expect(hasNoContactInformation(member)).toBe(false)
    })

    it('returns false when only emergency contact has data', () => {
      const member = createMember({
        memberContact: null,
        primaryContact1: null,
        primaryContact2: null,
      })
      expect(hasNoContactInformation(member)).toBe(false)
    })
  })

  describe('hasNoEmailOrPhone', () => {
    it('returns true when no contacts have email or phone', () => {
      const emptyContact = createContact({
        email1: '',
        email2: '',
        phone1: '',
        phone2: '',
      })
      const member = createMember({
        memberContact: emptyContact,
        primaryContact1: emptyContact,
        primaryContact2: emptyContact,
        emergencyContact: emptyContact,
      })
      expect(hasNoEmailOrPhone(member)).toBe(true)
    })

    it('returns false when member contact has email', () => {
      const member = createMember()
      expect(hasNoEmailOrPhone(member)).toBe(false)
    })

    it('returns false when member contact has only email2', () => {
      const blank = createContact({ email1: '', email2: '', phone1: '', phone2: '' })
      const member = createMember({
        memberContact: createContact(
          { email1: '', email2: 'secondary@example.test', phone1: '', phone2: '' },
          'member-email2'
        ),
        primaryContact1: blank,
        primaryContact2: blank,
        emergencyContact: blank,
      })
      expect(hasNoEmailOrPhone(member)).toBe(false)
    })

    it('returns false when member contact has only phone2', () => {
      const blank = createContact({ email1: '', email2: '', phone1: '', phone2: '' })
      const member = createMember({
        memberContact: createContact({ phone1: '', phone2: 'alt-phone', email1: '', email2: '' }, 'member-phone2'),
        primaryContact1: blank,
        primaryContact2: blank,
        emergencyContact: blank,
      })
      expect(hasNoEmailOrPhone(member)).toBe(false)
    })

    it('returns false when emergency contact has phone', () => {
      const noEmailPhone = createContact({ email1: '', email2: '', phone1: '', phone2: '' })
      const member = createMember({
        memberContact: noEmailPhone,
        primaryContact1: noEmailPhone,
        primaryContact2: noEmailPhone,
        emergencyContact: createContact({ email1: '', email2: '' }),
      })
      expect(hasNoEmailOrPhone(member)).toBe(false)
    })

    it('returns false when primary contact 1 has phone1 only', () => {
      const blank = createContact({ email1: '', email2: '', phone1: '', phone2: '' })
      const member = createMember({
        memberContact: blank,
        primaryContact1: createContact({ email1: '', email2: '', phone2: '', phone1: 'primary1-phone' }, 'primary1'),
        primaryContact2: blank,
        emergencyContact: blank,
      })
      expect(hasNoEmailOrPhone(member)).toBe(false)
    })

    it('returns false when primary contact 2 has phone2 only', () => {
      const blank = createContact({ email1: '', email2: '', phone1: '', phone2: '' })
      const member = createMember({
        memberContact: blank,
        primaryContact1: blank,
        primaryContact2: createContact({ phone1: '', phone2: 'alt-phone', email1: '', email2: '' }, 'primary2'),
        emergencyContact: blank,
      })
      expect(hasNoEmailOrPhone(member)).toBe(false)
    })
  })

  describe('hasNoEmergencyContact', () => {
    it('returns true when emergency contact is null', () => {
      const member = createMember({ emergencyContact: null })
      expect(hasNoEmergencyContact(member)).toBe(true)
    })

    it('returns false when emergency contact exists', () => {
      const member = createMember()
      expect(hasNoEmergencyContact(member)).toBe(false)
    })

    it('returns true when emergency contact has no data', () => {
      const emptyContact = createContact({
        address1: '',
        email1: '',
        email2: '',
        phone1: '',
        phone2: '',
      })
      const member = createMember({ emergencyContact: emptyContact })
      expect(hasNoEmergencyContact(member)).toBe(true)
    })
  })

  describe('hasMissingDoctorInfo', () => {
    it('returns true when all doctor fields are null', () => {
      const member = createMember({
        doctorName: null,
        doctorPhone: null,
        doctorAddress: null,
      })
      expect(hasMissingDoctorInfo(member)).toBe(true)
    })

    it('returns false when doctor name exists', () => {
      const member = createMember()
      expect(hasMissingDoctorInfo(member)).toBe(false)
    })

    it('returns false when only doctor phone exists', () => {
      const member = createMember({
        doctorName: null,
        doctorAddress: null,
      })
      expect(hasMissingDoctorInfo(member)).toBe(false)
    })
  })

  describe('hasDuplicateEmergencyContact', () => {
    it('returns false when emergency contact is null', () => {
      const member = createMember({ emergencyContact: null })
      const result = hasDuplicateEmergencyContact(member)
      expect(result).toEqual({ isDuplicate: false })
    })

    it('detects duplicate with primary contact 1 via email', () => {
      const sharedEmail = 'shared@example.com'
      const member = createMember({
        emergencyContact: createContact({ email1: sharedEmail }),
        primaryContact1: createContact({ email1: sharedEmail }),
      })
      const result = hasDuplicateEmergencyContact(member)
      expect(result.isDuplicate).toBe(true)
      expect(result.duplicateOf).toBe('Primary Contact 1')
    })

    it('detects duplicate with primary contact 2 via phone', () => {
      const sharedPhone = '07777777777'
      const member = createMember({
        emergencyContact: createContact({ phone1: sharedPhone }),
        primaryContact2: createContact({ phone1: sharedPhone }),
      })
      const result = hasDuplicateEmergencyContact(member)
      expect(result.isDuplicate).toBe(true)
      expect(result.duplicateOf).toBe('Primary Contact 2')
    })

    it('detects duplicate with primary contact 1 via secondary email', () => {
      const sharedEmail = 'secondary@example.test'
      const member = createMember({
        emergencyContact: createContact({ email1: '', email2: sharedEmail }),
        primaryContact1: createContact({ email1: '', email2: sharedEmail }),
      })
      const result = hasDuplicateEmergencyContact(member)
      expect(result.isDuplicate).toBe(true)
      expect(result.duplicateOf).toBe('Primary Contact 1')
    })

    it('detects duplicate with primary contact 2 via phone2', () => {
      const sharedPhone = '0777000111'
      const member = createMember({
        emergencyContact: createContact({ phone1: '', phone2: sharedPhone }),
        primaryContact2: createContact({ phone1: '', phone2: sharedPhone }),
      })
      const result = hasDuplicateEmergencyContact(member)
      expect(result.isDuplicate).toBe(true)
      expect(result.duplicateOf).toBe('Primary Contact 2')
    })

    it('does not treat null primary contacts as duplicates', () => {
      const member = createMember({
        primaryContact1: null,
        primaryContact2: null,
      })
      const result = hasDuplicateEmergencyContact(member)
      expect(result.isDuplicate).toBe(false)
    })

    it('returns false when contacts are different', () => {
      const member = createMember()
      const result = hasDuplicateEmergencyContact(member)
      expect(result.isDuplicate).toBe(false)
    })
  })

  describe('hasMissingMemberContactDetails', () => {
    it('returns true with both email and phone missing when member contact is null', () => {
      const member = createMember({ memberContact: null })
      const result = hasMissingMemberContactDetails(member)
      expect(result.isMissing).toBe(true)
      expect(result.missingFields).toEqual(['email', 'phone'])
    })

    it('returns true with email missing', () => {
      const member = createMember({
        memberContact: createContact({ email1: '', email2: '' }),
      })
      const result = hasMissingMemberContactDetails(member)
      expect(result.isMissing).toBe(true)
      expect(result.missingFields).toEqual(['email'])
    })

    it('returns true with phone missing', () => {
      const member = createMember({
        memberContact: createContact({ phone1: '', phone2: '' }),
      })
      const result = hasMissingMemberContactDetails(member)
      expect(result.isMissing).toBe(true)
      expect(result.missingFields).toEqual(['phone'])
    })

    it('returns false when both email and phone exist', () => {
      const member = createMember()
      const result = hasMissingMemberContactDetails(member)
      expect(result.isMissing).toBe(false)
      expect(result.missingFields).toEqual([])
    })
  })

  describe('hasMissingPhotoConsent', () => {
    it('returns true when consents is null', () => {
      const member = createMember({ consents: null })
      expect(hasMissingPhotoConsent(member)).toBe(true)
    })

    it('returns true when photoConsent is false', () => {
      const member = createMember({
        consents: { photoConsent: false, medicalConsent: true },
      })
      expect(hasMissingPhotoConsent(member)).toBe(true)
    })

    it('returns false when photoConsent is true', () => {
      const member = createMember()
      expect(hasMissingPhotoConsent(member)).toBe(false)
    })
  })

  describe('hasMissingMedicalConsent', () => {
    it('returns true when consents is null', () => {
      const member = createMember({ consents: null })
      expect(hasMissingMedicalConsent(member)).toBe(true)
    })

    it('returns true when medicalConsent is false', () => {
      const member = createMember({
        consents: { photoConsent: true, medicalConsent: false },
      })
      expect(hasMissingMedicalConsent(member)).toBe(true)
    })

    it('returns false when medicalConsent is true', () => {
      const member = createMember()
      expect(hasMissingMedicalConsent(member)).toBe(false)
    })
  })

  describe('getMemberIssues', () => {
    it('returns empty array for member with no issues', () => {
      const member = createMember()
      const issues = getMemberIssues(member)
      expect(issues).toHaveLength(0)
    })

    it('returns critical issues', () => {
      const member = createMember({
        memberContact: null,
        primaryContact1: null,
        primaryContact2: null,
        emergencyContact: null,
      })
      const issues = getMemberIssues(member)
      const criticalIssues = issues.filter((i) => i.severity === 'critical')
      expect(criticalIssues).toHaveLength(3)
      expect(issues.map((i) => i.type)).toContain('no-contact-info')
      expect(issues.map((i) => i.type)).toContain('no-email-or-phone')
      expect(issues.map((i) => i.type)).toContain('no-emergency-contact')
    })

    it('returns medium issues', () => {
      const member = createMember({
        doctorName: null,
        doctorPhone: null,
        doctorAddress: null,
        memberContact: createContact({ email1: '', email2: '' }),
        emergencyContact: createContact({ email1: 'shared@example.com' }),
        primaryContact1: createContact({ email1: 'shared@example.com' }),
      })
      const issues = getMemberIssues(member)
      const mediumIssues = issues.filter((i) => i.severity === 'medium')
      expect(mediumIssues.length).toBeGreaterThan(0)
      expect(mediumIssues.map((i) => i.type)).toContain('missing-doctor-info')
      expect(mediumIssues.map((i) => i.type)).toContain('duplicate-emergency-contact')
      expect(mediumIssues.map((i) => i.type)).toContain('missing-member-contact')
    })

    it('returns low issues', () => {
      const member = createMember({
        consents: { photoConsent: false, medicalConsent: false },
      })
      const issues = getMemberIssues(member)
      const lowIssues = issues.filter((i) => i.severity === 'low')
      expect(lowIssues).toHaveLength(2)
      expect(lowIssues.map((i) => i.type)).toContain('missing-photo-consent')
      expect(lowIssues.map((i) => i.type)).toContain('missing-medical-consent')
    })
  })

  describe('getMembersWithIssues', () => {
    it('categorizes members by severity with minimal fixtures', () => {
      const critical = createMember({ id: 'critical', emergencyContact: null })
      const medium = createMember({
        id: 'medium',
        doctorName: null,
        doctorPhone: null,
        doctorAddress: null,
      })
      const low = createMember({
        id: 'low',
        consents: { photoConsent: false, medicalConsent: true },
      })

      const result = getMembersWithIssues([critical, medium, low])
      expect(result.critical).toEqual([critical])
      expect(result.medium).toEqual([medium])
      expect(result.low).toEqual([low])
      expect(result.all).toHaveLength(3)
    })

    it('returns empty arrays when no issues', () => {
      const result = getMembersWithIssues([createMember({ id: '1' })])
      expect(result.critical).toHaveLength(0)
      expect(result.medium).toHaveLength(0)
      expect(result.low).toHaveLength(0)
      expect(result.all).toHaveLength(0)
    })
  })

  describe('getIssueCounts', () => {
    it('counts targeted issue types', () => {
      const members = [
        createMember({ id: '1', emergencyContact: null }),
        createMember({ id: '2', doctorName: null, doctorPhone: null, doctorAddress: null }),
        createMember({ id: '3', consents: { photoConsent: false, medicalConsent: false } }),
      ]

      const counts = getIssueCounts(members)
      expect(counts.noEmergencyContact).toBe(1)
      expect(counts.missingDoctorInfo).toBe(1)
      expect(counts.missingPhotoConsent).toBe(1)
      expect(counts.missingMedicalConsent).toBe(1)
    })

    it('returns zero counts when no issues', () => {
      const counts = getIssueCounts([createMember({ id: 'clean' })])
      expect(counts.noContactInfo).toBe(0)
      expect(counts.noEmailOrPhone).toBe(0)
      expect(counts.noEmergencyContact).toBe(0)
      expect(counts.missingDoctorInfo).toBe(0)
      expect(counts.duplicateEmergencyContact).toBe(0)
      expect(counts.missingMemberContact).toBe(0)
      expect(counts.missingPhotoConsent).toBe(0)
      expect(counts.missingMedicalConsent).toBe(0)
    })
  })
})
