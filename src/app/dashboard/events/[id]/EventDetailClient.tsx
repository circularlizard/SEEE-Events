'use client'

import { useMemo, useState } from 'react'
import { useEventDetail } from '@/hooks/useEventDetail'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useEventSummaryCache } from '@/hooks/useEventSummaryCache'
import Link from 'next/link'
// Using event summary for participant-related info (custom fields names live here)

interface Props {
  eventId: number
}

export default function EventDetailClient({ eventId }: Props) {
  const { data, isLoading, isError } = useEventDetail(eventId)
  const [unitFilter, setUnitFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
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

    // Build config title map from summary meta.event.config
    const configMap: Record<string, string> = {}
    const configs: any[] = Array.isArray(summary?.meta?.event?.config) ? summary.meta.event.config : []
    configs.forEach((c) => {
      if (c?.id && c?.name) configMap[String(c.id)] = String(c.name)
    })

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
      dob: a.dob ?? a.member?.dob ?? undefined,
      custom: (() => {
        const details = a.details ?? a.member?.details ?? {}
        const out: Record<string, string> = {}
        if (details && typeof details === 'object') {
          Object.entries(details).forEach(([key, val]) => {
            const title = configMap[key] || key
            out[title] = Array.isArray(val) ? val.join(', ') : String(val ?? '')
          })
        }
        return out
      })(),
    }))

    const filtered = mapped.filter((p) => {
      const unitOk = unitFilter ? String(p.patrol ?? '').toLowerCase().includes(unitFilter.toLowerCase()) : true
      const statusOk = statusFilter ? String(p.status ?? '').toLowerCase() === statusFilter.toLowerCase() : true
      return unitOk && statusOk
    })

    const compare = (a: any, b: any) => {
      const va = String(a[sortKey] ?? '').toLowerCase()
      const vb = String(b[sortKey] ?? '').toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    }

    return filtered.sort(compare)
  }, [data?.summary, unitFilter, statusFilter, sortKey, sortDir])

  const computeAge = (dob?: string) => {
    if (!dob) return '—'
    const d = new Date(dob)
    if (isNaN(d.getTime())) return '—'
    const now = new Date()
    let years = now.getFullYear() - d.getFullYear()
    let months = now.getMonth() - d.getMonth()
    if (now.getDate() < d.getDate()) months -= 1
    if (months < 0) {
      years -= 1
      months += 12
    }
    if (years >= 18) return '18+'
    return `${years}y ${months}m`
  }

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
      {/* Back link at very top with comfortable spacing */}
      <div className="container mx-auto flex items-center px-4 md:px-6">
        <Link href="/dashboard/events">
          <Button variant="ghost" className="pl-0">← Back to Events</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <Header eventId={eventId} data={data} getSummaryById={getSummaryById} />
        </CardHeader>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="unitFilter" className="text-sm">Patrol</label>
            <input
              id="unitFilter"
              value={unitFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnitFilter(e.target.value)}
              placeholder="Patrol ID"
              className="w-40 border rounded px-2 py-1 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="w-40 border rounded px-2 py-1 text-sm"
            >
              <option value="">Attendance Status</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Invited">Invited</option>
              <option value="">Unknown</option>
            </select>
          </div>
          
        </div>
      </Card>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 px-3 cursor-pointer" onClick={() => setSortKey('name')}>Name</th>
                <th className="py-2 px-3 cursor-pointer" onClick={() => setSortKey('patrol')}>Patrol ID</th>
                <th className="py-2 px-3 cursor-pointer" onClick={() => setSortKey('status')}>Status</th>
                <th className="py-2 px-3">Age</th>
                <th className="py-2 px-3">Custom Fields</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2 px-3">{p.name}</td>
                  <td className="py-2 px-3">{p.patrol ?? '—'}</td>
                  <td className="py-2 px-3">{p.status ?? '—'}</td>
                  <td className="py-2 px-3">{computeAge(p.dob)}</td>
                  <td className="py-2 px-3">
                    {p.custom && Object.keys(p.custom).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(p.custom).map(([k, v]) => (
                          <div key={k} className="text-xs"><span className="text-muted-foreground">{k}:</span> {v || '—'}</div>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
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
                <div className="text-sm text-muted-foreground">Patrol: {p.patrol ?? '—'} • Status: {p.status ?? '—'} • Age: {computeAge(p.dob)}</div>
              </div>
              {/* Placeholder for First Aid badge */}
              <div className="text-xs px-2 py-1 rounded bg-muted">FA: —</div>
            </div>
            {p.custom && Object.keys(p.custom).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(p.custom).map(([k, v]) => (
                  <div key={k} className="text-xs"><span className="text-muted-foreground">{k}:</span> {v || '—'}</div>
                ))}
              </div>
            )}
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
  const metaEvent = summary?.meta?.event || {}
  const name = metaEvent?.name || summary?.name || details?.name || `Event ${eventId}`
  const start = metaEvent?.startdate || summary?.startdate || details?.startdate || summary?.date || ''
  const end = metaEvent?.enddate || summary?.enddate || details?.enddate || ''
  const starttime = metaEvent?.starttime || ''
  const endtime = metaEvent?.endtime || ''
  const location = metaEvent?.location || summary?.location || details?.location || ''
  // Only show meaningful approval status; do not surface API success flag
  const status = metaEvent?.approval_status || details?.approval_status || ''
  const publicnotes = metaEvent?.publicnotes || ''
  const cost = metaEvent?.cost ?? summary?.cost ?? details?.cost ?? 0

  const dateRange = (() => {
    const date = start && end && start !== end ? `${start} - ${end}` : start || end || ''
    const time = starttime && endtime ? `${starttime} - ${endtime}` : starttime || endtime || ''
    return [date, time].filter(Boolean).join(' • ')
  })()

  return (
    <div className="w-full">
      <CardTitle data-testid="event-detail-title" className="text-2xl md:text-3xl font-semibold tracking-tight">{name}</CardTitle>
      <CardDescription>
        {[dateRange, location ? `Location: ${location}` : null, `Cost: £${Number(cost).toFixed(2)}`, status ? `Status: ${status}` : null]
          .filter(Boolean)
          .join(' • ')}
      </CardDescription>
      {publicnotes ? (
        <CardContent>
          <details open={false}>
            <summary className="cursor-pointer select-none text-sm text-muted-foreground">Event Description</summary>
            <div className="mt-3 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: publicnotes }} />
          </details>
        </CardContent>
      ) : null}
    </div>
  )
}
