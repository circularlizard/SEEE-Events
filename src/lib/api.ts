/**
 * API Client for SEEE Expedition Dashboard
 * 
 * All API calls go through the /api/proxy route (Safety Shield).
 * Includes type-safe response parsing with Zod schemas.
 */

import {
  MembersListSchema,
  EventsResponseSchema,
  FlexiDataResponseSchema,
  FlexiStructureSchema,
  BadgeRecordsResponseSchema,
  AttendanceResponseSchema,
  PatrolsResponseSchema,
  parseStrict,
  parsePermissive,
  type Member,
  type EventsResponse,
  type FlexiDataResponse,
  type FlexiStructure,
  type BadgeRecordsResponse,
  type AttendanceResponse,
  type PatrolsResponse,
  StartupDataSchema,
  type StartupData,
} from './schemas'

/**
 * API Error Types
 */
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Base fetch wrapper with error handling
 * 
 * All API calls go through the proxy route. This function is designed for
 * client-side use where the browser handles cookies/auth automatically.
 */
async function proxyFetch(path: string, params?: Record<string, string>): Promise<Response> {
  const searchParams = new URLSearchParams(params)
  const url = `/api/proxy/${path}${params ? `?${searchParams.toString()}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Handle error responses
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new APIError(
      errorData.message || `API request failed with status ${response.status}`,
      errorData.error || 'UNKNOWN_ERROR',
      response.status,
      errorData.retryAfter
    )
  }

  return response
}

/**
 * @deprecated This endpoint is no longer needed. User data, sections, and permissions
 * are now provided directly by the OAuth /oauth/resource endpoint and stored in the
 * NextAuth session. Use `useSession()` instead to access this data.
 * 
 * Fetch startup data (Tier 1 - Strict validation)
 * Contains user roles and available sections
 */
export async function getStartupData(): Promise<StartupData | null> {
  const response = await proxyFetch('ext/generic/startup/', {
    action: 'getData',
  })

  const data = await response.json()
  return parsePermissive(StartupDataSchema, data, null as StartupData | null, 'Startup Data')
}

/**
 * Fetch members list (Tier 1 - Strict validation)
 */
export async function getMembers(params: {
  sectionid: number
  termid: number
  section?: string
}): Promise<Member[]> {
  const response = await proxyFetch('ext/members/contact/', {
    action: 'getListOfMembers',
    sort: 'dob',
    sectionid: params.sectionid.toString(),
    termid: params.termid.toString(),
    section: params.section || 'explorers',
  })

  const data = await response.json()
  return parseStrict(MembersListSchema, data, 'Members')
}

/**
 * Fetch events list (Tier 1 - Strict validation)
 */
export async function getEvents(params: {
  sectionid: number
  termid: number
}): Promise<EventsResponse> {
  const response = await proxyFetch('ext/events/summary/', {
    action: 'get',
    sectionid: params.sectionid.toString(),
    termid: params.termid.toString(),
  })

  const data = await response.json()
  return parseStrict(EventsResponseSchema, data, 'Events')
}

/**
 * Fetch patrols (Tier 1 - Strict validation)
 *
 * Upstream OSM API returns an object keyed by patrol ID (and sometimes an
 * "unallocated" key), not a `{ patrols: [...] }` array. We normalize that
 * into the simple `{ patrols: Patrol[] }` shape expected by
 * `PatrolsResponseSchema` before running strict validation.
 */
export async function getPatrols(params: {
  sectionid: number
  termid: number
  section?: string
}): Promise<PatrolsResponse> {
  const response = await proxyFetch('ext/members/patrols/', {
    action: 'getPatrolsWithPeople',
    sectionid: params.sectionid.toString(),
    termid: params.termid.toString(),
    section: params.section || 'explorers',
  })

  const raw = await response.json() as unknown

  // Normalize into `{ patrols: Patrol[] }` regardless of upstream shape
  let normalized: { patrols: Array<{ patrolid: number; name: string; active?: boolean }> }

  if (raw && typeof raw === 'object' && Array.isArray((raw as any).patrols)) {
    // Already in the expected shape
    normalized = { patrols: (raw as any).patrols }
  } else if (raw && typeof raw === 'object') {
    // OSM-style object keyed by patrolid plus optional "unallocated" key
    const values = Object.values(raw as Record<string, unknown>)
    const patrols = values
      .filter((v) => v && typeof v === 'object' && 'patrolid' in (v as any) && 'name' in (v as any))
      .map((v) => {
        const p = v as { patrolid: unknown; name: unknown; active?: unknown }
        const patrolid = typeof p.patrolid === 'string' ? parseInt(p.patrolid, 10) : Number(p.patrolid)
        const name = String(p.name ?? '')
        const activeValue = (p as any).active
        const active =
          typeof activeValue === 'boolean'
            ? activeValue
            : activeValue === '1' || activeValue === 1

        return {
          patrolid,
          name,
          ...(Number.isFinite(patrolid) && name ? { active } : {}),
        }
      })
      // Filter out any entries where patrolid is NaN or name is empty
      .filter((p) => Number.isFinite(p.patrolid) && p.name.length > 0)

    normalized = { patrols }
  } else {
    normalized = { patrols: [] }
  }

  return parseStrict(PatrolsResponseSchema, normalized, 'Patrols')
}

/**
 * Fetch flexi record structure (Tier 1 - Column definitions)
 */
export async function getFlexiStructure(params: {
  sectionid: number
  extraid: number
}): Promise<FlexiStructure> {
  const response = await proxyFetch('ext/members/flexirecords/', {
    action: 'getStructure',
    sectionid: params.sectionid.toString(),
    extraid: params.extraid.toString(),
  })

  const data = await response.json()
  return parseStrict(FlexiStructureSchema, data, 'Flexi Structure')
}

/**
 * Fetch flexi record data (Tier 2 - Permissive validation)
 */
export async function getFlexiData(params: {
  sectionid: number
  termid: number
  extraid: number
}): Promise<FlexiDataResponse> {
  const response = await proxyFetch('ext/members/flexirecords/', {
    action: 'getData',
    sectionid: params.sectionid.toString(),
    termid: params.termid.toString(),
    extraid: params.extraid.toString(),
    nototal: 'true',
  })

  const data = await response.json()
  return parsePermissive(
    FlexiDataResponseSchema,
    data,
    { identifier: 'scoutid', items: [] },
    'Flexi Data'
  )
}

/**
 * Fetch badge records (Tier 2 - Permissive validation)
 */
export async function getBadgeRecords(params: {
  sectionid: number
  termid: number
  badgeId: number
  section?: string
}): Promise<BadgeRecordsResponse> {
  const response = await proxyFetch('ext/badges/records/', {
    action: 'getBadgeRecords',
    section_id: params.sectionid.toString(),
    term_id: params.termid.toString(),
    badge_id: params.badgeId.toString(),
    section: params.section || 'explorers',
    badge_version: '1',
    payload: '1',
    type_id: '1',
  })

  const data = await response.json()
  return parsePermissive(
    BadgeRecordsResponseSchema,
    data,
    { identifier: '', items: [] },
    'Badge Records'
  )
}

/**
 * Fetch event attendance (Tier 2 - Permissive validation)
 */
export async function getEventAttendance(params: {
  eventid: number
  termid: number
}): Promise<AttendanceResponse> {
  const response = await proxyFetch(`v3/events/event/${params.eventid}/members/attendance`, {
    term_id: params.termid.toString(),
  })

  const data = await response.json()
  return parsePermissive(AttendanceResponseSchema, data, [], 'Event Attendance')
}

/**
 * Fetch event details
 */
export async function getEventDetails(eventid: number): Promise<unknown> {
  const response = await proxyFetch(`v3/events/event/${eventid}/basic_details`)
  return await response.json()
}

/**
 * Fetch event summary
 */
export async function getEventSummary(eventid: number): Promise<unknown> {
  const response = await proxyFetch(`v3/events/event/${eventid}/summary`)
  return await response.json()
}

/**
 * Health check - test if proxy is accessible
 */
export async function healthCheck(): Promise<{
  status: 'ok' | 'error'
  rateLimiter: 'available' | 'soft_locked' | 'hard_locked' | 'error'
}> {
  try {
    // Try a simple API call
    const response = await fetch('/api/proxy/ext/generic/startup/?action=getData', {
      method: 'GET',
    })

    if (response.status === 429) {
      return { status: 'ok', rateLimiter: 'soft_locked' }
    }

    if (response.status === 503) {
      return { status: 'ok', rateLimiter: 'hard_locked' }
    }

    if (response.ok) {
      return { status: 'ok', rateLimiter: 'available' }
    }

    return { status: 'error', rateLimiter: 'error' }
  } catch {
    return { status: 'error', rateLimiter: 'error' }
  }
}
