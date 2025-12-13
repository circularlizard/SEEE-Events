import { useStore } from '@/store/use-store'

describe('Data Loading Tracker State', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      dataSourceProgress: {},
    })
  })

  describe('updateDataSourceProgress', () => {
    it('creates a new data source entry', () => {
      const { updateDataSourceProgress } = useStore.getState()
      
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'loading',
        total: 10,
        completed: 0,
        phase: 'Loading events...',
      })

      const state = useStore.getState()
      expect(state.dataSourceProgress.events).toEqual({
        id: 'events',
        label: 'Events',
        state: 'loading',
        total: 10,
        completed: 0,
        phase: 'Loading events...',
        error: undefined,
      })
    })

    it('updates an existing data source entry', () => {
      const { updateDataSourceProgress } = useStore.getState()
      
      // Initial state
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'loading',
        total: 10,
        completed: 0,
        phase: 'Loading events...',
      })

      // Update progress
      updateDataSourceProgress('events', {
        completed: 5,
        phase: 'Loading events (5/10)...',
      })

      const state = useStore.getState()
      expect(state.dataSourceProgress.events).toEqual({
        id: 'events',
        label: 'Events',
        state: 'loading',
        total: 10,
        completed: 5,
        phase: 'Loading events (5/10)...',
        error: undefined,
      })
    })

    it('tracks multiple data sources independently', () => {
      const { updateDataSourceProgress } = useStore.getState()
      
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'complete',
        total: 10,
        completed: 10,
        phase: '10 events loaded',
      })

      updateDataSourceProgress('members', {
        label: 'Members',
        state: 'loading',
        total: 25,
        completed: 5,
        phase: 'Loading member info...',
      })

      const state = useStore.getState()
      expect(Object.keys(state.dataSourceProgress)).toHaveLength(2)
      expect(state.dataSourceProgress.events.state).toBe('complete')
      expect(state.dataSourceProgress.members.state).toBe('loading')
    })

    it('handles error state with error message', () => {
      const { updateDataSourceProgress } = useStore.getState()
      
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'error',
        total: 0,
        completed: 0,
        phase: 'Error loading events',
        error: 'Network error',
      })

      const state = useStore.getState()
      expect(state.dataSourceProgress.events.state).toBe('error')
      expect(state.dataSourceProgress.events.error).toBe('Network error')
    })
  })

  describe('clearDataSourceProgress', () => {
    it('removes a specific data source', () => {
      const { updateDataSourceProgress, clearDataSourceProgress } = useStore.getState()
      
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'complete',
        total: 10,
        completed: 10,
        phase: '10 events loaded',
      })

      updateDataSourceProgress('members', {
        label: 'Members',
        state: 'complete',
        total: 25,
        completed: 25,
        phase: '25 members loaded',
      })

      clearDataSourceProgress('events')

      const state = useStore.getState()
      expect(state.dataSourceProgress.events).toBeUndefined()
      expect(state.dataSourceProgress.members).toBeDefined()
    })
  })

  describe('clearAllDataSourceProgress', () => {
    it('removes all data sources', () => {
      const { updateDataSourceProgress, clearAllDataSourceProgress } = useStore.getState()
      
      updateDataSourceProgress('events', {
        label: 'Events',
        state: 'complete',
        total: 10,
        completed: 10,
        phase: '10 events loaded',
      })

      updateDataSourceProgress('members', {
        label: 'Members',
        state: 'complete',
        total: 25,
        completed: 25,
        phase: '25 members loaded',
      })

      clearAllDataSourceProgress()

      const state = useStore.getState()
      expect(state.dataSourceProgress).toEqual({})
    })
  })
})
