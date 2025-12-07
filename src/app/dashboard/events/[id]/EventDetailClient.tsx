'use client'

import { useMemo, useState } from 'react'
import { useEventDetail } from '@/hooks/useEventDetail'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEventSummaryCache } from '@/hooks/useEventSummaryCache'
// Using event summary for participant-related info (custom fields names live here)

interface Props {
  eventId: number
}

export default function EventDetailClient({ eventId }: Props) {
  const { data, isLoading, isError } = useEventDetail(eventId)
  const [unitFilter, setUnitFilter] = useState<string>('')
  const { getSummaryById } = useEventSummaryCache()

  const participants = useMemo(() => {
    // Support multiple shapes:
    // - v3 summary: { status, error, data: { members: [{ member_id, full_name, patrol_id }] } }
    // - legacy/permissive: { participants: [...]} or { attendees: [...] }
    const summary: any = data?.summary || {}

    // Extract list candidates
    const v3Members: any[] = Array.isArray(summary?.data?.members) ? summary.data.members : []
    const legacyParticipants: any[] = Array.isArray(summary?.participants) ? summary.participants : []
    const legacyAttendees: any[] = Array.isArray(summary?.attendees) ? summary.attendees : []

    const list: any[] = v3Members.length ? v3Members : (legacyParticipants.length ? legacyParticipants : legacyAttendees)

    const mapped = list.map((a) => ({
      id: String(a.member_id ?? a.scoutid ?? a.id ?? ''),
      name:
        (a.full_name as string) ||
        [a.firstname ?? a.first_name, a.lastname ?? a.last_name].filter(Boolean).join(' ').trim() ||
        (a.name as string) ||
        '',
      patrol: a.patrol ?? a.group ?? a.patrol_id ?? undefined,
      role: a.role ?? undefined,
      status: a.status ?? a.attending ?? undefined,
      contact: a.contact ?? a.email ?? undefined,
    }))

    return mapped.filter((p) => (unitFilter ? String(p.patrol ?? '').toLowerCase().includes(unitFilter.toLowerCase()) : true))
  }, [data?.summary, unitFilter])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="hidden md:block">
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return <div className="text-red-600">Failed to load event details.</div>
  }

  return (
    <div className="space-y-6">
      <Header eventId={eventId} data={data} getSummaryById={getSummaryById} />

      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">First Aid Readiness</div>
            {/* Placeholder: compute X/Y from participants when badge/flexi source decided */}
            <div className="text-lg">0/{participants.length} Participants are First Aid Qualified</div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="unitFilter" className="text-sm">Unit Filter</label>
            <input
              id="unitFilter"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              placeholder="Patrol/Group"
            />
          </div>
        </div>
      </Card>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Patrol</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Contact</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2 px-3">{p.name}</td>
                  <td className="py-2 px-3">{p.patrol || '—'}</td>
                  <td className="py-2 px-3">{p.role || '—'}</td>
                  <td className="py-2 px-3">{p.status || '—'}</td>
                  <td className="py-2 px-3">{p.contact || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {participants.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.patrol || '—'}</div>
              </div>
              {/* Placeholder for First Aid badge */}
              <div className="text-xs px-2 py-1 rounded bg-muted">FA: —</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Header({
  eventId,
  data,
  getSummaryById,
}: {
  eventId: number
  data: any
  getSummaryById: (id: number) => any
}) {
  const summary = getSummaryById(eventId) || data?.summary || {}
  const details = data?.details || {}

  // Attempt to derive header fields from summary/details with graceful fallback
  const name = summary?.name || details?.name || `Event ${eventId}`
  const start = summary?.startdate || details?.startdate || summary?.date || ''
  const end = summary?.enddate || details?.enddate || ''
  const location = summary?.location || details?.location || ''
  const status = summary?.status || details?.approval_status || ''

  const dateRange = start && end && start !== end ? `${start} - ${end}` : start || end || ''

  return (
    <div>
      <h1 className="text-2xl font-semibold" data-testid="event-detail-title">{name}</h1>
      {dateRange && <p className="text-muted-foreground">{dateRange}</p>}
      {location && <p className="text-muted-foreground">{location}</p>}
      {status && <p className="text-muted-foreground">Status: {status}</p>}
    </div>
  )
}
