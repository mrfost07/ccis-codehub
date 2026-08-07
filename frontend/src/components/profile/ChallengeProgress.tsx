import { useEffect, useMemo, useRef, useState } from 'react'
import { Terminal } from 'lucide-react'

import api from '../../services/api'

/**
 * Coding progress on the profile: solved counts per difficulty, a year of daily
 * activity, and the last few solves.
 *
 * The heatmap is built from a sparse list — the API sends only days with
 * something on them, because a year is 365 entries and most are empty for most
 * students. The grid here is the full year regardless, so an empty stretch
 * reads as an empty stretch rather than silently collapsing.
 *
 * A year is 53 columns, which is wider than a phone whatever the cell size. So
 * it scrolls, and it starts scrolled to today — the right-hand end is the part
 * anyone actually wants, and a grid that opens on last August looks empty.
 *
 * With a `userId` it shows somebody else's, for their public profile. Same
 * panel either way — what changes is only the copy that addresses the reader,
 * because "your first solve shows up here" is wrong when the work is not
 * theirs to do.
 */

interface Progress {
  solved: { easy: number; medium: number; hard: number; total: number }
  available: { easy: number; medium: number; hard: number; total: number }
  submissions: { total: number; accepted: number; acceptance_rate: number }
  points: number
  streak: { current: number; longest: number }
  activity: Array<{ date: string; count: number; solved: number }>
  recent: Array<{
    slug: string; title: string; difficulty: string
    language: string; points: number; solved_at: string
  }>
  window_days: number
  today: string
}

const LEVELS = [
  { key: 'easy' as const, label: 'Easy', ring: 'stroke-green-400', text: 'text-green-400' },
  { key: 'medium' as const, label: 'Medium', ring: 'stroke-amber-400', text: 'text-amber-400' },
  { key: 'hard' as const, label: 'Hard', ring: 'stroke-red-400', text: 'text-red-400' },
]

const DIFFICULTY_DOT: Record<string, string> = {
  easy: 'bg-green-400', medium: 'bg-amber-400', hard: 'bg-red-400',
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Local-date ISO string, so the grid does not shift by a day in some zones. */
function isoDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function shade(count: number) {
  if (count === 0) return 'bg-neutral-800'
  if (count < 3) return 'bg-purple-900'
  if (count < 6) return 'bg-purple-700'
  if (count < 10) return 'bg-purple-500'
  return 'bg-purple-400'
}

function Ring({ solved, total, className }: {
  solved: number; total: number; className: string
}) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const share = total > 0 ? Math.min(solved / total, 1) : 0

  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90 sm:h-16 sm:w-16">
      <circle cx="32" cy="32" r={radius} fill="none"
        className="stroke-white/5" strokeWidth="5" />
      <circle
        cx="32" cy="32" r={radius} fill="none" strokeWidth="5"
        strokeLinecap="round" className={className}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - share)}
      />
    </svg>
  )
}

export default function ChallengeProgress({ userId }: { userId?: string } = {}) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [failed, setFailed] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const mine = !userId

  useEffect(() => {
    let cancelled = false
    setProgress(null)
    setFailed(false)
    api.get('/learning/challenges/progress/',
      userId ? { params: { user: userId } } : undefined)
      .then(({ data }) => { if (!cancelled) setProgress(data) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [userId])

  // The full year as weeks of seven days, with counts filled in from the
  // sparse response.
  const weeks = useMemo(() => {
    if (!progress) return []
    const counts = new Map(progress.activity.map(a => [a.date, a]))
    const end = new Date(`${progress.today}T00:00:00`)
    const start = new Date(end)
    start.setDate(start.getDate() - (progress.window_days - 1))
    // Begin on the Sunday on or before the start, so columns are whole weeks.
    start.setDate(start.getDate() - start.getDay())

    const built: Array<Array<{ date: string; count: number; solved: number; future: boolean }>> = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const week: Array<{ date: string; count: number; solved: number; future: boolean }> = []
      for (let day = 0; day < 7; day++) {
        const date = isoDate(cursor)
        const found = counts.get(date)
        week.push({
          date,
          count: found?.count ?? 0,
          solved: found?.solved ?? 0,
          future: cursor > end,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
      built.push(week)
    }
    return built
  }, [progress])

  const monthLabels = useMemo(() => {
    const labels: Array<{ index: number; label: string }> = []
    let previous = -1
    weeks.forEach((week, index) => {
      const month = new Date(`${week[0].date}T00:00:00`).getMonth()
      if (month !== previous) {
        labels.push({ index, label: MONTHS[month] })
        previous = month
      }
    })
    return labels
  }, [weeks])

  // Open on today. On a phone the grid is several screens wide, and the end is
  // the only part worth landing on.
  //
  // Setting scrollLeft once is not enough: the grid keeps growing after the
  // effect runs — web fonts land and the month labels get wider — so a single
  // pin lands short of the end by however much it grew afterwards. Measured at
  // 79px short on production. So it re-pins while the content is still
  // settling, and stops the moment the reader scrolls it themselves.
  useEffect(() => {
    const element = scroller.current
    if (!element || weeks.length === 0) return

    let readerHasScrolled = false
    const pin = () => { if (!readerHasScrolled) element.scrollLeft = element.scrollWidth }
    const noteScroll = () => {
      const distanceFromEnd = element.scrollWidth - element.clientWidth - element.scrollLeft
      if (distanceFromEnd > 2) readerHasScrolled = true
    }

    pin()
    element.addEventListener('scroll', noteScroll, { passive: true })
    // jsdom has no ResizeObserver; the pin is a no-op there anyway.
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(pin)
    if (observer && element.firstElementChild) observer.observe(element.firstElementChild)

    return () => {
      element.removeEventListener('scroll', noteScroll)
      observer?.disconnect()
    }
  }, [weeks.length])

  if (failed) {
    return (
      <section className="rounded-3xl bg-neutral-900/70 p-5 ring-1 ring-white/5">
        <p className="text-sm text-neutral-500">
          Could not load {mine ? 'your' : 'this'} coding progress.
        </p>
      </section>
    )
  }

  if (!progress) {
    return (
      <section className="rounded-3xl bg-neutral-900/70 p-5 ring-1 ring-white/5">
        <div className="h-48 animate-pulse rounded-2xl bg-neutral-800/40" />
      </section>
    )
  }

  const activeDays = progress.activity.length
  const totalSubmissionsThisYear = progress.activity.reduce((n, a) => n + a.count, 0)

  return (
    <section className="relative overflow-hidden rounded-3xl bg-neutral-900/70 p-4
      ring-1 ring-white/5 sm:p-5">
      {/* A single soft wash rather than another border — the card already sits
          inside a bordered page section. */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40
        rounded-full bg-emerald-500 opacity-20 blur-3xl" />

      <header className="relative flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex items-center gap-2.5">
          <span className="text-neutral-400"><Terminal className="h-4 w-4" /></span>
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Coding activity
            </h2>
            <p className="mt-1 text-sm tabular-nums text-neutral-300">
              {progress.solved.total} of {progress.available.total} solved
            </p>
          </div>
        </div>

        <div className="flex items-end gap-6 sm:gap-8">
          <div>
            <p className={`text-2xl font-semibold tracking-tight tabular-nums ${
              progress.streak.current > 0 ? 'text-amber-300' : 'text-white'}`}>
              {progress.streak.current}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-400">day streak</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-white">
              {progress.submissions.acceptance_rate}%
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-400">accepted</p>
          </div>
        </div>
      </header>

      {/* Per difficulty. Unframed — a ring is already a shape; putting it in a
          box draws a second one around it. */}
      <div className="relative mt-5 grid grid-cols-3 gap-2">
        {LEVELS.map(level => {
          const solved = progress.solved[level.key]
          const total = progress.available[level.key]
          return (
            <div key={level.key} className="flex flex-col items-center gap-1">
              <div className="relative">
                <Ring solved={solved} total={total} className={level.ring} />
                <span className="absolute inset-0 flex items-center justify-center
                  text-sm font-semibold tabular-nums text-white">
                  {solved}
                </span>
              </div>
              <p className={`text-[11px] font-medium ${level.text}`}>{level.label}</p>
              <p className="text-[10px] tabular-nums text-neutral-500">of {total}</p>
            </div>
          )
        })}
      </div>

      {/* A year of activity */}
      <div className="relative mt-6">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[11px] text-neutral-400">
            <span className="font-semibold tabular-nums text-white">{totalSubmissionsThisYear}</span>
            {' '}submission{totalSubmissionsThisYear === 1 ? '' : 's'} on{' '}
            <span className="font-semibold tabular-nums text-white">{activeDays}</span>
            {' '}day{activeDays === 1 ? '' : 's'} in the past year
          </p>
          <p className="text-[11px] tabular-nums text-neutral-500">
            longest streak {progress.streak.longest}
          </p>
        </div>

        {/* Bleeds to the card edge on a phone so the grid does not look boxed
            in, and scrolls from there. */}
        <div ref={scroller}
          className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0
            [--cell:10px] [--gap:3px] sm:[--cell:11px]">
          <div className="inline-block min-w-full">
            <div className="flex gap-[var(--gap)] pl-0 text-[10px] text-neutral-500 sm:pl-8">
              {weeks.map((_, index) => {
                const label = monthLabels.find(m => m.index === index)
                return (
                  <span key={index} className="w-[var(--cell)] shrink-0">
                    {label ? label.label : ''}
                  </span>
                )
              })}
            </div>

            <div className="flex gap-[var(--gap)]">
              {/* Dropped on a phone — the labels cost a quarter of the width to
                  say what the shape already says. */}
              <div className="hidden w-8 shrink-0 flex-col gap-[var(--gap)] pr-1
                text-right text-[10px] text-neutral-500 sm:flex">
                {DAY_LABELS.map((label, index) => (
                  <span key={index} className="h-[var(--cell)] leading-[var(--cell)]">
                    {label}
                  </span>
                ))}
              </div>

              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex shrink-0 flex-col gap-[var(--gap)]">
                  {week.map(day => (
                    <span
                      key={day.date}
                      data-testid="heatmap-day"
                      data-date={day.date}
                      data-count={day.count}
                      title={day.count === 0
                        ? `No submissions on ${day.date}`
                        : `${day.count} submission${day.count === 1 ? '' : 's'}, `
                          + `${day.solved} solved on ${day.date}`}
                      className={`h-[var(--cell)] w-[var(--cell)] rounded-[2px] ${
                        day.future ? 'bg-transparent' : shade(day.count)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-neutral-500">
          <span>Less</span>
          {[0, 2, 5, 9, 12].map(n => (
            <span key={n} className={`h-[10px] w-[10px] rounded-[2px] ${shade(n)}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Recently solved */}
      <div className="relative mt-6">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Recently solved
        </h3>
        {progress.recent.length === 0 ? (
          <p className="rounded-2xl bg-white/[0.02] px-4 py-6 text-center text-sm text-neutral-500">
            {mine
              ? 'Nothing solved yet. Pick a challenge and your first solve shows up here.'
              : 'Nothing solved yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-white/[0.02]">
            {progress.recent.map(item => (
              <li key={item.slug} className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4">
                <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  DIFFICULTY_DOT[item.difficulty] ?? 'bg-neutral-500'}`} />
                <a href={`/learning/challenges/${item.slug}`}
                  className="min-w-0 flex-1 truncate text-sm text-white
                    transition-colors hover:text-purple-300">
                  {item.title}
                </a>
                <span className="hidden shrink-0 text-[10px] font-medium uppercase
                  tracking-wide text-neutral-500 sm:inline">
                  {item.difficulty}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
                  {new Date(item.solved_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
