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
function normalizeValue(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'n/a') {
    return ''
  }
  return trimmed
}

function getColumnValue(columns: CustomDataColumn[], varname: string): string {
  const column = columns.find((c) => c.varname === varname)
  return normalizeValue(column?.value ?? '')
}

function getFirstColumnValue(columns: CustomDataColumn[], varnames: string[]): string {
  for (const varname of varnames) {
    const value = getColumnValue(columns, varname)
    if (value) return value
  }
  return ''
}

/**
 * Extract contact information from a custom data group
 */
function extractContact(group: CustomDataGroup): NormalizedContact {
  const cols = group.columns
  return {
    firstName: getFirstColumnValue(cols, ['firstname', 'first_name', 'forename']),
    lastName: getFirstColumnValue(cols, ['lastname', 'last_name', 'surname']),
    address1: getFirstColumnValue(cols, ['address1', 'address_1', 'address']),
    address2: getFirstColumnValue(cols, ['address2', 'address_2']),
    address3: getFirstColumnValue(cols, ['address3', 'address_3', 'town', 'city']),
    address4: getFirstColumnValue(cols, ['address4', 'address_4', 'county', 'region']),
    postcode: getFirstColumnValue(cols, ['postcode', 'post_code', 'zip', 'zipcode']),
    phone1: getFirstColumnValue(cols, ['phone1', 'phone', 'telephone', 'mobile', 'mobile1']),
    phone2: getFirstColumnValue(cols, ['phone2', 'telephone2', 'mobile2']),
    email1: getFirstColumnValue(cols, ['email1', 'email', 'email_address']),
    email2: getFirstColumnValue(cols, ['email2', 'email_alt', 'email_address2']),
    relationship: getFirstColumnValue(cols, ['relationship', 'relation', 'cf_relationship']),
  }
}

function parseConsentValue(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (['yes', 'y', 'true', '1'].includes(normalized)) return true
  if (['no', 'n', 'false', '0'].includes(normalized)) return false
  return null
}

/**
 * Extract consents from the consents group
 */
function extractConsents(group: CustomDataGroup): NormalizedConsents {
  const cols = group.columns
  
  // Photo consent - look for various possible varnames
  const photoValue = getColumnValue(cols, 'photo_consent') || 
                     getColumnValue(cols, 'consent_photo') ||
                     getColumnValue(cols, 'photography') ||
                     getColumnValue(cols, 'photographs_all')

  // Medical consent - look for various possible varnames
  const medicalValue = getColumnValue(cols, 'medical_consent') ||
                       getColumnValue(cols, 'consent_medical') ||
                       getColumnValue(cols, 'medical') ||
                       getColumnValue(cols, 'sensitive')

  return {
    photoConsent: parseConsentValue(photoValue),
    medicalConsent: parseConsentValue(medicalValue),
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
    const identifier = group.identifier.toLowerCase()
    const name = group.name.toLowerCase()

    const isMemberContact =
      identifier === GROUP_IDENTIFIERS.MEMBER_CONTACT ||
      identifier.includes('contact_primary_member') ||
      name === 'member'

    const isPrimary1 =
      identifier === GROUP_IDENTIFIERS.PRIMARY_CONTACT_1 ||
      identifier.includes('contact_primary_1') ||
      name.includes('primary contact 1')

    const isPrimary2 =
      identifier === GROUP_IDENTIFIERS.PRIMARY_CONTACT_2 ||
      identifier.includes('contact_primary_2') ||
      name.includes('primary contact 2')

    const isEmergency =
      identifier === GROUP_IDENTIFIERS.EMERGENCY ||
      identifier.includes('emergency') ||
      name.includes('emergency')

    const isDoctor =
      identifier === GROUP_IDENTIFIERS.DOCTOR ||
      identifier.includes('doctor') ||
      identifier.includes('medical') ||
      name.includes('doctor') ||
      name.includes('medical') ||
      name.includes('practice')

    const isConsents =
      identifier === GROUP_IDENTIFIERS.CONSENTS ||
      identifier.includes('consent') ||
      name.includes('consent')

    const isStandardFields =
      identifier === GROUP_IDENTIFIERS.STANDARD_FIELDS ||
      identifier.includes('standard')

    if (isMemberContact) {
      result.memberContact = extractContact(group)
      // Also extract medical/dietary/allergy notes from member contact group
      result.medicalNotes = getFirstColumnValue(group.columns, [
        'medical',
        'medical_notes',
        'medical_details',
        'cf_medical_notes',
        'cf_medical',
      ])
      result.dietaryNotes = getFirstColumnValue(group.columns, [
        'dietary',
        'dietary_notes',
        'dietary_requirements',
        'cf_dietary_notes',
        'cf_dietary_requirements',
      ])
      result.allergyNotes = getFirstColumnValue(group.columns, [
        'allergies',
        'allergy_notes',
        'cf_allergy_notes',
      ])
      continue
    }

    if (isPrimary1) {
      result.primaryContact1 = extractContact(group)
      continue
    }

    if (isPrimary2) {
      result.primaryContact2 = extractContact(group)
      continue
    }

    if (isEmergency) {
      result.emergencyContact = extractContact(group)
      continue
    }

    if (isDoctor) {
      result.doctorName = getFirstColumnValue(group.columns, ['surgery', 'practice', 'gp_surgery', 'doctor_name', 'name']) || result.doctorName
      result.doctorPhone = getFirstColumnValue(group.columns, ['phone', 'phone1', 'telephone', 'tel']) || result.doctorPhone
      result.doctorAddress = getFirstColumnValue(group.columns, ['address', 'address1', 'address_1']) || result.doctorAddress
      continue
    }

    if (isStandardFields) {
      // Standard fields may also contain medical info
      if (!result.medicalNotes) {
        result.medicalNotes = getFirstColumnValue(group.columns, [
          'medical',
          'medical_details',
          'medical_notes',
          'cf_medical_notes',
          'cf_medical',
        ])
      }
      if (!result.dietaryNotes) {
        result.dietaryNotes = getFirstColumnValue(group.columns, [
          'dietary',
          'dietary_requirements',
          'dietary_notes',
          'cf_dietary_notes',
          'cf_dietary_requirements',
        ])
      }
      if (!result.allergyNotes) {
        result.allergyNotes = getFirstColumnValue(group.columns, [
          'allergies',
          'allergy_notes',
          'cf_allergy_notes',
        ])
      }
      continue
    }

    if (isConsents) {
      result.consents = extractConsents(group)
      continue
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
    fullName: `${member.firstname} ${member.lastname}`,
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
