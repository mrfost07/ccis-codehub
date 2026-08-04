import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Reactions, and task events as channel messages.
 *
 * The reaction bug was invisible in the API: the row was written, the endpoint
 * returned 200, and the pill never appeared — because the component applied
 * nothing and waited for a broadcast. A backend test cannot catch that.
 */

const getProjectWorkspace = vi.fn()
const getChannelMessages = vi.fn()
const reactToMessage = vi.fn()
const markChannelRead = vi.fn()
const getTaskChannel = vi.fn()
const getThread = vi.fn()

vi.mock('../services/api', () => ({
  projectsAPI: {
    getProjectWorkspace: (...a: any[]) => getProjectWorkspace(...a),
    getChannelMessages: (...a: any[]) => getChannelMessages(...a),
    reactToMessage: (...a: any[]) => reactToMessage(...a),
    markChannelRead: (...a: any[]) => markChannelRead(...a),
    getTaskChannel: (...a: any[]) => getTaskChannel(...a),
    getThread: (...a: any[]) => getThread(...a),
    postChannelMessage: vi.fn(),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me', username: 'me' } }),
}))

vi.mock('./ProfileAvatar', () => ({ default: () => null }))

/** The socket never opens here, which is the state the reaction bug lived in. */
class DeadSocket {
  onopen: any = null
  onmessage: any = null
  onclose: any = null
  close() {}
}

const WORKSPACE = {
  project: { slug: 'p', name: 'Proj' },
  channels: [{ id: 'room-1', name: 'proj', kind: 'project', unread_count: 0 }],
  tasks: [
    { id: 't1', title: 'Wire the API', status: 'in_progress', channel_id: 'room-2', unread_count: 3 },
  ],
}

function message(overrides: Record<string, any> = {}) {
  return {
    id: 'm1',
    content: 'hello',
    sender_info: { id: 'them', username: 'them' },
    thread_root: null,
    reply_count: 0,
    is_own_message: false,
    created_at: '2026-08-05T02:00:00Z',
    ...overrides,
  }
}

afterEach(cleanup)
beforeEach(() => {
  // jsdom does not implement it, and the message list scrolls to the bottom on
  // every load.
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('WebSocket', DeadSocket as any)
  ;[getProjectWorkspace, getChannelMessages, reactToMessage, markChannelRead,
    getTaskChannel, getThread].forEach(m => m.mockReset())
  getProjectWorkspace.mockResolvedValue({ data: WORKSPACE })
  getChannelMessages.mockResolvedValue({ data: [message()] })
  markChannelRead.mockResolvedValue({ data: {} })
  getThread.mockResolvedValue({ data: [] })
})

async function show(props: Record<string, any> = {}) {
  const { default: ProjectWorkspace } = await import('./ProjectWorkspace')
  const view = render(<ProjectWorkspace slug="p" {...props} />)
  await waitFor(() => expect(screen.queryByText('hello')).not.toBeNull())
  return view
}

describe('reacting to a message', () => {
  it('shows the reaction without waiting for a broadcast', async () => {
    // The socket above never opens. Before this the click wrote a row and
    // changed nothing on screen.
    reactToMessage.mockResolvedValue({
      data: {
        action: 'added',
        reaction: '🔥',
        message: message({
          reactions_summary: {
            '🔥': { count: 1, reacted_by_me: true, users: [{ id: 'me', username: 'me' }] },
          },
        }),
      },
    })

    const user = userEvent.setup()
    await show()
    await user.click(screen.getByRole('button', { name: 'React 🔥' }))

    await waitFor(() => expect(screen.getByText('1')).toBeTruthy())
    expect(reactToMessage).toHaveBeenCalledWith('m1', '🔥')
  })

  it('marks a pill as mine from the reactor list, not the flag', async () => {
    // reacted_by_me is computed for whoever triggered the change and the same
    // payload is broadcast to the whole channel, so trusting it lights up a pill
    // for people who never reacted.
    getChannelMessages.mockResolvedValue({
      data: [message({
        reactions_summary: {
          '👍': { count: 1, reacted_by_me: true, users: [{ id: 'someone-else', username: 'x' }] },
        },
      })],
    })

    await show()

    const pill = screen.getByTitle('x')
    expect(pill.className).not.toContain('border-purple-400')
  })

  it('marks a pill as mine when I am in the reactor list', async () => {
    getChannelMessages.mockResolvedValue({
      data: [message({
        reactions_summary: {
          '👍': { count: 1, reacted_by_me: false, users: [{ id: 'me', username: 'me' }] },
        },
      })],
    })

    await show()

    expect(screen.getByTitle('me').className).toContain('border-purple-400')
  })
})

describe('task events in the channel', () => {
  it('renders an event as an event, not as something someone typed', async () => {
    getChannelMessages.mockResolvedValue({
      data: [
        message(),
        message({
          id: 'm2',
          event_type: 'task_status',
          content: 'moved this from To Do to In Progress',
          sender_info: { id: 'them', username: 'lead' },
        }),
      ],
    })

    await show()

    expect(screen.getByText(/moved this from To Do to In Progress/)).toBeTruthy()
    // No quick-reaction row on an event: it is a record, not a remark.
    expect(screen.queryAllByRole('button', { name: 'React 🔥' })).toHaveLength(1)
  })

  it('lets an event be threaded, which is why it lives in the channel', async () => {
    getChannelMessages.mockResolvedValue({
      data: [message({
        id: 'm2',
        event_type: 'task_created',
        content: 'created this task',
      })],
    })

    const user = userEvent.setup()
    const { default: ProjectWorkspace } = await import('./ProjectWorkspace')
    render(<ProjectWorkspace slug="p" />)
    await waitFor(() => expect(screen.queryByText(/created this task/)).not.toBeNull())

    await user.click(screen.getByRole('button', { name: /reply in thread/i }))

    expect(getThread).toHaveBeenCalledWith('m2')
  })
})

describe('the tracker', () => {
  it('opens a task channel instead of just listing statuses', async () => {
    getTaskChannel.mockResolvedValue({ data: { id: 'room-2' } })

    const user = userEvent.setup()
    await show()
    await user.click(screen.getByRole('button', { name: /project tracker/i }))
    // Disambiguated by the status, which only the tracker row carries — the
    // sidebar lists the same task by title alone.
    await user.click(screen.getByRole('button', { name: /Wire the API.*in progress/i }))

    await waitFor(() => expect(getTaskChannel).toHaveBeenCalledWith('t1'))
  })
})

describe('deep-linking from the board', () => {
  it('opens the asked-for task rather than the project channel', async () => {
    getTaskChannel.mockResolvedValue({ data: { id: 'room-2' } })

    const { default: ProjectWorkspace } = await import('./ProjectWorkspace')
    render(<ProjectWorkspace slug="p" focusTaskId="t1" />)

    await waitFor(() => expect(getTaskChannel).toHaveBeenCalledWith('t1'))
    // The project channel is not opened first: that would show the wrong room
    // and then replace it.
    expect(getChannelMessages.mock.calls.map(c => c[0])).not.toContain('room-1')
  })
})
