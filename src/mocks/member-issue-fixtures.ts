export interface CustomDataColumn {
  varname: string
  value: string
}

export interface CustomDataGroup {
  identifier: string
  columns: CustomDataColumn[]
}

export interface CustomDataPayload {
  data: CustomDataGroup[]
}

const CONTACT_FIELD_NAMES = [
  'firstname',
  'lastname',
  'address1',
  'address2',
  'address3',
  'address4',
  'postcode',
  'relationship',
  'cf_relationship',
  'email1',
  'email2',
  'phone1',
  'phone2',
] as const

const CONTACT_GROUPS = [
  'contact_primary_member',
  'contact_primary_1',
  'contact_primary_2',
  'emergency',
]

const memberIssueFixtures: Record<string, (payload: CustomDataPayload) => void> = {
  // No contact info + no email/phone + no emergency contact
  '1379343': (payload) => {
    CONTACT_GROUPS.forEach((id) => clearContact(findGroup(payload, id)))
  },
  // Missing doctor info
  '1587448': (payload) => {
    clearDoctor(findGroup(payload, 'doctor'))
  },
  // Duplicate emergency contact
  '1274260': (payload) => {
    const primary = findGroup(payload, 'contact_primary_1')
    const emergency = findGroup(payload, 'emergency')
    if (!primary || !emergency) return
    CONTACT_FIELD_NAMES.forEach((field) => {
      const value = getColumnValue(primary, field)
      setColumnValue(emergency, field, value)
    })
  },
  // Missing member contact details
  '1208135': (payload) => {
    const member = findGroup(payload, 'contact_primary_member')
    if (!member) return
    ;['email1', 'email2', 'phone1', 'phone2'].forEach((field) => setColumnValue(member, field, ''))
  },
  // Missing photo consent
  '1587447': (payload) => {
    const consents = findGroup(payload, 'consents')
    if (!consents) return
    setColumnValue(consents, 'photographs_all', 'No')
  },
  // Missing medical consent
  '1067484': (payload) => {
    const consents = findGroup(payload, 'consents')
    if (!consents) return
    setColumnValue(consents, 'sensitive', 'No')
  },
  // Doctor info + member contact partly missing
  '1950150': (payload) => {
    clearDoctor(findGroup(payload, 'doctor'))
    const member = findGroup(payload, 'contact_primary_member')
    if (!member) return
    ;['email1', 'phone1'].forEach((field) => setColumnValue(member, field, ''))
  },
  // No emergency contact only
  '1131206': (payload) => {
    clearContact(findGroup(payload, 'emergency'))
  },
  // Missing photo + medical consents combo
  '3171011': (payload) => {
    const consents = findGroup(payload, 'consents')
    if (!consents) return
    setColumnValue(consents, 'photographs_all', 'No')
    setColumnValue(consents, 'sensitive', 'No')
  },
  // Only missing member phone
  '1274256': (payload) => {
    const member = findGroup(payload, 'contact_primary_member')
    if (!member) return
    setColumnValue(member, 'phone1', '')
  },
}

export function applyMemberIssueFixtures(
  scoutId: string | null | undefined,
  data: unknown
): unknown {
  if (!scoutId) return data
  if (!data || typeof data !== 'object') return data

  const transformer = memberIssueFixtures[scoutId]
  if (!transformer) return data

  const cloned = structuredClone(data) as CustomDataPayload
  transformer(cloned)
  return cloned
}

function findGroup(payload: CustomDataPayload, identifier: string): CustomDataGroup | undefined {
  const id = identifier.toLowerCase()
  return payload.data.find((group) => group.identifier?.toLowerCase() === id)
}

function setColumnValue(group: CustomDataGroup | undefined, varname: string, value: string) {
  if (!group) return
  const column = group.columns.find((col) => col.varname === varname)
  if (column) {
    column.value = value
  }
}

function getColumnValue(group: CustomDataGroup | undefined, varname: string): string {
  if (!group) return ''
  const column = group.columns.find((col) => col.varname === varname)
  return column?.value ?? ''
}

function clearContact(group: CustomDataGroup | undefined) {
  if (!group) return
  CONTACT_FIELD_NAMES.forEach((field) => setColumnValue(group, field, ''))
}

function clearDoctor(group: CustomDataGroup | undefined) {
  if (!group) return
  ;['firstname', 'lastname', 'surgery', 'phone1', 'phone2', 'address1', 'address2', 'address3', 'address4', 'postcode'].forEach((field) =>
    setColumnValue(group, field, '')
  )
}
