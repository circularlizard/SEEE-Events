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
  
  const email1Match = contact1.email1 && contact1.email1 === contact2.email1
  const email2Match = contact1.email2 && contact1.email2 === contact2.email2
  const phone1Match = contact1.phone1 && contact1.phone1 === contact2.phone1
  const phone2Match = contact1.phone2 && contact1.phone2 === contact2.phone2
  
  return !!(email1Match || email2Match || phone1Match || phone2Match)
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

export function hasMissingDoctorInfo(member: NormalizedMember): boolean {
  return !member.doctorName && !member.doctorPhone && !member.doctorAddress
}

export function hasDuplicateEmergencyContact(member: NormalizedMember): {
  isDuplicate: boolean
  duplicateOf?: string
} {
  if (!member.emergencyContact) {
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
  return !member.consents?.photoConsent
}

export function hasMissingMedicalConsent(member: NormalizedMember): boolean {
  return !member.consents?.medicalConsent
}

export function getMemberIssues(member: NormalizedMember): MemberIssue[] {
  const issues: MemberIssue[] = []

  if (hasNoContactInformation(member)) {
    issues.push({
      type: 'no-contact-info',
      severity: 'critical',
      description: 'No contact information available',
    })
  }

  if (hasNoEmailOrPhone(member)) {
    issues.push({
      type: 'no-email-or-phone',
      severity: 'critical',
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
    missingDoctorInfo: members.filter(hasMissingDoctorInfo).length,
    duplicateEmergencyContact: members.filter(
      (m) => hasDuplicateEmergencyContact(m).isDuplicate
    ).length,
    missingMemberContact: members.filter(
      (m) => hasMissingMemberContactDetails(m).isMissing
    ).length,
    missingPhotoConsent: members.filter(hasMissingPhotoConsent).length,
    missingMedicalConsent: members.filter(hasMissingMedicalConsent).length,
  }
}
