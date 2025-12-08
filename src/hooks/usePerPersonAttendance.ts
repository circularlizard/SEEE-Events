import { useMemo } from 'react'
import { useEventSummaryCache } from '@/hooks/useEventSummaryCache'

interface EventMeta {
  id: number
  name: string
  startDate?: string
  endDate?: string
  location?: string
}

interface PersonAttendance {
  memberId: number
  name: string
  patrolId?: number | null
  events: EventMeta[]
}

/** Summary shape from event-summary cache */
interface EventSummary {
  meta?: {
    event?: {
      id?: number
      name?: string
      startdate?: string
      enddate?: string
      location?: string
      members?: Array<{
        member_id?: number
        attending?: string
        patrol_id?: number | null
        member?: { forename?: string; surname?: string }
      }>
    }
  }
}

export function usePerPersonAttendance() {
  const { getAllSummaries } = useEventSummaryCache()

  const data: PersonAttendance[] = useMemo(() => {
    const summaries = (getAllSummaries?.() ?? []) as EventSummary[]
    const personMap = new Map<number, PersonAttendance>()

    for (const summary of summaries) {
      const evId = summary?.meta?.event?.id
      if (evId === undefined) continue
      const evMeta: EventMeta = {
        id: evId,
        name: summary?.meta?.event?.name ?? 'Unknown Event',
        startDate: summary?.meta?.event?.startdate,
        endDate: summary?.meta?.event?.enddate,
        location: summary?.meta?.event?.location,
      }

      const members = summary?.meta?.event?.members ?? []

      for (const m of members) {
        if (m?.attending === 'yes') {
          const memberId = Number(m?.member_id)
          if (!memberId) continue

          const existing = personMap.get(memberId)
          const name = [m?.member?.forename, m?.member?.surname].filter(Boolean).join(' ') || `Member ${memberId}`
          const patrolId = m?.patrol_id ?? null

          if (existing) {
            // Avoid duplicate event entries
            if (!existing.events.some((e) => e.id === evMeta.id)) {
              existing.events.push(evMeta)
            }
          } else {
            personMap.set(memberId, {
              memberId,
              name,
              patrolId,
              events: evMeta.id ? [evMeta] : [],
            })
          }
        }
      }
    }

    // Sort events by start date ascending inside each person
    const list = Array.from(personMap.values()).map((p) => ({
      ...p,
      events: [...p.events].sort((a, b) => {
        const ad = a.startDate ? new Date(a.startDate).getTime() : 0
        const bd = b.startDate ? new Date(b.startDate).getTime() : 0
        return ad - bd
      }),
    }))

    // Sort people alphabetically by name
    list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [getAllSummaries])

  return { data }
}
