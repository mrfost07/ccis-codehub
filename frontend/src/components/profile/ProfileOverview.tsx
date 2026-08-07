import { useEffect, useState } from 'react'
import {
  ArrowUpRight, Award, BookOpen, Code2, FolderKanban, Heart,
  Sparkles, Terminal, Users,
} from 'lucide-react'

import api from '../../services/api'

/**
 * What this person has actually done, across learning, projects and community.
 *
 * Every figure is computed from the source tables by the overview endpoint. The
 * profile used to read denormalised counters on Profile, and they were wrong —
 * `total_courses_completed` was 0 for a student with two finished paths and two
 * certificates, because nothing updates it when a path completes. Telling
 * somebody they have done nothing when they have is worse than telling them
 * nothing at all.
 *
 * On the layout: figures are separated by space and type weight rather than by
 * giving each one its own bordered box. Nesting bordered boxes inside bordered
 * cards puts three frames around every number, which reads as clutter and
 * leaves nothing for the eye to rank.
 */

export interface Overview {
  learning: {
    enrolled: number; completed_paths: number; modules_completed: number
    certificates: number; quizzes_available: number
    // Marks are omitted when viewing somebody else — they are between a
    // student and their instructor.
    quizzes_taken?: number; average_score?: number | null
  }
  challenges: {
    solved: { easy: number; medium: number; hard: number; total: number }
    available: { easy: number; medium: number; hard: number; total: number }
    streak: { current: number; longest: number }
    acceptance_rate: number
    submissions: number
  }
  projects: {
    owned: number; member_of: number; active: number; completed: number
    tasks_assigned: number; tasks_done: number
  }
  community: {
    posts: number; comments: number; likes_received: number
    followers: number; following: number
  }
}

/** A number and what it is. No frame — spacing and weight do the separating. */
function Stat({ value, label, hint, tone = 'text-white' }: {
  value: number | string; label: string; hint?: string; tone?: string
}) {
  return (
    <div>
      <p className={`text-2xl font-semibold tracking-tight tabular-nums ${tone}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-neutral-300">{label}</p>
      {hint && <p className="text-[10px] text-neutral-500">{hint}</p>}
    </div>
  )
}

function Card({ icon, title, href, linkLabel, accent, children }: {
  icon: React.ReactNode; title: string; href: string; linkLabel: string
  accent: string; children: React.ReactNode
}) {
  return (
    <section className="group relative overflow-hidden rounded-3xl bg-neutral-900/70 p-5
      ring-1 ring-white/5 transition-colors hover:ring-white/10">
      {/* A single soft wash instead of a hard border — gives the card an edge
          without drawing another rectangle. */}
      <div aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full
          blur-3xl opacity-20 ${accent}`} />

      <header className="relative mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-neutral-400">{icon}</span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {title}
          </h3>
        </div>
        <a href={href}
          className="flex items-center gap-0.5 text-[11px] text-neutral-500
            transition-colors hover:text-purple-300">
          {linkLabel}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </header>

      <div className="relative">{children}</div>
    </section>
  )
}

/** Thin rail. Renders at zero width rather than vanishing, so none-yet is visible. */
function Rail({ done, total, className }: {
  done: number; total: number; className: string
}) {
  const share = total > 0 ? Math.min((done / total) * 100, 100) : 0
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
      <div className={`h-full rounded-full transition-[width] duration-500 ${className}`}
        style={{ width: `${share}%` }} />
    </div>
  )
}

function Meter({ label, done, total, className }: {
  label: string; done: number; total: number; className: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-neutral-400">{label}</span>
        <span className="text-[11px] tabular-nums text-neutral-500">{done} / {total}</span>
      </div>
      <Rail done={done} total={total} className={className} />
    </div>
  )
}

export default function ProfileOverview({ userId, overview: given }: {
  userId?: string
  /** Pass this when the page already holds the overview, to save a second
      request for the same data. Omit it and the panel fetches its own. */
  overview?: Overview | null
} = {}) {
  const supplied = given !== undefined
  const [fetched, setFetched] = useState<Overview | null>(null)
  const [failed, setFailed] = useState(false)
  const overview = supplied ? given : fetched

  useEffect(() => {
    if (supplied) return
    let cancelled = false
    setFetched(null)
    setFailed(false)
    const url = userId
      ? `/auth/user/${userId}/overview/`
      : '/auth/profile/overview/'
    api.get(url)
      .then(({ data }) => { if (!cancelled) setFetched(data) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [userId, supplied])

  if (failed) {
    return (
      <section className="rounded-3xl bg-neutral-900/70 p-6 ring-1 ring-white/5">
        <p className="text-sm text-neutral-500">
          Could not load {userId ? 'this' : 'your'} overview.
        </p>
      </section>
    )
  }

  if (!overview) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i}
            className="h-44 animate-pulse rounded-3xl bg-neutral-800/40 ring-1 ring-white/5" />
        ))}
      </div>
    )
  }

  const { learning, challenges, projects, community } = overview

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card icon={<BookOpen className="h-4 w-4" />} title="Learning"
        href="/learning" linkLabel="Browse paths" accent="bg-violet-500">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Stat value={learning.completed_paths} label="Paths completed"
            hint={`${learning.enrolled} enrolled`} />
          <Stat value={learning.modules_completed} label="Modules done" />
          {learning.quizzes_taken !== undefined ? (
            <Stat value={learning.quizzes_taken} label="Quizzes taken"
              hint={learning.average_score !== null && learning.average_score !== undefined
                ? `${learning.average_score}% average`
                : 'no scores yet'} />
          ) : (
            <Stat value={learning.enrolled} label="Paths enrolled" />
          )}
          <Stat value={learning.certificates} label="Certificates"
            tone={learning.certificates > 0 ? 'text-amber-300' : 'text-white'} />
        </div>
        {learning.enrolled > 0 && (
          <div className="mt-5">
            <Meter label="Paths finished" done={learning.completed_paths}
              total={learning.enrolled} className="bg-violet-400" />
          </div>
        )}
      </Card>

      <Card icon={<Terminal className="h-4 w-4" />} title="Coding challenges"
        href="/learning/challenges" linkLabel="Solve one" accent="bg-emerald-500">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight tabular-nums text-white">
                {challenges.solved.total}
              </span>
              <span className="text-sm text-neutral-500 tabular-nums">
                / {challenges.available.total}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-300">Solved</p>
          </div>
          <Stat value={`${challenges.acceptance_rate}%`} label="Accepted"
            hint={`${challenges.submissions} submissions`} />
          <Stat value={challenges.streak.current} label="Day streak"
            hint={`best ${challenges.streak.longest}`}
            tone={challenges.streak.current > 0 ? 'text-amber-300' : 'text-white'} />
          <Stat value={challenges.solved.hard} label="Hard solved"
            hint={`of ${challenges.available.hard}`} />
        </div>
        <div className="mt-5 space-y-2.5">
          <Meter label="Easy" done={challenges.solved.easy}
            total={challenges.available.easy} className="bg-emerald-400" />
          <Meter label="Medium" done={challenges.solved.medium}
            total={challenges.available.medium} className="bg-amber-400" />
          <Meter label="Hard" done={challenges.solved.hard}
            total={challenges.available.hard} className="bg-rose-400" />
        </div>
      </Card>

      <Card icon={<FolderKanban className="h-4 w-4" />} title="Projects"
        href="/projects" linkLabel="Open projects" accent="bg-sky-500">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Stat value={projects.owned} label="Owned" hint={`${projects.active} active`} />
          <Stat value={projects.member_of} label="Joined" />
          <Stat value={projects.tasks_done} label="Tasks done"
            hint={`of ${projects.tasks_assigned} assigned`} />
          <Stat value={projects.completed} label="Delivered" />
        </div>
        {projects.tasks_assigned > 0 && (
          <div className="mt-5">
            <Meter label="Assigned work" done={projects.tasks_done}
              total={projects.tasks_assigned} className="bg-sky-400" />
          </div>
        )}
      </Card>

      <Card icon={<Users className="h-4 w-4" />} title="Community"
        href="/community" linkLabel="Go to community" accent="bg-pink-500">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Stat value={community.posts} label="Posts" />
          <Stat value={community.comments} label="Comments" />
          <Stat value={community.likes_received} label="Likes received"
            tone={community.likes_received > 0 ? 'text-pink-300' : 'text-white'} />
          <Stat value={community.followers} label="Followers"
            hint={`following ${community.following}`} />
        </div>
        <p className="mt-5 flex items-center gap-1.5 border-t border-white/5 pt-3
          text-[11px] text-neutral-500">
          {community.posts === 0 ? (
            <><Sparkles className="h-3 w-3" /> Nothing posted yet.</>
          ) : (
            <><Heart className="h-3 w-3 text-pink-400" />
              {community.likes_received} like{community.likes_received === 1 ? '' : 's'}
              {' '}across {community.posts} post{community.posts === 1 ? '' : 's'}</>
          )}
        </p>
      </Card>
    </div>
  )
}

/**
 * The headline row under the avatar.
 *
 * One rail of figures divided by hairlines rather than six bordered tiles — the
 * tiles competed with the profile card they sat inside.
 */
export function ProfileHeadline({ overview }: { overview: Overview | null }) {
  if (!overview) {
    return (
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/5 sm:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse bg-neutral-900" />
        ))}
      </div>
    )
  }

  const figures: Array<[string, number, React.ReactNode]> = [
    ['Followers', overview.community.followers, <Users key="f" className="h-3 w-3" />],
    ['Paths done', overview.learning.completed_paths, <BookOpen key="p" className="h-3 w-3" />],
    ['Modules', overview.learning.modules_completed, <BookOpen key="m" className="h-3 w-3" />],
    ['Solved', overview.challenges.solved.total, <Code2 key="s" className="h-3 w-3" />],
    ['Projects', overview.projects.owned + overview.projects.member_of,
      <FolderKanban key="j" className="h-3 w-3" />],
    ['Certificates', overview.learning.certificates, <Award key="c" className="h-3 w-3" />],
  ]

  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/5 sm:grid-cols-6">
      {figures.map(([label, value, icon]) => (
        <div key={label} className="bg-neutral-900 px-2 py-3 text-center">
          <p className="text-xl font-semibold tracking-tight tabular-nums text-white sm:text-2xl">
            {value}
          </p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px]
            font-medium uppercase tracking-wide text-neutral-500">
            <span className="text-neutral-600">{icon}</span>{label}
          </p>
        </div>
      ))}
    </div>
  )
}
