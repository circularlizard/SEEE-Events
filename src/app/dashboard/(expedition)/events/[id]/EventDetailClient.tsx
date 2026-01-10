'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
// This component handles multiple API response shapes (v3, legacy, permissive)
// where dynamic typing is necessary for graceful degradation

import { useMemo, useState } from 'react'
import { useEventDetail } from '@/hooks/useEventDetail'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEventSummaryCache } from '@/hooks/useEventSummaryCache'
import { usePatrolMap } from '@/hooks/usePatrolMap'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExportMenu } from '@/components/domain/export'
import {
  useExportViewContext,
  createExportColumn,
  createExportFilter,
} from '@/hooks/useExportContext'
import type { ExportColumn, ExportRow } from '@/lib/export/types'
// Using event summary for participant-related info (custom fields names live here)

interface Props {
  eventId: number
  backHref?: string
  attendanceHrefBase?: string
}

export default function EventDetailClient({
  eventId,
  backHref = '/dashboard/events',
  attendanceHrefBase = '/dashboard/events/attendance',
}: Props) {
  const { data, isLoading, isError } = useEventDetail(eventId)
  const [unitFilter, setUnitFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('Yes')
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const { getSummaryById } = useEventSummaryCache()
  const { getPatrolName } = usePatrolMap()
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

  // Build export columns from visible columns (REQ-VIEW-10)
  const exportColumns = useMemo<ExportColumn[]>(() => {
    const cols: ExportColumn[] = [
      createExportColumn('name', 'Name', 'string'),
      createExportColumn('unit', 'Unit', 'string'),
      createExportColumn('attendance', 'Attendance', 'string'),
      createExportColumn('age', 'Age', 'string'),
    ]
    // Add custom field columns
    customColumnKeys.forEach((title) => {
      cols.push(createExportColumn(`custom_${title}`, title, 'string'))
    })
    return cols
  }, [customColumnKeys])

  // Build export rows from filtered/sorted participants (REQ-VIEW-10)
  const exportRows = useMemo<ExportRow[]>(() => {
    return participants.map((p) => {
      const row: ExportRow = {
        name: p.name,
        unit: getPatrolName(p.patrol),
        attendance: p.status ?? '—',
        age: computeAge(p.dob),
      }
      // Add custom field values
      customColumnKeys.forEach((title) => {
        row[`custom_${title}`] = p.custom?.[title] || '—'
      })
      return row
    })
  }, [participants, customColumnKeys, getPatrolName])

  // Build export filters from active filters
  const exportFilters = useMemo(() => {
    const filters = []
    if (unitFilter) {
      filters.push(createExportFilter('unit', 'Unit', unitFilter))
    }
    if (statusFilter) {
      filters.push(createExportFilter('status', 'Attendance', statusFilter))
    }
    return filters
  }, [unitFilter, statusFilter])

  // Create export context (REQ-VIEW-10, REQ-VIEW-12)
  // Must be called before early returns to satisfy React hooks rules
  const exportContext = useExportViewContext({
    id: `event-participants-${eventId}`,
    title: `Event ${eventId} - Participants`,
    columns: exportColumns,
    rows: exportRows,
    filters: exportFilters,
  })

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

  const summary: any = getSummaryById(eventId) || data.summary || {}
  const details: any = data.details || {}
  const metaEvent = summary?.meta?.event || {}
  const name = metaEvent?.name || summary?.name || details?.name || `Event ${eventId}`
  const start = metaEvent?.startdate || summary?.startdate || details?.startdate || summary?.date || ''
  const end = metaEvent?.enddate || summary?.enddate || details?.enddate || ''
  const starttime = metaEvent?.starttime || ''
  const endtime = metaEvent?.endtime || ''
  const location = metaEvent?.location || summary?.location || details?.location || ''
  const status = metaEvent?.approval_status || details?.approval_status || ''
  const publicnotes = metaEvent?.publicnotes || ''
  const cost = metaEvent?.cost ?? summary?.cost ?? details?.cost ?? 0

  const startDisplay = start || 'Date TBC'
  const startWithTime = [startDisplay, starttime].filter(Boolean).join(' • ')
  const hasEndInfo = Boolean(end || endtime)
  const endDisplay = end || startDisplay
  const endWithTime = hasEndInfo ? [endDisplay || 'Date TBC', endtime].filter(Boolean).join(' • ') : ''
  const costNumber = Number(cost)
  const costDisplay = Number.isFinite(costNumber) ? `£${costNumber.toFixed(2)}` : String(cost ?? '—')

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="mb-6 rounded-lg bg-primary px-4 py-4 text-primary-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/90 transition-opacity hover:text-primary-foreground hover:opacity-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to Events
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{name}</h1>
          </div>
          <ExportMenu
            context={exportContext}
            label="Export Participants"
            buttonVariant="ghost"
            className="self-start border border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/90 px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] space-y-4 md:grid md:grid-cols-2 md:gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule</p>
          <div className="text-sm text-foreground space-y-1">
            <p>
              <span className="font-semibold text-muted-foreground">Start:</span>{' '}
              <span>{startWithTime}</span>
            </p>
            {hasEndInfo ? (
              <p>
                <span className="font-semibold text-muted-foreground">End:</span>{' '}
                <span>{endWithTime}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="space-y-2 text-sm text-foreground md:text-right">
          <p>
            <span className="font-semibold text-muted-foreground">Location:</span>{' '}
            <span>{location || 'Location TBC'}</span>
          </p>
          <p>
            <span className="font-semibold text-muted-foreground">Cost:</span>{' '}
            <span>{costDisplay}</span>
          </p>
          {status ? (
            <p>
              <span className="font-semibold text-muted-foreground">Status:</span>{' '}
              <span>{status}</span>
            </p>
          ) : null}
        </div>
        {publicnotes ? (
          <div className="md:col-span-2 border-t border-border/60 pt-4">
            <details className="group rounded-lg bg-muted/30 p-4">
              <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground">
                Event Description
              </summary>
              <div
                className="mt-3 prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: publicnotes }}
              />
            </details>
          </div>
        ) : null}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label htmlFor="unitFilter" className="text-sm">Unit</label>
          <input
            id="unitFilter"
            value={unitFilter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnitFilter(e.target.value)}
            placeholder="Filter by unit"
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
                  <span className="inline-flex items-center gap-2">Unit <span className="text-xs text-muted-foreground">{sortKey==='patrol' ? (sortDir==='asc'?'↑':'↓') : ''}</span></span>
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
                  <td className="p-4 text-muted-foreground">
                    <Link
                      href={`${attendanceHrefBase}/${encodeURIComponent(String(p.patrol ?? 'unassigned'))}`}
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      {getPatrolName(p.patrol)}
                    </Link>
                  </td>
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
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <div>
                    Unit:{' '}
                    <Link
                      href={`${attendanceHrefBase}/${encodeURIComponent(String(p.patrol ?? 'unassigned'))}`}
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      {getPatrolName(p.patrol)}
                    </Link>
                  </div>
                  <div>Status: {p.status ?? '—'} • Age: {computeAge(p.dob)}</div>
                </div>
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
