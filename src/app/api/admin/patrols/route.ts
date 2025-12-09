import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getAuthConfig } from '@/lib/auth'
import { getPatrols } from '@/lib/api'
import {
  setPatrolCache,
  setPatrolCacheMeta,
  getPatrolCacheMeta,
  getAllPatrolCaches,
  type CachedPatrol,
  type PatrolCacheMeta,
} from '@/lib/redis'
import { getOAuthData } from '@/lib/redis'

/**
 * GET /api/admin/patrols
 * Get cached patrol data and metadata
 * Accessible to all authenticated users (read-only)
 */
export async function GET() {
  const authOptions = await getAuthConfig()
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const meta = await getPatrolCacheMeta()
    const caches = await getAllPatrolCaches()
    
    // Flatten all patrols from all sections
    const allPatrols: CachedPatrol[] = []
    for (const patrols of caches.values()) {
      allPatrols.push(...patrols)
    }

    return NextResponse.json({
      meta,
      patrols: allPatrols,
    })
  } catch (error) {
    console.error('Failed to get patrol cache:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve patrol data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/patrols
 * Refresh patrol data from OSM API
 * Admin only - fetches fresh patrol data for all accessible sections
 */
export async function POST(request: NextRequest) {
  const authOptions = await getAuthConfig()
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin role
  const role = (session as { roleSelection?: string })?.roleSelection
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
  }

  try {
    // Get user's accessible sections from OAuth data
    const userId = (session.user as { id?: string })?.id
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 })
    }

    const oauthData = await getOAuthData(userId)
    if (!oauthData?.sections || oauthData.sections.length === 0) {
      return NextResponse.json({ error: 'No sections available' }, { status: 400 })
    }

    const allPatrols: CachedPatrol[] = []
    const errors: string[] = []

    // Fetch patrol data for each section
    for (const section of oauthData.sections) {
      const sectionId = section.section_id.toString()
      const sectionName = section.section_name || `Section ${sectionId}`
      
      try {
        // Use termid 0 to get current term patrols
        const patrolsResponse = await getPatrols({
          sectionid: section.section_id,
          termid: 0,
          includeNoPatrol: true,
        })

        const cachedPatrols: CachedPatrol[] = patrolsResponse.patrols.map((p) => ({
          patrolId: p.patrolid,
          patrolName: p.name,
          sectionId,
          sectionName,
          memberCount: 0, // OSM doesn't return member count in patrol list
        }))

        // Store in cache
        await setPatrolCache(sectionId, cachedPatrols)
        allPatrols.push(...cachedPatrols)
      } catch (error) {
        console.error(`Failed to fetch patrols for section ${sectionId}:`, error)
        errors.push(`Section ${sectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Update metadata
    const meta: PatrolCacheMeta = {
      lastUpdated: new Date().toISOString(),
      updatedBy: session.user.name || userId,
      sectionCount: oauthData.sections.length,
      patrolCount: allPatrols.length,
    }
    await setPatrolCacheMeta(meta)

    return NextResponse.json({
      success: true,
      meta,
      patrols: allPatrols,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Failed to refresh patrol data:', error)
    return NextResponse.json(
      { error: 'Failed to refresh patrol data' },
      { status: 500 }
    )
  }
}
