import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock, Search, Sparkles } from 'lucide-react'

import Navbar from '../components/Navbar'
import { learningAPI } from '../services/api'
import { Badge, EmptyState, LoadingState, cn } from '../components/ui'

/**
 * Career map: which jobs each CCIS program leads to, and which have a path yet.
 *
 * Its own route rather than a modal, so it is linkable, shareable and the back
 * button works — "open a wide window" as a URL rather than an overlay you cannot
 * send to anyone.
 *
 * Three levels: program → category → role. Deeper would stop being drawable on a
 * phone. The tree is expressed with a left rule and short connector stubs rather
 * than SVG, so it reflows at any width instead of being a fixed drawing that has
 * to scroll sideways on mobile.
 *
 * A role whose path is not seeded yet is deliberately still shown, marked "path
 * coming soon". Hiding them would make the map look thin and tell a student
 * nothing about where their course leads.
 */

interface RolePath {
  id: string
  name: string
  slug: string
  total_modules: number
}

interface Role {
  id: string
  slug: string
  name: string
  summary: string
  core_skills: string[]
  demand: 'high' | 'steady' | 'emerging'
  path: RolePath | null
}

interface Category {
  name: string
  roles: Role[]
}

interface Program {
  key: string
  label: string
  role_count: number
  with_path: number
  categories: Category[]
}

const DEMAND_STYLE: Record<Role['demand'], string> = {
  high: 'text-green-300 bg-green-500/15 border-green-500/30',
  steady: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
  emerging: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
}

const DEMAND_LABEL: Record<Role['demand'], string> = {
  high: 'High demand',
  steady: 'Steady',
  emerging: 'Emerging',
}

function RoleCard({ role }: { role: Role }) {
  const navigate = useNavigate()
  const linked = role.path !== null

  return (
    <div
      // The whole card is the target when a path exists; otherwise it is inert
      // rather than a button that goes nowhere.
      onClick={() => linked && navigate(`/learning/paths/${role.path!.id}`)}
      className={cn(
        'group rounded-xl border p-4 transition-colors',
        linked
          ? 'cursor-pointer border-neutral-800 bg-neutral-900/60 hover:border-purple-500/60 hover:bg-neutral-900'
          : 'border-neutral-800/70 bg-neutral-900/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className={cn('text-sm font-semibold', linked ? 'text-white' : 'text-neutral-300')}>
          {role.name}
        </h4>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
            DEMAND_STYLE[role.demand],
          )}
        >
          {DEMAND_LABEL[role.demand]}
        </span>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{role.summary}</p>

      {role.core_skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {role.core_skills.map(skill => (
            <span
              key={skill}
              className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-neutral-800 pt-2.5">
        {linked ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-purple-400">
            Start the path
            <span className="text-neutral-500">
              · {role.path!.total_modules} module{role.path!.total_modules === 1 ? '' : 's'}
            </span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="h-3 w-3" />
            Path coming soon
          </span>
        )}
      </div>
    </div>
  )
}

export default function CareerMap() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeProgram, setActiveProgram] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await learningAPI.getCareerMap()
        if (!cancelled) setPrograms(data.programs ?? [])
      } catch {
        if (!cancelled) setError('Could not load the career map.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return programs
      .filter(program => activeProgram === 'all' || program.key === activeProgram)
      .map(program => ({
        ...program,
        categories: program.categories
          .map(category => ({
            ...category,
            roles: needle === ''
              ? category.roles
              : category.roles.filter(role =>
                  role.name.toLowerCase().includes(needle) ||
                  role.summary.toLowerCase().includes(needle) ||
                  role.core_skills.some(s => s.toLowerCase().includes(needle))),
          }))
          // Drop categories the filter emptied, so a search does not leave
          // headings with nothing under them.
          .filter(category => category.roles.length > 0),
      }))
      .filter(program => program.categories.length > 0)
  }, [programs, query, activeProgram])

  const totals = useMemo(() => ({
    roles: programs.reduce((sum, p) => sum + p.role_count, 0),
    withPath: programs.reduce((sum, p) => sum + p.with_path, 0),
  }), [programs])

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      {/* Full width on purpose — the tree is three columns of cards on a large
          screen, and a centred max-w container would waste half of it. */}
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
        <Link
          to="/learning"
          className="inline-flex h-10 items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to learning
        </Link>

        <header className="mt-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            <Sparkles className="h-6 w-6 text-purple-400" />
            Career map
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-neutral-400">
            Where each CCIS program leads. Pick a role to see the learning path that
            prepares for it — {totals.withPath} of {totals.roles} roles have one so far,
            and the rest are being written.
          </p>
        </header>

        {/* Controls: program filter and search. Wrap, never shrink (§4). */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {[{ key: 'all', label: 'All programs' },
            ...programs.map(p => ({ key: p.key, label: p.label }))].map(option => (
            <button
              key={option.key}
              onClick={() => setActiveProgram(option.key)}
              className={cn(
                'h-10 rounded-lg px-3 text-sm font-medium transition-colors',
                activeProgram === option.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white',
              )}
            >
              {option.label}
            </button>
          ))}

          <div className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search roles or skills…"
              className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-3 text-sm
                text-white placeholder:text-neutral-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading the career map…" />
        ) : error ? (
          <EmptyState title="Career map unavailable" description={error} />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Nothing matches that"
            description="Try a different role, skill or program."
          />
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {visible.map(program => (
              <section key={program.key} className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-base font-bold text-white">{program.label}</h2>
                  <Badge>{program.role_count} roles</Badge>
                </div>

                <div className="mt-4 space-y-5">
                  {program.categories.map(category => (
                    <div key={category.name}>
                      <h3 className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                        {category.name}
                      </h3>
                      {/* The tree: one rule down the left with a short stub per
                          card. CSS rather than SVG, so it reflows instead of
                          scrolling sideways on a phone. */}
                      <div className="mt-2 space-y-2.5 border-l border-neutral-800 pl-4">
                        {category.roles.map(role => (
                          <div key={role.id} className="relative">
                            <span
                              aria-hidden="true"
                              className="absolute -left-4 top-6 h-px w-4 bg-neutral-800"
                            />
                            <RoleCard role={role} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
