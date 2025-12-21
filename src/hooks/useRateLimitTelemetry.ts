import { useQuery } from '@tanstack/react-query'
import { RateLimitTelemetrySchema, type RateLimitTelemetry } from '@/lib/schemas'

async function fetchRateLimitTelemetry(): Promise<RateLimitTelemetry> {
  const res = await fetch('/api/telemetry/rate-limit', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch rate limit telemetry (${res.status})`)
  }

  const data = (await res.json()) as unknown
  return RateLimitTelemetrySchema.parse(data)
}

export function useRateLimitTelemetry() {
  const pollingMs = Number(process.env.NEXT_PUBLIC_RATE_LIMIT_TELEMETRY_POLL_MS || '15000')

  return useQuery({
    queryKey: ['rate-limit-telemetry'],
    queryFn: fetchRateLimitTelemetry,
    refetchInterval: Number.isFinite(pollingMs) ? pollingMs : 15000,
    refetchIntervalInBackground: true,
    staleTime: 5000,
    retry: 1,
  })
}
