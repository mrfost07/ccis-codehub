/**
 * When a message starts a new day, and when it belongs to the run above it.
 *
 * Shared by the project channel and the community chat. Those two render very
 * differently — community chat has nicknames, bumped messages, delete-for-me and
 * quoted replies; the channel has threads and reply counts — so forcing one
 * component onto both would be worse than two. What they genuinely share is this
 * decision, and having it in one place is what keeps the two feeling like the
 * same product.
 *
 * Pure functions over the two fields both message shapes have, rather than over
 * either shape, so neither has to be converted to the other.
 */

/** Consecutive messages from one person inside this window read as one run. */
export const GROUP_WINDOW_MS = 5 * 60 * 1000

export interface Groupable {
  /** Anything stable per author: an id, a username. Null when unknown. */
  authorId: string | null | undefined
  /** ISO timestamp. */
  createdAt: string
}

function midnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * "Today" / "Yesterday" / "12 March" — the day divider's label.
 *
 * Compared by calendar day rather than by elapsed hours: a message at 23:50 and
 * one at 00:10 are eleven hours apart in the same night but belong under
 * different headings, and subtracting timestamps gets that backwards.
 */
export function dayLabel(
  iso: string,
  now: Date = new Date(),
  /**
   * 'short' for narrow surfaces — the floating community chat panel is about
   * 20rem wide and "12 September" wraps in its divider. An option rather than a
   * second implementation: the two differ only in this.
   */
  options: { month?: 'short' | 'long' } = {},
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const days = Math.round((midnight(now) - midnight(date)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days === -1) return 'Tomorrow'  // clock skew between client and server
  return date.toLocaleDateString([], {
    month: options.month ?? 'long',
    day: 'numeric',
    // Only show the year when it is not the current one — "12 March 2024" is
    // useful, "12 March 2026" on today's messages is noise.
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

/**
 * True when `message` opens a new calendar day relative to `previous`.
 *
 * Compares the days themselves rather than the rendered labels: a label is a
 * presentation choice that now takes options, and two different days must not be
 * able to collapse into one divider because they happened to format alike.
 */
export function startsNewDay(
  message: Groupable,
  previous: Groupable | undefined,
  now: Date = new Date(),
): boolean {
  if (!previous) return true

  const current = new Date(message.createdAt)
  const before = new Date(previous.createdAt)
  if (Number.isNaN(current.getTime()) || Number.isNaN(before.getTime())) return false
  return midnight(current) !== midnight(before)
}

/**
 * True when `message` should be drawn without its own avatar and name.
 *
 * Never groups across a day divider, even for the same author within the window:
 * the heading would end up sitting above a message whose name is hidden, and the
 * run would appear to start before the day it is under.
 */
export function isGroupedWith(
  message: Groupable,
  previous: Groupable | undefined,
  options: { windowMs?: number; now?: Date } = {},
): boolean {
  if (!previous) return false

  const { windowMs = GROUP_WINDOW_MS, now = new Date() } = options
  if (startsNewDay(message, previous, now)) return false

  // An unknown author must not group with another unknown author: two different
  // people would silently merge into one run.
  if (!message.authorId || !previous.authorId) return false
  if (message.authorId !== previous.authorId) return false

  const gap = new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime()
  return Number.isFinite(gap) && gap >= 0 && gap < windowMs
}
