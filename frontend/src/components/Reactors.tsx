import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ProfileAvatar from './ProfileAvatar'
import { cn, EmptyState, Modal, Spinner } from './ui'

/**
 * "Who reacted" — one component for posts, comments, replies and chat messages.
 *
 * The identities were always recorded (PostLike.user, CommentLike.user,
 * MessageReaction.user); the API just returned counts and dropped them, so every
 * surface could show a number and nothing else.
 *
 * Two ways to supply people, because the two cases genuinely differ:
 *
 *   loadPage  posts and comments. Their feeds do NOT carry likers — like_count is
 *             unbounded, so inlining them would bloat every feed row and invite an
 *             N+1. Fetched on demand from /likers/, which is paginated.
 *   people    chat messages. reactions_summary already ships the full reactor list
 *             per emoji, so fetching again would be a pointless round-trip.
 *
 * Uses ui/Modal, so responsive behaviour — centering, safe-area inset, dvh height
 * cap, staying clear of the mobile bottom nav — is inherited rather than
 * reinvented here (DESIGN_SYSTEM.md §10).
 */

export interface Reactor {
  id: string
  username: string
  first_name?: string | null
  last_name?: string | null
  profile_picture?: string | null
}

/** One page of reactors, matching DRF's PageNumberPagination envelope. */
export interface ReactorPage {
  results: Reactor[]
  next: string | null
}

interface ReactorsProps {
  /** Total reactors. This is what the trigger shows, and it comes from the
   *  parent's own count field so the trigger is correct before anything loads. */
  count: number
  /** Dialog header, e.g. "Liked by" or "Reacted with 👍". */
  title: string
  /** Fetches page `page`, 1-indexed. Mutually exclusive with `people`. */
  loadPage?: (page: number) => Promise<ReactorPage>
  /** Reactors already in hand; skips fetching entirely. */
  people?: Reactor[]
  /** Label next to the count, e.g. "like" → "3 likes". Ignored when `children`. */
  noun?: string
  /** Replaces the default trigger content. */
  children?: React.ReactNode
  /** Show up to three faces before the count. Needs `people`. */
  showFaces?: boolean
  /**
   * Replaces the trigger's default sizing entirely — it does not merge with it.
   *
   * `cn` is a plain string joiner, not tailwind-merge, so two conflicting
   * utilities (`h-10` and `h-auto`) would both land in the attribute and which
   * one wins depends on stylesheet order, not on what the caller asked for.
   * Rather than pretend an override works, passing a className means the caller
   * owns layout. Keep ≥44px of tappable height on mobile per DESIGN_SYSTEM §4.
   */
  className?: string
}

/** Colour, focus and transition only — never sizing, see `className` above. */
const TRIGGER_BEHAVIOUR =
  'inline-flex items-center gap-2 rounded-lg text-neutral-400 transition-colors ' +
  'hover:text-white focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-purple-500'

/** Default when the caller does not supply its own layout. */
const TRIGGER_SIZE = 'h-10 px-2 text-sm sm:h-8'

export function reactorName(person: Reactor) {
  const full = [person.first_name, person.last_name].filter(Boolean).join(' ').trim()
  return full || person.username
}

export default function Reactors({
  count,
  title,
  loadPage,
  people,
  noun = 'like',
  children,
  showFaces = false,
  className = '',
}: ReactorsProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Reactor[]>(people ?? [])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Held in a ref so `fetchPage` and the open-effect below have stable
  // identities. Call sites pass an inline arrow — `loadPage={p => api(id, p)}` —
  // which is a new function on every render. Depending on it directly would
  // re-run the effect each render while the dialog is open and fetch forever.
  const loadRef = useRef(loadPage)
  useEffect(() => {
    loadRef.current = loadPage
  }, [loadPage])

  const fetchPage = useCallback(async (target: number) => {
    const load = loadRef.current
    if (!load) return
    setLoading(true)
    setError(null)
    try {
      const { results, next } = await load(target)
      // Append rather than replace, so "Load more" accumulates.
      setRows(prev => (target === 1 ? results : [...prev, ...results]))
      setHasMore(Boolean(next))
      setPage(target)
    } catch {
      // Deliberately vague: a failed reactor list is not worth surfacing an
      // axios message to a student.
      setError('Could not load reactions. Try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on open, not on mount — this renders once per post in a feed, and
  // eagerly loading every list would be one request per row.
  useEffect(() => {
    if (open && loadRef.current) fetchPage(1)
  }, [open, fetchPage])

  // Keep in step when the inline list changes (a chat reaction added or removed).
  useEffect(() => {
    if (people) setRows(people)
  }, [people])

  if (count <= 0) return null

  const faces = showFaces ? rows.slice(0, 3) : []

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(TRIGGER_BEHAVIOUR, className || TRIGGER_SIZE)}
        aria-label={`See who reacted — ${count} ${count === 1 ? noun : `${noun}s`}`}
      >
        {faces.length > 0 && (
          <span className="flex -space-x-2">
            {faces.map(person => (
              <ProfileAvatar
                key={person.id}
                src={person.profile_picture}
                alt={reactorName(person)}
                fallbackText={reactorName(person)}
                size="xs"
                className="ring-2 ring-neutral-900"
              />
            ))}
          </span>
        )}
        {children ?? (
          <span>
            {count} {count === 1 ? noun : `${noun}s`}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} size="sm">
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : error && rows.length === 0 ? (
          <EmptyState title="Something went wrong" description={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No reactions yet" description="Be the first to react." />
        ) : (
          <ul className="divide-y divide-neutral-800">
            {rows.map(person => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate(`/user/${person.id}`)
                  }}
                  className="flex w-full items-center gap-3 px-1 py-3 text-left
                    transition-colors hover:bg-neutral-800/60
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <ProfileAvatar
                    src={person.profile_picture}
                    alt={reactorName(person)}
                    fallbackText={reactorName(person)}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {reactorName(person)}
                    </span>
                    <span className="block truncate text-xs text-neutral-400">
                      @{person.username}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={() => fetchPage(page + 1)}
            disabled={loading}
            className="mt-3 h-10 w-full rounded-lg border border-neutral-700 text-sm
              text-neutral-300 transition-colors hover:bg-neutral-800
              disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        )}

        {error && rows.length > 0 && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </Modal>
    </>
  )
}
