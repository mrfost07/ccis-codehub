import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLabRun } from './useLabRun'

/**
 * The run/poll loop.
 *
 * The bug worth pinning is the stale reply: a student presses Run, edits, and
 * presses Run again. The server supersedes the first run. If the first run's
 * response is still allowed to reach the console, the student reads the output
 * of code they have already changed and concludes their edit did nothing —
 * which is worse than no output at all, because it is wrong and confident.
 */

const get = vi.fn()
const post = vi.fn()
vi.mock('../services/api', () => ({
  default: {
    get: (...a: any[]) => get(...a),
    post: (...a: any[]) => post(...a),
  },
}))

const done = (stdout: string) => ({
  data: { state: 'done', queue_position: 0, stdout, stderr: '', error: null },
})

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

// This project does not enable React Testing Library's automatic cleanup, so
// without this a hook from an earlier test stays mounted and keeps polling —
// its requests land on the shared mock and are counted against the next test.
// That is exactly what made the unmount test read four calls when the hook was
// in fact making one.
afterEach(cleanup)

describe('starting a run', () => {
  it('asks the lab to run the code and keeps the ticket', async () => {
    post.mockResolvedValue({ data: { run_id: 'r1', state: 'queued', queue_position: 3 } })
    const { result } = renderHook(() => useLabRun('lab-1'))

    await act(async () => {
      await result.current.start({ language: 'python', code: 'print(1)' })
    })

    expect(post).toHaveBeenCalledWith('/lab/labs/lab-1/run/',
      { language: 'python', code: 'print(1)' })
    expect(result.current.run?.queue_position).toBe(3)
    expect(result.current.running).toBe(true)
  })

  it('shows the position while it waits, so the wait is not a blank spinner', async () => {
    post.mockResolvedValue({ data: { run_id: 'r1', state: 'queued', queue_position: 7 } })
    const { result } = renderHook(() => useLabRun('lab-1'))

    await act(async () => {
      await result.current.start({ language: 'python', code: 'print(1)' })
    })

    expect(result.current.run?.state).toBe('queued')
    expect(result.current.run?.queue_position).toBe(7)
  })

  it('reports the reason when the lab refuses the run', async () => {
    post.mockRejectedValue({ response: { data: { detail: 'This lab allows: python.' } } })
    const { result } = renderHook(() => useLabRun('lab-1'))

    await act(async () => {
      await result.current.start({ language: 'java', code: 'x' })
    })

    expect(result.current.failed).toBe('This lab allows: python.')
    expect(result.current.running).toBe(false)
  })
})

describe('polling', () => {
  it('stops once the run is done and shows the output', async () => {
    post.mockResolvedValue({ data: { run_id: 'r1', state: 'queued', queue_position: 0 } })
    get.mockResolvedValue(done('42\n'))
    const { result } = renderHook(() => useLabRun('lab-1'))

    await act(async () => {
      await result.current.start({ language: 'python', code: 'print(42)' })
    })
    await waitFor(() => expect(result.current.run?.state).toBe('done'))

    expect(result.current.run?.stdout).toBe('42\n')
    expect(result.current.running).toBe(false)

    const callsWhenDone = get.mock.calls.length
    await new Promise(resolve => setTimeout(resolve, 900))
    expect(get.mock.calls.length).toBe(callsWhenDone)
  })

  it('says so when it loses contact rather than spinning forever', async () => {
    post.mockResolvedValue({ data: { run_id: 'r1', state: 'queued', queue_position: 0 } })
    get.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useLabRun('lab-1'))

    await act(async () => {
      await result.current.start({ language: 'python', code: 'print(1)' })
    })

    await waitFor(() => expect(result.current.failed).toMatch(/lost contact/i))
    expect(result.current.running).toBe(false)
  })
})

describe('when the student presses Run again', () => {
  it('never lets the abandoned run write to the console', async () => {
    // The whole point. The first run's reply arrives after the second has
    // started; if it lands, the student reads output for code they edited.
    post.mockResolvedValueOnce({ data: { run_id: 'r1', state: 'queued', queue_position: 0 } })
    post.mockResolvedValueOnce({ data: { run_id: 'r2', state: 'queued', queue_position: 0 } })
    get.mockImplementation((url: string) =>
      url.includes('r1')
        ? new Promise(resolve => setTimeout(() => resolve(done('STALE')), 300))
        : Promise.resolve(done('FRESH')))

    const { result } = renderHook(() => useLabRun('lab-1'))
    await act(async () => {
      await result.current.start({ language: 'python', code: 'old' })
    })
    await act(async () => {
      await result.current.start({ language: 'python', code: 'new' })
    })

    await waitFor(() => expect(result.current.run?.stdout).toBe('FRESH'))

    // Give the abandoned poll time to come back and try to overwrite.
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(result.current.run?.stdout).toBe('FRESH')
  })

  it('clears the previous output so nothing stale is on screen while waiting', async () => {
    post.mockResolvedValue({ data: { run_id: 'r1', state: 'queued', queue_position: 0 } })
    get.mockResolvedValue(done('first'))
    const { result } = renderHook(() => useLabRun('lab-1'))

    await act(async () => {
      await result.current.start({ language: 'python', code: 'a' })
    })
    await waitFor(() => expect(result.current.run?.stdout).toBe('first'))

    post.mockResolvedValue({ data: { run_id: 'r2', state: 'queued', queue_position: 2 } })
    await act(async () => {
      await result.current.start({ language: 'python', code: 'b' })
    })

    expect(result.current.run?.stdout).toBeUndefined()
  })
})

describe('unmounting', () => {
  it('stops polling, so a closed tab does not keep asking', async () => {
    post.mockResolvedValue({ data: { run_id: 'r1', state: 'queued', queue_position: 0 } })
    get.mockResolvedValue({ data: { state: 'running', queue_position: 0, stdout: '', stderr: '', error: null } })
    const { result, unmount } = renderHook(() => useLabRun('lab-1'))

    await act(async () => {
      await result.current.start({ language: 'python', code: 'print(1)' })
    })
    await waitFor(() => expect(get).toHaveBeenCalled())
    unmount()

    const after = get.mock.calls.length
    await new Promise(resolve => setTimeout(resolve, 1600))
    expect(get.mock.calls.length).toBeLessThanOrEqual(after + 1)
  })
})
