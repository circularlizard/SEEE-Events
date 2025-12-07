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
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }
  

  const participants = useMemo(() => {
    // Support multiple shapes:
    // - v3 summary: { status, error, data: { members: [{ member_id, full_name, patrol_id }] } }
    // - legacy/permissive: { participants: [...]} or { attendees: [...] }
    const summary: any = data?.summary || {}

    // Extract list from meta.event.members (authoritative for event signups)
    const metaMembers: any[] = Array.isArray(summary?.meta?.event?.members) ? summary.meta.event.members : []
    const legacyParticipants: any[] = Array.isArray(summary?.participants) ? summary.participants : []
    const legacyAttendees: any[] = Array.isArray(summary?.attendees) ? summary.attendees : []

    const list: any[] = metaMembers.length ? metaMembers : (legacyParticipants.length ? legacyParticipants : legacyAttendees)

    // Build config title map from summary meta.event.config
    const configMap: Record<string, string> = {}
    const configs: any[] = Array.isArray(summary?.meta?.event?.config) ? summary.meta.event.config : []
    configs.forEach((c) => {
      if (c?.id && c?.name) configMap[String(c.id)] = String(c.name)
    })

    // Build patrol lookup from v3 summary data.members where available
    const patrolMap: Record<string, number> = {}
    const v3Members: any[] = Array.isArray(summary?.data?.members) ? summary.data.members : []
    v3Members.forEach((m) => {
      const key = String(m.member_id ?? '')
      if (key) patrolMap[key] = Number(m.patrol_id ?? NaN)
    })

    const mapped = list.map((a) => ({
      id: String(a.member?.scoutid ?? a.scoutid ?? a.member_id ?? a.id ?? ''),
      name:
        [a.member?.firstname ?? a.firstname ?? a.first_name, a.member?.lastname ?? a.lastname ?? a.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() || (a.full_name as string) || (a.name as string) || '',
      patrol: (() => {
        const scoutId = String(a.member?.scoutid ?? a.scoutid ?? '')
        const fromLookup = scoutId ? patrolMap[scoutId] : undefined
        return fromLookup ?? (a.patrol ?? a.group ?? a.patrol_id ?? undefined)
      })(),
      role: a.role ?? undefined,
      status: a.attending ?? a.status ?? undefined,
      contact: a.contact ?? a.email ?? undefined,
      dob: a.member?.dob ?? a.dob ?? undefined,
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
      if (sortKey === 'age') {
        const ageVal = (dob?: string) => {
          if (!dob) return Number.POSITIVE_INFINITY
          const d = new Date(dob)
          if (isNaN(d.getTime())) return Number.POSITIVE_INFINITY
          const now = new Date()
          let years = now.getFullYear() - d.getFullYear()
          let months = now.getMonth() - d.getMonth()
          if (now.getDate() < d.getDate()) months -= 1
          if (months < 0) {
            years -= 1
            months += 12
          }
          return years * 12 + months
        }
        const va = ageVal(a.dob)
        const vb = ageVal(b.dob)
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      }
      if (sortKey.startsWith('custom:')) {
        const title = sortKey.slice('custom:'.length)
        const va = String(a.custom?.[title] ?? '').toLowerCase()
        const vb = String(b.custom?.[title] ?? '').toLowerCase()
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      }
      const va = String(a[sortKey] ?? '').toLowerCase()
      const vb = String(b[sortKey] ?? '').toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    }

    return filtered.sort(compare)
  }, [data?.summary, unitFilter, statusFilter, sortKey, sortDir])

  // Determine which custom fields should be shown as individual columns
  const customColumnKeys = useMemo(() => {
    const summary: any = data?.summary || {}
    const configs: any[] = Array.isArray(summary?.meta?.event?.config) ? summary.meta.event.config : []
    const titles: string[] = configs
      .map((c) => (c?.id && c?.name ? String(c.name) : null))
      .filter(Boolean) as string[]
    // Only include titles where at least one participant has a non-empty value
    const hasValue = (title: string) =>
      participants.some((p: any) => p.custom && p.custom[title] && String(p.custom[title]).trim() !== '')
    return titles.filter(hasValue)
  }, [data?.summary, participants])

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
    <div className="p-4 md:p-6 space-y-6">
      {/* Back link at very top with comfortable spacing */}
      <div className="flex items-center">
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

      {/* Desktop table styled like Events list */}
      <div className="hidden md:block">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="border-b">
                <th className="text-left p-4 font-semibold cursor-pointer" onClick={() => handleSort('name')}>
                  <span className="inline-flex items-center gap-2">Name <span className="text-xs text-muted-foreground">{sortKey==='name' ? (sortDir==='asc'?'↑':'↓') : ''}</span></span>
                </th>
                <th className="text-left p-4 font-semibold cursor-pointer" onClick={() => handleSort('patrol')}>
                  <span className="inline-flex items-center gap-2">Patrol ID <span className="text-xs text-muted-foreground">{sortKey==='patrol' ? (sortDir==='asc'?'↑':'↓') : ''}</span></span>
                </th>
                <th className="text-left p-4 font-semibold cursor-pointer" onClick={() => handleSort('status')}>
                  <span className="inline-flex items-center gap-2">Attendance <span className="text-xs text-muted-foreground">{sortKey==='status' ? (sortDir==='asc'?'↑':'↓') : ''}</span></span>
                </th>
                <th className="text-left p-4 font-semibold cursor-pointer" onClick={() => handleSort('age')}>
                  <span className="inline-flex items-center gap-2">Age <span className="text-xs text-muted-foreground">{sortKey==='age' ? (sortDir==='asc'?'↑':'↓') : ''}</span></span>
                </th>
                {customColumnKeys.map((title) => (
                  <th key={title} className="text-left p-4 font-semibold cursor-pointer" onClick={() => handleSort(`custom:${title}`)}>
                    <span className="inline-flex items-center gap-2">{title} <span className="text-xs text-muted-foreground">{sortKey===`custom:${title}` ? (sortDir==='asc'?'↑':'↓') : ''}</span></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">{p.name}</td>
                  <td className="p-4 text-muted-foreground">{p.patrol ?? '—'}</td>
                  <td className="p-4 text-muted-foreground">{p.status ?? '—'}</td>
                  <td className="p-4 text-muted-foreground">{computeAge(p.dob)}</td>
                  {customColumnKeys.map((title) => (
                    <td key={title} className="p-4 text-muted-foreground">{p.custom?.[title] || '—'}</td>
                  ))}
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
