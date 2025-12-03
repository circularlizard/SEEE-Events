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
  group_name: z.string(),
  section_id: z.number(),
  group_id: z.number(),
  section_type: z.string(),
  terms: z.array(OAuthTermSchema),
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
