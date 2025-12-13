import { z } from 'zod'
import { logValidationError } from './logger'

/**
 * Zod Schemas for SEEE Expedition Dashboard
 * 
 * Two-tier validation strategy:
 * - Tier 1 (Strict): Critical data (IDs, Names, Config) - Fails on invalid data
 * - Tier 2 (Permissive): Logistics data (Flexi, Badges) - Returns null on invalid data
 */

// ============================================================================
// OAUTH RESOURCE SCHEMAS
// ============================================================================

/**
 * OSM OAuth Resource Response Schema
 * Used for /oauth/resource endpoint - contains user info, sections, terms, permissions
 * This replaces the old getStartupData call
 */
export const OAuthTermSchema = z.object({
  name: z.string(),
  startdate: z.string(),
  enddate: z.string(),
  term_id: z.number(),
})

export const OAuthUpgradesSchema = z.object({
  level: z.string(),
  badges: z.boolean(),
  campsiteexternalbookings: z.boolean(),
  details: z.boolean(),
  events: z.boolean(),
  emailbolton: z.boolean(),
  programme: z.boolean(),
  accounts: z.boolean(),
  filestorage: z.boolean(),
  chat: z.boolean(),
  ai: z.boolean(),
  tasks: z.boolean(),
  at_home: z.boolean(),
})

export const OAuthSectionSchema = z.object({
  section_name: z.string(),
  group_name: z.string().optional(),
  section_id: z.number(),
  group_id: z.number(),
  section_type: z.string(),
  terms: z.array(OAuthTermSchema),
  upgrades: OAuthUpgradesSchema,
})

/**
 * Simplified OAuth Section Schema for JWT storage
 * Only stores essential data to avoid JWT size limits
 */
export const SimplifiedOAuthSectionSchema = z.object({
  section_name: z.string(),
  section_id: z.number(),
  group_id: z.number(),
  section_type: z.string(),
  latest_term: OAuthTermSchema.nullable(),
  upgrades: OAuthUpgradesSchema,
})

export const OAuthResourceDataSchema = z.object({
  user_id: z.number(),
  full_name: z.string(),
  email: z.string().email(),
  profile_picture_url: z.string().url().nullable(),
  scopes: z.array(z.string()),
  sections: z.array(OAuthSectionSchema),
  has_parent_access: z.boolean(),
  has_section_access: z.boolean(),
})

export const OAuthResourceSchema = z.object({
  status: z.boolean(),
  error: z.any().nullable(),
  data: OAuthResourceDataSchema,
  meta: z.array(z.any()),
})

export type OAuthTerm = z.infer<typeof OAuthTermSchema>
export type OAuthUpgrades = z.infer<typeof OAuthUpgradesSchema>
export type OAuthSection = z.infer<typeof OAuthSectionSchema>
export type SimplifiedOAuthSection = z.infer<typeof SimplifiedOAuthSectionSchema>
export type OAuthResourceData = z.infer<typeof OAuthResourceDataSchema>
export type OAuthResource = z.infer<typeof OAuthResourceSchema>

// ============================================================================
// TIER 1: STRICT SCHEMAS (Critical Data - Must Be Valid)
// ============================================================================

/**
 * Scout/Member Schema (Tier 1)
 * Used for getmembers.txt - Must have valid IDs and names
 */
export const MemberSchema = z.object({
  scoutid: z.number(),
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  full_name: z.string().min(1),
  photo_guid: z.string().uuid(),
  patrolid: z.number(),
  patrol: z.string(),
  sectionid: z.number(),
  enddate: z.string().nullable(),
  age: z.string(),
  patrol_role_level_label: z.string(),
  active: z.boolean(),
})

export const MembersListSchema = z.array(MemberSchema)

export type Member = z.infer<typeof MemberSchema>

/**
 * Event Schema (Tier 1)
 * Used for getEvents.txt - Must have valid event IDs and names
 */
export const EventSchema = z.object({
  eventid: z.string(),
  name: z.string().min(1),
  date: z.string(),
  startdate_g: z.string(),
  startdate: z.string(),
  enddate: z.string(),
  starttime: z.string(),
  endtime: z.string(),
  cost: z.string(),
  location: z.string(),
  approval_status: z.string().nullable(),
  rota_offered: z.number(),
  rota_accepted: z.number(),
  rota_required: z.number().nullable(),
  yes: z.number(),
  yes_members: z.number(),
  yes_yls: z.number(),
  yes_leaders: z.number(),
  reserved: z.number(),
  no: z.number(),
  invited: z.number(),
  shown: z.number(),
  x: z.number(),
})

export const EventsResponseSchema = z.object({
  identifier: z.literal('eventid'),
  items: z.array(EventSchema),
})

export type Event = z.infer<typeof EventSchema>
export type EventsResponse = z.infer<typeof EventsResponseSchema>

/**
 * Startup Data Schema (Tier 1)
 * Contains user roles and section access - Critical for auth
 */
export const RoleSchema = z.object({
  groupname: z.string(),
  groupid: z.string(),
  group_country: z.string(),
  sectionid: z.string(),
  sectionname: z.string(),
  section: z.string(),
  isDefault: z.string(),
  permissions: z.object({
    badge: z.number(),
    member: z.number(),
    user: z.number(),
    register: z.number(),
    programme: z.number(),
    events: z.number(),
    finance: z.number().optional(),
    flexi: z.number().optional(),
    quartermaster: z.number().optional(),
  }),
  sectionConfig: z.object({
    subscription_level: z.number(),
    subscription_expires: z.string(),
    section_type: z.string(),
  }).passthrough(), // Allow additional fields
})

export const StartupDataSchema = z.object({
  cdn: z.string(),
  resources: z.array(z.string()),
  config_hash: z.string(),
  required_cdn_built_files: z.object({}).passthrough(),
  cache_bust: z.string(),
  globals: z.object({
    post_login_action: z.union([z.boolean(), z.string()]),
    theme: z.string(),
    userid: z.number(),
    roles: z.array(RoleSchema),
  }).passthrough(), // Allow additional fields in globals
}).passthrough() // Allow additional top-level fields

export type Role = z.infer<typeof RoleSchema>
export type StartupData = z.infer<typeof StartupDataSchema>

/**
 * Flexi Record Structure Schema (Tier 1)
 * Column definitions - Critical for data mapping
 */
export const FlexiColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.string().optional(),
  type: z.string().optional(),
})

export const FlexiStructureSchema = z.object({
  identifier: z.string(),
  columns: z.array(FlexiColumnSchema),
})

export type FlexiColumn = z.infer<typeof FlexiColumnSchema>
export type FlexiStructure = z.infer<typeof FlexiStructureSchema>

/**
 * Patrol Schema (Tier 1)
 * Patrol organization - Important for grouping
 */
export const PatrolSchema = z.object({
  patrolid: z.number(),
  name: z.string(),
  active: z.boolean().optional(),
})

export const PatrolsResponseSchema = z.object({
  patrols: z.array(PatrolSchema),
})

export type Patrol = z.infer<typeof PatrolSchema>
export type PatrolsResponse = z.infer<typeof PatrolsResponseSchema>

// ============================================================================
// MEMBER DETAIL SCHEMAS (for getIndividual and getCustomData APIs)
// ============================================================================

/**
 * Individual Member Response Schema
 * Used for ext/members/contact/?action=getIndividual
 * Returns DOB, membership history, and other sections
 */
export const IndividualDataSchema = z.object({
  scoutid: z.union([z.string(), z.number()]).transform(String),
  firstname: z.string(),
  lastname: z.string(),
  photo_guid: z.string().nullable(),
  dob: z.string(), // "2008-01-31"
  started: z.string(), // "2014-03-01"
  created_date: z.string(),
  last_accessed: z.string(),
  patrolid: z.union([z.string(), z.number()]).transform(String),
  patrolleader: z.union([z.string(), z.number()]).transform(String),
  startedsection: z.string(), // "2022-08-08"
  enddate: z.string().nullable(),
  age: z.string(), // "17 years and 10 months"
  age_simple: z.string(), // "17 / 10"
  sectionid: z.number(),
  active: z.boolean(),
  meetings: z.union([z.string(), z.number()]).transform(String),
  others: z.array(z.string()), // Other sections member belongs to
})

export const IndividualResponseSchema = z.object({
  ok: z.boolean(),
  read_only: z.array(z.unknown()),
  data: IndividualDataSchema,
  meta: z.array(z.unknown()),
})

export type IndividualData = z.infer<typeof IndividualDataSchema>
export type IndividualResponse = z.infer<typeof IndividualResponseSchema>

/**
 * Custom Data Column Schema
 * Individual field within a custom data group
 */
export const CustomDataColumnSchema = z.object({
  column_id: z.number(),
  type: z.string(),
  required: z.string(),
  display_in_advanced_view: z.string(),
  display_if_empty: z.string(),
  hide_from_group_display: z.string(),
  config: z.unknown(), // Can be array or object
  varname: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).transform((v) => 
    v === null ? '' : String(v)
  ),
  is_core: z.string(),
  order: z.string(),
  force_read_only: z.string(),
  special_permissions: z.string(),
  permissions: z.array(z.unknown()),
  orig_label: z.string(),
})

/**
 * Custom Data Group Schema
 * Groups like "Member", "Primary Contact 1", "Emergency Contact", etc.
 */
export const CustomDataGroupSchema = z.object({
  group_id: z.number(),
  config: z.unknown().nullable(),
  group_type: z.string(),
  identifier: z.string(), // Key identifier: "contact_primary_member", "contact_primary_1", etc.
  name: z.string(),
  description: z.string(),
  description_mymember: z.string(),
  is_considered_core: z.string(),
  allow_new_columns: z.string(),
  display: z.string(),
  columns: z.array(CustomDataColumnSchema),
  custom_order: z.number(),
})

/**
 * Custom Data Response Schema
 * Full response from ext/customdata/?action=getData
 */
export const CustomDataResponseSchema = z.object({
  status: z.boolean(),
  error: z.unknown().nullable(),
  data: z.array(CustomDataGroupSchema),
  meta: z.object({
    group_name: z.string().optional(),
    section_name: z.string().optional(),
  }).passthrough().optional(),
})

export type CustomDataColumn = z.infer<typeof CustomDataColumnSchema>
export type CustomDataGroup = z.infer<typeof CustomDataGroupSchema>
export type CustomDataResponse = z.infer<typeof CustomDataResponseSchema>

/**
 * Normalized Contact Schema
 * Unified structure for member, parent, and emergency contacts
 */
export const NormalizedContactSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  address1: z.string(),
  address2: z.string(),
  address3: z.string(),
  address4: z.string(),
  postcode: z.string(),
  phone1: z.string(),
  phone2: z.string(),
  email1: z.string(),
  email2: z.string(),
  relationship: z.string().optional(), // For parent/emergency contacts
})

export type NormalizedContact = z.infer<typeof NormalizedContactSchema>

/**
 * Normalized Consents Schema
 */
export const NormalizedConsentsSchema = z.object({
  photoConsent: z.boolean(),
  medicalConsent: z.boolean(),
  // Additional consent fields can be added as needed
})

export type NormalizedConsents = z.infer<typeof NormalizedConsentsSchema>

/**
 * Normalized Member Schema
 * Unified view combining getMembers + getIndividual + getCustomData
 */
export const NormalizedMemberSchema = z.object({
  // Core identity (from getMembers)
  id: z.string(), // scoutid
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  photoGuid: z.string().nullable(),
  
  // Section info
  sectionId: z.number(),
  patrolId: z.number(),
  patrolName: z.string(),
  active: z.boolean(),
  
  // Age info (from getMembers + getIndividual)
  age: z.string(), // "17 / 10" from getMembers
  dateOfBirth: z.string().nullable(), // "2008-01-31" from getIndividual
  
  // Membership dates (from getIndividual)
  started: z.string().nullable(), // When they joined scouting
  startedSection: z.string().nullable(), // When they joined this section
  endDate: z.string().nullable(),
  
  // Other sections (from getIndividual)
  otherSections: z.array(z.string()),
  
  // Contact info (from getCustomData)
  memberContact: NormalizedContactSchema.nullable(),
  primaryContact1: NormalizedContactSchema.nullable(),
  primaryContact2: NormalizedContactSchema.nullable(),
  emergencyContact: NormalizedContactSchema.nullable(),
  
  // Doctor info (from getCustomData)
  doctorName: z.string().nullable(),
  doctorPhone: z.string().nullable(),
  doctorAddress: z.string().nullable(),
  
  // Medical info (from getCustomData)
  medicalNotes: z.string().nullable(),
  dietaryNotes: z.string().nullable(),
  allergyNotes: z.string().nullable(),
  
  // Consents (from getCustomData)
  consents: NormalizedConsentsSchema.nullable(),
  
  // Loading state for progressive hydration
  loadingState: z.enum(['pending', 'summary', 'individual', 'customData', 'complete', 'error']),
  errorMessage: z.string().nullable(),
})

export type NormalizedMember = z.infer<typeof NormalizedMemberSchema>

// ============================================================================
// TIER 2: PERMISSIVE SCHEMAS (Logistics Data - Graceful Degradation)
// ============================================================================

/**
 * Flexi Record Data Schema (Tier 2)
 * Dynamic columns with custom data - May be corrupted or incomplete
 * Returns null for invalid fields instead of throwing
 */
export const FlexiDataItemSchema = z.object({
  scoutid: z.string(),
  firstname: z.string().catch(''),
  lastname: z.string().catch(''),
  dob: z.string().catch(''),
  photo_guid: z.string().catch(''),
  patrolid: z.string().catch(''),
  age: z.string().catch(''),
  total: z.string().catch(''),
  completed: z.string().catch(''),
  // Dynamic flexi columns (f_1, f_2, f_3, etc.)
  // Use catchall for unknown fields
}).catchall(z.string().nullable().catch(null))

export const FlexiDataResponseSchema = z.object({
  identifier: z.literal('scoutid'),
  items: z.array(FlexiDataItemSchema),
}).catch({ identifier: 'scoutid' as const, items: [] })

export type FlexiDataItem = z.infer<typeof FlexiDataItemSchema>
export type FlexiDataResponse = z.infer<typeof FlexiDataResponseSchema>

/**
 * Badge Record Schema (Tier 2)
 * Badge completion data - May have missing or invalid entries
 */
export const BadgeItemSchema = z.object({
  badge_id: z.string().catch(''),
  badge_identifier: z.string().catch(''),
  badge: z.string().catch(''),
  completed: z.string().nullable().catch(null),
  awarded: z.string().nullable().catch(null),
}).catchall(z.unknown().catch(null))

export const BadgeRecordSchema = z.object({
  scoutid: z.string(),
  firstname: z.string().catch(''),
  lastname: z.string().catch(''),
  photo_guid: z.string().catch(''),
  age: z.string().catch(''),
  items: z.array(BadgeItemSchema).catch([]),
}).nullable()

export const BadgeRecordsResponseSchema = z.object({
  identifier: z.string(),
  items: z.array(BadgeRecordSchema).catch([]),
}).catch({ identifier: '', items: [] })

export type BadgeItem = z.infer<typeof BadgeItemSchema>
export type BadgeRecord = z.infer<typeof BadgeRecordSchema>
export type BadgeRecordsResponse = z.infer<typeof BadgeRecordsResponseSchema>

/**
 * Event Attendance Schema (Tier 2)
 * Attendance tracking - May have incomplete data
 */
export const AttendanceItemSchema = z.object({
  scoutid: z.number().catch(0),
  firstname: z.string().catch(''),
  lastname: z.string().catch(''),
  attending: z.enum(['Yes', 'No', 'Invited', 'Reserved', 'Shown']).catch('No'),
  payment_status: z.string().nullable().catch(null),
}).catchall(z.unknown().catch(null))

export const AttendanceResponseSchema = z.array(AttendanceItemSchema).catch([])

export type AttendanceItem = z.infer<typeof AttendanceItemSchema>
export type AttendanceResponse = z.infer<typeof AttendanceResponseSchema>

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safe parse helper for Tier 1 schemas
 * Throws descriptive error if validation fails
 */
export function parseStrict<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    logValidationError({ context, tier: 1, error: result.error, data })
    throw new Error(`Invalid ${context} data: ${result.error.message}`)
  }
  return result.data
}

/**
 * Safe parse helper for Tier 2 schemas
 * Returns default value if validation fails (graceful degradation)
 */
export function parsePermissive<T>(
  schema: z.ZodType<T>,
  data: unknown,
  defaultValue: T,
  context: string
): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    logValidationError({ context, tier: 2, error: result.error, data })
    return defaultValue
  }
  return result.data
}
