import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ExamPausedOverlay from './ExamPausedOverlay'
import FullscreenGate from './FullscreenGate'

/**
 * The fullscreen reminder and the paused overlay.
 *
 * The rule that has to hold, and that reads backwards from the requirement:
 * fullscreen is requested SYNCHRONOUSLY inside the click, and the countdown runs
 * afterwards. "Press continue, count down, then go fullscreen" cannot work —
 * transient user activation is spent by the time a timer fires, and Chrome
 * answers `TypeError: Permissions check failed`. A test is the only place this
 * ordering is visible; in a browser it just silently stays windowed.
 */

let requested: number[]
let grant: boolean

beforeEach(() => {
  requested = []
  grant = true
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    writable: true,
    value: () => {
      requested.push(performance.now())
      return grant ? Promise.resolve() : Promise.reject(new TypeError('Permissions check failed'))
    },
  })
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => (grant ? document.body : null),
  })
})
afterEach(cleanup)

describe('FullscreenGate', () => {
  it('is a reminder with a way past it, not a wall', async () => {
    // A hard block strands anyone whose browser refuses fullscreen, and that is
    // indistinguishable from refusing on purpose.
    render(<FullscreenGate onReady={() => {}} onSkip={() => {}} />)

    expect(screen.getByRole('button', { name: /start in fullscreen/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /skip for now/i })).toBeTruthy()
  })

  it('warns that skipping is recorded, before the student chooses', async () => {
    render(<FullscreenGate onReady={() => {}} onSkip={() => {}} />)
    expect(screen.getByText(/recorded and shown to your instructor/i)).toBeTruthy()
  })

  it('requests fullscreen on start and reports that it was granted', async () => {
    const onReady = vi.fn()
    const user = userEvent.setup()
    render(<FullscreenGate onReady={onReady} onSkip={() => {}} />)

    await user.click(screen.getByRole('button', { name: /start in fullscreen/i }))

    expect(requested).toHaveLength(1)
    expect(onReady).toHaveBeenCalledWith(true)
  })

  it('reports a refusal rather than pretending it worked', async () => {
    grant = false
    const onReady = vi.fn()
    const user = userEvent.setup()
    render(<FullscreenGate onReady={onReady} onSkip={() => {}} />)

    await user.click(screen.getByRole('button', { name: /start in fullscreen/i }))

    expect(onReady).toHaveBeenCalledWith(false)
  })

  it('does not request fullscreen when the student skips', async () => {
    const onSkip = vi.fn()
    const user = userEvent.setup()
    render(<FullscreenGate onReady={() => {}} onSkip={onSkip} />)

    await user.click(screen.getByRole('button', { name: /skip for now/i }))

    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(requested).toHaveLength(0)
  })
})

describe('ExamPausedOverlay', () => {
  it('shows why it paused and does not resume on its own', async () => {
    const onContinue = vi.fn()
    render(<ExamPausedOverlay reason="You left fullscreen." onContinue={onContinue} />)

    expect(screen.getByText('You left fullscreen.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /continue/i })).toBeTruthy()
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('asks for fullscreen BEFORE counting down, not after', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onContinue = vi.fn()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ExamPausedOverlay reason="Paused." countdownSeconds={3} onContinue={onContinue} />)

      await user.click(screen.getByRole('button', { name: /continue/i }))

      // The request has already happened, with the countdown still running.
      expect(requested, 'fullscreen must be requested inside the click').toHaveLength(1)
      expect(onContinue).not.toHaveBeenCalled()
      expect(screen.getByText('3')).toBeTruthy()

      // Stepped, not one 3000ms jump: each tick schedules the next only after a
      // render, so a single exact-length advance can leave the last one pending.
      for (let i = 0; i < 4; i += 1) {
        await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
      }
      expect(onContinue).toHaveBeenCalledTimes(1)
      // And it did not ask again on the way through.
      expect(requested).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('counts down to zero before handing back', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onContinue = vi.fn()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ExamPausedOverlay reason="Paused." countdownSeconds={2} onContinue={onContinue} />)
      await user.click(screen.getByRole('button', { name: /continue/i }))

      expect(screen.getByText('2')).toBeTruthy()
      await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
      expect(screen.getByText('1')).toBeTruthy()
      expect(onContinue).not.toHaveBeenCalled()

      await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
      expect(onContinue).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores a second click while already counting down', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onContinue = vi.fn()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ExamPausedOverlay reason="Paused." countdownSeconds={3} onContinue={onContinue} />)

      const button = screen.getByRole('button', { name: /continue/i })
      await user.click(button)
      // The button is replaced by the countdown, but a double-tap can still land.
      for (let i = 0; i < 4; i += 1) {
        await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
      }

      expect(requested).toHaveLength(1)
      expect(onContinue).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('tells the student when the browser refused, since it is on their record', async () => {
    grant = false
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<ExamPausedOverlay reason="Paused." countdownSeconds={1} onContinue={() => {}} />)
      await user.click(screen.getByRole('button', { name: /continue/i }))

      expect(screen.getByText(/fullscreen was refused/i)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('surfaces the running clock when given one', async () => {
    render(
      <ExamPausedOverlay reason="Paused." clockNote="1:23 left — the clock is still running"
        onContinue={() => {}} />,
    )
    expect(screen.getByText(/the clock is still running/i)).toBeTruthy()
  })
})
