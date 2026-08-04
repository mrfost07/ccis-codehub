import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, X } from 'lucide-react'

import { projectsAPI } from '../services/api'
import ProfileAvatar from './ProfileAvatar'
import { EmptyState, Spinner } from './ui'

/**
 * The project's discussion channel — everything about the project in one place,
 * with Slack-style threads.
 *
 * Separate from the community chat rooms on purpose. Those are four
 * program-wide rooms (CS / IT / IS / GLOBAL); this is scoped to one project and
 * only reachable by people who can see that project. Same tables, different
 * scope — see ChatRoom.scope on the backend.
 *
 * The channel lists root messages only. Replies live inside their thread and are
 * fetched when a thread is opened, so a long argument about one task cannot bury
 * the rest of the channel.
 *
 * Transport is polling, deliberately for now. Channels + Redis are already proven
 * here by live quizzes, and a ChannelConsumer is the next step — but a WebSocket
 * with no UI to exercise it is unverifiable code, so the UI lands first and the
 * socket replaces the poll underneath it.
 */

interface Sender {
  id: string
  username: string
  first_name?: string | null
  last_name?: string | null
  profile_picture?: string | null
}

interface ChannelMessage {
  id: string
  content: string
  sender: string
  sender_info: Sender | null
  thread_root: string | null
  reply_count: number
  last_reply_at: string | null
  is_own_message: boolean
  created_at: string
}

interface Channel {
  id: string
  name: string
  scope: string
  unread_count: number
}

const POLL_MS = 6000

function senderName(message: ChannelMessage) {
  const info = message.sender_info
  if (!info) return 'Unknown'
  const full = [info.first_name, info.last_name].filter(Boolean).join(' ').trim()
  return full || info.username
}

function when(iso: string) {
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function MessageRow({
  message,
  onOpenThread,
}: {
  message: ChannelMessage
  onOpenThread?: (message: ChannelMessage) => void
}) {
  return (
    <div className="flex gap-3 px-1 py-2">
      <ProfileAvatar
        src={message.sender_info?.profile_picture}
        alt={senderName(message)}
        fallbackText={senderName(message)}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-white">
            {senderName(message)}
          </span>
          <span className="shrink-0 text-[11px] text-neutral-500">
            {when(message.created_at)}
          </span>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-neutral-300">
          {message.content}
        </p>
        {onOpenThread && (
          <button
            onClick={() => onOpenThread(message)}
            // h-10 keeps a 40px target on mobile per DESIGN_SYSTEM.md §4.
            className="mt-1 inline-flex h-10 items-center gap-1.5 rounded-lg px-1 text-xs
              text-neutral-400 transition-colors hover:text-purple-400 sm:h-7"
          >
            <MessageSquare className="h-3 w-3" />
            {message.reply_count > 0
              ? `${message.reply_count} ${message.reply_count === 1 ? 'reply' : 'replies'}`
              : 'Reply in thread'}
          </button>
        )}
      </div>
    </div>
  )
}

function Composer({
  placeholder,
  onSend,
  busy,
}: {
  placeholder: string
  onSend: (content: string) => Promise<void>
  busy: boolean
}) {
  const [text, setText] = useState('')

  const submit = async () => {
    const content = text.trim()
    if (!content || busy) return
    setText('')
    // Cleared before awaiting so a slow round trip does not swallow the next
    // keystrokes back into the old value.
    await onSend(content)
  }

  return (
    <div className="flex items-end gap-2 border-t border-neutral-800 p-3">
      <textarea
        value={text}
        onChange={event => setText(event.target.value)}
        onKeyDown={event => {
          // Enter sends, Shift+Enter is a newline — the convention people already
          // have from every other chat.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
        rows={1}
        placeholder={placeholder}
        className="max-h-32 min-h-[44px] flex-1 resize-y rounded-lg border border-neutral-700
          bg-neutral-800 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500
          focus:border-purple-500 focus:outline-none"
      />
      <button
        onClick={submit}
        disabled={busy || text.trim() === ''}
        aria-label="Send message"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg
          bg-purple-600 text-white transition-colors hover:bg-purple-500
          disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function ProjectChannel({ slug }: { slug: string }) {
  const [channel, setChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const [thread, setThread] = useState<ChannelMessage | null>(null)
  const [replies, setReplies] = useState<ChannelMessage[]>([])
  const [threadLoading, setThreadLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  // Held in a ref so the poll effect depends on the channel id alone and is not
  // re-created on every message arriving.
  const channelIdRef = useRef<string | null>(null)

  const rows = (payload: any): ChannelMessage[] => payload?.results ?? payload ?? []

  const loadMessages = useCallback(async (roomId: string) => {
    const { data } = await projectsAPI.getChannelMessages(roomId)
    setMessages(rows(data))
  }, [])

  // Open the channel: resolve it, load messages, mark it read.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await projectsAPI.getProjectChannel(slug)
        if (cancelled) return
        setChannel(data)
        channelIdRef.current = data.id
        await loadMessages(data.id)
        // Marking read on open is what makes an unread badge mean anything.
        await projectsAPI.markChannelRead(data.id).catch(() => {})
      } catch {
        if (!cancelled) setError('Could not open this project’s channel.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, loadMessages])

  // Poll while the tab is visible. Stopping when hidden is why the community
  // chat's original fixed interval had to be reworked — it ran forever and burned
  // mobile battery and data.
  useEffect(() => {
    const tick = () => {
      if (document.hidden || !channelIdRef.current) return
      loadMessages(channelIdRef.current).catch(() => {})
    }
    const timer = setInterval(tick, POLL_MS)
    return () => clearInterval(timer)
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const send = async (content: string) => {
    if (!channel) return
    setSending(true)
    try {
      await projectsAPI.postChannelMessage(channel.id, content)
      await loadMessages(channel.id)
    } catch {
      setError('Message not sent. Try again.')
    } finally {
      setSending(false)
    }
  }

  const openThread = async (root: ChannelMessage) => {
    setThread(root)
    setThreadLoading(true)
    try {
      const { data } = await projectsAPI.getThread(root.id)
      setReplies(rows(data))
    } catch {
      setReplies([])
    } finally {
      setThreadLoading(false)
    }
  }

  const sendReply = async (content: string) => {
    if (!channel || !thread) return
    setSending(true)
    try {
      await projectsAPI.postChannelMessage(channel.id, content, thread.id)
      const { data } = await projectsAPI.getThread(thread.id)
      setReplies(rows(data))
      // The root's reply_count changed, so the channel behind the pane is stale.
      await loadMessages(channel.id)
    } catch {
      setError('Reply not sent. Try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (error && !channel) {
    return <EmptyState title="Channel unavailable" description={error} />
  }

  return (
    // Stacks under lg so the thread pane becomes a full-width panel on a phone
    // rather than a squeezed column.
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="flex min-h-[60vh] flex-col rounded-xl border border-neutral-800 bg-neutral-900/50">
        <div className="border-b border-neutral-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">
            # {channel?.name ?? 'Project channel'}
          </h3>
          <p className="text-xs text-neutral-500">
            Everyone who can see this project can read and post here.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Start the conversation about this project."
            />
          ) : (
            messages.map(message => (
              <MessageRow key={message.id} message={message} onOpenThread={openThread} />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="px-4 pb-1 text-xs text-red-400">{error}</p>}
        <Composer
          placeholder={`Message # ${channel?.name ?? ''}`}
          onSend={send}
          busy={sending}
        />
      </div>

      {thread && (
        <div className="flex min-h-[60vh] flex-col rounded-xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Thread</h3>
            <button
              onClick={() => {
                setThread(null)
                setReplies([])
              }}
              aria-label="Close thread"
              className="flex h-10 w-10 items-center justify-center rounded-lg
                text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white sm:h-8 sm:w-8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {/* The root, so the thread reads in context rather than as orphaned
                replies. */}
            <MessageRow message={thread} />
            <div className="my-2 border-t border-neutral-800" />
            {threadLoading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : replies.length === 0 ? (
              <p className="px-1 py-4 text-xs text-neutral-500">
                No replies yet.
              </p>
            ) : (
              replies.map(reply => <MessageRow key={reply.id} message={reply} />)
            )}
          </div>

          <Composer placeholder="Reply…" onSend={sendReply} busy={sending} />
        </div>
      )}
    </div>
  )
}
