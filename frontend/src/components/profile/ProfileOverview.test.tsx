import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProfileOverview, { ProfileHeadline } from './ProfileOverview'

/**
 * The profile's cross-domain summary.
 *
 * It replaced figures read from denormalised counters, which were wrong on
 * production — a student with two finished paths and two certificates was shown
 * zero courses, because nothing updates that counter when a path completes.
 *
 * So what is pinned is that the numbers come from the overview endpoint and are
 * shown with the context that makes them mean something: solved against
 * available, tasks done against tasks assigned, paths finished against paths
 * enrolled.
 */

const get = vi.fn()
vi.mock('../../services/api', () => ({ default: { get: (...a: any[]) => get(...a) } }))

const overview = (over: Record<string, any> = {}) => ({
  learning: {
    enrolled: 4, completed_paths: 2, modules_completed: 8, certificates: 2,
    quizzes_taken: 6, average_score: 82.5, quizzes_available: 76,
  },
  challenges: {
    solved: { easy: 12, medium: 4, hard: 1, total: 17 },
    available: { easy: 57, medium: 53, hard: 50, total: 160 },
    streak: { current: 3, longest: 11 },
    acceptance_rate: 42.5, submissions: 40,
  },
  projects: {
    owned: 2, member_of: 3, active: 1, completed: 1,
    tasks_assigned: 10, tasks_done: 7,
  },
  community: {
    posts: 5, comments: 12, likes_received: 23, followers: 9, following: 4,
  },
  ...over,
})

afterEach(cleanup)
beforeEach(() => {
  get.mockReset()
  get.mockResolvedValue({ data: overview() })
})

describe('the overview', () => {
  it('reads from the overview endpoint, not the profile counters', async () => {
    render(<ProfileOverview />)

    await waitFor(() => expect(get).toHaveBeenCalledWith('/auth/profile/overview/'))
  })

  it('covers learning, challenges, projects and community', async () => {
    render(<ProfileOverview />)

    await screen.findByText('Learning')
    expect(screen.getByText('Coding challenges')).toBeTruthy()
    expect(screen.getByText('Projects')).toBeTruthy()
    expect(screen.getByText('Community')).toBeTruthy()
  })

  it('shows completed paths against the number enrolled', async () => {
    // "2 completed" alone does not say whether that is all of them.
    render(<ProfileOverview />)

    await waitFor(() => expect(screen.getByText('Paths completed')).toBeTruthy())
    expect(screen.getByText('4 enrolled')).toBeTruthy()
    expect(screen.getByText('2 / 4')).toBeTruthy()
  })

  it('shows solved against available for every difficulty', async () => {
    render(<ProfileOverview />)

    await waitFor(() => expect(screen.getByText('12 / 57')).toBeTruthy())
    expect(screen.getByText('4 / 53')).toBeTruthy()
    expect(screen.getByText('1 / 50')).toBeTruthy()
  })

  it('shows tasks done against tasks assigned', async () => {
    render(<ProfileOverview />)

    await waitFor(() => expect(screen.getByText('of 10 assigned')).toBeTruthy())
    expect(screen.getByText('7 / 10')).toBeTruthy()
  })

  it('reports likes received rather than only a post count', async () => {
    render(<ProfileOverview />)

    await waitFor(() => expect(screen.getByText('Likes received')).toBeTruthy())
    expect(screen.getByText(/23 likes across 5 posts/)).toBeTruthy()
  })

  it('links each area to where the work happens', async () => {
    render(<ProfileOverview />)

    await screen.findByText('Learning')
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hrefs).toContain('/learning')
    expect(hrefs).toContain('/learning/challenges')
    expect(hrefs).toContain('/projects')
    expect(hrefs).toContain('/community')
  })

  it('says something honest when nothing has been done', async () => {
    get.mockResolvedValue({ data: overview({
      learning: { enrolled: 0, completed_paths: 0, modules_completed: 0,
        certificates: 0, quizzes_taken: 0, average_score: null, quizzes_available: 76 },
      community: { posts: 0, comments: 0, likes_received: 0, followers: 0, following: 0 },
    }) })
    render(<ProfileOverview />)

    await waitFor(() => expect(screen.getByText(/nothing posted yet/i)).toBeTruthy())
    expect(screen.getByText('no scores yet')).toBeTruthy()
  })

  it('says so when it cannot load rather than showing empty cards', async () => {
    get.mockRejectedValue(new Error('nope'))
    render(<ProfileOverview />)

    await waitFor(() => expect(screen.getByText(/could not load your overview/i)).toBeTruthy())
  })
})

describe('when the page already has the overview', () => {
  it('uses it instead of asking again', async () => {
    // Both profile pages load the overview for their headline row. Fetching
    // it a second time here was two requests for one answer.
    render(<ProfileOverview overview={overview() as any} />)

    await screen.findByText('Learning')
    expect(get).not.toHaveBeenCalled()
    expect(screen.getByText('2 / 4')).toBeTruthy()
  })

  it('shows the loading state while the page is still fetching', () => {
    const { container } = render(<ProfileOverview overview={null} />)

    expect(get).not.toHaveBeenCalled()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('says so when the page\'s request failed, rather than pulsing forever', () => {
    // Both pages swallow a failed overview into null. Without being told the
    // difference, the panel cannot tell "still loading" from "gave up", and
    // shows four grey boxes that never resolve.
    const { container } = render(<ProfileOverview overview={null} overviewFailed />)

    expect(screen.getByText(/could not load your overview/i)).toBeTruthy()
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0)
  })

  it('still says "this" for somebody else when the page\'s request failed', () => {
    render(<ProfileOverview userId="abc-123" overview={null} overviewFailed />)

    expect(screen.getByText(/could not load this overview/i)).toBeTruthy()
  })
})

describe('the headline row', () => {
  it('shows the six figures from the same source', async () => {
    render(<ProfileHeadline overview={overview() as any} />)

    expect(screen.getByText('Followers')).toBeTruthy()
    expect(screen.getByText('Paths done')).toBeTruthy()
    expect(screen.getByText('Solved')).toBeTruthy()
    expect(screen.getByText('Certificates')).toBeTruthy()
    // Certificates: 2, from the certificates table rather than a counter that
    // read 0 on production.
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('counts owned and joined projects together', async () => {
    render(<ProfileHeadline overview={overview() as any} />)

    expect(screen.getByText('Projects')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('shows placeholders rather than zeroes while loading', () => {
    const { container } = render(<ProfileHeadline overview={null} />)

    expect(container.querySelectorAll('.animate-pulse').length).toBe(6)
    expect(screen.queryByText('0')).toBeNull()
  })
})

describe('viewing somebody else', () => {
  it('asks for that user rather than your own overview', async () => {
    render(<ProfileOverview userId="abc-123" />)

    await waitFor(() => expect(get).toHaveBeenCalledWith('/auth/user/abc-123/overview/'))
  })

  it('shows no marks, because they are not a viewer\'s business', async () => {
    // The public endpoint omits them; the component must not then render
    // "undefined" or a misleading zero.
    const { learning, ...rest } = overview()
    const { quizzes_taken, average_score, ...publicLearning } = learning as any
    get.mockResolvedValue({ data: { ...rest, learning: publicLearning } })

    render(<ProfileOverview userId="abc-123" />)

    await waitFor(() => expect(screen.getByText('Paths enrolled')).toBeTruthy())
    expect(screen.queryByText('Quizzes taken')).toBeNull()
    expect(screen.queryByText(/average/)).toBeNull()
    expect(screen.queryByText('undefined')).toBeNull()
  })

  it('still shows what a profile is for', async () => {
    const { learning, ...rest } = overview()
    const { quizzes_taken, average_score, ...publicLearning } = learning as any
    get.mockResolvedValue({ data: { ...rest, learning: publicLearning } })

    render(<ProfileOverview userId="abc-123" />)

    await waitFor(() => expect(screen.getByText('Paths completed')).toBeTruthy())
    expect(screen.getByText('Coding challenges')).toBeTruthy()
    expect(screen.getByText('Projects')).toBeTruthy()
    expect(screen.getByText('Community')).toBeTruthy()
  })

  it('refetches when the profile being viewed changes', async () => {
    const { rerender } = render(<ProfileOverview userId="abc-123" />)
    await waitFor(() => expect(get).toHaveBeenCalledWith('/auth/user/abc-123/overview/'))

    rerender(<ProfileOverview userId="def-456" />)

    await waitFor(() => expect(get).toHaveBeenCalledWith('/auth/user/def-456/overview/'))
  })

  it('says "this" rather than "your" when it cannot load', async () => {
    get.mockRejectedValue(new Error('nope'))
    render(<ProfileOverview userId="abc-123" />)

    await waitFor(() => expect(screen.getByText(/could not load this overview/i)).toBeTruthy())
  })
})
