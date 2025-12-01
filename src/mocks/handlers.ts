import { http, HttpResponse } from 'msw'
import apiMap from './api_map.json'

// Import all mock data files
import attendanceData from './data/attendance.json'
import badgeAssignmentsData from './data/badge_assignments.json'
import badgeRecordsData from './data/badge_records.json'
import badgesData from './data/badges.json'
import eventDetailsData from './data/event_details.json'
import eventSummaryData from './data/event_summary.json'
import eventSummary2Data from './data/event_summary_2.json'
import eventsData from './data/events.json'
import flexiDataData from './data/flexi_data.json'
import flexiDefinitionsData from './data/flexi_definitions.json'
import flexiStructureData from './data/flexi_structure.json'
import membersData from './data/members.json'
import patrolsData from './data/patrols.json'
import startupConfigData from './data/startup_config.json'
import startupDataData from './data/startup_data.json'

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
 * Generate MSW handlers from the api_map.json
 * 
 * This creates handlers for all documented OSM API endpoints,
 * returning the corresponding sanitized mock data.
 */
function generateHandlers() {
  const handlers = (apiMap as ApiMapEntry[]).map((entry) => {
    const { full_url, method, mock_data_file, is_static_resource } = entry
    
    // Get the mock data for this endpoint
    const mockData = mockDataRegistry[mock_data_file]
    
    // For static resources (images), return empty response
    if (is_static_resource) {
      return http.get(full_url, () => {
        return new HttpResponse(null, {
          status: 404,
          statusText: 'Mock image not available',
        })
      })
    }
    
    // Create handler based on HTTP method
    if (method === 'GET') {
      return http.get(full_url, () => {
        // Simulate API rate limit headers
        return HttpResponse.json(mockData, {
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
        full_url,
        () => {
          return HttpResponse.json(
            { error: 'Mutations are not allowed in read-only mode' },
            { status: 403 }
          )
        }
      )
    }
    
    // Fallback
    return http.get(full_url, () => HttpResponse.json(mockData))
  })
  
  return handlers
}

export const handlers = generateHandlers()
