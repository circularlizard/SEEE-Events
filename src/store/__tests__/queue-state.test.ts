import { useStore } from '../use-store'

describe('useStore queue state', () => {
  beforeEach(() => {
    useStore.setState({
      queueItems: [],
      queueRunning: 0,
      queueTimerActive: false,
    })
  })

  it('enqueues unique event IDs and skips duplicates', () => {
    const { enqueueItems } = useStore.getState()
    enqueueItems([1, 2])
    enqueueItems([2, 3, 4])

    expect(useStore.getState().queueItems).toEqual([1, 2, 3, 4])
  })

  it('dequeues items in FIFO order', () => {
    const { enqueueItems, dequeueItem } = useStore.getState()
    enqueueItems([10, 20, 30])

    expect(dequeueItem()).toBe(10)
    expect(useStore.getState().queueItems).toEqual([20, 30])
    expect(dequeueItem()).toBe(20)
    expect(dequeueItem()).toBe(30)
    expect(dequeueItem()).toBeNull()
  })

  it('clears queue state', () => {
    const { enqueueItems, clearQueue } = useStore.getState()
    enqueueItems([5])
    clearQueue()

    expect(useStore.getState().queueItems).toEqual([])
    expect(useStore.getState().queueRunning).toBe(0)
    expect(useStore.getState().queueTimerActive).toBe(false)
  })

  it('tracks running count and timer flag', () => {
    const { setQueueRunning, setQueueTimerActive } = useStore.getState()
    setQueueRunning(2)
    expect(useStore.getState().queueRunning).toBe(2)
    setQueueTimerActive(true)
    expect(useStore.getState().queueTimerActive).toBe(true)
  })
})
