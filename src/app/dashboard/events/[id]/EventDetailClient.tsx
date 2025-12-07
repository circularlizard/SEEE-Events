'use client'

import { useMemo, useState } from 'react'
import { useEventDetail } from '@/hooks/useEventDetail'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
// Using event summary for participant-related info (custom fields names live here)

interface Props {
  eventId: number
}

export default function EventDetailClient({ eventId }: Props) {
  const { data, isLoading, isError } = useEventDetail(eventId)
  const [unitFilter, setUnitFilter] = useState<string>('')

  const participants = useMemo(() => {
    // The event summary includes custom fields and often a list of attendees with names
    // Since summary shape is permissive/unknown, access safely
    const summary: any = data?.summary || {}
    const list: any[] = Array.isArray(summary?.participants)
      ? summary.participants
      : Array.isArray(summary?.attendees)
      ? summary.attendees
      : []

    const mapped = list.map((a) => ({
      id: String(a.scoutid ?? a.id ?? ''),
      name: [a.firstname ?? a.first_name, a.lastname ?? a.last_name].filter(Boolean).join(' ').trim() || a.name || '',
      patrol: a.patrol ?? a.group ?? undefined,
      role: a.role ?? undefined,
      status: a.status ?? a.attending ?? undefined,
      contact: a.contact ?? a.email ?? undefined,
    }))

    return mapped.filter((p) => (unitFilter ? (p.patrol || '').toLowerCase().includes(unitFilter.toLowerCase()) : true))
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
      <div>
        <h1 className="text-2xl font-semibold" data-testid="event-detail-title">Event Detail</h1>
        <p className="text-muted-foreground">ID: {eventId}</p>
        <p className="text-muted-foreground">Attendees: {participants.length}</p>
      </div>

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
