import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReportQueue from './ReportQueue'

/**
 * The moderator queue.
 *
 * The thing worth pinning is that a moderator can see and act on what was
 * reported. A queue that lists ids, or drops rows whose target has been deleted,
 * leaves reports stuck as pending with no way to reach them.
 */

const getReportQueue = vi.fn()
const resolveReport = vi.fn()

vi.mock('../../services/api', () => ({
  communityAPI: {
    getReportQueue: (...a: any[]) => getReportQueue(...a),
    resolveReport: (...a: any[]) => resolveReport(...a),
  },
}))
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const NOW = new Date().toISOString()

const row = (over: Record<string, any> = {}) => ({
  id: 'r1',
  report_type: 'harassment',
  reason: 'calling people names',
  status: 'pending',
  created_at: NOW,
  reporter: { id: 'u2', username: 'ana' },
  moderator: null,
  target: {
    type: 'post', id: 'p1',
    author: { id: 'u3', username: 'ben' },
    excerpt: 'the offending words',
    image: null,
    created_at: NOW,
  },
  ...over,
})

afterEach(cleanup)
beforeEach(() => {
  getReportQueue.mockReset()
  resolveReport.mockReset()
  getReportQueue.mockResolvedValue({ data: { results: [row()], count: 1 } })
  resolveReport.mockResolvedValue({ data: {} })
})

describe('the queue', () => {
  it('opens on pending, which is the work', async () => {
    render(<ReportQueue />)
    await waitFor(() => expect(getReportQueue).toHaveBeenCalledWith('pending'))
  })

  it('shows the complaint and the content it is about, together', async () => {
    render(<ReportQueue />)

    await waitFor(() => expect(screen.getByText(/calling people names/)).toBeTruthy())
    // Without the target, a moderator has only an id to go on.
    expect(screen.getByText('the offending words')).toBeTruthy()
    expect(screen.getByText('ben')).toBeTruthy()
    expect(screen.getByText('ana')).toBeTruthy()
    expect(screen.getByText('Harassment')).toBeTruthy()
  })

  it('links through to the reported post', async () => {
    render(<ReportQueue />)
    await waitFor(() => expect(screen.getByText(/open/i)).toBeTruthy())

    expect(screen.getByRole('link', { name: /open/i }).getAttribute('href'))
      .toBe('/community/posts/p1')
  })

  it('links a reported comment to its post, at the comment', async () => {
    getReportQueue.mockResolvedValue({ data: { results: [row({
      target: {
        type: 'comment', id: 'c9', post_id: 'p5',
        author: { id: 'u3', username: 'ben' },
        excerpt: 'rude reply', image: null, created_at: NOW,
      },
    })], count: 1 } })
    render(<ReportQueue />)

    await waitFor(() => expect(screen.getByText('rude reply')).toBeTruthy())
    expect(screen.getByRole('link', { name: /open/i }).getAttribute('href'))
      .toBe('/community/posts/p5#comment-c9')
  })

  it('still lists a report whose content was deleted, and keeps it actionable', async () => {
    // "It was already removed" is an outcome; the report has to be closable.
    getReportQueue.mockResolvedValue({ data: { results: [row({ target: null })], count: 1 } })
    render(<ReportQueue />)

    await waitFor(() => expect(screen.getByText(/since been deleted/i)).toBeTruthy())
    expect(screen.getByRole('button', { name: /actioned/i })).toBeTruthy()
  })

  it('says so when there is nothing waiting', async () => {
    getReportQueue.mockResolvedValue({ data: { results: [], count: 0 } })
    render(<ReportQueue />)

    await waitFor(() => expect(screen.getByText(/nothing waiting/i)).toBeTruthy())
  })
})

describe('acting on a report', () => {
  it('marks one actioned and reloads, since it leaves the pending filter', async () => {
    const user = userEvent.setup()
    render(<ReportQueue />)
    await waitFor(() => expect(screen.getByText('the offending words')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: /actioned/i }))

    expect(resolveReport).toHaveBeenCalledWith('r1', 'resolved')
    await waitFor(() => expect(getReportQueue).toHaveBeenCalledTimes(2))
  })

  it('dismisses one', async () => {
    const user = userEvent.setup()
    render(<ReportQueue />)
    await waitFor(() => expect(screen.getByText('the offending words')).toBeTruthy())

    // Scoped to the row: the filter bar also has a "Dismissed" button.
    const card = screen.getByRole('listitem')
    await user.click(within(card).getByRole('button', { name: /dismiss/i }))

    expect(resolveReport).toHaveBeenCalledWith('r1', 'dismissed')
  })

  it('offers no actions on one already closed', async () => {
    getReportQueue.mockResolvedValue({ data: { results: [row({
      status: 'resolved', moderator: { id: 'm1', username: 'mod' },
    })], count: 1 } })
    render(<ReportQueue />)

    await waitFor(() => expect(screen.getByText(/handled by mod/i)).toBeTruthy())
    // Scoped to the row, since the filter bar carries similar words.
    const card = screen.getByRole('listitem')
    expect(within(card).queryByRole('button', { name: /actioned/i })).toBeNull()
    expect(within(card).queryByRole('button', { name: /dismiss/i })).toBeNull()
  })

  it('changes the filter and refetches with it', async () => {
    const user = userEvent.setup()
    render(<ReportQueue />)
    await waitFor(() => expect(getReportQueue).toHaveBeenCalledWith('pending'))

    await user.click(screen.getByRole('button', { name: /^resolved$/i }))

    await waitFor(() => expect(getReportQueue).toHaveBeenCalledWith('resolved'))
  })
})
