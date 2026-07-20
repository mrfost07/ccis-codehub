import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Github, ExternalLink, Globe, Code2, Layers, Tag, Calendar, Users, Search
} from 'lucide-react'
import { useFeaturedProjects } from '../hooks/useApiCache'
import { Modal, Button } from './ui'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Contributor {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar: string | null
  role: string
}

export interface FeaturedProject {
  id: string
  slug: string
  name: string
  description: string
  project_type: string
  programming_language: string
  status: string
  github_repo: string
  owner_name: string
  team_name: string | null
  contributors: Contributor[]
  updated_at: string | null
  created_at: string | null
}

const TYPE_LABELS: Record<string, string> = {
  web_application:  'Web App',
  mobile_app:       'Mobile App',
  desktop_app:      'Desktop',
  api:              'API / Backend',
  data_science:     'Data Science',
  machine_learning: 'Machine Learning',
  game:             'Game',
  other:            'Other',
}

// ─── Avatar ────────────────────────────────────────────────────────────────

function Avatar({ c, size = 'sm' }: { c: Contributor; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs'
  const initials = `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase() || c.username[0].toUpperCase()
  if (c.avatar) {
    return (
      <img
        src={c.avatar}
        alt={c.username}
        className={`${sz} rounded-full object-cover border-2 border-neutral-800`}
      />
    )
  }
  return (
    <div className={`${sz} rounded-full bg-neutral-800 flex items-center justify-center font-medium text-neutral-300 border-2 border-neutral-900 flex-shrink-0`}>
      {initials}
    </div>
  )
}

function AvatarStack({ contributors, max = 4 }: { contributors: Contributor[]; max?: number }) {
  const visible  = contributors.slice(0, max)
  const overflow = contributors.length - max
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {visible.map(c => (
          <div key={c.id} title={`${c.first_name || c.username} · ${c.role}`}>
            <Avatar c={c} size="sm" />
          </div>
        ))}
        {overflow > 0 && (
          <div className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-neutral-900 flex items-center justify-center text-[10px] font-bold text-neutral-400 tabular-nums">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-xs text-neutral-500 tabular-nums">
        {contributors.length} contributor{contributors.length !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

// ─── Detail Modal (kit Modal: focus trap, Esc, scroll lock) ─────────────────

function ProjectDetailModal({ project, onClose }: { project: FeaturedProject; onClose: () => void }) {
  const navigate = useNavigate()

  return (
    <Modal
      open
      onClose={onClose}
      title={project.name}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => { onClose(); navigate(`/projects/${project.slug}`) }}
          >
            <ExternalLink className="w-4 h-4" /> View Project
          </Button>
          {project.github_repo && (
            <a
              href={project.github_repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              <Github className="w-4 h-4" /> View on GitHub
            </a>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-neutral-500 -mt-1">by {project.owner_name}</p>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center gap-1.5 capitalize">
            <Tag className="w-3 h-3" /> {project.programming_language || 'Unknown'}
          </span>
          <span className="text-xs px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> {TYPE_LABELS[project.project_type] || project.project_type}
          </span>
          {project.updated_at && (
            <span className="text-xs px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Updated {new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {project.team_name && (
            <span className="text-xs px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> {project.team_name}
            </span>
          )}
        </div>

        {project.description && (
          <p className="text-sm text-neutral-300 leading-relaxed">{project.description}</p>
        )}

        {/* Contributors */}
        {project.contributors.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 tabular-nums">
              Contributors — {project.contributors.length}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {project.contributors.map(c => (
                <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/40">
                  <Avatar c={c} size="md" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {c.first_name ? `${c.first_name} ${c.last_name}` : c.username}
                    </p>
                    <p className="text-[10px] text-neutral-500 capitalize">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Project Card ───────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: FeaturedProject; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick() }}
      className="group flex flex-col cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900 p-5
        transition-all duration-200 hover:border-neutral-700 hover:shadow-card-hover"
    >
      {/* Name + icon */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 flex-shrink-0">
          <Code2 className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-1" title={project.name}>
            {project.name}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5 truncate">{project.owner_name}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2 flex-1 mt-3">
        {project.description || 'No description provided.'}
      </p>

      {/* Tech pills */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {project.programming_language && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 flex items-center gap-1 capitalize">
            <Tag className="w-2.5 h-2.5" /> {project.programming_language}
          </span>
        )}
        {project.project_type && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" /> {TYPE_LABELS[project.project_type] || project.project_type}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-800 mt-3 pt-3 flex items-center justify-between gap-2">
        <AvatarStack contributors={project.contributors} />

        {/* GitHub link — always visible (hover-only was untappable on touch) */}
        {project.github_repo && (
          <a
            href={project.github_repo}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white transition-colors text-[11px] font-medium"
          >
            <Github className="w-3.5 h-3.5" /> GitHub
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Main Export ────────────────────────────────────────────────────────────

export default function FeaturedCarousel() {
  const [selected, setSelected] = useState<FeaturedProject | null>(null)
  const [search, setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'contributors'>('recent')

  const { data, isLoading: loading } = useFeaturedProjects()
  const projects: FeaturedProject[] = (data as FeaturedProject[]) || []

  const types = useMemo(() =>
    Array.from(new Set(projects.map(p => p.project_type).filter(Boolean))).sort(), [projects])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const result = projects.filter(p =>
      (!q ||
        p.name.toLowerCase().includes(q) ||
        p.owner_name.toLowerCase().includes(q) ||
        (p.programming_language || '').toLowerCase().includes(q)) &&
      (!typeFilter || p.project_type === typeFilter)
    )
    switch (sortBy) {
      case 'name':
        return [...result].sort((a, b) => a.name.localeCompare(b.name))
      case 'contributors':
        return [...result].sort((a, b) => b.contributors.length - a.contributors.length)
      default: // recent
        return [...result].sort((a, b) =>
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    }
  }, [projects, search, typeFilter, sortBy])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-52 bg-neutral-900 rounded-xl animate-pulse border border-neutral-800" />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-20 rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40">
        <Globe className="w-12 h-12 mx-auto mb-3 text-neutral-700" />
        <p className="text-sm text-neutral-400">No public projects yet.</p>
        <p className="text-xs mt-1 text-neutral-600">
          Set a project's visibility to <strong className="text-neutral-400">Public</strong> to feature it here.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Toolbar: search + sort */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, owner, or language…"
            className="w-full h-11 pl-10 pr-4 bg-neutral-900 border border-neutral-700 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="h-11 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 text-sm text-neutral-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          aria-label="Sort projects"
        >
          <option value="recent">Recently updated</option>
          <option value="name">Name A–Z</option>
          <option value="contributors">Most contributors</option>
        </select>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button
          onClick={() => setTypeFilter('')}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${typeFilter === ''
            ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
            : 'border-neutral-700 text-neutral-300 hover:border-neutral-600'
            }`}
        >
          All <span className="text-xs text-neutral-500 tabular-nums ml-1">{projects.length}</span>
        </button>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${typeFilter === t
              ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
              : 'border-neutral-700 text-neutral-300 hover:border-neutral-600'
              }`}
          >
            {TYPE_LABELS[t] || t}
            <span className="text-xs text-neutral-500 tabular-nums ml-1">
              {projects.filter(p => p.project_type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="mb-4 text-xs sm:text-sm text-neutral-500 tabular-nums">
        Showing {filtered.length} of {projects.length} projects
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(p => (
          <ProjectCard key={p.id} project={p} onClick={() => setSelected(p)} />
        ))}
      </div>

      {filtered.length === 0 && (search || typeFilter) && (
        <div className="text-center py-12">
          <p className="text-neutral-400 text-sm mb-2">No projects match your filters.</p>
          <button
            onClick={() => { setSearch(''); setTypeFilter('') }}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <ProjectDetailModal project={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
