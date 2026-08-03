import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Reactors, { reactorName, type Reactor, type ReactorPage } from './Reactors'

/**
 * The load-once behaviour is the reason these exist.
 *
 * Every call site passes an inline arrow — `loadPage={p => api(id, p)}` — which
 * is a new function on each render. An effect depending on that identity would
 * re-run on every parent render while the dialog is open and fetch in a loop.
 * The component holds it in a ref for exactly that reason, and that is invisible
 * from reading the JSX at the call sites.
 *
 * globals: false in vitest.config.ts also disables Testing Library's automatic
 * cleanup, so it is done explicitly below. Without it, dialogs from earlier tests
 * stay mounted and later queries match the wrong one.
 */

afterEach(cleanup)

const PEOPLE: Reactor[] = [
  { id: 'u1', username: 'ana', first_name: 'Ana', last_name: 'Cruz', profile_picture: null },
  { id: 'u2', username: 'ben', first_name: null, last_name: null, profile_picture: null },
]

function show(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const trigger = () => screen.getByRole('button', { name: /see who reacted/i })

describe('Reactors trigger', () => {
  it('renders nothing when nobody has reacted', () => {
    show(<Reactors count={0} title="Liked by" people={[]} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('pluralises the noun', () => {
    const { unmount } = show(<Reactors count={1} title="Liked by" people={PEOPLE} />)
    expect(screen.getByText('1 like')).toBeTruthy()
    unmount()

    show(<Reactors count={4} title="Liked by" people={PEOPLE} />)
    expect(screen.getByText('4 likes')).toBeTruthy()
  })
})

describe('Reactors list', () => {
  it('lists people supplied inline without fetching anything', async () => {
    const user = userEvent.setup()
    const load = vi.fn()
    show(<Reactors count={2} title="Liked by" people={PEOPLE} loadPage={undefined} />)

    await user.click(trigger())

    expect(screen.getByText('Ana Cruz')).toBeTruthy()
    expect(screen.getByText('@ana')).toBeTruthy()
    expect(load).not.toHaveBeenCalled()
  })

  it('falls back to the username when there is no real name', async () => {
    const user = userEvent.setup()
    show(<Reactors count={2} title="Liked by" people={PEOPLE} />)

    await user.click(trigger())

    // 'ben' has no first or last name, so the display name is the username —
    // never a blank row.
    expect(screen.getAllByText('ben').length).toBeGreaterThan(0)
  })

  it('fetches once on open, and not again when the parent re-renders', async () => {
    const user = userEvent.setup()
    const load = vi.fn(async (_page: number): Promise<ReactorPage> => (
      { results: PEOPLE, next: null }
    ))

    // A fresh arrow each render, exactly as the real call sites do.
    const { rerender } = show(
      <Reactors count={2} title="Liked by" loadPage={page => load(page)} />,
    )

    await user.click(trigger())
    await waitFor(() => expect(screen.queryByText('Ana Cruz')).not.toBeNull())
    expect(load).toHaveBeenCalledTimes(1)

    // Parent re-renders (a like elsewhere in the feed, a poll, anything) and
    // hands over a brand new function identity while the dialog is still open.
    rerender(
      <MemoryRouter>
        <Reactors count={2} title="Liked by" loadPage={page => load(page)} />
      </MemoryRouter>,
    )
    rerender(
      <MemoryRouter>
        <Reactors count={2} title="Liked by" loadPage={page => load(page)} />
      </MemoryRouter>,
    )
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('does not fetch until it is opened', async () => {
    const load = vi.fn(async (_page: number): Promise<ReactorPage> => (
      { results: PEOPLE, next: null }
    ))
    show(<Reactors count={2} title="Liked by" loadPage={page => load(page)} />)

    // This component renders once per row in a feed. Loading eagerly would be
    // one request per post just to show a number that is already in hand.
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(load).not.toHaveBeenCalled()
  })

  it('appends the next page and then hides Load more', async () => {
    const user = userEvent.setup()
    const load = vi.fn(async (page: number): Promise<ReactorPage> =>
      page === 1
        ? { results: [PEOPLE[0]], next: 'http://x/?page=2' }
        : { results: [PEOPLE[1]], next: null },
    )
    show(<Reactors count={2} title="Liked by" loadPage={page => load(page)} />)

    await user.click(trigger())
    await waitFor(() => expect(screen.queryByText('Ana Cruz')).not.toBeNull())

    await user.click(screen.getByRole('button', { name: /load more/i }))

    await waitFor(() => expect(screen.queryByText('@ben')).not.toBeNull())
    // Page 1 must still be there — appended, not replaced.
    expect(screen.queryByText('Ana Cruz')).not.toBeNull()
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('surfaces a failure without leaving a spinner behind', async () => {
    const user = userEvent.setup()
    const load = vi.fn(async (_page: number): Promise<ReactorPage> => {
      throw new Error('network')
    })
    show(<Reactors count={2} title="Liked by" loadPage={page => load(page)} />)

    await user.click(trigger())

    await waitFor(() => expect(screen.queryByText(/could not load reactions/i)).not.toBeNull())
  })
})

describe('reactorName', () => {
  it('prefers the full name, falls back to the username', () => {
    expect(reactorName(PEOPLE[0])).toBe('Ana Cruz')
    expect(reactorName(PEOPLE[1])).toBe('ben')
    expect(reactorName({ id: 'x', username: 'solo', first_name: 'Solo', last_name: null }))
      .toBe('Solo')
  })
})
