import { groupByPatrol, groupByPatrolAndEvent, sortByName } from '@/components/domain/consolidated-attendance/grouping'
import type { PersonAttendance } from '@/hooks/usePerPersonAttendance'

describe('sortByName', () => {
  it('sorts data alphabetically by name (case-insensitive)', () => {
    const data = [
      { name: 'Zara', id: '1' },
      { name: 'alice', id: '2' },
      { name: 'Bob', id: '3' },
    ]
    
    const result = sortByName(data)
    
    expect(result.map(d => d.name)).toEqual(['alice', 'Bob', 'Zara'])
  })
  
  it('returns empty array for empty input', () => {
    expect(sortByName([])).toEqual([])
  })
  
  it('does not mutate original array', () => {
    const data = [{ name: 'B' }, { name: 'A' }]
    const original = [...data]
    sortByName(data)
    expect(data).toEqual(original)
  })
})

describe('groupByPatrol', () => {
    const mockData: PersonAttendance[] = [
    { memberId: 1, name: 'Zara', patrolId: 101, events: [] },
    { memberId: 2, name: 'Alice', patrolId: 202, events: [] },
    { memberId: 3, name: 'Bob', patrolId: 101, events: [] },
    { memberId: 4, name: 'Charlie', patrolId: null, events: [] },
  ]
  
  it('groups data by patrol with people sorted alphabetically within each group', () => {
    const result = groupByPatrol(mockData)
    
    // Should have 3 groups: Patrol-A, Patrol-B, Unassigned
    expect(result.length).toBe(3)
    
    // Groups should be sorted alphabetically
    expect(result.map(([key]) => key)).toEqual(['101', '202', 'Unassigned'])
    
    // People within Patrol-A should be sorted
    const patrolA = result.find(([key]) => key === '101')
    expect(patrolA?.[1].map(p => p.name)).toEqual(['Bob', 'Zara'])
  })
  
  it('handles null patrolId as "Unassigned"', () => {
    const result = groupByPatrol(mockData)
    const unassigned = result.find(([key]) => key === 'Unassigned')
    
    expect(unassigned).toBeDefined()
    expect(unassigned?.[1].length).toBe(1)
    expect(unassigned?.[1][0].name).toBe('Charlie')
  })
  
  it('handles numeric patrolId', () => {
    const data: PersonAttendance[] = [
      { memberId: 1, name: 'Alice', patrolId: 123, events: [] },
    ]
    
    const result = groupByPatrol(data)
    expect(result[0][0]).toBe('123')
  })
  
  it('returns empty array for empty input', () => {
    expect(groupByPatrol([])).toEqual([])
  })
})

describe('groupByPatrolAndEvent', () => {
  const mockData: PersonAttendance[] = [
    { 
      memberId: 1, 
      name: 'Zara', 
      patrolId: 101, 
      events: [
        { id: 1, name: 'Bronze Practice', startDate: '2025-03-15' },
        { id: 2, name: 'Silver Qualifier', startDate: '2025-04-20' },
      ] 
    },
    { 
      memberId: 2, 
      name: 'Alice', 
      patrolId: 101, 
      events: [
        { id: 1, name: 'Bronze Practice', startDate: '2025-03-15' },
      ] 
    },
    { 
      memberId: 3, 
      name: 'Bob', 
      patrolId: 202, 
      events: [
        { id: 2, name: 'Silver Qualifier', startDate: '2025-04-20' },
      ] 
    },
  ]
  
  it('groups data by patrol then by event', () => {
    const result = groupByPatrolAndEvent(mockData)
    
    // Should have 2 patrol groups
    expect(result.length).toBe(2)
    expect(result.map(g => g.patrolKey)).toEqual(['101', '202'])
  })
  
  it('sorts events by start date within each patrol', () => {
    const result = groupByPatrolAndEvent(mockData)
    const patrolA = result.find(g => g.patrolKey === '101')
    
    // Events should be sorted by date (Bronze Practice before Silver Qualifier)
    expect(patrolA?.events.map(e => e.eventName)).toEqual(['Bronze Practice', 'Silver Qualifier'])
  })
  
  it('lists people alphabetically under each event', () => {
    const result = groupByPatrolAndEvent(mockData)
    const patrolA = result.find(g => g.patrolKey === '101')
    const bronzePractice = patrolA?.events.find(e => e.eventName === 'Bronze Practice')
    
    // Alice and Zara both attend Bronze Practice, should be sorted
    expect(bronzePractice?.people.map(p => p.name)).toEqual(['Alice', 'Zara'])
  })
  
  it('handles events without start dates', () => {
    const data: PersonAttendance[] = [
      { 
        memberId: 1, 
        name: 'Alice', 
        patrolId: 101, 
        events: [
          { id: 1, name: 'Event A' },
          { id: 2, name: 'Event B', startDate: '2025-01-01' },
        ] 
      },
    ]
    
    const result = groupByPatrolAndEvent(data)
    const patrolA = result[0]
    
    // Event with date should come first, then event without date
    expect(patrolA.events.map(e => e.eventName)).toEqual(['Event B', 'Event A'])
  })
  
  it('handles null patrolId as "Unassigned"', () => {
    const data: PersonAttendance[] = [
      { 
        memberId: 1, 
        name: 'Alice', 
        patrolId: null, 
        events: [{ id: 1, name: 'Event A' }] 
      },
    ]
    
    const result = groupByPatrolAndEvent(data)
    expect(result[0].patrolKey).toBe('Unassigned')
  })
  
  it('returns empty array for empty input', () => {
    expect(groupByPatrolAndEvent([])).toEqual([])
  })
  
  it('handles person with no events', () => {
    const data: PersonAttendance[] = [
      { memberId: 1, name: 'Alice', patrolId: 101, events: [] },
    ]
    
    const result = groupByPatrolAndEvent(data)
    // Person with no events creates a patrol group with empty events array
    expect(result.length).toBe(1)
    expect(result[0].patrolKey).toBe('101')
    expect(result[0].events).toEqual([])
  })
})
