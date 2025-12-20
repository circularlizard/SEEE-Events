/**
 * API Client for SEEE Expedition Dashboard
 * 
 * All API calls go through the /api/proxy route (Safety Shield).
 * Includes type-safe response parsing with Zod schemas.
 */

import {
  MembersListResponseSchema,
  EventsResponseSchema,
  FlexiDataResponseSchema,
  FlexiStructureSchema,
  BadgeRecordsResponseSchema,
  AttendanceResponseSchema,
  PatrolsResponseSchema,
  IndividualResponseSchema,
  CustomDataResponseSchema,
  parseStrict,
  parsePermissive,
  type Member,
  type MembersListResponse,
  type EventsResponse,
  type FlexiDataResponse,
  type FlexiStructure,
  type BadgeRecordsResponse,
  type AttendanceResponse,
  type PatrolsResponse,
  type IndividualResponse,
  type CustomDataResponse,
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
 * Options for proxyFetch
 */
interface ProxyFetchOptions {
  signal?: AbortSignal
}

/**
 * Base fetch wrapper with error handling
 * 
 * All API calls go through the proxy route. This function is designed for
 * client-side use where the browser handles cookies/auth automatically.
 * 
 * @param path - API path (e.g., 'ext/members/contact/')
 * @param params - Query parameters
 * @param options - Optional fetch options including AbortSignal for cancellation
 */
async function proxyFetch(
  path: string,
  params?: Record<string, string>,
  options?: ProxyFetchOptions
): Promise<Response> {
  const searchParams = new URLSearchParams(params)
  const url = `/api/proxy/${path}${params ? `?${searchParams.toString()}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: options?.signal,
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
  signal?: AbortSignal
}): Promise<Member[]> {
  const response = await proxyFetch('ext/members/contact/', {
    action: 'getListOfMembers',
    sort: 'dob',
    sectionid: params.sectionid.toString(),
    termid: params.termid.toString(),
    section: params.section || 'explorers',
  }, { signal: params.signal })

  const raw = (await response.json()) as unknown

  const normalized: unknown = (() => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>
      // Real OSM shape: { identifier, photos, items }
      if (Array.isArray(obj.items)) return raw

      // Other common wrapper keys
      const candidates: Array<unknown> = [obj.data, obj.members, obj.results]
      const firstArray = candidates.find(Array.isArray)
      if (firstArray && Array.isArray(firstArray)) {
        const wrapped: MembersListResponse = {
          identifier: typeof obj.identifier === 'string' ? obj.identifier : 'scoutid',
          photos: typeof obj.photos === 'boolean' ? obj.photos : undefined,
          items: firstArray as Member[],
        }
        return wrapped
      }

      // Keyed object: { "123": { scoutid, firstname, lastname, ... }, ... }
      const values = Object.values(obj)
      const looksLikeMemberRecord = (v: unknown): v is Record<string, unknown> => {
        if (!v || typeof v !== 'object') return false
        const rec = v as Record<string, unknown>
        return 'scoutid' in rec && 'firstname' in rec && 'lastname' in rec
      }
      const memberValues = values.filter(looksLikeMemberRecord)
      if (memberValues.length > 0) {
        const wrapped: MembersListResponse = {
          identifier: 'scoutid',
          photos: undefined,
          items: memberValues as Member[],
        }
        return wrapped
      }
    }

    // Legacy mock shape: raw array
    if (Array.isArray(raw)) {
      const wrapped: MembersListResponse = { identifier: 'scoutid', photos: undefined, items: raw as Member[] }
      return wrapped
    }

    return raw
  })()

  const parsed = parseStrict(MembersListResponseSchema, normalized, 'Members')
  return parsed.items
}

/**
 * Fetch events list (Tier 1 - Strict validation)
 */
export async function getEvents(params: {
  sectionid: number
  termid: number
  signal?: AbortSignal
}): Promise<EventsResponse> {
  const response = await proxyFetch('ext/events/summary/', {
    action: 'get',
    sectionid: params.sectionid.toString(),
    termid: params.termid.toString(),
  }, { signal: params.signal })

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
  signal?: AbortSignal
}): Promise<PatrolsResponse> {
  const response = await proxyFetch('ext/members/patrols/', {
    action: 'getPatrolsWithPeople',
    sectionid: params.sectionid.toString(),
    termid: params.termid.toString(),
    section: params.section || 'explorers',
  }, { signal: params.signal })

  const raw = await response.json() as unknown

  // Normalize into `{ patrols: Patrol[] }` regardless of upstream shape
  let normalized: { patrols: Array<{ patrolid: number; name: string; active?: boolean }> }

  const rawObj = raw as Record<string, unknown> | null
  if (rawObj && Array.isArray(rawObj.patrols)) {
    // Already in the expected shape
    normalized = { patrols: rawObj.patrols as Array<{ patrolid: number; name: string; active?: boolean }> }
  } else if (raw && typeof raw === 'object') {
    // OSM-style object keyed by patrolid plus optional "unallocated" key
    const values = Object.values(raw as Record<string, unknown>)
    const patrols = values
      .filter((v): v is Record<string, unknown> => v !== null && typeof v === 'object' && 'patrolid' in v && 'name' in v)
      .map((v) => {
        const patrolid = typeof v.patrolid === 'string' ? parseInt(v.patrolid, 10) : Number(v.patrolid)
        const name = String(v.name ?? '')
        const activeValue = v.active
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
  signal?: AbortSignal
}): Promise<FlexiStructure> {
  const response = await proxyFetch('ext/members/flexirecords/', {
    action: 'getStructure',
    sectionid: params.sectionid.toString(),
    extraid: params.extraid.toString(),
  }, { signal: params.signal })

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
  signal?: AbortSignal
}): Promise<FlexiDataResponse> {
  const response = await proxyFetch('ext/members/flexirecords/', {
    action: 'getData',
    sectionid: params.sectionid.toString(),
    termid: params.termid.toString(),
    extraid: params.extraid.toString(),
    nototal: 'true',
  }, { signal: params.signal })

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
  signal?: AbortSignal
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
  }, { signal: params.signal })

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
  signal?: AbortSignal
}): Promise<AttendanceResponse> {
  const response = await proxyFetch(`v3/events/event/${params.eventid}/members/attendance`, {
    term_id: params.termid.toString(),
  }, { signal: params.signal })

  const data = await response.json()
  return parsePermissive(AttendanceResponseSchema, data, [], 'Event Attendance')
}

/**
 * Fetch event details
 */
export async function getEventDetails(eventid: number, signal?: AbortSignal): Promise<unknown> {
  const response = await proxyFetch(`v3/events/event/${eventid}/basic_details`, undefined, { signal })
  return await response.json()
}

/**
 * Fetch event summary
 */
export async function getEventSummary(eventid: number, signal?: AbortSignal): Promise<unknown> {
  const response = await proxyFetch(`v3/events/event/${eventid}/summary`, undefined, { signal })
  return await response.json()
}

/**
 * Fetch individual member details (Tier 1 - Strict validation)
 * Returns DOB, membership history, and other sections
 * 
 * Upstream URL: ext/members/contact/?action=getIndividual&sectionid={sectionid}&scoutid={scoutid}&termid={termid}&context=members
 */
export async function getMemberIndividual(params: {
  sectionid: number
  scoutid: number
  termid: number
  signal?: AbortSignal
}): Promise<IndividualResponse> {
  const response = await proxyFetch('ext/members/contact/', {
    action: 'getIndividual',
    sectionid: params.sectionid.toString(),
    scoutid: params.scoutid.toString(),
    termid: params.termid.toString(),
    context: 'members',
  }, { signal: params.signal })

  const data = await response.json()
  return parseStrict(IndividualResponseSchema, data, 'Individual Member')
}

/**
 * Fetch member custom data (Tier 1 - Strict validation)
 * Returns contacts, medical info, consents, and custom fields
 * 
 * Upstream URL: ext/customdata/?action=getData&section_id={sectionid}&associated_id={scoutid}&associated_type=member&...
 */
export async function getMemberCustomData(params: {
  sectionid: number
  scoutid: number
  signal?: AbortSignal
}): Promise<CustomDataResponse> {
  const response = await proxyFetch('ext/customdata/', {
    action: 'getData',
    section_id: params.sectionid.toString(),
    associated_id: params.scoutid.toString(),
    associated_type: 'member',
    associated_is_section: 'null',
    varname_filter: 'null',
    context: 'members',
    group_order: 'section',
  }, { signal: params.signal })

  const data = await response.json()
  return parseStrict(CustomDataResponseSchema, data, 'Member Custom Data')
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
