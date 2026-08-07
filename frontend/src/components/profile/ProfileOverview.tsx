import { useEffect, useState } from 'react'
import {
  Award, BookOpen, Code2, FolderKanban, Heart, MessageSquare,
  Terminal, Users,
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

function Figure({ value, label, hint }: {
  value: number | string; label: string; hint?: string
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-3 py-2.5">
      <p className="text-xl font-bold tabular-nums text-white">{value}</p>
      <p className="text-[11px] text-neutral-400">{label}</p>
      {hint && <p className="text-[10px] text-neutral-600">{hint}</p>}
    </div>
  )
}

function Card({ icon, title, href, linkLabel, children }: {
  icon: React.ReactNode; title: string; href: string; linkLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-purple-500/10 p-2 text-purple-400">{icon}</span>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <a href={href} className="text-xs text-purple-400 hover:text-purple-300">
          {linkLabel} →
        </a>
      </header>
      {children}
    </section>
  )
}

/** A thin bar. Renders at zero rather than vanishing, so "none yet" is visible. */
function Bar({ done, total, className }: {
  done: number; total: number; className: string
}) {
  const share = total > 0 ? Math.min((done / total) * 100, 100) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${share}%` }} />
    </div>
  )
}

export default function ProfileOverview({ userId }: { userId?: string } = {}) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setOverview(null)
    setFailed(false)
    const url = userId
      ? `/auth/user/${userId}/overview/`
      : '/auth/profile/overview/'
    api.get(url)
      .then(({ data }) => { if (!cancelled) setOverview(data) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [userId])

  if (failed) {
    return (
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="text-sm text-neutral-500">
          Could not load {userId ? 'this' : 'your'} overview.
        </p>
      </section>
    )
  }

  if (!overview) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i}
            className="h-40 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-800/40" />
        ))}
      </div>
    )
  }

  const { learning, challenges, projects, community } = overview

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card icon={<BookOpen className="h-4 w-4" />} title="Learning"
        href="/learning" linkLabel="Browse paths">
        <div className="grid grid-cols-2 gap-2">
          <Figure value={learning.completed_paths} label="Paths completed"
            hint={`${learning.enrolled} enrolled`} />
          <Figure value={learning.modules_completed} label="Modules done" />
          {learning.quizzes_taken !== undefined ? (
            <Figure value={learning.quizzes_taken} label="Quizzes taken"
              hint={learning.average_score !== null && learning.average_score !== undefined
                ? `${learning.average_score}% average`
                : 'no scores yet'} />
          ) : (
            <Figure value={learning.enrolled} label="Paths enrolled" />
          )}
          <Figure value={learning.certificates} label="Certificates" />
        </div>
        {learning.enrolled > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-neutral-500">
              <span>Paths finished</span>
              <span className="tabular-nums">
                {learning.completed_paths} / {learning.enrolled}
              </span>
            </div>
            <Bar done={learning.completed_paths} total={learning.enrolled}
              className="bg-purple-500" />
          </div>
        )}
      </Card>

      <Card icon={<Terminal className="h-4 w-4" />} title="Coding challenges"
        href="/learning/challenges" linkLabel="Solve one">
        <div className="grid grid-cols-2 gap-2">
          <Figure value={challenges.solved.total} label="Solved"
            hint={`of ${challenges.available.total}`} />
          <Figure value={`${challenges.acceptance_rate}%`} label="Accepted"
            hint={`${challenges.submissions} submissions`} />
          <Figure value={challenges.streak.current} label="Day streak"
            hint={`best ${challenges.streak.longest}`} />
          <Figure value={challenges.solved.hard} label="Hard solved"
            hint={`of ${challenges.available.hard}`} />
        </div>
        <div className="mt-3 space-y-1.5">
          {([
            ['Easy', challenges.solved.easy, challenges.available.easy, 'bg-green-500'],
            ['Medium', challenges.solved.medium, challenges.available.medium, 'bg-amber-500'],
            ['Hard', challenges.solved.hard, challenges.available.hard, 'bg-red-500'],
          ] as Array<[string, number, number, string]>).map(([label, done, total, colour]) => (
            <div key={label}>
              <div className="mb-0.5 flex justify-between text-[11px] text-neutral-500">
                <span>{label}</span>
                <span className="tabular-nums">{done} / {total}</span>
              </div>
              <Bar done={done} total={total} className={colour} />
            </div>
          ))}
        </div>
      </Card>

      <Card icon={<FolderKanban className="h-4 w-4" />} title="Projects"
        href="/projects" linkLabel="Open projects">
        <div className="grid grid-cols-2 gap-2">
          <Figure value={projects.owned} label="Owned"
            hint={`${projects.active} active`} />
          <Figure value={projects.member_of} label="Joined" />
          <Figure value={projects.tasks_done} label="Tasks done"
            hint={`of ${projects.tasks_assigned} assigned`} />
          <Figure value={projects.completed} label="Delivered" />
        </div>
        {projects.tasks_assigned > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-neutral-500">
              <span>Assigned work</span>
              <span className="tabular-nums">
                {projects.tasks_done} / {projects.tasks_assigned}
              </span>
            </div>
            <Bar done={projects.tasks_done} total={projects.tasks_assigned}
              className="bg-purple-500" />
          </div>
        )}
      </Card>

      <Card icon={<Users className="h-4 w-4" />} title="Community"
        href="/community" linkLabel="Go to community">
        <div className="grid grid-cols-2 gap-2">
          <Figure value={community.posts} label="Posts" />
          <Figure value={community.comments} label="Comments" />
          <Figure value={community.likes_received} label="Likes received" />
          <Figure value={community.followers} label="Followers"
            hint={`following ${community.following}`} />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-500">
          {community.posts === 0 ? (
            <><MessageSquare className="h-3 w-3" /> Nothing posted yet.</>
          ) : (
            <><Heart className="h-3 w-3 text-red-400" />
              {community.likes_received} like{community.likes_received === 1 ? '' : 's'}
              {' '}across {community.posts} post{community.posts === 1 ? '' : 's'}</>
          )}
        </p>
      </Card>
    </div>
  )
}

/** The headline row under the avatar. Kept here so it reads the same numbers. */
export function ProfileHeadline({ overview }: { overview: Overview | null }) {
  if (!overview) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-800/50" />
        ))}
      </div>
    )
  }

  const figures: Array<[string, number, React.ReactNode]> = [
    ['Followers', overview.community.followers, <Users key="f" className="h-3.5 w-3.5" />],
    ['Paths done', overview.learning.completed_paths, <BookOpen key="p" className="h-3.5 w-3.5" />],
    ['Modules', overview.learning.modules_completed, <BookOpen key="m" className="h-3.5 w-3.5" />],
    ['Solved', overview.challenges.solved.total, <Code2 key="s" className="h-3.5 w-3.5" />],
    ['Projects', overview.projects.owned + overview.projects.member_of,
      <FolderKanban key="j" className="h-3.5 w-3.5" />],
    ['Certificates', overview.learning.certificates, <Award key="c" className="h-3.5 w-3.5" />],
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {figures.map(([label, value, icon]) => (
        <div key={label}
          className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-2 py-2 text-center">
          <p className="text-lg font-bold tabular-nums text-white sm:text-xl">{value}</p>
          <p className="flex items-center justify-center gap-1 text-[10px] text-neutral-400 sm:text-[11px]">
            <span className="text-neutral-600">{icon}</span>{label}
          </p>
        </div>
      ))}
    </div>
  )
}
