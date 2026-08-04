import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown, ChevronRight, Hash, LayoutList, Menu, MessageSquare, Send, X,
} from 'lucide-react'

import { projectsAPI } from '../services/api'
import ProfileAvatar from './ProfileAvatar'
import { EmptyState, Spinner, cn } from './ui'
import { dayLabel, isGroupedWith, startsNewDay } from '../lib/messageGrouping'

/**
 * The project's Slack-style workspace: sidebar, conversation, thread pane.
 *
 * Replaces a two-column channel view that was reachable from a tab and did not
 * behave like the thing it was modelled on. The patterns here are taken from
 * Slack's own documentation of its interface:
 *
 *   - a sidebar of collapsible sections rather than a flat list
 *   - unread conversations shown in BOLD, with a count badge
 *   - threads opening in a pane alongside the conversation, not replacing it
 *   - the parent message carrying its reply count as the way into the thread
 *
 * Adapted where a project is not a workspace: the sections are Channels, Tasks
 * (one channel per task, created when first opened) and Tracker, instead of
 * Channels/DMs/Activity/Files.
 *
 * Realtime over a WebSocket per open channel, with a slow poll only as a
 * fallback while the socket is down. The socket is read-only: posting stays on
 * the REST endpoint, which validates, sets the sender and maintains thread
 * counters in a transaction.
 *
 * "Also send to channel" posts the reply as a real second message rather than
 * setting a flag, so no reader of the channel has to know to un-hide certain
 * replies.
 */

/**
 * Fallback poll interval, used only while the socket is not open.
 *
 * Slower than the old 6s because it is now a safety net rather than the
 * transport: a socket that is connecting, reconnecting, or blocked by a proxy
 * should not leave the channel frozen, but it should not be polled hard either.
 */
const FALLBACK_POLL_MS = 15000

interface Sender {
  id: string
  username: string
  first_name?: string | null
  last_name?: string | null
  profile_picture?: string | null
}

interface ReactionSummary {
  count: number
  reacted_by_me: boolean
  users: Array<{ id: string; username: string }>
}

interface Message {
  id: string
  content: string
  sender_info: Sender | null
  thread_root: string | null
  reply_count: number
  is_own_message: boolean
  created_at: string
  reactions_summary?: Record<string, ReactionSummary>
}

/** Slack shows a small set on hover rather than the whole picker. */
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👏']

interface ChannelRow {
  id: string
  name: string
  kind: string
  unread_count: number
}

interface TaskRow {
  id: string
  title: string
  status: string
  channel_id: string | null
  unread_count: number
}

interface Workspace {
  project: { slug: string; name: string }
  channels: ChannelRow[]
  tasks: TaskRow[]
}

type Selection =
  | { kind: 'channel'; id: string; name: string }
  | { kind: 'task'; taskId: string; name: string }
  | { kind: 'tracker' }

function displayName(sender: Sender | null) {
  if (!sender) return 'Unknown'
  const full = [sender.first_name, sender.last_name].filter(Boolean).join(' ').trim()
  return full || sender.username
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function rowsOf(payload: any): Message[] {
  return payload?.results ?? payload ?? []
}

/** A message, grouped under the previous one when it is the same author nearby. */
function MessageBlock({
  message,
  previous,
  onOpenThread,
  onReact,
}: {
  message: Message
  previous?: Message
  onOpenThread?: (m: Message) => void
  onReact?: (m: Message, emoji: string) => void
}) {
  // Shared with the community chat via lib/messageGrouping, so the two surfaces
  // cannot disagree about when a run of messages starts.
  const grouped = isGroupedWith(
    { authorId: message.sender_info?.id, createdAt: message.created_at },
    previous && { authorId: previous.sender_info?.id, createdAt: previous.created_at },
  )

  return (
    <div className={cn('group flex gap-3 px-4', grouped ? 'py-0.5' : 'pt-3 pb-0.5')}>
      <div className="w-9 shrink-0">
        {grouped ? (
          // Slack leaves the gutter empty on grouped messages and reveals the
          // timestamp there on hover, which keeps a run of messages readable.
          <span className="hidden text-[10px] leading-6 text-neutral-500 group-hover:block">
            {timeOf(message.created_at)}
          </span>
        ) : (
          <ProfileAvatar
            src={message.sender_info?.profile_picture}
            alt={displayName(message.sender_info)}
            fallbackText={displayName(message.sender_info)}
            size="sm"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-semibold text-white">
              {displayName(message.sender_info)}
            </span>
            <span className="shrink-0 text-[11px] text-neutral-500">
              {timeOf(message.created_at)}
            </span>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-200">
          {message.content}
        </p>

        {/* Existing reactions, as pills that toggle your own. */}
        {message.reactions_summary && Object.keys(message.reactions_summary).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(message.reactions_summary).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message, emoji)}
                title={data.users.map(u => u.username).join(', ')}
                className={cn(
                  'flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] transition-colors',
                  data.reacted_by_me
                    ? 'border-purple-400 bg-purple-500/25 text-white'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600',
                )}
              >
                <span>{emoji}</span>
                <span className="tabular-nums">{data.count}</span>
              </button>
            ))}
          </div>
        )}

        {onReact && (
          // A short set, revealed on hover on a pointer device and always
          // reachable by tap — Slack shows a handful, not the whole picker.
          <div className="mt-1 flex flex-wrap gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => onReact(message, emoji)}
                aria-label={`React ${emoji}`}
                className="flex h-8 w-8 items-center justify-center rounded-md text-sm
                  transition-colors hover:bg-neutral-800"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {onOpenThread && (message.reply_count > 0 ? (
          // The parent's reply count is the way into a thread.
          <button
            onClick={() => onOpenThread(message)}
            className="mt-1 inline-flex h-10 items-center gap-1.5 rounded-lg px-1.5 text-xs
              font-medium text-purple-400 transition-colors hover:bg-neutral-800 sm:h-7"
          >
            {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
          </button>
        ) : (
          // Hidden until hover on a pointer device, always available by tap.
          <button
            onClick={() => onOpenThread(message)}
            className="mt-1 inline-flex h-10 items-center gap-1.5 rounded-lg px-1.5 text-xs
              text-neutral-500 transition-colors hover:text-purple-400
              sm:h-7 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <MessageSquare className="h-3 w-3" />
            Reply in thread
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageList({
  messages,
  onOpenThread,
  onReact,
  empty,
}: {
  messages: Message[]
  onOpenThread?: (m: Message) => void
  onReact?: (m: Message, emoji: string) => void
  empty: React.ReactNode
}) {
  if (messages.length === 0) return <>{empty}</>

  const output: React.ReactNode[] = []
  messages.forEach((message, index) => {
    const previous = messages[index - 1]
    const asGroupable = (m: Message) => ({
      authorId: m.sender_info?.id, createdAt: m.created_at,
    })
    if (startsNewDay(asGroupable(message), previous && asGroupable(previous))) {
      output.push(
        <div key={`day-${message.id}`} className="flex items-center gap-3 px-4 py-3">
          <span className="h-px flex-1 bg-neutral-800" />
          <span className="rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-400">
            {dayLabel(message.created_at)}
          </span>
          <span className="h-px flex-1 bg-neutral-800" />
        </div>,
      )
    }
    output.push(
      <MessageBlock
        key={message.id}
        message={message}
        // isGroupedWith already refuses to group across a divider, so the
        // previous message can be passed unconditionally.
        previous={previous}
        onOpenThread={onOpenThread}
        onReact={onReact}
      />,
    )
  })
  return <>{output}</>
}

function Composer({
  placeholder,
  onSend,
  busy,
  footer,
}: {
  placeholder: string
  onSend: (content: string) => Promise<void>
  busy: boolean
  footer?: React.ReactNode
}) {
  const [text, setText] = useState('')

  const submit = async () => {
    const content = text.trim()
    if (!content || busy) return
    setText('')
    await onSend(content)
  }

  return (
    <div className="border-t border-neutral-800 p-3">
      <div className="flex items-end gap-2 rounded-xl border border-neutral-700 bg-neutral-800/70 p-2 focus-within:border-purple-500">
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            // Enter sends, Shift+Enter is a newline — what people already expect.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="max-h-32 min-h-[36px] flex-1 resize-y bg-transparent px-1.5 py-1.5 text-sm
            text-white placeholder:text-neutral-500 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={busy || text.trim() === ''}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600
            text-white transition-colors hover:bg-purple-500 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {footer}
    </div>
  )
}

function SidebarSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(value => !value)}
        className="flex w-full items-center gap-1 rounded px-2 py-1 text-[11px] font-bold
          uppercase tracking-wide text-neutral-500 transition-colors hover:text-neutral-300"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label}
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  )
}

function SidebarItem({
  icon,
  label,
  unread,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  unread?: number
  active: boolean
  onClick: () => void
}) {
  const hasUnread = (unread ?? 0) > 0
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors sm:py-1.5',
        active ? 'bg-purple-600/90 text-white' : 'text-neutral-400 hover:bg-neutral-800',
        // Unread is bold, per Slack. Weight rather than colour so it still reads
        // as unread on the selected row.
        hasUnread && !active && 'font-semibold text-white',
      )}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hasUnread && (
        <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {unread}
        </span>
      )}
    </button>
  )
}

function Tracker({ tasks }: { tasks: TaskRow[] }) {
  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { todo: 0, in_progress: 0, review: 0, done: 0 }
    tasks.forEach(task => {
      byStatus[task.status] = (byStatus[task.status] ?? 0) + 1
    })
    return byStatus
  }, [tasks])
  const done = counts.done ?? 0
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100)

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white">Project tracker</h3>
      <p className="mt-1 text-xs text-neutral-500">
        {tasks.length} task{tasks.length === 1 ? '' : 's'} · {percent}% complete
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
        <div className="h-full rounded-full bg-purple-500" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ['todo', 'To do'],
          ['in_progress', 'In progress'],
          ['review', 'Review'],
          ['done', 'Done'],
        ] as const).map(([key, label]) => (
          <div key={key} className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
            <p className="text-xl font-bold text-white">{counts[key] ?? 0}</p>
            <p className="text-xs text-neutral-500">{label}</p>
          </div>
        ))}
      </div>

      {tasks.length > 0 && (
        <ul className="mt-4 divide-y divide-neutral-800 rounded-lg border border-neutral-800">
          {tasks.map(task => (
            <li key={task.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-300">{task.title}</span>
              <span className="shrink-0 rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                {task.status.replace('_', ' ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ProjectWorkspace({ slug }: { slug: string }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  /** Socket is open. Drives the header dot and disables the fallback poll. */
  const [live, setLive] = useState(false)
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false)

  const [thread, setThread] = useState<Message | null>(null)
  const [replies, setReplies] = useState<Message[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  // In a ref so the poll effect depends on nothing that changes per message.
  const roomIdRef = useRef<string | null>(null)

  const loadWorkspace = useCallback(async () => {
    const { data } = await projectsAPI.getProjectWorkspace(slug)
    setWorkspace(data)
    return data as Workspace
  }, [slug])

  const loadMessages = useCallback(async (id: string) => {
    const { data } = await projectsAPI.getChannelMessages(id)
    setMessages(rowsOf(data))
  }, [])

  const openRoom = useCallback(async (id: string) => {
    setRoomId(id)
    roomIdRef.current = id
    setThread(null)
    setReplies([])
    await loadMessages(id)
    // Marking read on open is what makes the sidebar's bold and badge mean
    // something; refresh the sidebar so the badge clears immediately.
    await projectsAPI.markChannelRead(id).catch(() => {})
    loadWorkspace().catch(() => {})
  }, [loadMessages, loadWorkspace])

  // First load: fetch the sidebar and open the project channel.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await loadWorkspace()
        if (cancelled) return
        const first = data.channels[0]
        if (first) {
          setSelection({ kind: 'channel', id: first.id, name: first.name })
          await openRoom(first.id)
        }
      } catch {
        if (!cancelled) setError('Could not load this project’s workspace.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [slug, loadWorkspace, openRoom])

  // Realtime. One socket per open channel, torn down when the selection changes.
  //
  // Read-only by design: posting stays on the REST endpoint, which validates,
  // sets the sender and maintains thread counters in a transaction. The socket
  // only carries what the server decided.
  useEffect(() => {
    if (!roomId) return

    const base = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
    // The JWT travels as a subprotocol, not a query parameter: a query string
    // lands in nginx access logs and Referer headers. The backend has no session
    // cookie to fall back on — REST auth is simplejwt only — so without this the
    // socket is refused and the channel silently falls back to polling.
    //
    // sessionStorage, matching the API client: "sessionStorage is the source of
    // truth" (services/api.ts). localStorage is only read once by AuthContext as
    // a legacy migration, so reading it here found nothing and every socket was
    // refused — the exact silent failure this token is meant to prevent.
    const token = sessionStorage.getItem('token')
    let socket: WebSocket | null = null
    let closed = false
    let retry: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    const connect = () => {
      if (closed) return
      socket = token
        ? new WebSocket(`${base}/channels/${roomId}/`, ['bearer', token])
        : new WebSocket(`${base}/channels/${roomId}/`)

      socket.onopen = () => {
        attempt = 0
        setLive(true)
      }

      socket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.event === 'message.created') {
            if (payload.thread_root) {
              // A thread reply belongs to its thread, not the channel — the same
              // rule the REST list follows. Only fold it in if that thread is open.
              setThread(current => {
                if (current && current.id === payload.thread_root) {
                  setReplies(existing =>
                    existing.some(r => r.id === payload.message.id)
                      ? existing
                      : [...existing, payload.message],
                  )
                }
                return current
              })
            } else {
              setMessages(existing =>
                // Guarded against duplicates: the sender also gets this event
                // after its own POST already appended the row.
                existing.some(m => m.id === payload.message.id)
                  ? existing
                  : [...existing, payload.message],
              )
            }
          } else if (payload.event === 'message.reaction') {
            const updated = payload.message
            setMessages(existing =>
              existing.map(m => (m.id === updated.id ? { ...m, ...updated } : m)),
            )
            setReplies(existing =>
              existing.map(m => (m.id === updated.id ? { ...m, ...updated } : m)),
            )
          }
        } catch {
          // A malformed frame must not take the channel down.
        }
      }

      socket.onclose = event => {
        setLive(false)
        // 4401/4403 are our own auth refusals — retrying cannot help.
        if (closed || event.code === 4401 || event.code === 4403) return
        attempt += 1
        const backoff = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5))
        retry = setTimeout(connect, backoff)
      }
    }

    connect()
    return () => {
      closed = true
      if (retry) clearTimeout(retry)
      socket?.close()
      setLive(false)
    }
  }, [roomId])

  // Fallback poll, and only while the socket is down and the tab is visible.
  // The community chat's original fixed interval ran regardless of both and had
  // to be reworked because it burned mobile battery and data.
  useEffect(() => {
    if (live) return
    const timer = setInterval(() => {
      if (document.hidden || !roomIdRef.current) return
      loadMessages(roomIdRef.current).catch(() => {})
    }, FALLBACK_POLL_MS)
    return () => clearInterval(timer)
  }, [live, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, roomId])

  const selectChannel = async (channel: ChannelRow) => {
    setSelection({ kind: 'channel', id: channel.id, name: channel.name })
    setSidebarOpen(false)
    await openRoom(channel.id)
  }

  const selectTask = async (task: TaskRow) => {
    setSelection({ kind: 'task', taskId: task.id, name: task.title })
    setSidebarOpen(false)
    try {
      // Creates the channel server-side on first open, which is why the sidebar
      // can list tasks without conjuring a channel for every one of them.
      const { data } = await projectsAPI.getTaskChannel(task.id)
      await openRoom(data.id)
    } catch {
      setError('Could not open this task’s channel.')
    }
  }

  const send = async (content: string) => {
    if (!roomId) return
    setSending(true)
    try {
      await projectsAPI.postChannelMessage(roomId, content)
      await loadMessages(roomId)
    } catch {
      setError('Message not sent. Try again.')
    } finally {
      setSending(false)
    }
  }

  const react = async (message: Message, emoji: string) => {
    try {
      await projectsAPI.reactToMessage(message.id, emoji)
      // No local mutation: the server broadcasts the rebuilt summary, so applying
      // it here as well would be a second source of truth for the same counts.
    } catch {
      setError('Could not react. Try again.')
    }
  }

  const openThread = async (root: Message) => {
    setThread(root)
    try {
      const { data } = await projectsAPI.getThread(root.id)
      setReplies(rowsOf(data))
    } catch {
      setReplies([])
    }
  }

  const sendReply = async (content: string) => {
    if (!roomId || !thread) return
    setSending(true)
    try {
      await projectsAPI.postThreadReply(roomId, thread.id, content, alsoSendToChannel)
      const { data } = await projectsAPI.getThread(thread.id)
      setReplies(rowsOf(data))
      // The root's reply count changed, so the conversation behind is stale.
      await loadMessages(roomId)
    } catch {
      setError('Reply not sent. Try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>
  }
  if (error && !workspace) {
    return <EmptyState title="Workspace unavailable" description={error} />
  }

  const headerLabel =
    selection?.kind === 'tracker' ? 'Project tracker'
      : selection?.kind === 'task' ? selection.name
        : selection?.name ?? ''

  const sidebar = (
    <div
      className="flex h-full w-64 max-w-[80vw] shrink-0 flex-col border-r border-neutral-800 bg-neutral-950/60 sm:w-60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-3">
        <h2 className="truncate text-sm font-bold text-white">{workspace?.project.name}</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <SidebarSection label="Channels">
          {workspace?.channels.map(channel => (
            <SidebarItem
              key={channel.id}
              icon={<Hash className="h-4 w-4" />}
              label={channel.name}
              unread={channel.unread_count}
              active={selection?.kind === 'channel' && selection.id === channel.id}
              onClick={() => selectChannel(channel)}
            />
          ))}
        </SidebarSection>

        <SidebarSection label={`Tasks${workspace?.tasks.length ? ` (${workspace.tasks.length})` : ''}`}>
          {workspace?.tasks.length === 0 ? (
            <p className="px-2 py-1 text-xs text-neutral-600">No tasks yet</p>
          ) : (
            workspace?.tasks.map(task => (
              <SidebarItem
                key={task.id}
                icon={<Hash className="h-4 w-4" />}
                label={task.title}
                unread={task.unread_count}
                active={selection?.kind === 'task' && selection.taskId === task.id}
                onClick={() => selectTask(task)}
              />
            ))
          )}
        </SidebarSection>

        <SidebarSection label="Tracker">
          <SidebarItem
            icon={<LayoutList className="h-4 w-4" />}
            label="Project tracker"
            active={selection?.kind === 'tracker'}
            onClick={() => {
              setSelection({ kind: 'tracker' })
              setSidebarOpen(false)
            }}
          />
        </SidebarSection>
      </div>
    </div>
  )

  return (
    <div className="flex h-[70dvh] min-h-[24rem] overflow-hidden rounded-xl border
      border-neutral-800 bg-neutral-900/40 sm:h-[75vh] sm:min-h-[30rem]">
      {/* Desktop: a permanent rail. Mobile: a drawer, because 15rem of sidebar
          on a phone leaves nothing for the conversation. */}
      <div className="hidden lg:flex">{sidebar}</div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open channel list"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
              {selection?.kind !== 'tracker' && <Hash className="h-4 w-4 text-neutral-500" />}
              {headerLabel}
            </h3>
            <p className="flex items-center gap-1.5 truncate text-[11px] text-neutral-500">
              <span
                title={live ? 'Live' : 'Reconnecting — falling back to refresh'}
                className={cn('h-1.5 w-1.5 shrink-0 rounded-full',
                  live ? 'bg-green-400' : 'bg-amber-400')}
              />
              {selection?.kind === 'task'
                ? 'Discussion for this task'
                : selection?.kind === 'tracker'
                  ? 'Status across every task'
                  : 'Everyone who can see this project'}
            </p>
          </div>
        </div>

        {selection?.kind === 'tracker' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Tracker tasks={workspace?.tasks ?? []} />
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              <MessageList
                messages={messages}
                onOpenThread={openThread}
                onReact={react}
                empty={
                  <EmptyState
                    title="No messages yet"
                    description={
                      selection?.kind === 'task'
                        ? 'Start the discussion for this task.'
                        : 'Start the conversation about this project.'
                    }
                  />
                }
              />
              <div ref={bottomRef} />
            </div>
            {error && <p className="px-4 pb-1 text-xs text-red-400">{error}</p>}
            <Composer placeholder={`Message ${headerLabel}`} onSend={send} busy={sending} />
          </>
        )}
      </div>

      {/* Thread pane: alongside the conversation on desktop, full-screen on a
          phone where there is no room for two columns. */}
      {thread && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-neutral-950
            lg:static lg:z-auto lg:w-96 lg:shrink-0 lg:border-l lg:border-neutral-800
            lg:bg-transparent"
          // fixed inset-0 escapes the body padding that reserves room for the
          // mobile dock, so the reply composer would otherwise sit under the home
          // indicator. Zeroed from lg up, where this is a static column and the
          // page owns its own spacing.
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-3">
            <h3 className="text-sm font-bold text-white">Thread</h3>
            <button
              onClick={() => { setThread(null); setReplies([]) }}
              aria-label="Close thread"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 sm:h-8 sm:w-8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {/* The parent, so the thread reads in context. */}
            <MessageBlock message={thread} onReact={react} />
            <div className="mx-4 my-2 border-t border-neutral-800" />
            <MessageList
              messages={replies}
              onReact={react}
              empty={<p className="px-4 py-4 text-xs text-neutral-500">No replies yet.</p>}
            />
          </div>
          <Composer
            placeholder="Reply…"
            onSend={sendReply}
            busy={sending}
            footer={
              <label className="mt-2 flex items-center gap-2 px-1 text-[11px] text-neutral-400">
                <input
                  type="checkbox"
                  checked={alsoSendToChannel}
                  onChange={event => setAlsoSendToChannel(event.target.checked)}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 accent-purple-500"
                />
                Also send to {headerLabel}
              </label>
            }
          />
        </div>
      )}
    </div>
  )
}
