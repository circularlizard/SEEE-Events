import type { PersonAttendance } from '@/hooks/usePerPersonAttendance'

/** Sort data alphabetically by name (case-insensitive) */
export function sortByName<T extends { name: string }>(data: T[]): T[] {
  return [...data].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

/** Helper to group data by patrol (Patrol → Person → Events) */
export function groupByPatrol(data: PersonAttendance[]) {
  const sorted = sortByName(data)
  const groups = sorted.reduce<Record<string, PersonAttendance[]>>((acc, person) => {
    const key = String(person.patrolId ?? 'Unassigned')
    acc[key] = acc[key] ? [...acc[key], person] : [person]
    return acc
  }, {})
  // Sort patrol keys alphabetically
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

/** Helper to group data by patrol and event (Patrol → Event → People) */
export function groupByPatrolAndEvent(data: PersonAttendance[]) {
  const sorted = sortByName(data)

  // First group by patrol
  const patrolGroups: Record<
    string,
    Record<string, { eventName: string; startDate?: string; people: PersonAttendance[] }>
  > = {}

  for (const person of sorted) {
    const patrolKey = String(person.patrolId ?? 'Unassigned')
    if (!patrolGroups[patrolKey]) {
      patrolGroups[patrolKey] = {}
    }

    for (const event of person.events) {
      const eventKey = event.id
      if (!patrolGroups[patrolKey][eventKey]) {
        patrolGroups[patrolKey][eventKey] = {
          eventName: event.name,
          startDate: event.startDate,
          people: [],
        }
      }
      patrolGroups[patrolKey][eventKey].people.push(person)
    }
  }

  // Convert to sorted array structure
  return Object.entries(patrolGroups)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([patrolKey, events]) => ({
      patrolKey,
      events: Object.entries(events)
        .map(([eventId, eventData]) => ({
          eventId,
          ...eventData,
        }))
        // Sort events by start date (soonest first)
        .sort((a, b) => {
          if (!a.startDate && !b.startDate) return 0
          if (!a.startDate) return 1
          if (!b.startDate) return -1
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        }),
    }))
}
