// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RotaryDial } from './RotaryDial'

describe('RotaryDial accessible input', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('accepts a simple click on a number hole', () => {
    vi.useFakeTimers()
    const onDigit = vi.fn()
    render(<RotaryDial onDigit={onDigit} />)
    const hole = screen.getByRole('button', { name: '拨 9' })
    Object.defineProperties(hole, {
      setPointerCapture: { value: vi.fn() },
      releasePointerCapture: { value: vi.fn() },
    })

    fireEvent.pointerDown(hole, { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerUp(hole, { pointerId: 1, clientX: 0, clientY: 0 })
    act(() => vi.advanceTimersByTime(560))

    expect(onDigit).toHaveBeenCalledWith('9')
  })

  it('accepts number keys without requiring rotary focus', () => {
    vi.useFakeTimers()
    const onDigit = vi.fn()
    render(<RotaryDial onDigit={onDigit} />)

    fireEvent.keyDown(window, { key: '4' })
    act(() => vi.advanceTimersByTime(560))

    expect(onDigit).toHaveBeenCalledWith('4')
  })

  it('queues rapid keyboard input instead of silently dropping digits', () => {
    vi.useFakeTimers()
    const onDigit = vi.fn()
    render(<RotaryDial onDigit={onDigit} />)

    for (const digit of '8714000') fireEvent.keyDown(window, { key: digit })
    act(() => vi.runAllTimers())

    expect(onDigit.mock.calls.map(([digit]) => digit).join('')).toBe('8714000')
  })

  it('queues rapid clicks while the wheel is returning', () => {
    vi.useFakeTimers()
    const onDigit = vi.fn()
    render(<RotaryDial onDigit={onDigit} />)

    for (const digit of '946') fireEvent.click(screen.getByRole('button', { name: `拨 ${digit}` }))
    act(() => vi.runAllTimers())

    expect(onDigit.mock.calls.map(([digit]) => digit).join('')).toBe('946')
  })
})
