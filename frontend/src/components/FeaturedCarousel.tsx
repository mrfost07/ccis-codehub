import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Github, ExternalLink, Globe, X,
  Code2, Layers, Tag, Calendar, Users, Search
} from 'lucide-react'
import { useFeaturedProjects } from '../hooks/useApiCache'

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
        className={`${sz} rounded-full object-cover border-2 border-slate-800`}
      />
    )
  }
  return (
    <div className={`${sz} rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 border-2 border-slate-800 flex-shrink-0`}>
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
          <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-xs text-slate-500">
        {contributors.length} contributor{contributors.length !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

// ─── Detail Modal ───────────────────────────────────────────────────────────

function ProjectDetailModal({ project, onClose }: { project: FeaturedProject; onClose: () => void }) {
  const navigate = useNavigate()

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — no gradient */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <Code2 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white leading-tight">{project.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{project.owner_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta pills */}
        <div className="px-6 py-3 flex flex-wrap gap-2 border-b border-slate-800">
          <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3 h-3" /> {project.programming_language || 'Unknown'}
          </span>
          <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> {TYPE_LABELS[project.project_type] || project.project_type}
          </span>
          {project.updated_at && (
            <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Updated {new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {project.team_name && (
            <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> {project.team_name}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {project.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{project.description}</p>
          )}

          {/* Contributors */}
          {project.contributors.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Contributors — {project.contributors.length}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {project.contributors.map(c => (
                  <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40">
                    <Avatar c={c} size="md" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {c.first_name ? `${c.first_name} ${c.last_name}` : c.username}
                      </p>
                      <p className="text-[10px] text-slate-500 capitalize">{c.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
          <button
            onClick={() => { onClose(); navigate(`/projects/${project.slug}`) }}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> View Project
          </button>
          {project.github_repo && (
            <a
              href={project.github_repo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <Github className="w-4 h-4" /> View on GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Project Card ───────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: FeaturedProject; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden cursor-pointer
        hover:border-slate-600 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5
        transition-all duration-200 group flex flex-col"
    >
      {/* Top bar — thin accent line, no gradient fill */}
      <div className="h-1 bg-slate-700 group-hover:bg-purple-500/60 transition-colors" />

      {/* Body */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Name + icon */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
            <Code2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-sm leading-tight group-hover:text-purple-300 transition line-clamp-1">
              {project.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{project.owner_name}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 flex-1">
          {project.description || 'No description provided.'}
        </p>

        {/* Tech pills */}
        <div className="flex flex-wrap gap-1.5">
          {project.programming_language && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-slate-400 flex items-center gap-1 capitalize">
              <Tag className="w-2.5 h-2.5" /> {project.programming_language}
            </span>
          )}
          {project.project_type && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-slate-400 flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" /> {TYPE_LABELS[project.project_type] || project.project_type}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800" />

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2">
          <AvatarStack contributors={project.contributors} />

          {/* GitHub link — visible on hover */}
          {project.github_repo && (
            <a
              href={project.github_repo}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition text-[11px] font-medium opacity-0 group-hover:opacity-100"
            >
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ────────────────────────────────────────────────────────────

export default function FeaturedCarousel() {
  const [selected, setSelected] = useState<FeaturedProject | null>(null)
  const [search, setSearch]     = useState('')

  const { data, isLoading: loading } = useFeaturedProjects()
  const projects: FeaturedProject[] = (data as FeaturedProject[]) || []

  const filtered = projects.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.programming_language || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-52 bg-slate-800/50 rounded-2xl animate-pulse border border-slate-700/40" />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No public projects yet.</p>
        <p className="text-xs mt-1 text-slate-600">
          Set a project's visibility to <strong className="text-slate-400">Public</strong> to feature it here.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, owner, or language…"
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(p => (
          <ProjectCard key={p.id} project={p} onClick={() => setSelected(p)} />
        ))}
      </div>

      {filtered.length === 0 && search && (
        <p className="text-center text-slate-500 text-sm py-12">No projects match "{search}"</p>
      )}

      {/* Detail modal */}
      {selected && (
        <ProjectDetailModal project={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
