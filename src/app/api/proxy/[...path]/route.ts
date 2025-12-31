import { NextRequest, NextResponse } from 'next/server'
import { scheduleRequest, parseRateLimitHeaders } from '@/lib/bottleneck'
import {
  isHardLocked,
  isSoftLocked,
  setHardLock,
  setSoftLock,
  getCachedResponse,
  setCachedResponse,
  getQuota,
} from '@/lib/redis'
import { logProxyRequest, logCache } from '@/lib/logger'
import { logApiRequest, logApiResponse, logApiError } from '@/lib/api-debug-logger'
import { getServerSession } from 'next-auth/next'
import { getAuthConfig } from '@/lib/auth'
import apiMap from '@/mocks/api_map.json'

// Import all mock data files
import attendanceData from '@/mocks/data/attendance.json'
import badgeAssignmentsData from '@/mocks/data/badge_assignments.json'
import badgeRecordsData from '@/mocks/data/badge_records.json'
import badgesData from '@/mocks/data/badges.json'
import eventDetailsData from '@/mocks/data/event_details.json'
import eventSummaryData from '@/mocks/data/event_summary.json'
import eventSummary2Data from '@/mocks/data/event_summary_2.json'
import eventsData from '@/mocks/data/events.json'
import flexiDataData from '@/mocks/data/flexi_data.json'
import flexiDefinitionsData from '@/mocks/data/flexi_definitions.json'
import flexiStructureData from '@/mocks/data/flexi_structure.json'
import membersData from '@/mocks/data/members.json'
import individualData from '@/mocks/data/individual.json'
import userCustomData from '@/mocks/data/user_custom_data.json'
import patrolsData from '@/mocks/data/patrols.json'
import listOfQMListsData from '@/mocks/data/listOfQMLists.json'
import qmListData from '@/mocks/data/QMList.json'
import startupConfigData from '@/mocks/data/startup_config.json'
import startupDataData from '@/mocks/data/startup_data.json'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

// Map mock data filenames to imported data
const mockDataRegistry: Record<string, unknown> = {
  'attendance.json': attendanceData,
  'badge_assignments.json': badgeAssignmentsData,
  'badge_records.json': badgeRecordsData,
  'badges.json': badgesData,
  'event_details.json': eventDetailsData,
  'event_summary.json': eventSummaryData,
  'event_summary_2.json': eventSummary2Data,
  'events.json': eventsData,
  'flexi_data.json': flexiDataData,
  'flexi_definitions.json': flexiDefinitionsData,
  'flexi_structure.json': flexiStructureData,
  'members.json': membersData,
  'individual.json': individualData,
  'user_custom_data.json': userCustomData,
  'patrols.json': patrolsData,
  'listOfQMLists.json': listOfQMListsData,
  'QMList.json': qmListData,
  'startup_config.json': startupConfigData,
  'startup_data.json': startupDataData,
}

interface ApiMapEntry {
  original_file: string
  mock_data_file: string
  full_url: string
  path: string
  method: string
  action: string | null
  query_params: Record<string, string[]>
  is_static_resource: boolean
}

/**
 * Proxy API Route
 * 
 * The "Safety Shield" - All OSM API requests must go through here.
 * 
 * Features:
 * - Rate limiting (Bottleneck)
 * - Circuit breaker (Redis locks)
 * - Read-through caching
 * - Request validation
 * - Read-only enforcement (blocks POST/PUT/DELETE)
 * 
 * Route: /api/proxy/[...path]
 * Example: /api/proxy/ext/members/contact/?action=getListOfMembers&sectionid=37458
 */

const OSM_API_BASE = process.env.OSM_API_URL || 'https://www.onlinescoutmanager.co.uk'
const USE_MSW = process.env.NEXT_PUBLIC_USE_MSW === 'true'

const USER_CACHE_TTL_SECONDS = 60 * 60

type CacheKeyScope =
  | { kind: 'none' }
  | { kind: 'user'; userId: string; sectionId?: string }

function stableStringifyParams(params: Record<string, string>): string {
  const entries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(Object.fromEntries(entries))
}

function buildUserCacheKey(params: {
  userId: string
  sectionId?: string
  path: string
  queryParams: Record<string, string>
}): string {
  const { userId, sectionId, path, queryParams } = params
  const paramsString = stableStringifyParams(queryParams)
  const sectionPart = sectionId ? `:section:${sectionId}` : ''
  return `cache:user:${userId}${sectionPart}:${path}:${paramsString}`
}

function pickSectionIdFromQuery(queryParams: Record<string, string>): string | undefined {
  return queryParams.sectionid || queryParams.section_id
}

function getCacheKeyScope(params: {
  path: string
  queryParams: Record<string, string>
  userId?: string
}): CacheKeyScope {
  const { path, queryParams, userId } = params
  if (!userId) return { kind: 'none' }

  const action = queryParams.action

  const normalizedPath = `/${path.replace(/^\/+/, '').replace(/\/+$/, '')}`
  const isMembersList = normalizedPath === '/ext/members/contact' && action === 'getListOfMembers'
  const isEventsList = normalizedPath === '/ext/events/summary' && action === 'get'
  const isV3Event = normalizedPath.startsWith('/v3/events/event/')

  if (isMembersList || isEventsList) {
    return { kind: 'user', userId, sectionId: pickSectionIdFromQuery(queryParams) }
  }

  if (isV3Event) {
    return { kind: 'user', userId }
  }

  return { kind: 'none' }
}

function getCacheTtlSeconds(params: { scope: CacheKeyScope }): number | null {
  if (params.scope.kind === 'user') return USER_CACHE_TTL_SECONDS
  return null
}

async function getRateLimitHeadersFallback(): Promise<Record<string, string>> {
  const quota = await getQuota().catch(() => null)
  if (!quota) return {}

  return {
    'X-RateLimit-Remaining': String(quota.remaining),
    'X-RateLimit-Limit': String(quota.limit),
    'X-RateLimit-Reset': String(quota.reset),
  }
}

function pickIfPresent(headers: Headers, key: string): string | undefined {
  const v = headers.get(key)
  if (!v) return undefined
  return v
}

async function buildSafetyHeaders(params: {
  targetUrl: string
  cache: 'HIT' | 'MISS' | 'BYPASS'
  upstreamHeaders?: Headers
  upstreamRequestHeaders?: Record<string, string>
}): Promise<Record<string, string>> {
  const { targetUrl, cache, upstreamHeaders, upstreamRequestHeaders } = params

  const fromUpstream: Record<string, string> = {}
  if (upstreamHeaders) {
    const remaining = pickIfPresent(upstreamHeaders, 'X-RateLimit-Remaining')
    const limit = pickIfPresent(upstreamHeaders, 'X-RateLimit-Limit')
    const reset = pickIfPresent(upstreamHeaders, 'X-RateLimit-Reset')
    const retryAfter = pickIfPresent(upstreamHeaders, 'Retry-After')
    const blocked = pickIfPresent(upstreamHeaders, 'X-Blocked')

    if (remaining) fromUpstream['X-RateLimit-Remaining'] = remaining
    if (limit) fromUpstream['X-RateLimit-Limit'] = limit
    if (reset) fromUpstream['X-RateLimit-Reset'] = reset
    if (retryAfter) fromUpstream['Retry-After'] = retryAfter
    if (blocked) fromUpstream['X-Blocked'] = blocked
  }

  const rateLimitFallback = await getRateLimitHeadersFallback()

  const merged: Record<string, string> = {
    'X-Cache': cache,
    'X-Upstream-URL': targetUrl,
    ...rateLimitFallback,
    ...fromUpstream,
  }

  if (upstreamRequestHeaders) {
    merged['X-Upstream-Request-Headers'] = JSON.stringify(upstreamRequestHeaders)
  }

  return merged
}

/**
 * Find mock data for a given request path and query params
 * Used when MSW is enabled to serve mock data server-side
 */
function findMockData(path: string, queryParams: URLSearchParams): unknown | null {
  const entries = apiMap as ApiMapEntry[]
  
  // Normalize path: ensure it starts with / and may or may not end with /
  const normalizedPath = `/${path.replace(/^\/+/, '').replace(/\/+$/, '')}`
  
  // Get action param if present (most OSM endpoints use this)
  const action = queryParams.get('action')

  const wrapMembersListIfNeeded = (data: unknown): unknown => {
    if (action !== 'getListOfMembers') return data
    if (normalizedPath !== '/ext/members/contact') return data

    // Keep existing real-shape mocks as-is
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>
      if (Array.isArray(obj.items) && typeof obj.identifier === 'string') return data
    }

    // Legacy fixture shape: array of members
    if (Array.isArray(data)) {
      return {
        identifier: 'scoutid',
        photos: true,
        items: data,
      }
    }

    return data
  }
  
  // Try to find best match:
  // 1. Match by path and action
  // 2. Match by path only
  let entry: ApiMapEntry | undefined
  
  if (action) {
    entry = entries.find(e => {
      const entryPath = e.path.replace(/\/+$/, '')
      return entryPath === normalizedPath && e.action === action
    })
  }
  
  // Fallback: match by path only
  if (!entry) {
    entry = entries.find(e => {
      const entryPath = e.path.replace(/\/+$/, '')
      return entryPath === normalizedPath
    })
  }
  
  if (entry && entry.mock_data_file) {
    const mockData = mockDataRegistry[entry.mock_data_file]
    if (mockData) {
      console.log(`[Proxy] Returning mock data: ${entry.mock_data_file} for ${normalizedPath}${action ? ` (action=${action})` : ''}`)
      return wrapMembersListIfNeeded(mockData)
    }
  }

  // Second fallback: Use API_ENDPOINTS definitions
  // Match by path pattern (supporting tokens like {eventid}) and action
  const endpoint = API_ENDPOINTS.find((ep) => {
    // Normalize endpoint path
    const epPath = `/${ep.path.replace(/^\/+/, '').replace(/\/+$/, '')}`
    // Convert tokens like {eventid} into a matcher
    const epRegex = new RegExp('^' + epPath.replace(/\{[^}]+\}/g, '[^/]+') + '$')
    const pathMatches = epRegex.test(normalizedPath)
    const actionMatches = (ep.action || null) === (action || null)
    return pathMatches && actionMatches
  })

  if (endpoint && endpoint.exampleResponse) {
    const mockData = mockDataRegistry[endpoint.exampleResponse]
    if (mockData) {
      console.log(`[Proxy] Fallback mock via API_ENDPOINTS: ${endpoint.exampleResponse} for ${normalizedPath}${action ? ` (action=${action})` : ''}`)
      return wrapMembersListIfNeeded(mockData)
    }
  }
  
  console.warn(`[Proxy] No mock data found for: ${normalizedPath}${action ? ` (action=${action})` : ''}`)
  return null
}

/**
 * GET Handler - Fetch data from OSM API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const startTime = Date.now()
  let resolvedParams: { path: string[] } | null = null
  try {
    resolvedParams = await params
    // Check for hard lock (global halt)
    if (await isHardLocked()) {
      const targetUrl = request.nextUrl.pathname
      return NextResponse.json(
        {
          error: 'SYSTEM_HALTED',
          message:
            'System is temporarily unavailable due to API blocking. Please contact administrator.',
          retryAfter: 300,
        },
        {
          status: 503,
          headers: {
            ...(await buildSafetyHeaders({ targetUrl, cache: 'BYPASS' })),
            'Retry-After': '300',
          },
        }
      )
    }

    // Check for soft lock (cooldown period)
    if (await isSoftLocked()) {
      const targetUrl = request.nextUrl.pathname
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'System is cooling down. Please try again in a moment.',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            ...(await buildSafetyHeaders({ targetUrl, cache: 'BYPASS' })),
            'Retry-After': '60',
          },
        }
      )
    }

    // Require authenticated session and read access token from NextAuth
    const session = await getServerSession(getAuthConfig()) as
      | { accessToken?: string; user?: { id?: string } }
      | null
    if (!session || !session.accessToken) {
      return NextResponse.json(
        {
          error: 'UNAUTHENTICATED',
          message: 'You must be signed in to access the proxy.',
        },
        { status: 401 }
      )
    }

    // Build target URL
    const path = resolvedParams.path.join('/')
    const searchParams = request.nextUrl.searchParams.toString()
    // Preserve trailing slash if present on the original request path
    const originalPathname = request.nextUrl.pathname.replace(/^\/?api\/proxy\//, '')
    const hasTrailingSlash = originalPathname.endsWith('/')
    const basePath = `${OSM_API_BASE}/${path}`
    // Heuristic: OSM "ext" endpoints conventionally require a trailing slash before query
    const isExtEndpoint = originalPathname.startsWith('ext/') || originalPathname.includes('/ext/')
    const needsTrailingSlash = hasTrailingSlash || isExtEndpoint
    const normalizedPath = needsTrailingSlash ? (basePath.endsWith('/') ? basePath : `${basePath}/`) : basePath
    const targetUrl = `${normalizedPath}${searchParams ? `?${searchParams}` : ''}`
    
    // MSW Mode: Return mock data directly (server-side)
    if (USE_MSW) {
      const mockData = findMockData(path, request.nextUrl.searchParams)
      if (mockData) {
        logProxyRequest({
          method: 'GET',
          path,
          status: 200,
          duration: Date.now() - startTime,
          cached: false,
        })
        return NextResponse.json(mockData, {
          status: 200,
          headers: {
            'X-Mock': 'true',
            ...(await buildSafetyHeaders({ targetUrl, cache: 'BYPASS' })),
          },
        })
      } else {
        // No mock data found
        return NextResponse.json(
          {
            error: 'MOCK_DATA_NOT_FOUND',
            message: `No mock data available for ${path}`,
            path,
          },
          { status: 404 }
        )
      }
    }

    // Log the API request for debugging
    const queryParams = Object.fromEntries(request.nextUrl.searchParams)
    logApiRequest('GET', path, queryParams)

    const bypassCache = request.headers.get('X-Cache-Bypass') === '1'
    const userId = session.user?.id
    const cacheScope = getCacheKeyScope({ path, queryParams, userId })
    const cacheTtlSeconds = getCacheTtlSeconds({ scope: cacheScope })
    const cacheEnabled = Boolean(cacheTtlSeconds && cacheTtlSeconds > 0)

    const cacheKey =
      cacheScope.kind === 'user'
        ? buildUserCacheKey({
            userId: cacheScope.userId,
            sectionId: cacheScope.sectionId,
            path,
            queryParams,
          })
        : null

    if (!bypassCache && cacheEnabled && cacheKey) {
      const cachedData = await getCachedResponse(cacheKey)

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData)
          logCache({ operation: 'hit', key: cacheKey })
          logProxyRequest({
            method: 'GET',
            path,
            status: 200,
            duration: Date.now() - startTime,
            cached: true,
          })
          // Log cached response for debugging
          logApiResponse('GET', path, 200, Date.now() - startTime, true, parsed)
          return NextResponse.json(parsed, {
            status: 200,
            headers: await buildSafetyHeaders({ targetUrl, cache: 'HIT' }),
          })
        } catch (e) {
          // Corrupted cache (e.g., HTML accidentally stored). Treat as miss.
          console.warn('[Proxy] Cache parse failed, treating as MISS', e)
        }
      }

      logCache({ operation: 'miss', key: cacheKey })
    }

    // Schedule request through rate limiter
    // Build upstream request headers (mask sensitive values when echoing back)
    const upstreamRequestHeaders: Record<string, string> = {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    }

    const response = await scheduleRequest(async () => {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: upstreamRequestHeaders,
      })

      return res
    })

    // Parse rate limit headers
    await parseRateLimitHeaders(response.headers)

    // Check for API blocking (X-Blocked header)
    const blocked = response.headers.get('X-Blocked')
    if (blocked) {
      console.error('[Proxy] API returned X-Blocked header - triggering hard lock')
      await setHardLock(300) // 5 minutes
      return NextResponse.json(
        {
          error: 'API_BLOCKED',
          message: 'API access has been blocked. System halted for 5 minutes.',
          retryAfter: 300,
        },
        {
          status: 503,
          headers: {
            ...(await buildSafetyHeaders({
              targetUrl,
              cache: 'MISS',
              upstreamHeaders: response.headers,
              upstreamRequestHeaders: { ...upstreamRequestHeaders, Authorization: 'Bearer REDACTED' },
            })),
            'Retry-After': '300',
          },
        }
      )
    }

    // Handle error responses
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfterRaw = response.headers.get('Retry-After')
        const retryAfterParsed = retryAfterRaw ? Number(retryAfterRaw) : NaN
        const nowSec = Math.floor(Date.now() / 1000)
        const resetRaw = response.headers.get('X-RateLimit-Reset')
        const resetParsed = resetRaw ? Number(resetRaw) : NaN

        const ttl = (() => {
          if (Number.isFinite(retryAfterParsed) && retryAfterParsed > 0) {
            return Math.max(1, Math.floor(retryAfterParsed))
          }
          if (Number.isFinite(resetParsed) && resetParsed > nowSec) {
            return Math.max(60, Math.floor(resetParsed - nowSec))
          }
          return 60
        })()

        await setSoftLock(ttl)

        return NextResponse.json(
          {
            error: 'RATE_LIMITED',
            message: 'OSM rate limit exceeded. System is cooling down. Please try again later.',
            retryAfter: ttl,
          },
          {
            status: 429,
            headers: {
              ...(await buildSafetyHeaders({
                targetUrl,
                cache: 'MISS',
                upstreamHeaders: response.headers,
                upstreamRequestHeaders: { ...upstreamRequestHeaders, Authorization: 'Bearer REDACTED' },
              })),
              'Retry-After': String(ttl),
            },
          }
        )
      }

      const errorText = await response.text()
      console.error(`[Proxy] API error: ${response.status} - ${errorText}`)

      const retryAfter = response.headers.get('Retry-After')
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: `OSM API returned ${response.status}`,
          details: errorText,
          retryAfter: retryAfter ? Number(retryAfter) : undefined,
        },
        {
          status: response.status,
          headers: {
            ...(await buildSafetyHeaders({
              targetUrl,
              cache: 'MISS',
              upstreamHeaders: response.headers,
              upstreamRequestHeaders: { ...upstreamRequestHeaders, Authorization: 'Bearer REDACTED' },
            })),
          },
        }
      )
    }

    // Parse and cache successful response
    const data = await response.json()
    if (!bypassCache && cacheEnabled && cacheKey && cacheTtlSeconds) {
      await setCachedResponse(cacheKey, JSON.stringify(data), cacheTtlSeconds)
      logCache({ operation: 'set', key: cacheKey, ttl: cacheTtlSeconds })
    }

    // Log fresh response for debugging
    logApiResponse('GET', path, 200, Date.now() - startTime, false, data)

    logProxyRequest({
      method: 'GET',
      path,
      status: 200,
      duration: Date.now() - startTime,
      cached: false,
    })

    const cacheHeader: 'MISS' | 'BYPASS' = bypassCache || !cacheEnabled ? 'BYPASS' : 'MISS'
    return NextResponse.json(data, {
      status: 200,
      headers: await buildSafetyHeaders({
        targetUrl,
        cache: cacheHeader,
        upstreamHeaders: response.headers,
        upstreamRequestHeaders: { ...upstreamRequestHeaders, Authorization: 'Bearer REDACTED' },
      }),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const pathFromUrl = resolvedParams ? resolvedParams.path.join('/') : request.nextUrl.pathname.replace(/^\/?api\/proxy\//, '')
    const targetUrl = request.nextUrl.pathname

    if (error instanceof Error && error.message.includes('RATE_LIMITED')) {
      logProxyRequest({ method: 'GET', path: pathFromUrl, status: 429, duration, error: errorMessage })
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: error.message, retryAfter: 60 },
        {
          status: 429,
          headers: {
            ...(await buildSafetyHeaders({ targetUrl, cache: 'BYPASS' })),
            'Retry-After': '60',
          },
        }
      )
    }

    logProxyRequest({ method: 'GET', path: pathFromUrl, status: 500, duration, error: errorMessage })
    logApiError('GET', pathFromUrl, errorMessage)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errorMessage },
      {
        status: 500,
        headers: await buildSafetyHeaders({ targetUrl, cache: 'BYPASS' }),
      }
    )
  }
}

/**
 * POST/PUT/DELETE Handlers - Blocked (Read-Only Policy)
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'This application is read-only. POST requests are not permitted.',
    },
    { status: 403 }
  )
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'This application is read-only. PUT requests are not permitted.',
    },
    { status: 403 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'This application is read-only. DELETE requests are not permitted.',
    },
    { status: 403 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'This application is read-only. PATCH requests are not permitted.',
    },
    { status: 403 }
  )
}
