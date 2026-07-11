import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from '../components/Navbar'
import { jobsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  Search, MapPin, Briefcase, Bookmark, BookmarkCheck,
  ExternalLink, RefreshCw, ChevronLeft, ChevronRight,
  Building2, Zap, X, Filter, TrendingUp, Clock
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface SkillMatch {
  score: number
  matched: string[]
  missing: string[]
  total_required: number
}

interface Job {
  id: string
  title: string
  company: string
  company_logo: string
  location: string
  job_type: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  description: string
  apply_url: string
  skills_required: string[]
  posted_at: string | null
  cached_at: string
  skill_match: SkillMatch
  is_saved: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  fulltime:    'Full-time',
  parttime:    'Part-time',
  internship:  'Internship',
  contract:    'Contract',
  remote:      'Remote',
}

const TYPE_COLORS: Record<string, string> = {
  fulltime:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
  parttime:    'bg-purple-500/20 text-purple-300 border-purple-500/30',
  internship:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  contract:    'bg-amber-500/20 text-amber-300 border-amber-500/30',
  remote:      'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
}

const SCORE_COLOR = (s: number) =>
  s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-amber-400' : 'text-slate-400'

const SCORE_BG = (s: number) =>
  s >= 70 ? 'bg-emerald-500/20 border-emerald-500/30' :
  s >= 40 ? 'bg-amber-500/20 border-amber-500/30' :
            'bg-slate-700/40 border-slate-600/30'

function timeAgo(iso: string | null): string {
  if (!iso) return 'Recently'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d}d ago`
  if (d < 60) return '1mo ago'
  return `${Math.floor(d / 30)}mo ago`
}

function salary(job: Job): string {
  if (!job.salary_min && !job.salary_max) return ''
  const cur = job.salary_currency || 'PHP'
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
  if (job.salary_min && job.salary_max)
    return `${cur} ${fmt(job.salary_min)}–${fmt(job.salary_max)}`
  if (job.salary_min) return `${cur} ${fmt(job.salary_min)}+`
  return `Up to ${cur} ${fmt(job.salary_max!)}`
}

// ─── Job Card ──────────────────────────────────────────────────────────────

function JobCard({
  job, selected, onClick, onToggleSave,
}: {
  job: Job
  selected: boolean
  onClick: () => void
  onToggleSave: (id: string, saved: boolean) => void
}) {
  const score = job.skill_match?.score ?? 0

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 group
        ${selected
          ? 'border-blue-500/60 bg-slate-800/90 shadow-lg shadow-blue-500/10'
          : 'border-slate-700/50 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60'
        }`}
    >
      {/* Skill match bar */}
      {score > 0 && (
        <div className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-t-xl transition-all"
          style={{ width: `${score}%` }} />
      )}

      <div className="flex items-start gap-3">
        {/* Logo */}
        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {job.company_logo
            ? <img src={job.company_logo} alt={job.company} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : <Building2 className="w-5 h-5 text-slate-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold line-clamp-1 transition ${selected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
            {job.title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{job.company}</p>
          <div className="flex flex-wrap gap-1.5 mt-2 items-center">
            {job.location && (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" /> {job.location.split(' ').slice(0, 2).join(' ')}
              </span>
            )}
            {job.job_type && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[job.job_type] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                {TYPE_LABELS[job.job_type] || job.job_type}
              </span>
            )}
            {score > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${SCORE_BG(score)} ${SCORE_COLOR(score)}`}>
                {score}% match
              </span>
            )}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={e => { e.stopPropagation(); onToggleSave(job.id, job.is_saved) }}
          className={`p-1.5 rounded-lg transition flex-shrink-0 ${job.is_saved ? 'text-blue-400 bg-blue-500/10' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-700/50'}`}
        >
          {job.is_saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between mt-2">
        {salary(job) && <span className="text-[11px] text-slate-400 font-medium">{salary(job)}</span>}
        <span className="text-[10px] text-slate-600 ml-auto flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" /> {timeAgo(job.posted_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Detail Panel ──────────────────────────────────────────────────────────

function JobDetail({ job, onClose, onToggleSave }: {
  job: Job
  onClose: () => void
  onToggleSave: (id: string, saved: boolean) => void
}) {
  const score = job.skill_match?.score ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {job.company_logo
                ? <img src={job.company_logo} alt={job.company} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                : <Building2 className="w-6 h-6 text-slate-500" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white leading-tight">{job.title}</h2>
              <p className="text-sm text-slate-400 mt-0.5">{job.company}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {job.location && (
            <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
              <MapPin className="w-3 h-3" /> {job.location}
            </span>
          )}
          {job.job_type && (
            <span className={`text-xs px-2 py-1 rounded-lg border ${TYPE_COLORS[job.job_type] || ''}`}>
              {TYPE_LABELS[job.job_type] || job.job_type}
            </span>
          )}
          {salary(job) && (
            <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
              {salary(job)}
            </span>
          )}
        </div>
      </div>

      {/* Skill match */}
      {job.skill_match && job.skill_match.total_required > 0 && (
        <div className="px-5 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Skill Match
            </span>
            <span className={`text-sm font-bold ${SCORE_COLOR(score)}`}>{score}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-slate-500'}`}
              style={{ width: `${score}%` }} />
          </div>
          {job.skill_match.matched.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {job.skill_match.matched.map(sk => (
                <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">{sk}</span>
              ))}
            </div>
          )}
          {job.skill_match.missing.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {job.skill_match.missing.slice(0, 6).map(sk => (
                <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 text-slate-500 border border-slate-600/30">{sk}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {job.description && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>
        )}
        {job.skills_required.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.skills_required.map(sk => (
                <span key={sk} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">{sk}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-slate-700/50 flex gap-3">
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2">
          <ExternalLink className="w-4 h-4" /> Apply Now
        </a>
        <button
          onClick={() => onToggleSave(job.id, job.is_saved)}
          className={`px-4 py-2.5 rounded-xl border transition text-sm flex items-center gap-2 ${job.is_saved ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}>
          {job.is_saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          {job.is_saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function Jobs() {
  const { user } = useAuth()
  const [jobs, setJobs]           = useState<Job[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(false)
  const [selected, setSelected]   = useState<Job | null>(null)
  const [showSaved, setShowSaved] = useState(false)
  const [savedJobs, setSavedJobs] = useState<Job[]>([])

  // Filters
  const [q, setQ]             = useState('')
  const [typeFilter, setType] = useState('')
  const [locFilter, setLoc]   = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchJobs = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await jobsAPI.getJobs({ q, type: typeFilter, location: locFilter, page: p, page_size: 20 })
      setJobs(res.data.results || [])
      setTotal(res.data.count || 0)
      setTotalPages(res.data.total_pages || 1)
      setPage(p)
    } catch { setJobs([]) }
    finally { setLoading(false) }
  }, [q, typeFilter, locFilter])

  const fetchSaved = useCallback(async () => {
    try {
      const res = await jobsAPI.getSavedJobs()
      setSavedJobs(Array.isArray(res.data) ? res.data : [])
    } catch { setSavedJobs([]) }
  }, [])

  useEffect(() => { fetchJobs(1) }, [fetchJobs])
  useEffect(() => { fetchSaved() }, [fetchSaved])

  const handleSearch = (val: string) => {
    setQ(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchJobs(1), 500)
  }

  const handleToggleSave = async (id: string, isSaved: boolean) => {
    try {
      if (isSaved) {
        await jobsAPI.unsaveJob(id)
        toast.success('Removed from saved')
      } else {
        await jobsAPI.saveJob(id)
        toast.success('Job saved!')
      }
      const update = (j: Job) => j.id === id ? { ...j, is_saved: !isSaved } : j
      setJobs(prev => prev.map(update))
      setSavedJobs(prev => isSaved ? prev.filter(j => j.id !== id) : prev)
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, is_saved: !isSaved } : null)
      fetchSaved()
    } catch { toast.error('Could not update saved status') }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await jobsAPI.syncJobs()
      toast.success(`Sync complete: ${res.data.created} new, ${res.data.updated} updated`)
      fetchJobs(1)
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Sync failed')
    } finally { setSyncing(false) }
  }

  const displayJobs = showSaved ? savedJobs : jobs

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-400" /> Job Board
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {total} IT jobs · matched to your skills
            </p>
          </div>
          <div className="flex gap-2">
            {(user?.role === 'admin' || user?.role === 'instructor') && (
              <button onClick={handleSync} disabled={syncing}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white hover:border-slate-600 transition disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-blue-400' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync Jobs'}
              </button>
            )}
            <button onClick={() => setShowSaved(s => !s)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition border ${showSaved ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}>
              <BookmarkCheck className="w-4 h-4" />
              Saved ({savedJobs.length})
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        {!showSaved && (
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={q} onChange={e => handleSearch(e.target.value)}
                placeholder="Search job title, company, skill…"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select value={typeFilter} onChange={e => { setType(e.target.value); fetchJobs(1) }}
                className="bg-transparent text-sm text-slate-300 py-2.5 pr-2 focus:outline-none">
                <option value="">All Types</option>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={locFilter} onChange={e => { setLoc(e.target.value); fetchJobs(1) }}
                placeholder="Location"
                className="pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36" />
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="flex gap-4 h-[calc(100vh-13rem)]">
          {/* Job list */}
          <div className={`flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-hide transition-all ${selected ? 'w-full lg:w-96 flex-shrink-0' : 'w-full'}`}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse border border-slate-700/30" />
              ))
            ) : displayJobs.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{showSaved ? 'No saved jobs yet.' : 'No jobs found.'}</p>
                {!showSaved && (
                  <p className="text-xs mt-1 text-slate-600">
                    Try syncing jobs or adjusting your filters.
                  </p>
                )}
              </div>
            ) : (
              displayJobs.map(job => (
                <JobCard key={job.id} job={job} selected={selected?.id === job.id}
                  onClick={() => setSelected(s => s?.id === job.id ? null : job)}
                  onToggleSave={handleToggleSave} />
              ))
            )}

            {/* Pagination */}
            {!showSaved && totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4">
                <button onClick={() => fetchJobs(page - 1)} disabled={page <= 1}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
                <button onClick={() => fetchJobs(page + 1)} disabled={page >= totalPages}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="hidden lg:flex flex-1 flex-col bg-slate-900/70 border border-slate-700/50 rounded-2xl overflow-hidden">
              <JobDetail job={selected} onClose={() => setSelected(null)} onToggleSave={handleToggleSave} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
