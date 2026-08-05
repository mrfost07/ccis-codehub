import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The chat's shape and its transport.
 *
 * Two things here are easy to break without noticing. The layout: a horizontally
 * scrolling tab strip hid every room past the second one, and the panel was a
 * 384px column. And the transport: reads used to be a 3s refetch of the whole
 * room per open client, so a busy room cost more the more people read it.
 */

const apiGet = vi.fn()
const apiPost = vi.fn()

vi.mock('../services/api', () => ({
  default: {
    get: (...args: any[]) => apiGet(...args),
    post: (...args: any[]) => apiPost(...args),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me', username: 'me' } }),
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('./Reactors', () => ({ default: () => null }))

const ROOMS = [
  { id: 'r1', name: 'Global', room_type: 'GLOBAL', description: 'Everyone', icon: '', member_count: 120 },
  { id: 'r2', name: 'Computer Science', room_type: 'CS', description: 'BSCS', icon: '', member_count: 40 },
  { id: 'r3', name: 'Information Technology', room_type: 'IT', description: 'BSIT', icon: '', member_count: 55 },
]

function chatMessage(overrides: Record<string, any> = {}) {
  return {
    id: 'm1', room: 'r1', sender: 'them',
    sender_info: { id: 'them', username: 'them', nickname: null, display_name: 'Them' },
    content: 'hello there',
    reply_to: null, reply_to_info: null,
    is_bumped: false, bump_count: 0, is_deleted: false, deleted_for_everyone: false,
    is_own_message: false, is_deleted_for_me: false,
    reactions_summary: {}, created_at: '2026-08-05T02:00:00Z',
    ...overrides,
  }
}

/** Captures what was constructed so the transport can be asserted on. */
const sockets: any[] = []
class FakeSocket {
  onopen: any = null
  onmessage: any = null
  onclose: any = null
  url: string
  protocols: any
  constructor(url: string, protocols?: any) {
    this.url = url
    this.protocols = protocols
    sockets.push(this)
  }
  close() {}
}

afterEach(cleanup)
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  sockets.length = 0
  localStorage.clear()
  sessionStorage.setItem('token', 'jwt-token')
  vi.stubGlobal('WebSocket', FakeSocket as any)
  apiGet.mockReset()
  apiPost.mockReset()
  apiGet.mockImplementation((url: string) => {
    if (url === '/community/chat/rooms/') return Promise.resolve({ data: ROOMS })
    if (url.includes('/messages/')) {
      return Promise.resolve({ data: { results: [chatMessage()], has_more: false } })
    }
    if (url.includes('nickname')) return Promise.resolve({ data: { nickname: '' } })
    return Promise.resolve({ data: {} })
  })
  apiPost.mockResolvedValue({ data: {} })
})

async function showPage() {
  const { default: CommunityChat } = await import('./CommunityChat')
  const view = render(<CommunityChat variant="page" />)
  await waitFor(() => expect(screen.queryByText('Computer Science')).not.toBeNull())
  return view
}

describe('the chat lists channels down the side', () => {
  it('shows every channel at once, not behind a horizontal swipe', async () => {
    await showPage()

    // All three reachable without scrolling a tab strip.
    expect(screen.getByRole('button', { name: /Global/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Computer Science/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Information Technology/ })).toBeTruthy()
  })

  it('filters the list by search', async () => {
    const user = userEvent.setup()
    await showPage()

    await user.type(screen.getByLabelText(/search channels/i), 'inform')

    expect(screen.getByRole('button', { name: /Information Technology/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Computer Science/ })).toBeNull()
  })

  it('says so when a search matches nothing, instead of an empty column', async () => {
    const user = userEvent.setup()
    await showPage()

    await user.type(screen.getByLabelText(/search channels/i), 'zzz')

    expect(screen.getByText(/no channels match/i)).toBeTruthy()
  })

  it('opens a channel when its row is used', async () => {
    const user = userEvent.setup()
    await showPage()

    await user.click(screen.getByRole('button', { name: /Information Technology/ }))

    await waitFor(() =>
      expect(apiGet.mock.calls.some(c => String(c[0]).includes('/rooms/r3/messages/'))).toBe(true))
  })

  it('carries a rail and a back control for the phone layout', async () => {
    await showPage()

    // The rail is the section switcher; the back button is how a phone leaves the
    // conversation, since one pane at a time is all that fits.
    expect(screen.getByLabelText(/^channels$/i)).toBeTruthy()
    expect(screen.getByLabelText(/back to channels/i)).toBeTruthy()
  })
})

describe('the chat reads over the socket', () => {
  it('opens one, authenticated by subprotocol rather than a query string', async () => {
    await showPage()

    await waitFor(() => expect(sockets.length).toBeGreaterThan(0))
    expect(sockets[0].url).toContain('/channels/r1/')
    expect(sockets[0].protocols).toEqual(['bearer', 'jwt-token'])
  })

  it('appends a pushed message without refetching the room', async () => {
    await showPage()
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0))

    const before = apiGet.mock.calls.filter(c => String(c[0]).includes('/messages/')).length
    sockets[0].onopen?.()
    sockets[0].onmessage?.({
      data: JSON.stringify({
        event: 'message.created',
        thread_root: null,
        message: chatMessage({ id: 'm2', content: 'pushed straight in' }),
      }),
    })

    await waitFor(() => expect(screen.getByText('pushed straight in')).toBeTruthy())
    const after = apiGet.mock.calls.filter(c => String(c[0]).includes('/messages/')).length
    expect(after).toBe(before)
  })

  it('ignores a duplicate of a message it already has', async () => {
    await showPage()
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0))

    sockets[0].onopen?.()
    sockets[0].onmessage?.({
      data: JSON.stringify({
        event: 'message.created', thread_root: null, message: chatMessage(),
      }),
    })

    await waitFor(() => expect(screen.getAllByText('hello there')).toHaveLength(1))
  })

  it('keeps thread replies out of the channel', async () => {
    await showPage()
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0))

    sockets[0].onopen?.()
    sockets[0].onmessage?.({
      data: JSON.stringify({
        event: 'message.created',
        thread_root: 'm1',
        message: chatMessage({ id: 'm3', content: 'belongs to a thread' }),
      }),
    })

    await waitFor(() => expect(screen.queryByText('belongs to a thread')).toBeNull())
  })

  it('survives a malformed frame', async () => {
    await showPage()
    await waitFor(() => expect(sockets.length).toBeGreaterThan(0))

    sockets[0].onmessage?.({ data: 'not json' })

    expect(screen.getByText('hello there')).toBeTruthy()
  })

  // Generous timeout: stepping fake timers through a capped backoff is slow.
  it('stops reconnecting instead of retrying an expired token forever', async () => {
    // ChannelConsumer refuses by closing BEFORE accept(), which is answered as an
    // HTTP 403 — so the browser reports a failed handshake with code 1006 and the
    // 4401/4403 guard never fires. Observed in production: eight attempts and
    // still climbing. Without a cap every stale tab retries the server forever.
    // Fake timers, so the backoff actually elapses. With real ones the scheduled
    // reconnects never fire inside the test and the assertion passes either way —
    // which is what the first version of this test did.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { default: CommunityChat } = await import('./CommunityChat')
      render(<CommunityChat variant="page" />)
      await vi.waitFor(() => expect(sockets.length).toBeGreaterThan(0))

      // Ten is comfortably past the cap of six and keeps the loop quick. Twenty
      // rounds of a 35s fake-timer advance was slow enough to hit the 5s per-test
      // timeout under full-suite load, while passing when run alone.
      const CLOSES = 10
      for (let i = 0; i < CLOSES; i += 1) {
        sockets.at(-1)?.onclose?.({ code: 1006 })
        // Past the capped 30s backoff, so any scheduled reconnect has run.
        await vi.advanceTimersByTimeAsync(31_000)
      }

      // 1 initial + MAX_SOCKET_ATTEMPTS reconnects, then it lives on the poll.
      expect(sockets.length).toBeLessThanOrEqual(7)
      expect(sockets.length).toBeLessThan(CLOSES)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reads the paged response shape', async () => {
    // The endpoint returns {results, has_more}. Reading response.data as an array
    // would leave the room permanently blank.
    await showPage()
    expect(screen.getByText('hello there')).toBeTruthy()
  })
})
