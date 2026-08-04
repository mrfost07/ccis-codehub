import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Clock, Minus, Plus, Search, Sparkles,
} from 'lucide-react'

import Navbar from '../components/Navbar'
import { learningAPI } from '../services/api'
import { EmptyState, LoadingState, cn } from '../components/ui'

/**
 * Career map: a node-link tree of where each CCIS program leads.
 *
 * Program → Category → Role, laid out left to right: each level is indented from
 * its parent, joined by an elbow connector, with a round toggle on any node that
 * has children. The shape of an org-chart / OKR alignment view.
 *
 * Connectors are CSS borders — a vertical rule down each child list and a short
 * horizontal stub per child — not SVG. An SVG overlay would need every node's
 * measured position, a ResizeObserver, and a redraw on every expand, and it
 * breaks the moment a card wraps to a different height. Borders reflow for free
 * and survive any text length.
 *
 * Its own route rather than a modal, so it is linkable and the back button works.
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

/**
 * One accent per program, so a branch is identifiable at a glance once the tree
 * is long enough to scroll past its own heading.
 *
 * Written as whole static class strings rather than composed from a colour name:
 * Tailwind scans source text, so `border-${colour}-500` produces no CSS at all.
 */
const PROGRAM_ACCENT: Record<string, { rule: string; chip: string; bar: string }> = {
  bscs: { rule: 'bg-violet-500', chip: 'bg-violet-500/20 text-violet-300', bar: 'bg-violet-500' },
  bsit: { rule: 'bg-cyan-500', chip: 'bg-cyan-500/20 text-cyan-300', bar: 'bg-cyan-500' },
  bsis: { rule: 'bg-amber-500', chip: 'bg-amber-500/20 text-amber-300', bar: 'bg-amber-500' },
}
const FALLBACK_ACCENT = {
  rule: 'bg-neutral-500', chip: 'bg-neutral-800 text-neutral-300', bar: 'bg-neutral-500',
}

/** Compact drops each role's summary and skills, keeping name and demand. */
type Density = 'comfortable' | 'compact'

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

/**
 * One branch of the tree.
 *
 * `depth` only picks the card's visual weight — the indentation itself comes from
 * nesting, so an extra level would not need new spacing rules.
 */
function Branch({
  children,
  hasChildren,
  open,
  card,
  isLast,
}: {
  children?: React.ReactNode
  hasChildren: boolean
  open: boolean
  card: React.ReactNode
  isLast: boolean
}) {
  return (
    <li className="relative">
      {/*
        The elbow. The vertical rule is drawn by this item rather than the list so
        it can stop halfway down the last child — otherwise the rule overshoots
        past the final card with nothing below it to join.
      */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 w-px bg-neutral-800',
          isLast ? 'top-0 h-6' : 'top-0 h-full',
        )}
      />
      <span aria-hidden="true" className="absolute left-0 top-6 h-px w-4 bg-neutral-800" />

      {/* pl-3 on mobile: three levels at pl-4 plus a 40px external toggle used
          about 96px before the deepest card even started, which is a quarter of a
          phone. The toggle now lives inside the card instead. */}
      <div className="py-1.5 pl-3 sm:pl-4">{card}</div>

      {hasChildren && open && (
        <ul className="relative ml-3 sm:ml-10">{children}</ul>
      )}
    </li>
  )
}

function RoleCard({ role, density }: { role: Role; density: Density }) {
  const navigate = useNavigate()
  const linked = role.path !== null

  return (
    <div
      onClick={() => linked && navigate(`/learning/paths/${role.path!.id}`)}
      className={cn(
        'group w-full max-w-md rounded-xl border p-3 transition-colors',
        linked
          ? 'cursor-pointer border-neutral-800 bg-neutral-900/70 hover:border-purple-500/60'
          : 'border-neutral-800/70 bg-neutral-900/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className={cn('text-sm font-semibold', linked ? 'text-white' : 'text-neutral-300')}>
          {role.name}
        </h4>
        <span className={cn(
          'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
          DEMAND_STYLE[role.demand],
        )}>
          {DEMAND_LABEL[role.demand]}
        </span>
      </div>

      {density === 'comfortable' && (
        <p className="mt-1 text-xs leading-relaxed text-neutral-400">{role.summary}</p>
      )}

      {density === 'comfortable' && role.core_skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {role.core_skills.map(skill => (
            <span key={skill} className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5 border-t border-neutral-800 pt-2">
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

/** Program and category nodes: a compact bar with a count chip on the right. */
/**
 * Program and category nodes. The whole card is the expand/collapse control.
 *
 * It was a separate 40px round button beside the card. Two problems on a phone:
 * it and its gap took 48px of a 375px screen at every level, and a 40px circle is
 * a smaller target than the card sitting next to it. A card that is itself the
 * button is bigger, and matches how every file tree behaves.
 */
function NodeCard({
  title,
  subtitle,
  chip,
  accent,
  emphasis,
  progress,
  open,
  onToggle,
  toggleLabel,
}: {
  title: string
  subtitle?: string
  chip: string
  /** Program accent, or undefined for the neutral category level. */
  accent?: { rule: string; chip: string; bar: string }
  emphasis: boolean
  /** Fraction of roles with a path, 0–1. Program level only. */
  progress?: number
  open: boolean
  onToggle: () => void
  toggleLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={toggleLabel}
      className={cn(
        'relative block w-full max-w-md overflow-hidden rounded-xl border px-3 py-2.5 text-left',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500',
        emphasis
          ? 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
          : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700',
      )}
    >
      {/* Accent rule down the leading edge, so a branch stays identifiable after
          its heading has scrolled away. */}
      {accent && <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', accent.rule)} />}

      <div className={cn('flex items-center justify-between gap-3', accent && 'pl-2')}>
        <div className="min-w-0">
          {/* Wraps rather than truncates. At 320px the chip and toggle left
              154px, and "BS Information Technology" needs 182 — it clipped to
              "BS Information Techn…", which a student cannot tell from BSIS. */}
          <p className={cn('font-semibold', emphasis ? 'text-sm text-white' : 'text-[13px] text-neutral-200')}>
            {title}
          </p>
          {subtitle && <p className="truncate text-[11px] text-neutral-500">{subtitle}</p>}
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-bold',
            accent ? accent.chip : 'bg-neutral-800 text-neutral-400',
          )}>
            {chip}
          </span>
          {open
            ? <Minus className="h-4 w-4 text-neutral-500" />
            : <Plus className="h-4 w-4 text-neutral-500" />}
        </span>
      </div>

      {/* How much of this program is actually walkable today. The number alone
          ("3 with a path") does not convey 3 out of 29. */}
      {progress !== undefined && accent && (
        <div className="mt-2 ml-2 h-1 overflow-hidden rounded-full bg-neutral-800">
          <div
            className={cn('h-full rounded-full', accent.bar)}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </button>
  )
}

export default function CareerMap() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [density, setDensity] = useState<Density>('comfortable')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await learningAPI.getCareerMap()
        if (cancelled) return
        const list: Program[] = data.programs ?? []
        setPrograms(list)
        // Programs open, categories closed: the first screen should show the
        // three courses and their groupings, not 33 role cards at once.
        setExpanded(new Set(list.map(p => p.key)))
      } catch {
        if (!cancelled) setError('Could not load the career map.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const toggle = (key: string) =>
    setExpanded(current => {
      const next = new Set(current)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const allKeys = useMemo(
    () => programs.flatMap(p => [p.key, ...p.categories.map(c => `${p.key}/${c.name}`)]),
    [programs],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return programs
    return programs
      .map(program => ({
        ...program,
        categories: program.categories
          .map(category => ({
            ...category,
            roles: category.roles.filter(role =>
              role.name.toLowerCase().includes(needle) ||
              role.summary.toLowerCase().includes(needle) ||
              role.core_skills.some(s => s.toLowerCase().includes(needle))),
          }))
          .filter(category => category.roles.length > 0),
      }))
      .filter(program => program.categories.length > 0)
  }, [programs, query])

  // A search is useless if the matches stay collapsed, so searching opens
  // everything that still matches and stops honouring the manual state.
  const searching = query.trim() !== ''
  const isOpen = (key: string) => searching || expanded.has(key)

  const totals = useMemo(() => ({
    roles: programs.reduce((sum, p) => sum + p.role_count, 0),
    withPath: programs.reduce((sum, p) => sum + p.with_path, 0),
  }), [programs])

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
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
            Where each CCIS program leads. Expand a course, then a field, to see the
            roles it opens — {totals.withPath} of {totals.roles} have a learning path
            so far.
          </p>
        </header>

        {/*
          Sticky, because with 79 roles the tree is far taller than a viewport and
          the controls are useless once scrolled past. Wraps, never shrinks (§4).
        */}
        <div className="sticky top-0 z-30 -mx-4 mt-5 flex flex-wrap items-center gap-2
          border-b border-neutral-800 bg-neutral-950/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <button
            onClick={() => setExpanded(new Set(allKeys))}
            className="h-10 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-neutral-300
              transition-colors hover:bg-neutral-800 hover:text-white"
          >
            Expand all
          </button>
          <button
            onClick={() => setExpanded(new Set())}
            className="h-10 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-neutral-300
              transition-colors hover:bg-neutral-800 hover:text-white"
          >
            Collapse all
          </button>

          {/* Density: comfortable reads better, compact lets you see a whole
              field at once. Both are useful at this size, so neither is hidden. */}
          <div className="flex h-10 items-center rounded-lg bg-neutral-900 p-1">
            {(['comfortable', 'compact'] as const).map(option => (
              <button
                key={option}
                onClick={() => setDensity(option)}
                aria-pressed={density === option}
                className={cn(
                  'h-8 rounded-md px-2.5 text-xs font-medium capitalize transition-colors',
                  density === option
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-400 hover:text-white',
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="relative ml-auto w-full sm:w-80">
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

        {searching && !loading && !error && (
          <p className="mt-3 text-xs text-neutral-500">
            {filtered.reduce((sum, p) => sum + p.categories.reduce((n, c) => n + c.roles.length, 0), 0)}
            {' '}role{filtered.reduce((sum, p) => sum + p.categories.reduce((n, c) => n + c.roles.length, 0), 0) === 1 ? '' : 's'}
            {' '}match “{query.trim()}”
          </p>
        )}

        {loading ? (
          <LoadingState label="Loading the career map…" />
        ) : error ? (
          <EmptyState title="Career map unavailable" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nothing matches that" description="Try a different role or skill." />
        ) : (
          // Horizontal scroll rather than squeezing: three levels of indentation
          // plus a card is wider than a phone, and a cramped tree is unreadable.
          // No min-width: it was 34rem, which forced horizontal scrolling on
          // every phone. With the toggle inside the card and tighter indents the
          // tree fits; overflow-x-auto stays only as a safety net for an
          // unbreakable string, not as the normal way to read this.
          <div className="mt-6 overflow-x-auto pb-4">
            <ul className="space-y-1">
              {filtered.map(program => {
                const programOpen = isOpen(program.key)
                return (
                  <Branch
                    key={program.key}
                    isLast={program === filtered[filtered.length - 1]}
                    hasChildren={program.categories.length > 0}
                    open={programOpen}
                    card={
                      <NodeCard
                        open={programOpen}
                        onToggle={() => toggle(program.key)}
                        toggleLabel={`${programOpen ? 'Collapse' : 'Expand'} ${program.label}`}
                        emphasis
                        title={program.label}
                        subtitle={`${program.categories.length} field${program.categories.length === 1 ? '' : 's'} · ${program.with_path} of ${program.role_count} with a path`}
                        chip={`${program.role_count} roles`}
                        accent={PROGRAM_ACCENT[program.key] ?? FALLBACK_ACCENT}
                        progress={program.role_count === 0 ? 0 : program.with_path / program.role_count}
                      />
                    }
                  >
                    {program.categories.map(category => {
                      const key = `${program.key}/${category.name}`
                      const categoryOpen = isOpen(key)
                      return (
                        <Branch
                          key={key}
                          isLast={category === program.categories[program.categories.length - 1]}
                          hasChildren={category.roles.length > 0}
                          open={categoryOpen}
                          card={
                            <NodeCard
                              open={categoryOpen}
                              onToggle={() => toggle(key)}
                              toggleLabel={`${categoryOpen ? 'Collapse' : 'Expand'} ${category.name}`}
                              emphasis={false}
                              title={category.name}
                              chip={String(category.roles.length)}
                            />
                          }
                        >
                          {category.roles.map(role => (
                            <Branch
                              key={role.id}
                              isLast={role === category.roles[category.roles.length - 1]}
                              hasChildren={false}
                              open={false}
                              card={<RoleCard role={role} density={density} />}
                            />
                          ))}
                        </Branch>
                      )
                    })}
                  </Branch>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
