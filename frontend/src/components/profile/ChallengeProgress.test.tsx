import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ChallengeProgress from './ChallengeProgress'

/**
 * The coding progress panel on the profile.
 *
 * The heatmap is the part that can be quietly wrong. The API sends only days
 * with activity, so the grid has to be built here — and a grid built from the
 * response alone would collapse empty stretches, showing a busy-looking year to
 * someone who worked twice. So what is pinned is that the full window is
 * rendered, that a day lands on its own date, and that the shade tracks the
 * count.
 */

const get = vi.fn()
vi.mock('../../services/api', () => ({ default: { get: (...a: any[]) => get(...a) } }))

const progress = (over: Record<string, any> = {}) => ({
  solved: { easy: 12, medium: 4, hard: 1, total: 17 },
  available: { easy: 57, medium: 53, hard: 50, total: 160 },
  submissions: { total: 40, accepted: 17, acceptance_rate: 42.5 },
  points: 260,
  streak: { current: 3, longest: 11 },
  activity: [
    { date: '2026-08-06', count: 2, solved: 1 },
    { date: '2026-08-07', count: 12, solved: 4 },
  ],
  window_days: 365,
  today: '2026-08-08',
  ...over,
})

afterEach(cleanup)
beforeEach(() => {
  get.mockReset()
  get.mockResolvedValue({ data: progress() })
})

describe('the summary', () => {
  it('shows solved against the total, not a bare count', async () => {
    render(<ChallengeProgress />)

    await waitFor(() => expect(screen.getByText(/17 of 160 solved/)).toBeTruthy())
  })

  it('breaks the count down by difficulty with its denominator', async () => {
    render(<ChallengeProgress />)

    await screen.findByText('Easy')
    expect(screen.getByText('of 57')).toBeTruthy()
    expect(screen.getByText('of 53')).toBeTruthy()
    expect(screen.getByText('of 50')).toBeTruthy()
  })

  it('shows the streak and the acceptance rate', async () => {
    render(<ChallengeProgress />)

    await waitFor(() => expect(screen.getByText(/day streak/)).toBeTruthy())
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('42.5%')).toBeTruthy()
    expect(screen.getByText(/longest streak 11/)).toBeTruthy()
  })

  it('counts submissions and active days across the year', async () => {
    render(<ChallengeProgress />)

    await waitFor(() => expect(screen.getByText('14')).toBeTruthy())
    expect(screen.getByText('2')).toBeTruthy()
  })
})

describe('the heatmap', () => {
  it('renders the whole window, not only the days with activity', async () => {
    // A grid built from the response alone would be two cells wide and make a
    // student who worked twice look like they worked every day.
    render(<ChallengeProgress />)

    await waitFor(() => expect(
      screen.getAllByTestId('heatmap-day').length).toBeGreaterThan(365))
  })

  it('puts a day on its own date', async () => {
    render(<ChallengeProgress />)

    await waitFor(() => expect(screen.getAllByTestId('heatmap-day').length).toBeGreaterThan(0))
    const busy = screen.getAllByTestId('heatmap-day')
      .find(cell => cell.getAttribute('data-date') === '2026-08-07')
    expect(busy?.getAttribute('data-count')).toBe('12')
  })

  it('leaves days with no activity at zero', async () => {
    render(<ChallengeProgress />)

    await waitFor(() => expect(screen.getAllByTestId('heatmap-day').length).toBeGreaterThan(0))
    const quiet = screen.getAllByTestId('heatmap-day')
      .find(cell => cell.getAttribute('data-date') === '2026-08-05')
    expect(quiet?.getAttribute('data-count')).toBe('0')
  })

  it('shades a busy day more strongly than a quiet one', async () => {
    render(<ChallengeProgress />)

    await waitFor(() => expect(screen.getAllByTestId('heatmap-day').length).toBeGreaterThan(0))
    const cells = screen.getAllByTestId('heatmap-day')
    const busy = cells.find(c => c.getAttribute('data-date') === '2026-08-07')!
    const quiet = cells.find(c => c.getAttribute('data-date') === '2026-08-06')!
    const empty = cells.find(c => c.getAttribute('data-date') === '2026-08-05')!

    expect(busy.className).not.toEqual(quiet.className)
    expect(quiet.className).not.toEqual(empty.className)
    expect(empty.className).toContain('bg-neutral-800')
  })

  it('describes a day for anyone reading it with a screen reader or a mouse', async () => {
    render(<ChallengeProgress />)

    await waitFor(() => expect(screen.getAllByTestId('heatmap-day').length).toBeGreaterThan(0))
    const busy = screen.getAllByTestId('heatmap-day')
      .find(c => c.getAttribute('data-date') === '2026-08-07')
    expect(busy?.getAttribute('title')).toBe('12 submissions, 4 solved on 2026-08-07')
  })

  it('handles a student who has done nothing', async () => {
    get.mockResolvedValue({ data: progress({
      solved: { easy: 0, medium: 0, hard: 0, total: 0 },
      submissions: { total: 0, accepted: 0, acceptance_rate: 0 },
      streak: { current: 0, longest: 0 },
      activity: [],
    }) })
    render(<ChallengeProgress />)

    await waitFor(() => expect(screen.getByText(/0 of 160 solved/)).toBeTruthy())
    expect(screen.getAllByTestId('heatmap-day').length).toBeGreaterThan(365)
  })
})

describe('when it cannot load', () => {
  it('says so rather than showing a blank panel', async () => {
    get.mockRejectedValue(new Error('nope'))
    render(<ChallengeProgress />)

    await waitFor(() => expect(
      screen.getByText(/could not load your coding progress/i)).toBeTruthy())
  })
})
