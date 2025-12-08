import { useMemo, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'

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

/** 
 * Summary shape from event-summary cache
 * Matches the actual OSM API response structure
 */
interface EventSummaryMember {
  scoutid?: number
  member_id?: number  // fallback
  attending?: string
  patrol_id?: number | null
  member?: { 
    firstname?: string
    lastname?: string
    forename?: string  // fallback
    surname?: string   // fallback
  }
}

/** Member info from data.members (contains patrol_id) */
interface DataMember {
  member_id?: number
  patrol_id?: number | null
  full_name?: string
}

interface EventSummary {
  data?: {
    members?: DataMember[]
  }
  meta?: {
    event?: {
      eventid?: number
      id?: number  // fallback
      name?: string
      startdate?: string
      enddate?: string
      location?: string
      members?: EventSummaryMember[]
    }
  }
}

/**
 * Hook to aggregate per-person attendance from cached event summaries.
 * Uses useSyncExternalStore to react to TanStack Query cache changes.
 */
export function usePerPersonAttendance() {
  const qc = useQueryClient()
  
  // Subscribe to cache changes for reactivity
  const cacheVersion = useSyncExternalStore(
    (onStoreChange) => {
      const unsubscribe = qc.getQueryCache().subscribe(onStoreChange)
      return unsubscribe
    },
    () => {
      // Return a version string based on event-summary queries
      const queries = qc.getQueryCache().findAll({ queryKey: ['event-summary'] })
      return queries.map(q => `${q.queryKey[1]}-${q.state.dataUpdatedAt}`).join(',')
    },
    () => '' // Server snapshot
  )

  const data: PersonAttendance[] = useMemo(() => {
    const queries = qc.getQueryCache().findAll({ queryKey: ['event-summary'] })
    const summaries = queries
      .map((q) => q.state.data as EventSummary | undefined)
      .filter((s): s is EventSummary => Boolean(s))
    
    const personMap = new Map<number, PersonAttendance>()

    for (const summary of summaries) {
      // Support both 'eventid' (actual API) and 'id' (fallback)
      const evId = summary?.meta?.event?.eventid ?? summary?.meta?.event?.id
      if (evId === undefined) continue
      
      const evMeta: EventMeta = {
        id: evId,
        name: summary?.meta?.event?.name ?? 'Unknown Event',
        startDate: summary?.meta?.event?.startdate,
        endDate: summary?.meta?.event?.enddate,
        location: summary?.meta?.event?.location,
      }

      // Build a lookup map for patrol_id from data.members (keyed by member_id)
      const patrolLookup = new Map<number, number | null>()
      for (const dm of summary?.data?.members ?? []) {
        if (dm.member_id) {
          patrolLookup.set(dm.member_id, dm.patrol_id ?? null)
        }
      }

      const members = summary?.meta?.event?.members ?? []

      for (const m of members) {
        // Case-insensitive check for "Yes" attendance
        const isAttending = m?.attending?.toLowerCase() === 'yes'
        if (!isAttending) continue
        
        // Support both 'scoutid' (actual API) and 'member_id' (fallback)
        const memberId = Number(m?.scoutid ?? m?.member_id)
        if (!memberId) continue

        const existing = personMap.get(memberId)
        // Support both firstname/lastname (actual API) and forename/surname (fallback)
        const firstName = m?.member?.firstname ?? m?.member?.forename ?? ''
        const lastName = m?.member?.lastname ?? m?.member?.surname ?? ''
        const name = [firstName, lastName].filter(Boolean).join(' ') || `Member ${memberId}`
        
        // Look up patrol_id from data.members, fallback to meta.event.members.patrol_id
        const patrolId = patrolLookup.get(memberId) ?? m?.patrol_id ?? null

        if (existing) {
          // Avoid duplicate event entries
          if (!existing.events.some((e) => e.id === evMeta.id)) {
            existing.events.push(evMeta)
          }
          // Update patrolId if we found one and existing doesn't have it
          if (patrolId !== null && existing.patrolId === null) {
            existing.patrolId = patrolId
          }
        } else {
          personMap.set(memberId, {
            memberId,
            name,
            patrolId,
            events: [evMeta],
          })
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
  }, [qc, cacheVersion]) // cacheVersion triggers re-computation when cache updates

  return { data }
}
