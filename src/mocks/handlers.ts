import { http, HttpResponse } from 'msw'
import apiMap from './api_map.json'
import { applyMemberIssueFixtures } from './member-issue-fixtures'

// Import all mock data files
import attendanceData from './data/attendance.json'
import badgeAssignmentsData from './data/badge_assignments.json'
import badgeRecordsData from './data/badge_records.json'
import badgesData from './data/badges.json'
import eventDetailsData from './data/event_details.json'
import eventSummaryData from './data/event_summary.json'
import eventSummary2Data from './data/event_summary_2.json'
import eventSummary1385068Data from './data/event_summary_1385068.json'
import eventSummary1446923Data from './data/event_summary_1446923.json'
import eventSummary1446920Data from './data/event_summary_1446920.json'
import eventSummary1611068Data from './data/event_summary_1611068.json'
import eventSummary1633733Data from './data/event_summary_1633733.json'
import eventSummary1648434Data from './data/event_summary_1648434.json'
import eventSummary1398694Data from './data/event_summary_1398694.json'
import eventsData from './data/events.json'
import flexiDataData from './data/flexi_data.json'
import flexiDefinitionsData from './data/flexi_definitions.json'
import flexiStructureData from './data/flexi_structure.json'
import membersData from './data/members.json'
import patrolsData from './data/patrols.json'
import startupConfigData from './data/startup_config.json'
import startupDataData from './data/startup_data.json'

const rawModes =
  (process.env.MSW_MODE ?? 'admin')
    .split(',')
    .map((mode) => mode.trim().toLowerCase())
    .filter(Boolean) || ['admin']

const modeSet = new Set(rawModes)
if (!modeSet.has('admin') && !modeSet.has('standard')) {
  modeSet.add('admin')
}

const hasMode = (mode: string) => modeSet.has(mode)
const isAdminMode = hasMode('admin')
const isStandardMode = hasMode('standard') && !isAdminMode
const includePlatformFixtures = hasMode('platform')

type AnyRecord = Record<string, unknown>
const STANDARD_BLOCKED_SEGMENTS = ['/members', '/patrols', '/flexi', '/badge', '/startup']
const MEMBER_COLLECTION_KEYS = [
  'members',
  'membersByPatrol',
  'members_by_patrol',
  'memberDetails',
  'member_details',
  'memberRecords',
  'member_records',
]

// Map mock data filenames to imported data
const mockDataRegistry: Record<string, unknown> = {
  'attendance.json': attendanceData,
  'badge_assignments.json': badgeAssignmentsData,
  'badge_records.json': badgeRecordsData,
  'badges.json': badgesData,
  'event_details.json': eventDetailsData,
  'event_summary.json': eventSummaryData,
  'event_summary_2.json': eventSummary2Data,
  'event_summary_1385068.json': eventSummary1385068Data,
  'event_summary_1446923.json': eventSummary1446923Data,
  'event_summary_1446920.json': eventSummary1446920Data,
  'event_summary_1611068.json': eventSummary1611068Data,
  'event_summary_1633733.json': eventSummary1633733Data,
  'event_summary_1648434.json': eventSummary1648434Data,
  'event_summary_1398694.json': eventSummary1398694Data,
  'events.json': eventsData,
  'flexi_data.json': flexiDataData,
  'flexi_definitions.json': flexiDefinitionsData,
  'flexi_structure.json': flexiStructureData,
  'members.json': membersData,
  'patrols.json': patrolsData,
  'startup_config.json': startupConfigData,
  'startup_data.json': startupDataData,
  'images.json': [], // Stub for member images
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
 * Extract base URL (protocol + host + path) without query parameters
 */
function getBaseUrl(fullUrl: string): string {
  const url = new URL(fullUrl)
  return `${url.origin}${url.pathname}`
}

/**
 * Generate MSW handlers from the api_map.json
 * 
 * This creates handlers for all documented OSM API endpoints,
 * returning the corresponding sanitized mock data.
 */
function generateHandlers() {
  const baseHandlers = (apiMap as ApiMapEntry[]).map((entry) => {
    const { full_url, method, mock_data_file, is_static_resource } = entry

    // Get the mock data for this endpoint
    const mockData = mockDataRegistry[mock_data_file]
    
    // Extract base URL without query parameters (MSW v2+ best practice)
    const baseUrl = getBaseUrl(full_url)
    
    // For static resources (images), return empty response
    if (is_static_resource) {
      return http.get(baseUrl, () => {
        return new HttpResponse(null, {
          status: 404,
          statusText: 'Mock image not available',
        })
      })
    }
    
    // Create handler based on HTTP method
    if (method === 'GET') {
      return http.get(baseUrl, ({ request }) => {
        const requestUrl = new URL(request.url)
        // Note: We match on path only and ignore query parameters.
        // The actual query params are validated by the proxy layer.
        // This approach follows MSW v2+ best practices.
        
        const normalizedMockData = (() => {
          // For getListOfMembers, return the same wrapper shape as the real OSM API.
          // Our fixture historically was a plain array, so wrap it at runtime.
          if (entry.path === '/ext/members/contact/' && entry.action === 'getListOfMembers') {
            if (Array.isArray(mockData)) {
              return { identifier: 'scoutid', photos: true, items: mockData }
            }
          }
          return mockData
        })()

        const scenarioAwareData =
          entry.path === '/ext/customdata/' && entry.action === 'getData'
            ? applyMemberIssueFixtures(
                requestUrl.searchParams.get('associated_id'),
                normalizedMockData
              )
            : normalizedMockData

        const shapedData = applyModeTransforms(entry, scenarioAwareData)

        // Simulate API rate limit headers
        return HttpResponse.json(shapedData as Record<string, unknown>, {
          headers: {
            'X-RateLimit-Limit': '1000',
            'X-RateLimit-Remaining': '950',
            'X-RateLimit-Reset': String(Date.now() + 3600000),
          },
        })
      })
    }
    
    // Block POST/PUT/DELETE (Read-Only Policy)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return http[method.toLowerCase() as 'post' | 'put' | 'delete' | 'patch'](
        baseUrl,
        () => {
          return HttpResponse.json(
            { error: 'Mutations are not allowed in read-only mode' },
            { status: 403 }
          )
        }
      )
    }
    
    // Fallback
    return http.get(baseUrl, () => HttpResponse.json(mockData as Record<string, unknown>))
  })
  
  const extraHandlers: ReturnType<typeof http.get>[] = []

  if (includePlatformFixtures) {
    extraHandlers.push(
      http.get('https://localhost:3000/api/telemetry/rate-limit', () => {
        return HttpResponse.json({
          remaining: 950,
          limit: 1000,
          reset: Date.now() + 3600000,
          mode: 'platform',
        })
      }),
      http.get('https://localhost:3000/api/platform/cache-status', () => {
        return HttpResponse.json({
          patrols: {
            lastUpdated: new Date().toISOString(),
            sectionsCached: 1,
          },
          members: {
            lastUpdated: new Date().toISOString(),
            total: 120,
          },
        })
      })
    )
  }

  return [...baseHandlers, ...extraHandlers]
}

export const handlers = generateHandlers()

function cloneData<T>(value: T): T {
  return value ? (JSON.parse(JSON.stringify(value)) as T) : value
}

function applyModeTransforms(entry: ApiMapEntry, data: unknown) {
  if (!data || isAdminMode) {
    return data
  }

  if (isStandardMode) {
    return applyStandardFilters(entry, data)
  }

  return data
}

function applyStandardFilters(entry: ApiMapEntry, data: unknown) {
  if (!data) {
    return data
  }

  const cloned = cloneData(data)
  const isEventPath = entry.path.startsWith('/ext/events/') || entry.path.startsWith('/v3/events/')
  const isBlockedPath = STANDARD_BLOCKED_SEGMENTS.some((segment) => entry.path.includes(segment))

  if (!isEventPath && isBlockedPath) {
    return sanitizeBlockedPayload(cloned)
  }

  stripMemberCollections(cloned)
  return cloned
}

function sanitizeBlockedPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return []
  }

  if (value && typeof value === 'object') {
    const record = value as AnyRecord
    Object.keys(record).forEach((key) => {
      record[key] = sanitizeBlockedPayload(record[key])
    })
    return record
  }

  return value
}

function stripMemberCollections(value: unknown): void {
  if (!value || typeof value !== 'object') {
    return
  }

  const record = value as AnyRecord
  Object.keys(record).forEach((key) => {
    const child = record[key]

    if (MEMBER_COLLECTION_KEYS.includes(key)) {
      if (Array.isArray(child)) {
        record[key] = []
        return
      }
      if (child && typeof child === 'object') {
        stripMemberCollections(child)
        return
      }
    }

    if (Array.isArray(child)) {
      child.forEach((item) => {
        if (item && typeof item === 'object') {
          stripMemberCollections(item)
        }
      })
      return
    }

    if (child && typeof child === 'object') {
      stripMemberCollections(child)
    }
  })
}
