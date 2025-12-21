/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react'
import React from 'react'

jest.useFakeTimers()

const mockPush = jest.fn()

jest.mock('next-auth/react', () => {
  return {
    useSession: jest.fn(),
  }
})

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { useSessionTimeout } from '../useSessionTimeout'
import { useSession } from 'next-auth/react'

function TestComponent() {
  useSessionTimeout()
  return null
}

function TestComponentWithOnTimeout({ onTimeout }: { onTimeout: () => void | Promise<void> }) {
  useSessionTimeout({ onTimeout })
  return null
}

describe('useSessionTimeout', () => {
  const INACTIVITY_MS = 15 * 60 * 1000

  beforeEach(() => {
    jest.clearAllMocks()
    jest.setSystemTime(0)
    process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS = String(INACTIVITY_MS)
    ;(useSession as jest.Mock).mockReturnValue({ status: 'authenticated', data: { user: { id: 'u1' } } })
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS
    jest.runOnlyPendingTimers()
  })

  test('redirects to login after inactivity when no onTimeout handler is provided', async () => {
    render(<TestComponent />)

    jest.advanceTimersByTime(INACTIVITY_MS + 1000)
    await Promise.resolve()

    expect(mockPush).toHaveBeenCalledTimes(1)
    const target = mockPush.mock.calls[0][0]
    expect(typeof target).toBe('string')
    expect(target).toContain('/?callbackUrl=')
  })

  test('calls onTimeout after inactivity when a handler is provided (hard timeout)', async () => {
    const onTimeout = jest.fn()

    render(<TestComponentWithOnTimeout onTimeout={onTimeout} />)

    jest.advanceTimersByTime(INACTIVITY_MS + 1000)
    await Promise.resolve()

    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
  })

  test('does nothing when user is unauthenticated', () => {
    ;(useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated', data: null })

    render(<TestComponent />)

    jest.advanceTimersByTime(INACTIVITY_MS + 1000)
    expect(mockPush).not.toHaveBeenCalled()
  })
})
