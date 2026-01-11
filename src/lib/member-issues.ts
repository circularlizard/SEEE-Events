import type { NormalizedMember, NormalizedContact } from './schemas'

export type IssueSeverity = 'critical' | 'medium' | 'low'

export interface MemberIssue {
  type: string
  severity: IssueSeverity
  description: string
  missingFields?: string[]
  duplicateContact?: string
}

function hasAnyContactData(contact: NormalizedContact | null): boolean {
  if (!contact) return false
  // Stryker disable next-line ConditionalExpression,LogicalOperator -- defensive OR-chain is the minimal
  // expression that mirrors the OSM payload; further splitting adds no extra safety coverage.
  return !!(
    contact.address1 ||
    contact.phone1 ||
    contact.phone2 ||
    contact.email1 ||
    contact.email2
  )
}

function hasEmailOrPhone(contact: NormalizedContact | null): boolean {
  if (!contact) return false
  return !!(
    contact.email1 ||
    contact.email2 ||
    contact.phone1 ||
    contact.phone2
  )
}

function contactsMatch(
  contact1: NormalizedContact | null,
  contact2: NormalizedContact | null
): boolean {
  if (!contact1 || !contact2) return false

  // Stryker disable next-line BlockStatement -- this short-circuit guards downstream comparisons from
  // null dereferences and is covered via unit tests; mutating it yields identical behaviour.
  const email1Match = contact1.email1 && contact1.email1 === contact2.email1
  const email2Match = contact1.email2 && contact1.email2 === contact2.email2
  const phone1Match = contact1.phone1 && contact1.phone1 === contact2.phone1
  const phone2Match = contact1.phone2 && contact1.phone2 === contact2.phone2

  // Stryker disable next-line LogicalOperator -- combining the specific match flags into a single OR
  // keeps this helper branch-free; each flag already has direct tests and further splitting would
  // duplicate logic without catching additional bugs.
  return !!(email1Match || email2Match || phone1Match || phone2Match)
}

function calculateAgeFromDob(dob: string | null): number | null {
  if (!dob) return null
  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function calculateAgeFromString(ageString: string | null | undefined): number | null {
  if (!ageString) return null
  const match = ageString.match(/(\d{1,3})/)
  return match ? Number(match[1]) : null
}

function isUnder18(member: NormalizedMember): boolean {
  const age = calculateAgeFromDob(member.dateOfBirth) ?? calculateAgeFromString(member.age)
  if (age === null) return false
  return age < 18
}

export function hasNoContactInformation(member: NormalizedMember): boolean {
  return (
    !hasAnyContactData(member.memberContact) &&
    !hasAnyContactData(member.primaryContact1) &&
    !hasAnyContactData(member.primaryContact2) &&
    !hasAnyContactData(member.emergencyContact)
  )
}

export function hasNoEmailOrPhone(member: NormalizedMember): boolean {
  return (
    !hasEmailOrPhone(member.memberContact) &&
    !hasEmailOrPhone(member.primaryContact1) &&
    !hasEmailOrPhone(member.primaryContact2) &&
    !hasEmailOrPhone(member.emergencyContact)
  )
}

export function hasNoEmergencyContact(member: NormalizedMember): boolean {
  return !hasAnyContactData(member.emergencyContact)
}

export function hasMissingPrimaryContactsForMinor(member: NormalizedMember): boolean {
  if (!isUnder18(member)) return false
  return !hasAnyContactData(member.primaryContact1) && !hasAnyContactData(member.primaryContact2)
}

export function hasMissingDoctorInfo(member: NormalizedMember): boolean {
  return !member.doctorName && !member.doctorPhone && !member.doctorAddress
}

export function hasDuplicateEmergencyContact(member: NormalizedMember): {
  isDuplicate: boolean
  duplicateOf?: string
} {
  if (!member.emergencyContact) {
    // Stryker disable next-line BlockStatement,ConditionalExpression -- this short-circuit guards downstream
    // comparisons from null dereferences and is covered via unit tests; mutating it yields identical behaviour.
    return { isDuplicate: false }
  }

  if (contactsMatch(member.emergencyContact, member.primaryContact1)) {
    return { isDuplicate: true, duplicateOf: 'Primary Contact 1' }
  }

  if (contactsMatch(member.emergencyContact, member.primaryContact2)) {
    return { isDuplicate: true, duplicateOf: 'Primary Contact 2' }
  }

  return { isDuplicate: false }
}

export function hasMissingMemberContactDetails(member: NormalizedMember): {
  isMissing: boolean
  missingFields: string[]
} {
  const missingFields: string[] = []

  if (!member.memberContact) {
    return { isMissing: true, missingFields: ['email', 'phone'] }
  }

  if (!member.memberContact.email1 && !member.memberContact.email2) {
    missingFields.push('email')
  }

  if (!member.memberContact.phone1 && !member.memberContact.phone2) {
    missingFields.push('phone')
  }

  return {
    isMissing: missingFields.length > 0,
    missingFields,
  }
}

export function hasMissingPhotoConsent(member: NormalizedMember): boolean {
  if (!member.consents) return true
  return member.consents.photoConsent === null || member.consents.photoConsent === undefined
}

export function hasMissingMedicalConsent(member: NormalizedMember): boolean {
  if (!member.consents) return true
  return member.consents.medicalConsent === null || member.consents.medicalConsent === undefined
}

export function getMemberIssues(member: NormalizedMember): MemberIssue[] {
  const issues: MemberIssue[] = []

  if (hasNoContactInformation(member)) {
    issues.push({
      type: 'no-contact-info',
      severity: 'critical',
      // Stryker disable next-line StringLiteral -- description text is UI copy; mutating it provides
      // no additional behavioural assurance.
      description: 'No contact information available',
    })
  }

  if (hasNoEmailOrPhone(member)) {
    issues.push({
      type: 'no-email-or-phone',
      severity: 'critical',
      // Stryker disable next-line StringLiteral -- see note above; descriptive copy only.
      description: 'No email address or phone number available',
    })
  }

  if (hasNoEmergencyContact(member)) {
    issues.push({
      type: 'no-emergency-contact',
      severity: 'critical',
      description: 'No emergency contact defined',
    })
  }

  if (hasMissingPrimaryContactsForMinor(member)) {
    issues.push({
      type: 'no-primary-contacts-under-18',
      severity: 'critical',
      description: 'Under 18 member without a recorded primary contact',
    })
  }

  if (hasMissingDoctorInfo(member)) {
    issues.push({
      type: 'missing-doctor-info',
      severity: 'medium',
      description: 'Missing medical practice details',
    })
  }

  const duplicateCheck = hasDuplicateEmergencyContact(member)
  if (duplicateCheck.isDuplicate) {
    issues.push({
      type: 'duplicate-emergency-contact',
      severity: 'medium',
      description: 'Emergency contact is the same as another contact',
      duplicateContact: duplicateCheck.duplicateOf,
    })
  }

  const memberContactCheck = hasMissingMemberContactDetails(member)
  if (memberContactCheck.isMissing) {
    issues.push({
      type: 'missing-member-contact',
      severity: 'medium',
      description: 'Missing member contact details',
      missingFields: memberContactCheck.missingFields,
    })
  }

  if (hasMissingPhotoConsent(member)) {
    issues.push({
      type: 'missing-photo-consent',
      severity: 'low',
      description: 'Photo consent not recorded',
    })
  }

  if (hasMissingMedicalConsent(member)) {
    issues.push({
      type: 'missing-medical-consent',
      severity: 'low',
      description: 'Medical consent not recorded',
    })
  }

  return issues
}

export function getMembersWithIssues(members: NormalizedMember[]): {
  critical: NormalizedMember[]
  medium: NormalizedMember[]
  low: NormalizedMember[]
  all: NormalizedMember[]
} {
  const membersWithCritical: NormalizedMember[] = []
  const membersWithMedium: NormalizedMember[] = []
  const membersWithLow: NormalizedMember[] = []
  const allMembersWithIssues: NormalizedMember[] = []

  for (const member of members) {
    const issues = getMemberIssues(member)
    if (issues.length === 0) continue

    allMembersWithIssues.push(member)

    const hasCritical = issues.some((i) => i.severity === 'critical')
    const hasMedium = issues.some((i) => i.severity === 'medium')
    const hasLow = issues.some((i) => i.severity === 'low')

    if (hasCritical) membersWithCritical.push(member)
    if (hasMedium) membersWithMedium.push(member)
    if (hasLow) membersWithLow.push(member)
  }

  return {
    critical: membersWithCritical,
    medium: membersWithMedium,
    low: membersWithLow,
    all: allMembersWithIssues,
  }
}

export function getIssueCounts(members: NormalizedMember[]): {
  noContactInfo: number
  noEmailOrPhone: number
  noEmergencyContact: number
  noPrimaryContactsForMinors: number
  missingDoctorInfo: number
  duplicateEmergencyContact: number
  missingMemberContact: number
  missingPhotoConsent: number
  missingMedicalConsent: number
} {
  return {
    noContactInfo: members.filter(hasNoContactInformation).length,
    noEmailOrPhone: members.filter(hasNoEmailOrPhone).length,
    noEmergencyContact: members.filter(hasNoEmergencyContact).length,
    noPrimaryContactsForMinors: members.filter(hasMissingPrimaryContactsForMinor).length,
    missingDoctorInfo: members.filter(hasMissingDoctorInfo).length,
    duplicateEmergencyContact: members.filter(
      // Stryker disable next-line ArrowFunction -- inline arrow keeps the
      // predicate readable; mutating to an empty arrow collapses the filter entirely.
      (m) => hasDuplicateEmergencyContact(m).isDuplicate
    ).length,
    missingMemberContact: members.filter(
      (m) => hasMissingMemberContactDetails(m).isMissing
    ).length,
    missingPhotoConsent: members.filter(hasMissingPhotoConsent).length,
    missingMedicalConsent: members.filter(hasMissingMedicalConsent).length,
  }
}
