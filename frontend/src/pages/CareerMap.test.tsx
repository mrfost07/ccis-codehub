import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The tree's behaviour, not its looks.
 *
 * What is easy to get wrong here is the disclosure state: a first screen that
 * dumps every role at once, a "Collapse all" that leaves children visible, or a
 * search whose matches stay hidden inside collapsed branches — all of which look
 * fine in a screenshot of the default state.
 */

const getCareerMap = vi.fn()

vi.mock('../services/api', () => ({
  learningAPI: { getCareerMap: () => getCareerMap() },
}))

vi.mock('../components/Navbar', () => ({ default: () => null }))

const MAP = {
  data: {
    programs: [
      {
        key: 'bscs',
        label: 'BS Computer Science',
        role_count: 2,
        with_path: 1,
        categories: [
          {
            name: 'Software Engineering',
            roles: [
              {
                id: 'r1', slug: 'be', name: 'Backend Engineer',
                summary: 'Builds APIs.', core_skills: ['Python'], demand: 'high',
                path: { id: 'p1', name: 'Backend Path', slug: 'backend', total_modules: 5 },
              },
            ],
          },
          {
            name: 'Data and AI',
            roles: [
              {
                id: 'r2', slug: 'ds', name: 'Data Scientist',
                summary: 'Models data.', core_skills: ['Statistics'], demand: 'high',
                path: null,
              },
            ],
          },
        ],
      },
    ],
  },
}

afterEach(cleanup)
beforeEach(() => {
  getCareerMap.mockReset()
  getCareerMap.mockResolvedValue(MAP)
})

async function show() {
  const { default: CareerMap } = await import('./CareerMap')
  const view = render(<MemoryRouter><CareerMap /></MemoryRouter>)
  await waitFor(() => expect(screen.queryByText('BS Computer Science')).not.toBeNull())
  return view
}

describe('CareerMap tree', () => {
  it('opens programs but not categories, so the first screen is not 33 cards', async () => {
    await show()

    // Program and its fields are visible…
    expect(screen.getByText('BS Computer Science')).toBeTruthy()
    expect(screen.getByText('Software Engineering')).toBeTruthy()
    // …but the roles underneath are not, until asked for.
    expect(screen.queryByText('Backend Engineer')).toBeNull()
  })

  it('reveals a category\'s roles when its toggle is used', async () => {
    const user = userEvent.setup()
    await show()

    await user.click(screen.getByRole('button', { name: /expand software engineering/i }))

    expect(screen.getByText('Backend Engineer')).toBeTruthy()
    // The other category stays shut: expanding one branch must not open its
    // siblings.
    expect(screen.queryByText('Data Scientist')).toBeNull()
  })

  it('collapsing a program hides everything under it', async () => {
    const user = userEvent.setup()
    await show()

    await user.click(screen.getByRole('button', { name: /collapse bs computer science/i }))

    expect(screen.queryByText('Software Engineering')).toBeNull()
    expect(screen.queryByText('Backend Engineer')).toBeNull()
  })

  it('Expand all reaches the leaves, Collapse all reaches the roots', async () => {
    const user = userEvent.setup()
    await show()

    await user.click(screen.getByRole('button', { name: /expand all/i }))
    expect(screen.getByText('Backend Engineer')).toBeTruthy()
    expect(screen.getByText('Data Scientist')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /collapse all/i }))
    expect(screen.queryByText('Software Engineering')).toBeNull()
    expect(screen.getByText('BS Computer Science')).toBeTruthy()
  })

  it('a search shows its matches even from a fully collapsed tree', async () => {
    const user = userEvent.setup()
    await show()

    await user.click(screen.getByRole('button', { name: /collapse all/i }))
    await user.type(screen.getByPlaceholderText(/search roles or skills/i), 'backend')

    // A search that leaves its matches hidden inside collapsed branches is worse
    // than no search at all.
    expect(screen.getByText('Backend Engineer')).toBeTruthy()
    expect(screen.queryByText('Data Scientist')).toBeNull()
  })

  it('matches on a skill, not only a role name', async () => {
    const user = userEvent.setup()
    await show()

    await user.type(screen.getByPlaceholderText(/search roles or skills/i), 'statistics')

    expect(screen.getByText('Data Scientist')).toBeTruthy()
    expect(screen.queryByText('Backend Engineer')).toBeNull()
  })

  it('distinguishes a role with a path from one without', async () => {
    const user = userEvent.setup()
    await show()
    await user.click(screen.getByRole('button', { name: /expand all/i }))

    expect(screen.getByText(/start the path/i)).toBeTruthy()
    // Shown rather than hidden: hiding unseeded roles would tell a student
    // nothing about where their course leads.
    expect(screen.getByText(/path coming soon/i)).toBeTruthy()
  })

  it('surfaces a load failure instead of an empty tree', async () => {
    getCareerMap.mockRejectedValue(new Error('network'))
    const { default: CareerMap } = await import('./CareerMap')
    render(<MemoryRouter><CareerMap /></MemoryRouter>)

    await waitFor(() =>
      expect(screen.queryByText(/career map unavailable/i)).not.toBeNull())
  })
})
