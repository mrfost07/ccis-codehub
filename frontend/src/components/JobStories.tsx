import { useState, useEffect, useRef, useCallback } from 'react'
import { Briefcase, MapPin, Bookmark, BookmarkCheck, ExternalLink, ChevronLeft, ChevronRight, Building2, X } from 'lucide-react'
import { jobsAPI } from '../services/api'
import { useJobs } from '../hooks/useApiCache'
import toast from 'react-hot-toast'

interface Job {
  id: string
  title: string
  company: string
  company_logo: string
  location: string
  job_type: string
  apply_url: string
  skills_required: string[]
  posted_at: string | null
  skill_match: { score: number; matched: string[]; missing: string[] }
  is_saved: boolean
}

const TYPE_COLORS: Record<string, string> = {
  fulltime:    'bg-blue-500/20 text-blue-300',
  parttime:    'bg-purple-500/20 text-purple-300',
  internship:  'bg-emerald-500/20 text-emerald-300',
  contract:    'bg-amber-500/20 text-amber-300',
  remote:      'bg-cyan-500/20 text-cyan-300',
}
const TYPE_LABELS: Record<string, string> = {
  fulltime: 'Full-time', parttime: 'Part-time',
  internship: 'Internship', contract: 'Contract', remote: 'Remote',
}

const GRADIENTS = [
  'from-purple-500 to-purple-700',
  'from-green-600 to-green-700',
  'from-purple-600 to-violet-700',
  'from-amber-500 to-amber-700',
  'from-purple-400 to-purple-600',
  'from-green-500 to-emerald-700',
]

// ─── Expanded Modal ──────────────────────────────────────────────────────────
function JobModal({ job, onClose, onToggleSave }: { job: Job; onClose: () => void; onToggleSave: (id: string, saved: boolean) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const score = job.skill_match?.score ?? 0
  // Fix "None None" — filter out null/undefined/literal "None" values
  const location = job.location && job.location !== 'None' && job.location !== 'null' ? job.location : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-md bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700/50 shadow-2xl flex flex-col max-h-[70vh] sm:max-h-[85vh] mb-16 sm:mb-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-8 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Compact header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
            {job.company_logo
              ? <img src={job.company_logo} alt={job.company} className="w-full h-full object-contain p-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <Building2 className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight line-clamp-1">{job.title}</p>
            <p className="text-slate-400 text-xs truncate">{job.company}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Location + type pills */}
          <div className="flex flex-wrap gap-2">
            {location && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {location}
              </span>
            )}
            {job.job_type && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[job.job_type] || 'bg-slate-700 text-slate-300'}`}>
                {TYPE_LABELS[job.job_type] || job.job_type}
              </span>
            )}
          </div>

          {/* Skill match bar */}
          {score > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Skill match</span>
                <span className={score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-slate-400'}>
                  {score}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full">
                <div className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-slate-600'}`}
                  style={{ width: `${score}%` }} />
              </div>
            </div>
          )}

          {/* Skills */}
          {job.skills_required.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.skills_required.slice(0, 6).map(s => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* Actions — pinned at bottom */}
        <div className="flex gap-2 px-4 py-3 border-t border-slate-800">
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" /> Apply Now
          </a>
          <button
            onClick={() => onToggleSave(job.id, job.is_saved)}
            className={`px-4 py-2.5 rounded-xl border transition ${job.is_saved ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}>
            {job.is_saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Story Card ───────────────────────────────────────────────────────────────
function StoryCard({ job, idx, onClick, onToggleSave }: {
  job: Job; idx: number; onClick: () => void; onToggleSave: (id: string, saved: boolean) => void
}) {
  const score = job.skill_match?.score ?? 0
  const grad  = GRADIENTS[idx % GRADIENTS.length]
  const hasLogo = !!job.company_logo

  return (
    <div
      onClick={onClick}
      className="flex-none w-28 sm:w-32 cursor-pointer group"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* Story card */}
      <div className={`relative w-full aspect-[9/14] rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-purple-400 transition-all duration-200 shadow-lg group-hover:shadow-purple-500/20 group-hover:-translate-y-1 ${!hasLogo ? `bg-gradient-to-b ${grad}` : 'bg-slate-800'}`}>

        {/* Background: company logo fills the card */}
        {hasLogo && (
          <img
            src={job.company_logo}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}

        {/* Top gradient fade (so avatar is visible over logo) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

        {/* Bottom text overlay — dark gradient for readability */}
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Company logo avatar top-center */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur border-2 border-white/40 flex items-center justify-center overflow-hidden z-10">
          {hasLogo
            ? <img src={job.company_logo} alt={job.company} className="w-full h-full object-contain p-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : <Building2 className="w-4 h-4 text-white" />}
        </div>

        {/* Skill match badge */}
        {score > 0 && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur rounded-full px-1.5 py-0.5 z-10">
            <span className={`text-[9px] font-bold ${score >= 70 ? 'text-emerald-300' : score >= 40 ? 'text-amber-300' : 'text-white'}`}>
              {score}%
            </span>
          </div>
        )}

        {/* Bottom text — sits above the dark gradient */}
        <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
          <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2 drop-shadow">{job.title}</p>
          <p className="text-white/70 text-[9px] mt-0.5 truncate drop-shadow">{job.company}</p>
        </div>

        {/* Save button */}
        <button
          onClick={e => { e.stopPropagation(); onToggleSave(job.id, job.is_saved) }}
          className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition z-10
            ${job.is_saved ? 'bg-blue-500 text-white' : 'bg-black/30 text-white/70 opacity-0 group-hover:opacity-100'}`}
        >
          {job.is_saved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
        </button>
      </div>

      {/* Label below */}
      <p className="text-center text-[10px] text-slate-400 mt-1.5 truncate px-1">{job.company}</p>
    </div>
  )
}


// ─── Main Export ──────────────────────────────────────────────────────────────
export default function JobStories() {
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Job | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft]   = useState(false)
  const [canRight, setCanRight] = useState(true)

  // Cached query — persists across navigation
  const { data: rawJobs, isLoading: loading } = useJobs({ page_size: 12 })
  const jobs: Job[] = ((rawJobs as Job[]) || []).map(j => ({
    ...j,
    is_saved: savedOverrides[j.id] !== undefined ? savedOverrides[j.id] : j.is_saved,
  }))

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 10)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  const scroll = (dir: 'left' | 'right') =>
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })

  const handleToggleSave = async (id: string, isSaved: boolean) => {
    try {
      if (isSaved) { await jobsAPI.unsaveJob(id); toast.success('Removed from saved') }
      else          { await jobsAPI.saveJob(id);   toast.success('Job saved!') }
      setSavedOverrides(prev => ({ ...prev, [id]: !isSaved }))
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, is_saved: !isSaved } : null)
    } catch { toast.error('Could not update') }
  }

  if (loading) {
    return (
      <div className="mb-5">
        <div className="flex gap-3 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-none w-28 sm:w-32">
              <div className="w-full aspect-[9/14] rounded-2xl bg-slate-800/60 animate-pulse" />
              <div className="h-2.5 bg-slate-800/60 rounded mt-2 mx-2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (jobs.length === 0) return null

  return (
    <>
      <div className="mb-5">
        {/* Section label */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-400" />
            Job Opportunities
          </h3>
          <span className="text-xs text-slate-500">{jobs.length} matching jobs</span>
        </div>

        {/* Carousel */}
        <div className="relative group/stories">
          {/* Left arrow */}
          <button
            onClick={() => scroll('left')}
            disabled={!canLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10
              w-8 h-8 rounded-full bg-slate-800 border border-slate-600 shadow-md
              flex items-center justify-center text-white hover:bg-slate-700 transition
              opacity-0 group-hover/stories:opacity-100 disabled:opacity-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={scrollRef}
            onScroll={updateArrows}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {jobs.map((job, idx) => (
              <StoryCard
                key={job.id}
                job={job}
                idx={idx}
                onClick={() => setSelected(job)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scroll('right')}
            disabled={!canRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10
              w-8 h-8 rounded-full bg-slate-800 border border-slate-600 shadow-md
              flex items-center justify-center text-white hover:bg-slate-700 transition
              opacity-0 group-hover/stories:opacity-100 disabled:opacity-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <JobModal
          job={selected}
          onClose={() => setSelected(null)}
          onToggleSave={handleToggleSave}
        />
      )}
    </>
  )
}
