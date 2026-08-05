import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useExamLockdown } from './useExamLockdown'

/**
 * Contract tests for the exam lockdown.
 *
 * These exist so the anti-cheat can be refactored safely. LiveQuizSession and
 * SelfPacedQuizSession each carry their own near-identical copy of this logic
 * (fullscreen + focus loss + clipboard, reported over a WebSocket), and merging
 * them into one hook is only sane if the behaviour is pinned first. Every
 * subtlety asserted below is one a reimplementation could plausibly get wrong:
 *
 *   - right-click is blocked but is NOT a violation
 *   - a blur immediately following a tab switch is ONE violation, not two
 *   - onMaxViolations fires exactly once, however many violations follow
 *   - Ctrl+C is blocked at keydown, so it never becomes a counted copy event
 *
 * Written against a real jsdom DOM rather than mocks, because what is being
 * tested is event wiring: listener registration, preventDefault, and teardown.
 */

const dispatch = (target: Document | Window, type: string) => {
  const event = new Event(type, { cancelable: true })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

const pressKey = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { cancelable: true, bubbles: true, ...init })
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
}

const setFullscreenElement = (element: Element | null) => {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => element,
  })
}

afterEach(() => {
  // cleanup() must be explicit here. Testing Library only registers its own
  // automatic unmount when the test globals are exposed, and this project runs
  // vitest with globals:false (see vitest.config.ts). Without it, a hook from
  // an earlier test stays mounted and its document-level listeners keep firing
  // in every later test — which showed up immediately as three failures where
  // a copy event was still being blocked after unmount.
  cleanup()
  setHidden(false)
  setFullscreenElement(null)
  vi.useRealTimers()
})

describe('useExamLockdown', () => {
  it('does nothing while inactive', () => {
    const onViolation = vi.fn()
    const { result } = renderHook(() =>
      useExamLockdown({ active: false, onViolation }),
    )

    const copy = dispatch(document, 'copy')

    expect(copy.defaultPrevented).toBe(false)
    expect(result.current.violations).toBe(0)
    expect(onViolation).not.toHaveBeenCalled()
  })

  it('blocks and counts clipboard events', () => {
    const onViolation = vi.fn()
    const { result } = renderHook(() => useExamLockdown({ active: true, onViolation }))

    expect(dispatch(document, 'copy').defaultPrevented).toBe(true)
    expect(dispatch(document, 'cut').defaultPrevented).toBe(true)
    expect(dispatch(document, 'paste').defaultPrevented).toBe(true)

    expect(result.current.violations).toBe(3)
    expect(onViolation.mock.calls.map(([info]) => info.type)).toEqual([
      'copy',
      'cut',
      'paste',
    ])
    expect(onViolation).toHaveBeenLastCalledWith({ type: 'paste', count: 3 })
  })

  it('blocks right-click without counting it as a violation', () => {
    // Deliberate: a context menu alone reveals nothing. Counting it would
    // punish students who right-click out of habit, and the copy/cut handlers
    // already stop the only thing that matters.
    const { result } = renderHook(() => useExamLockdown({ active: true }))

    expect(dispatch(document, 'contextmenu').defaultPrevented).toBe(true)
    expect(result.current.violations).toBe(0)
  })

  it('leaves the clipboard alone when blockClipboard is false', () => {
    const { result } = renderHook(() =>
      useExamLockdown({ active: true, blockClipboard: false }),
    )

    expect(dispatch(document, 'copy').defaultPrevented).toBe(false)
    expect(result.current.violations).toBe(0)
  })

  it('counts a tab switch and pauses', () => {
    const onViolation = vi.fn()
    const { result } = renderHook(() => useExamLockdown({ active: true, onViolation }))

    setHidden(true)
    dispatch(document, 'visibilitychange')

    expect(result.current.violations).toBe(1)
    expect(result.current.paused).toBe(true)
    expect(onViolation).toHaveBeenCalledWith({ type: 'tab_switch', count: 1 })
  })

  it('ignores a visibilitychange that did not hide the page', () => {
    const { result } = renderHook(() => useExamLockdown({ active: true }))

    setHidden(false)
    dispatch(document, 'visibilitychange')

    expect(result.current.violations).toBe(0)
  })

  it('coalesces a blur that follows a tab switch into one violation', () => {
    // Switching tabs fires visibilitychange AND blur. Counting both would
    // double-charge a single action and burn a 3-violation budget in two
    // switches.
    vi.useFakeTimers()
    const { result } = renderHook(() => useExamLockdown({ active: true }))

    setHidden(true)
    dispatch(document, 'visibilitychange')
    dispatch(window, 'blur')

    expect(result.current.violations).toBe(1)
  })

  it('counts a second focus loss once the cooldown has passed', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useExamLockdown({ active: true }))

    setHidden(true)
    dispatch(document, 'visibilitychange')
    expect(result.current.violations).toBe(1)

    act(() => {
      vi.setSystemTime(Date.now() + 700)
    })
    dispatch(document, 'visibilitychange')

    expect(result.current.violations).toBe(2)
  })

  it('fires onMaxViolations exactly once', () => {
    const onMaxViolations = vi.fn()
    const { result } = renderHook(() =>
      useExamLockdown({ active: true, maxViolations: 2, onMaxViolations }),
    )

    dispatch(document, 'copy')
    expect(onMaxViolations).not.toHaveBeenCalled()

    dispatch(document, 'copy')
    expect(onMaxViolations).toHaveBeenCalledTimes(1)

    dispatch(document, 'copy')
    dispatch(document, 'cut')

    expect(onMaxViolations).toHaveBeenCalledTimes(1)
    expect(result.current.violations).toBe(4)
  })

  it('blocks devtools, view-source, save and print shortcuts', () => {
    const onViolation = vi.fn()
    const { result } = renderHook(() => useExamLockdown({ active: true, onViolation }))

    expect(pressKey({ key: 'F12' }).defaultPrevented).toBe(true)
    expect(pressKey({ key: 'I', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true)
    expect(pressKey({ key: 'u', ctrlKey: true }).defaultPrevented).toBe(true)
    expect(pressKey({ key: 's', metaKey: true }).defaultPrevented).toBe(true)
    expect(pressKey({ key: 'p', ctrlKey: true }).defaultPrevented).toBe(true)

    expect(onViolation.mock.calls.map(([info]) => info.type)).toEqual([
      'devtools',
      'devtools',
      'devtools',
      'devtools',
      'print',
    ])
    expect(result.current.violations).toBe(5)
  })

  it('blocks Ctrl+C at the keystroke without double counting it', () => {
    // Preventing the keydown stops the browser ever emitting a 'copy' event, so
    // the shortcut costs no violation while a menu-driven copy still does. If a
    // rewrite counted here too, one Ctrl+C would cost two violations.
    const { result } = renderHook(() => useExamLockdown({ active: true }))

    expect(pressKey({ key: 'c', ctrlKey: true }).defaultPrevented).toBe(true)
    expect(pressKey({ key: 'v', ctrlKey: true }).defaultPrevented).toBe(true)
    expect(pressKey({ key: 'x', ctrlKey: true }).defaultPrevented).toBe(true)

    expect(result.current.violations).toBe(0)
  })

  it('allows normal typing through', () => {
    const { result } = renderHook(() => useExamLockdown({ active: true }))

    expect(pressKey({ key: 'a' }).defaultPrevented).toBe(false)
    expect(pressKey({ key: 'Enter' }).defaultPrevented).toBe(false)
    expect(result.current.violations).toBe(0)
  })

  it('registers a fullscreen exit and stays paused until resume', () => {
    const onViolation = vi.fn()
    const { result } = renderHook(() => useExamLockdown({ active: true, onViolation }))

    setFullscreenElement(null)
    dispatch(document, 'fullscreenchange')

    expect(result.current.violations).toBe(1)
    expect(result.current.paused).toBe(true)
    expect(result.current.isFullscreen).toBe(false)
    expect(onViolation).toHaveBeenCalledWith({ type: 'fullscreen_exit', count: 1 })

    act(() => {
      result.current.resume()
    })
    expect(result.current.paused).toBe(false)
  })

  it('does not count re-entering fullscreen', () => {
    const { result } = renderHook(() => useExamLockdown({ active: true }))

    setFullscreenElement(document.body)
    dispatch(document, 'fullscreenchange')

    expect(result.current.isFullscreen).toBe(true)
    expect(result.current.violations).toBe(0)
  })

  it('ignores fullscreen changes when enforceFullscreen is false', () => {
    const { result } = renderHook(() =>
      useExamLockdown({ active: true, enforceFullscreen: false }),
    )

    setFullscreenElement(null)
    dispatch(document, 'fullscreenchange')

    expect(result.current.violations).toBe(0)
  })

  it('stops counting after unmount', () => {
    const onViolation = vi.fn()
    const { unmount } = renderHook(() => useExamLockdown({ active: true, onViolation }))

    unmount()
    const copy = dispatch(document, 'copy')

    expect(copy.defaultPrevented).toBe(false)
    expect(onViolation).not.toHaveBeenCalled()
  })

  it('tears down when active flips to false', () => {
    const onViolation = vi.fn()
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useExamLockdown({ active, onViolation }),
      { initialProps: { active: true } },
    )

    dispatch(document, 'copy')
    expect(onViolation).toHaveBeenCalledTimes(1)

    rerender({ active: false })
    const copy = dispatch(document, 'copy')

    expect(copy.defaultPrevented).toBe(false)
    expect(onViolation).toHaveBeenCalledTimes(1)
  })
})

describe('fullscreen entry is the caller\'s job', () => {
  /** Install a fake requestFullscreen and report how it was used. */
  const stubFullscreen = (behaviour: 'resolve' | 'reject') => {
    const calls: number[] = []
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      writable: true,
      value: () => {
        calls.push(Date.now())
        return behaviour === 'resolve'
          ? Promise.resolve()
          : Promise.reject(new TypeError('Permissions check failed'))
      },
    })
    return calls
  }

  it('does not request fullscreen from an effect', async () => {
    // It used to. An effect has no user activation, so the browser refuses it —
    // Chrome 148 answers `TypeError: Permissions check failed` and
    // fullscreenElement stays null. The lockdown then reported itself as engaged
    // while the exam was never actually locked down, because the rejection was
    // swallowed. Entry has to be gated behind a real gesture by the caller.
    const calls = stubFullscreen('resolve')

    renderHook(() => useExamLockdown({ active: true, enforceFullscreen: true }))
    await act(async () => { await Promise.resolve() })

    expect(calls, [
      'useExamLockdown called requestFullscreen on activate.',
      'That cannot succeed outside a user gesture. Gate it behind a button in the',
      'page, the way SelfPacedQuizSession does with "Start in Fullscreen".',
    ].join('\n')).toHaveLength(0)
  })

  it('still exposes enterFullscreen for the caller to use from a click', () => {
    const calls = stubFullscreen('resolve')
    const { result } = renderHook(() => useExamLockdown({ active: true }))

    act(() => { result.current.enterFullscreen() })

    expect(calls).toHaveLength(1)
  })

  it('reports a refusal rather than swallowing it', async () => {
    // `.catch(() => {})` meant a caller that got the gesture wrong saw silence.
    stubFullscreen('reject')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useExamLockdown({ active: true }))

    expect(result.current.fullscreenDenied).toBe(false)
    await act(async () => {
      result.current.enterFullscreen()
      await Promise.resolve()
    })

    expect(result.current.fullscreenDenied).toBe(true)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
