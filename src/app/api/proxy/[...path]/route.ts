import { NextRequest, NextResponse } from 'next/server'
import { scheduleRequest, parseRateLimitHeaders } from '@/lib/bottleneck'
import {
  isHardLocked,
  isSoftLocked,
  setHardLock,
  getCachedResponse,
  setCachedResponse,
  getCacheKey,
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

// Cache TTL (5 minutes)
const CACHE_TTL = 300

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
      return NextResponse.json(
        {
          error: 'SYSTEM_HALTED',
          message:
            'System is temporarily unavailable due to API blocking. Please contact administrator.',
          retryAfter: 300,
        },
        { status: 503 }
      )
    }

    // Check for soft lock (cooldown period)
    if (await isSoftLocked()) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'System is cooling down. Please try again in a moment.',
          retryAfter: 60,
        },
        { status: 429 }
      )
    }

    // Require authenticated session and read access token from NextAuth
    const session = await getServerSession(getAuthConfig()) as { accessToken?: string } | null
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
            'X-Cache': 'BYPASS',
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

    // Check cache first (read-through pattern)
    const cacheKey = getCacheKey(path, queryParams)
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
          headers: {
            'X-Cache': 'HIT',
            'X-Upstream-URL': targetUrl,
          },
        })
      } catch (e) {
        // Corrupted cache (e.g., HTML accidentally stored). Treat as miss.
        console.warn('[Proxy] Cache parse failed, treating as MISS', e)
      }
    }

    logCache({ operation: 'miss', key: cacheKey })

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
        { status: 503 }
      )
    }

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Proxy] API error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: `OSM API returned ${response.status}`,
          details: errorText,
        },
        { status: response.status, headers: { 'X-Upstream-URL': targetUrl, 'X-Upstream-Request-Headers': JSON.stringify({ ...upstreamRequestHeaders, Authorization: 'Bearer REDACTED' }) } }
      )
    }

    // Parse and cache successful response
    const data = await response.json()
    await setCachedResponse(cacheKey, JSON.stringify(data), CACHE_TTL)
    logCache({ operation: 'set', key: cacheKey, ttl: CACHE_TTL })

    // Log fresh response for debugging
    logApiResponse('GET', path, 200, Date.now() - startTime, false, data)

    logProxyRequest({
      method: 'GET',
      path,
      status: 200,
      duration: Date.now() - startTime,
      cached: false,
    })

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'X-Cache': 'MISS',
        'X-RateLimit-Remaining': response.headers.get('X-RateLimit-Remaining') || '',
        'X-RateLimit-Limit': response.headers.get('X-RateLimit-Limit') || '',
        'X-Upstream-URL': targetUrl,
        'X-Upstream-Request-Headers': JSON.stringify({ ...upstreamRequestHeaders, Authorization: 'Bearer REDACTED' }),
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const pathFromUrl = resolvedParams ? resolvedParams.path.join('/') : request.nextUrl.pathname.replace(/^\/?api\/proxy\//, '')

    if (error instanceof Error && error.message.includes('RATE_LIMITED')) {
      logProxyRequest({ method: 'GET', path: pathFromUrl, status: 429, duration, error: errorMessage })
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: error.message, retryAfter: 60 },
        { status: 429 }
      )
    }

    logProxyRequest({ method: 'GET', path: pathFromUrl, status: 500, duration, error: errorMessage })
    logApiError('GET', pathFromUrl, errorMessage)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errorMessage },
      { status: 500 }
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
