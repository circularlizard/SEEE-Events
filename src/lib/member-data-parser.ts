/**
 * Member Data Parser
 * 
 * Extracts structured data from the complex getCustomData response.
 * Maps group identifiers to normalized contact/medical/consent structures.
 */

import type {
  CustomDataGroup,
  CustomDataColumn,
  NormalizedContact,
  NormalizedConsents,
  NormalizedMember,
  Member,
  IndividualData,
} from './schemas'

/**
 * Group identifiers in getCustomData response
 */
const GROUP_IDENTIFIERS = {
  FLOATING: 'floating',
  MEMBER_CONTACT: 'contact_primary_member',
  PRIMARY_CONTACT_1: 'contact_primary_1',
  PRIMARY_CONTACT_2: 'contact_primary_2',
  EMERGENCY: 'emergency',
  DOCTOR: 'doctor',
  STANDARD_FIELDS: 'standard_fields',
  CONSENTS: 'consents',
  CUSTOMISABLE: 'customisable_data',
} as const

/**
 * Extract a column value by varname from a group's columns
 */
function getColumnValue(columns: CustomDataColumn[], varname: string): string {
  const column = columns.find((c) => c.varname === varname)
  return column?.value ?? ''
}

/**
 * Extract contact information from a custom data group
 */
function extractContact(group: CustomDataGroup): NormalizedContact {
  const cols = group.columns
  return {
    firstName: getColumnValue(cols, 'firstname') || getColumnValue(cols, 'first_name'),
    lastName: getColumnValue(cols, 'lastname') || getColumnValue(cols, 'last_name'),
    address1: getColumnValue(cols, 'address1'),
    address2: getColumnValue(cols, 'address2'),
    address3: getColumnValue(cols, 'address3'),
    address4: getColumnValue(cols, 'address4'),
    postcode: getColumnValue(cols, 'postcode'),
    phone1: getColumnValue(cols, 'phone1'),
    phone2: getColumnValue(cols, 'phone2'),
    email1: getColumnValue(cols, 'email1'),
    email2: getColumnValue(cols, 'email2'),
    relationship: getColumnValue(cols, 'relationship'),
  }
}

/**
 * Extract consents from the consents group
 */
function extractConsents(group: CustomDataGroup): NormalizedConsents {
  const cols = group.columns
  
  // Photo consent - look for various possible varnames
  const photoValue = getColumnValue(cols, 'photo_consent') || 
                     getColumnValue(cols, 'consent_photo') ||
                     getColumnValue(cols, 'photography')
  
  // Medical consent - look for various possible varnames
  const medicalValue = getColumnValue(cols, 'medical_consent') ||
                       getColumnValue(cols, 'consent_medical') ||
                       getColumnValue(cols, 'medical')
  
  return {
    photoConsent: photoValue.toLowerCase() === 'yes' || photoValue === '1',
    medicalConsent: medicalValue.toLowerCase() === 'yes' || medicalValue === '1',
  }
}

/**
 * Parsed custom data result
 */
export interface ParsedCustomData {
  memberContact: NormalizedContact | null
  primaryContact1: NormalizedContact | null
  primaryContact2: NormalizedContact | null
  emergencyContact: NormalizedContact | null
  doctorName: string | null
  doctorPhone: string | null
  doctorAddress: string | null
  medicalNotes: string | null
  dietaryNotes: string | null
  allergyNotes: string | null
  consents: NormalizedConsents | null
}

/**
 * Parse custom data groups into structured data
 */
export function parseCustomDataGroups(groups: CustomDataGroup[]): ParsedCustomData {
  const result: ParsedCustomData = {
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
  }

  for (const group of groups) {
    switch (group.identifier) {
      case GROUP_IDENTIFIERS.MEMBER_CONTACT:
        result.memberContact = extractContact(group)
        // Also extract medical/dietary/allergy notes from member contact group
        result.medicalNotes = getColumnValue(group.columns, 'medical') || 
                             getColumnValue(group.columns, 'medical_notes')
        result.dietaryNotes = getColumnValue(group.columns, 'dietary') ||
                             getColumnValue(group.columns, 'dietary_notes')
        result.allergyNotes = getColumnValue(group.columns, 'allergies') ||
                             getColumnValue(group.columns, 'allergy_notes')
        break

      case GROUP_IDENTIFIERS.PRIMARY_CONTACT_1:
        result.primaryContact1 = extractContact(group)
        break

      case GROUP_IDENTIFIERS.PRIMARY_CONTACT_2:
        result.primaryContact2 = extractContact(group)
        break

      case GROUP_IDENTIFIERS.EMERGENCY:
        result.emergencyContact = extractContact(group)
        break

      case GROUP_IDENTIFIERS.DOCTOR:
        result.doctorName = getColumnValue(group.columns, 'surgery') ||
                           getColumnValue(group.columns, 'doctor_name') ||
                           getColumnValue(group.columns, 'name')
        result.doctorPhone = getColumnValue(group.columns, 'phone') ||
                            getColumnValue(group.columns, 'phone1')
        result.doctorAddress = getColumnValue(group.columns, 'address') ||
                              getColumnValue(group.columns, 'address1')
        break

      case GROUP_IDENTIFIERS.STANDARD_FIELDS:
        // Standard fields may also contain medical info
        if (!result.medicalNotes) {
          result.medicalNotes = getColumnValue(group.columns, 'medical') ||
                               getColumnValue(group.columns, 'medical_details')
        }
        if (!result.dietaryNotes) {
          result.dietaryNotes = getColumnValue(group.columns, 'dietary') ||
                               getColumnValue(group.columns, 'dietary_requirements')
        }
        if (!result.allergyNotes) {
          result.allergyNotes = getColumnValue(group.columns, 'allergies')
        }
        break

      case GROUP_IDENTIFIERS.CONSENTS:
        result.consents = extractConsents(group)
        break
    }
  }

  return result
}

/**
 * Create initial normalized member from getMembers summary data
 */
export function createNormalizedMemberFromSummary(member: Member): NormalizedMember {
  return {
    id: member.scoutid.toString(),
    firstName: member.firstname,
    lastName: member.lastname,
    fullName: member.full_name,
    photoGuid: member.photo_guid,
    sectionId: member.sectionid,
    patrolId: member.patrolid,
    patrolName: member.patrol,
    active: member.active,
    age: member.age,
    dateOfBirth: null, // Will be filled from getIndividual
    started: null,
    startedSection: null,
    endDate: member.enddate,
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
    loadingState: 'summary',
    errorMessage: null,
  }
}

/**
 * Update normalized member with getIndividual data
 */
export function updateMemberWithIndividualData(
  member: NormalizedMember,
  individual: IndividualData
): NormalizedMember {
  return {
    ...member,
    dateOfBirth: individual.dob,
    started: individual.started,
    startedSection: individual.startedsection,
    otherSections: individual.others,
    loadingState: 'individual',
  }
}

/**
 * Update normalized member with getCustomData
 */
export function updateMemberWithCustomData(
  member: NormalizedMember,
  customData: ParsedCustomData
): NormalizedMember {
  return {
    ...member,
    memberContact: customData.memberContact,
    primaryContact1: customData.primaryContact1,
    primaryContact2: customData.primaryContact2,
    emergencyContact: customData.emergencyContact,
    doctorName: customData.doctorName,
    doctorPhone: customData.doctorPhone,
    doctorAddress: customData.doctorAddress,
    medicalNotes: customData.medicalNotes,
    dietaryNotes: customData.dietaryNotes,
    allergyNotes: customData.allergyNotes,
    consents: customData.consents,
    loadingState: 'complete',
  }
}

/**
 * Mark member as having an error
 */
export function markMemberError(
  member: NormalizedMember,
  errorMessage: string
): NormalizedMember {
  return {
    ...member,
    loadingState: 'error',
    errorMessage,
  }
}
