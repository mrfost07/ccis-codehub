import { useEffect, useMemo, useState } from 'react'
import { Flame, Target, Trophy } from 'lucide-react'

import api from '../../services/api'

/**
 * Coding progress on the profile: solved counts per difficulty and a year of
 * daily activity.
 *
 * The heatmap is built from a sparse list — the API sends only days with
 * something on them, because a year is 365 entries and most are empty for most
 * students. The grid here is the full year regardless, so an empty stretch
 * reads as an empty stretch rather than silently collapsing.
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
    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
      <circle cx="32" cy="32" r={radius} fill="none"
        className="stroke-neutral-800" strokeWidth="6" />
      <circle
        cx="32" cy="32" r={radius} fill="none" strokeWidth="6"
        strokeLinecap="round" className={className}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - share)}
      />
    </svg>
  )
}

export default function ChallengeProgress() {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.get('/learning/challenges/progress/')
      .then(({ data }) => { if (!cancelled) setProgress(data) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

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

  if (failed) {
    return (
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="text-sm text-neutral-500">Could not load your coding progress.</p>
      </section>
    )
  }

  if (!progress) {
    return (
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="h-40 animate-pulse rounded-xl bg-neutral-800/60" />
      </section>
    )
  }

  const activeDays = progress.activity.length
  const totalSubmissionsThisYear = progress.activity.reduce((n, a) => n + a.count, 0)

  return (
    <section className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-white">Coding challenges</h2>
            <p className="text-xs text-neutral-500">
              {progress.solved.total} of {progress.available.total} solved
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-semibold tabular-nums text-white">{progress.streak.current}</span>
            day streak
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
            <Target className="h-3.5 w-3.5 text-purple-400" />
            <span className="font-semibold tabular-nums text-white">
              {progress.submissions.acceptance_rate}%
            </span>
            accepted
          </span>
        </div>
      </header>

      {/* Per difficulty */}
      <div className="grid grid-cols-3 gap-3">
        {LEVELS.map(level => {
          const solved = progress.solved[level.key]
          const total = progress.available[level.key]
          return (
            <div key={level.key}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
              <div className="relative">
                <Ring solved={solved} total={total} className={level.ring} />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-white">
                  {solved}
                </span>
              </div>
              <p className={`text-xs font-semibold ${level.text}`}>{level.label}</p>
              <p className="text-[11px] tabular-nums text-neutral-500">of {total}</p>
            </div>
          )
        })}
      </div>

      {/* A year of activity */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-xs text-neutral-400">
            <span className="font-semibold text-white tabular-nums">{totalSubmissionsThisYear}</span>
            {' '}submissions on{' '}
            <span className="font-semibold text-white tabular-nums">{activeDays}</span>
            {' '}days in the past year
          </p>
          <p className="text-[11px] text-neutral-500">
            longest streak {progress.streak.longest}
          </p>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="inline-block min-w-full">
            <div className="flex gap-[3px] pl-8 text-[10px] text-neutral-500">
              {weeks.map((_, index) => {
                const label = monthLabels.find(m => m.index === index)
                return (
                  <span key={index} className="w-[11px] shrink-0">
                    {label ? label.label : ''}
                  </span>
                )
              })}
            </div>

            <div className="flex gap-[3px]">
              <div className="flex w-8 shrink-0 flex-col gap-[3px] pr-1 text-right text-[10px] text-neutral-500">
                {DAY_LABELS.map((label, index) => (
                  <span key={index} className="h-[11px] leading-[11px]">{label}</span>
                ))}
              </div>

              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex shrink-0 flex-col gap-[3px]">
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
                      className={`h-[11px] w-[11px] rounded-[2px] ${
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
            <span key={n} className={`h-[11px] w-[11px] rounded-[2px] ${shade(n)}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Recently solved */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Recently solved
        </h3>
        {progress.recent.length === 0 ? (
          <p className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-6 text-center text-sm text-neutral-500">
            Nothing solved yet. Pick a challenge and your first solve shows up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {progress.recent.map(item => (
              <li key={item.slug}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-2.5">
                <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  item.difficulty === 'easy'
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : item.difficulty === 'medium'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                  {item.difficulty}
                </span>
                <a href={`/learning/challenges/${item.slug}`}
                  className="text-sm font-medium text-white hover:text-purple-300">
                  {item.title}
                </a>
                <span className="ml-auto text-[11px] tabular-nums text-neutral-500">
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
