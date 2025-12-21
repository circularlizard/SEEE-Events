import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getAuthConfig } from '@/lib/auth'
import { isHardLocked, isSoftLocked, getQuota } from '@/lib/redis'
import { getRateLimiterStats } from '@/lib/bottleneck'

export async function GET() {
  const session = await getServerSession(getAuthConfig())
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [hardLocked, softLocked, quota, limiterStats] = await Promise.all([
      isHardLocked(),
      isSoftLocked(),
      getQuota().catch(() => null),
      getRateLimiterStats().catch(() => null),
    ])

    const queue = limiterStats
      ? {
          queued: limiterStats.queued,
          running: limiterStats.running,
          executing: limiterStats.executing,
          done: limiterStats.done,
        }
      : null

    return NextResponse.json({
      hardLocked,
      softLocked,
      quota,
      queue,
    })
  } catch (error) {
    console.error('[Telemetry RateLimit] Failed to compute telemetry', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
