import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useCareerPaths, useEnrollments } from '../hooks/useApiCache'
import { ArrowUpRight, Search, BookOpen, Video, Code, Trophy, CheckCircle, Circle, Play, Clock, Layers, Users, SlidersHorizontal } from 'lucide-react'
import codingService, { CodingChallenge, CodingStats } from '../services/codingService'
import videoService, { VideoCourse } from '../services/videoService'
import { SkeletonCard, Skeleton, SkeletonListRow, Modal, Button } from '../components/ui'

interface CareerPath {
  id: string
  slug: string
  title: string
  name?: string
  description: string
  duration: string
  estimated_duration?: number
  difficulty_level: string
  modules_count?: number
  total_modules?: number
  enrolled_count?: number
  icon?: string
  program_type?: string
  created_at?: string
}

interface FilterOption {
  value: string
  label: string
  count: number
}

/** Checkbox filter group used in the catalog sidebars (DESIGN_SYSTEM.md §11 filter pattern). */
function FilterGroup({ title, options, selected, onToggle, divider = true }: {
  title: string
  options: FilterOption[]
  selected: string[]
  onToggle: (value: string) => void
  divider?: boolean
}) {
  return (
    <div className={divider ? 'border-b border-neutral-800 pb-5' : ''}>
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">{title}</p>
      <div className="space-y-0.5">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2.5 py-1 text-sm text-neutral-400 hover:text-neutral-200 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="h-4 w-4 rounded accent-purple-600"
            />
            <span className="flex-1">{opt.label}</span>
            <span className="text-xs text-neutral-600 tabular-nums">{opt.count}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

/** Sticky desktop filters rail with header + clear-all. */
function FiltersSidebar({ hasActive, onClear, children }: {
  hasActive: boolean
  onClear: () => void
  children: React.ReactNode
}) {
  return (
    <aside className="hidden lg:block w-56 shrink-0 sticky top-20">
      <div className="flex items-center justify-between mb-5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
          <SlidersHorizontal className="w-4 h-4 text-neutral-400" /> Filters
        </span>
        {hasActive && (
          <button onClick={onClear} className="text-xs text-neutral-500 hover:text-purple-400 transition-colors">
            Clear all
          </button>
        )}
      </div>
      {children}
    </aside>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  web_dev: 'Web Development', mobile: 'Mobile', python: 'Python', javascript: 'JavaScript',
  java: 'Java', data_science: 'Data Science', algorithms: 'Algorithms', basics: 'Basics',
  arrays: 'Arrays', strings: 'Strings', math: 'Math', sorting: 'Sorting', dp: 'Dynamic Programming',
}
const categoryLabel = (v: string) =>
  CATEGORY_LABELS[v] || v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const formatMinutes = (m: number) =>
  m < 60 ? `${m} min` : `${Math.round((m / 60) * 10) / 10} hrs`

export default function LearningEnhanced() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [levelFilters, setLevelFilters] = useState<string[]>([])
  const [programFilters, setProgramFilters] = useState<string[]>([])
  const [lengthFilters, setLengthFilters] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'title' | 'duration'>('popular')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'courses' | 'videos' | 'hands-on'>('courses')

  // Coding challenges state (catalog fetched once; filtered client-side)
  const [challenges, setChallenges] = useState<CodingChallenge[]>([])
  const [codingStats, setCodingStats] = useState<CodingStats | null>(null)
  const [challengesLoading, setChallengesLoading] = useState(false)
  const [challengeSearch, setChallengeSearch] = useState('')
  const [challengeDifficultyFilters, setChallengeDifficultyFilters] = useState<string[]>([])
  const [challengeCategoryFilters, setChallengeCategoryFilters] = useState<string[]>([])
  const [challengeStatusFilters, setChallengeStatusFilters] = useState<string[]>([])
  const [challengeSort, setChallengeSort] = useState<'default' | 'title' | 'difficulty' | 'acceptance'>('default')
  const [showChallengeFilters, setShowChallengeFilters] = useState(false)

  // Video courses state (catalog fetched once; filtered client-side)
  const [videoCourses, setVideoCourses] = useState<VideoCourse[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [videoSearch, setVideoSearch] = useState('')
  const [videoLevelFilters, setVideoLevelFilters] = useState<string[]>([])
  const [videoCategoryFilters, setVideoCategoryFilters] = useState<string[]>([])
  const [videoLengthFilters, setVideoLengthFilters] = useState<string[]>([])
  const [videoSort, setVideoSort] = useState<'default' | 'title' | 'shortest' | 'lessons'>('default')
  const [showVideoFilters, setShowVideoFilters] = useState(false)

  // Load coding challenges when tab becomes active
  useEffect(() => {
    if (activeTab === 'hands-on' && challenges.length === 0) {
      loadChallenges()
      loadCodingStats()
    }
  }, [activeTab])

  // Load video courses when tab becomes active
  useEffect(() => {
    if (activeTab === 'videos' && videoCourses.length === 0) {
      loadVideoCourses()
    }
  }, [activeTab])

  const loadChallenges = async () => {
    setChallengesLoading(true)
    try {
      setChallenges(await codingService.getChallenges())
    } catch { /* ignore */ } finally { setChallengesLoading(false) }
  }

  const loadCodingStats = async () => {
    try { setCodingStats(await codingService.getStats()) } catch { /* ignore */ }
  }

  const loadVideoCourses = async () => {
    setVideosLoading(true)
    try {
      setVideoCourses(await videoService.getCourses())
    } catch { /* ignore */ } finally { setVideosLoading(false) }
  }
  const navigate = useNavigate()

  // Fetch the full catalog once (cached); search/difficulty filter client-side below,
  // so typing in the search box doesn't refetch on every keystroke.
  const { data: careerPathsData, isLoading: pathsLoading } = useCareerPaths()
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useEnrollments()

  const careerPaths: CareerPath[] = careerPathsData || []
  const enrollments: any[] = enrollmentsData || []
  const loading = pathsLoading || enrollmentsLoading

  // Compute enrolled path IDs from enrollments
  const enrolledPathIds = useMemo(() => {
    return new Set<string>(enrollments.map((e: any) => {
      const pathId = e.career_path?.id || e.career_path || e.path_id
      return String(pathId)
    }))
  }, [enrollments])

  const tabs = [
    { id: 'courses' as const, label: 'Learning Center', icon: BookOpen, active: true },
    { id: 'videos' as const, label: 'Video Courses', icon: Video, active: true },
    { id: 'hands-on' as const, label: 'Hands On', icon: Code, active: true }
  ]

  const getEnrollmentProgress = (pathId: string) => {
    const enrollment = enrollments.find(e => {
      const enrolledPathId = e.career_path?.id || e.career_path || e.path_id
      return String(enrolledPathId) === String(pathId)
    })
    // Clamp so a bad backend value can never overflow the bar
    return Math.min(100, Math.max(0, enrollment?.progress_percentage || 0))
  }

  /** Mutually exclusive learning status for a path, derived from enrollments. */
  const getPathStatus = (pathId: string): 'completed' | 'in_progress' | 'enrolled' | 'not_enrolled' => {
    const enrollment = enrollments.find(e => {
      const enrolledPathId = e.career_path?.id || e.career_path || e.path_id
      return String(enrolledPathId) === String(pathId)
    })
    if (!enrollment) return 'not_enrolled'
    const progress = Math.min(100, Math.max(0, enrollment.progress_percentage || 0))
    if (enrollment.status === 'completed' || progress >= 100) return 'completed'
    if (progress > 0) return 'in_progress'
    return 'enrolled'
  }

  const getDifficultyColor = (level: string) => {
    const lowerLevel = level?.toLowerCase() || ''
    if (lowerLevel.includes('beginner')) return 'text-green-400 bg-green-500/10 border-green-500/30'
    if (lowerLevel.includes('intermediate')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    if (lowerLevel.includes('advanced')) return 'text-red-400 bg-red-500/10 border-red-500/30'
    return 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  }

  // Get path display values (handle different API response formats)
  const getPathTitle = (path: CareerPath) => path.title || path.name || 'Untitled'
  const getPathDuration = (path: CareerPath) => {
    const raw = path.duration || (path.estimated_duration ? `${path.estimated_duration} weeks` : 'N/A')
    // Fix "1 weeks" → "1 week"
    return raw.replace(/(\d+)\s+weeks?/, (_, n) => `${n} ${n === '1' ? 'week' : 'weeks'}`)
              .replace(/(\d+)\s+days?/,  (_, n) => `${n} ${n === '1' ? 'day'  : 'days'}`)
              .replace(/(\d+)\s+months?/,(_, n) => `${n} ${n === '1' ? 'month': 'months'}`)
  }
  const getPathModules = (path: CareerPath) => path.modules_count ?? path.total_modules ?? 0
  const getPathEnrolled = (path: CareerPath) => path.enrolled_count ?? 0

  // Duration buckets (estimated_duration is in weeks)
  const getLengthBucket = (path: CareerPath): string | null => {
    const weeks = path.estimated_duration
    if (weeks == null) return null
    if (weeks <= 4) return 'short'
    if (weeks <= 10) return 'medium'
    return 'long'
  }

  const STATUS_OPTIONS = [
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'enrolled', label: 'Enrolled — not started' },
    { value: 'not_enrolled', label: 'Not enrolled' },
  ]
  const LEVEL_OPTIONS = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ]
  const PROGRAM_OPTIONS = [
    { value: 'bsit', label: 'BSIT' },
    { value: 'bscs', label: 'BSCS' },
    { value: 'bsis', label: 'BSIS' },
    { value: 'general', label: 'General' },
  ]
  const LENGTH_OPTIONS = [
    { value: 'short', label: 'Under 5 weeks' },
    { value: 'medium', label: '5–10 weeks' },
    { value: 'long', label: '10+ weeks' },
  ]

  const countByStatus = (v: string) =>
    careerPaths.filter(p => getPathStatus(p.id) === v).length
  const countByLevel = (v: string) =>
    careerPaths.filter(p => p.difficulty_level?.toLowerCase().includes(v)).length
  const countByProgram = (v: string) =>
    careerPaths.filter(p => p.program_type === v).length
  const countByLength = (v: string) =>
    careerPaths.filter(p => getLengthBucket(p) === v).length

  const toggleFilter = (list: string[], value: string, set: (next: string[]) => void) =>
    set(list.includes(value) ? list.filter(x => x !== value) : [...list, value])

  const hasActiveFilters = statusFilters.length > 0 || levelFilters.length > 0 || programFilters.length > 0 || lengthFilters.length > 0
  const clearFilters = () => {
    setStatusFilters([])
    setLevelFilters([])
    setProgramFilters([])
    setLengthFilters([])
  }

  // Filter + sort, all client-side (catalog is fetched once)
  const filteredPaths = useMemo(() => {
    const result = careerPaths.filter(path => {
      const matchesSearch = searchQuery === '' ||
        getPathTitle(path).toLowerCase().includes(searchQuery.toLowerCase()) ||
        path.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const level = path.difficulty_level?.toLowerCase() || ''
      const matchesLevel = levelFilters.length === 0 || levelFilters.some(f => level.includes(f))

      const matchesProgram = programFilters.length === 0 || (path.program_type != null && programFilters.includes(path.program_type))

      const bucket = getLengthBucket(path)
      const matchesLength = lengthFilters.length === 0 || (bucket !== null && lengthFilters.includes(bucket))

      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(getPathStatus(path.id))

      return matchesSearch && matchesLevel && matchesProgram && matchesLength && matchesStatus
    })

    switch (sortBy) {
      case 'newest':
        return [...result].sort((a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      case 'title':
        return [...result].sort((a, b) => getPathTitle(a).localeCompare(getPathTitle(b)))
      case 'duration':
        return [...result].sort((a, b) => (a.estimated_duration ?? Infinity) - (b.estimated_duration ?? Infinity))
      default: // 'popular'
        return [...result].sort((a, b) => (b.enrolled_count ?? 0) - (a.enrolled_count ?? 0))
    }
  }, [careerPaths, enrollments, searchQuery, statusFilters, levelFilters, programFilters, lengthFilters, sortBy])

  // Filter groups — rendered in the desktop sidebar and the mobile Filters modal
  const courseFilterGroups = (
    <div className="space-y-5">
      <FilterGroup
        title="Status"
        options={STATUS_OPTIONS.map(o => ({ ...o, count: countByStatus(o.value) }))}
        selected={statusFilters}
        onToggle={(v) => toggleFilter(statusFilters, v, setStatusFilters)}
      />
      <FilterGroup
        title="Level"
        options={LEVEL_OPTIONS.map(o => ({ ...o, count: countByLevel(o.value) }))}
        selected={levelFilters}
        onToggle={(v) => toggleFilter(levelFilters, v, setLevelFilters)}
      />
      <FilterGroup
        title="Program"
        options={PROGRAM_OPTIONS.map(o => ({ ...o, count: countByProgram(o.value) }))}
        selected={programFilters}
        onToggle={(v) => toggleFilter(programFilters, v, setProgramFilters)}
      />
      <FilterGroup
        title="Length"
        options={LENGTH_OPTIONS.map(o => ({ ...o, count: countByLength(o.value) }))}
        selected={lengthFilters}
        onToggle={(v) => toggleFilter(lengthFilters, v, setLengthFilters)}
        divider={false}
      />
    </div>
  )

  // ── Videos: derived filtering/sorting ──────────────────────────────────────
  const videoLengthBucket = (minutes: number) =>
    minutes < 60 ? 'short' : minutes <= 180 ? 'medium' : 'long'
  const VIDEO_LENGTH_OPTIONS = [
    { value: 'short', label: 'Under 1 hour' },
    { value: 'medium', label: '1–3 hours' },
    { value: 'long', label: '3+ hours' },
  ]
  const videoCategories = useMemo(() =>
    Array.from(new Set(videoCourses.map(v => v.category).filter(Boolean))).sort(), [videoCourses])

  const hasActiveVideoFilters = videoLevelFilters.length > 0 || videoCategoryFilters.length > 0 || videoLengthFilters.length > 0
  const clearVideoFilters = () => {
    setVideoLevelFilters([])
    setVideoCategoryFilters([])
    setVideoLengthFilters([])
  }

  const filteredVideos = useMemo(() => {
    const q = videoSearch.toLowerCase()
    const result = videoCourses.filter(v => {
      const matchesSearch = q === '' ||
        v.title.toLowerCase().includes(q) ||
        v.instructor_name?.toLowerCase().includes(q)
      const matchesLevel = videoLevelFilters.length === 0 || videoLevelFilters.includes(v.difficulty?.toLowerCase())
      const matchesCategory = videoCategoryFilters.length === 0 || videoCategoryFilters.includes(v.category)
      const matchesLength = videoLengthFilters.length === 0 || videoLengthFilters.includes(videoLengthBucket(v.total_duration_minutes ?? 0))
      return matchesSearch && matchesLevel && matchesCategory && matchesLength
    })
    switch (videoSort) {
      case 'title': return [...result].sort((a, b) => a.title.localeCompare(b.title))
      case 'shortest': return [...result].sort((a, b) => (a.total_duration_minutes ?? 0) - (b.total_duration_minutes ?? 0))
      case 'lessons': return [...result].sort((a, b) => (b.lessons_count ?? 0) - (a.lessons_count ?? 0))
      default: return result
    }
  }, [videoCourses, videoSearch, videoLevelFilters, videoCategoryFilters, videoLengthFilters, videoSort])

  const videoFilterGroups = (
    <div className="space-y-5">
      <FilterGroup
        title="Level"
        options={LEVEL_OPTIONS.map(o => ({ ...o, count: videoCourses.filter(v => v.difficulty?.toLowerCase() === o.value).length }))}
        selected={videoLevelFilters}
        onToggle={(v) => toggleFilter(videoLevelFilters, v, setVideoLevelFilters)}
      />
      <FilterGroup
        title="Category"
        options={videoCategories.map(c => ({ value: c, label: categoryLabel(c), count: videoCourses.filter(v => v.category === c).length }))}
        selected={videoCategoryFilters}
        onToggle={(v) => toggleFilter(videoCategoryFilters, v, setVideoCategoryFilters)}
      />
      <FilterGroup
        title="Length"
        options={VIDEO_LENGTH_OPTIONS.map(o => ({ ...o, count: videoCourses.filter(v => videoLengthBucket(v.total_duration_minutes ?? 0) === o.value).length }))}
        selected={videoLengthFilters}
        onToggle={(v) => toggleFilter(videoLengthFilters, v, setVideoLengthFilters)}
        divider={false}
      />
    </div>
  )

  // ── Challenges: derived filtering/sorting ──────────────────────────────────
  const challengeStatusOf = (c: CodingChallenge) =>
    c.user_status === 'solved' ? 'solved' : c.user_status === 'attempted' ? 'attempted' : 'todo'
  const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
  const CHALLENGE_STATUS_OPTIONS = [
    { value: 'solved', label: 'Solved' },
    { value: 'attempted', label: 'Attempted' },
    { value: 'todo', label: 'To do' },
  ]
  const challengeCategories = useMemo(() =>
    Array.from(new Set(challenges.map(c => c.category).filter(Boolean))).sort(), [challenges])

  const hasActiveChallengeFilters = challengeDifficultyFilters.length > 0 || challengeCategoryFilters.length > 0 || challengeStatusFilters.length > 0
  const clearChallengeFilters = () => {
    setChallengeDifficultyFilters([])
    setChallengeCategoryFilters([])
    setChallengeStatusFilters([])
  }

  const filteredChallenges = useMemo(() => {
    const q = challengeSearch.toLowerCase()
    const result = challenges.filter(c => {
      const matchesSearch = q === '' || c.title.toLowerCase().includes(q)
      const matchesDifficulty = challengeDifficultyFilters.length === 0 || challengeDifficultyFilters.includes(c.difficulty)
      const matchesCategory = challengeCategoryFilters.length === 0 || challengeCategoryFilters.includes(c.category)
      const matchesStatus = challengeStatusFilters.length === 0 || challengeStatusFilters.includes(challengeStatusOf(c))
      return matchesSearch && matchesDifficulty && matchesCategory && matchesStatus
    })
    switch (challengeSort) {
      case 'title': return [...result].sort((a, b) => a.title.localeCompare(b.title))
      case 'difficulty': return [...result].sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 3) - (DIFFICULTY_ORDER[b.difficulty] ?? 3))
      case 'acceptance': return [...result].sort((a, b) => (b.acceptance_rate ?? 0) - (a.acceptance_rate ?? 0))
      default: return result
    }
  }, [challenges, challengeSearch, challengeDifficultyFilters, challengeCategoryFilters, challengeStatusFilters, challengeSort])

  const challengeFilterGroups = (
    <div className="space-y-5">
      <FilterGroup
        title="Difficulty"
        options={['easy', 'medium', 'hard'].map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1), count: challenges.filter(c => c.difficulty === d).length }))}
        selected={challengeDifficultyFilters}
        onToggle={(v) => toggleFilter(challengeDifficultyFilters, v, setChallengeDifficultyFilters)}
      />
      <FilterGroup
        title="Status"
        options={CHALLENGE_STATUS_OPTIONS.map(o => ({ ...o, count: challenges.filter(c => challengeStatusOf(c) === o.value).length }))}
        selected={challengeStatusFilters}
        onToggle={(v) => toggleFilter(challengeStatusFilters, v, setChallengeStatusFilters)}
      />
      <FilterGroup
        title="Category"
        options={challengeCategories.map(c => ({ value: c, label: categoryLabel(c), count: challenges.filter(ch => ch.category === c).length }))}
        selected={challengeCategoryFilters}
        onToggle={(v) => toggleFilter(challengeCategoryFilters, v, setChallengeCategoryFilters)}
        divider={false}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-950 sm:pb-8">
      <Navbar />

      {/* Tab Navigation */}
      <div className="bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 sm:py-3 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-sm sm:text-base transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
              >
                <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                {!tab.active && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full ml-1">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Learning Center Tab (Active) */}
      {activeTab === 'courses' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Page header (DESIGN_SYSTEM.md §11) */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 mb-6 sm:mb-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">Career paths</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Learning Center</h1>
            <p className="mt-2 text-neutral-400 max-w-3xl leading-relaxed">
              Choose your career path and start your journey to become a professional developer
            </p>
          </div>

          {/* Toolbar: filters (mobile), search, sort */}
          <div className="flex gap-3 mb-6 sm:mb-8">
            <button
              onClick={() => setShowFilters(true)}
              className="lg:hidden inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 text-sm font-medium text-neutral-300 hover:border-neutral-600 hover:text-white transition-colors"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-1.5 text-xs text-purple-300 tabular-nums">
                  {levelFilters.length + programFilters.length + lengthFilters.length}
                </span>
              )}
            </button>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
              <input
                type="text"
                placeholder="What are you looking for? Type to search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-11 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 text-sm text-neutral-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              aria-label="Sort courses"
            >
              <option value="popular">Most popular</option>
              <option value="newest">Newest</option>
              <option value="title">Title A–Z</option>
              <option value="duration">Shortest first</option>
            </select>
          </div>

          {/* Sidebar + catalog */}
          <div className="flex items-start gap-8">
            <FiltersSidebar hasActive={hasActiveFilters} onClear={clearFilters}>
              {courseFilterGroups}
            </FiltersSidebar>

            {/* Results */}
            <div className="flex-1 min-w-0">
              <div className="mb-4 text-xs sm:text-sm text-neutral-500 tabular-nums">
                Showing {filteredPaths.length} of {careerPaths.length} courses
              </div>

          {/* Career Paths Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filteredPaths.length === 0 ? (
            <div className="text-center py-16 sm:py-24 bg-neutral-900/30 rounded-xl border border-neutral-800/50">
              <p className="text-neutral-400 text-base sm:text-lg mb-2">
                {searchQuery || hasActiveFilters ? 'No courses match your filters.' : 'No courses available yet.'}
              </p>
              {(searchQuery || hasActiveFilters) && (
                <button
                  onClick={() => { setSearchQuery(''); clearFilters(); }}
                  className="text-purple-400 hover:text-purple-300 text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              {filteredPaths.map((path) => {
                const isEnrolled = enrolledPathIds.has(String(path.id))
                const progress = getEnrollmentProgress(path.id)
                const status = getPathStatus(path.id)

                return (
                  <div
                    key={path.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/learning/paths/${path.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/learning/paths/${path.id}`) }}
                    className="group flex flex-col h-full cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5 transition-all duration-200 hover:border-neutral-700 hover:shadow-card-hover"
                  >
                    {/* Icon tile + level/duration pills */}
                    <div className="flex items-start justify-between gap-2 mb-6">
                      <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isEnrolled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-green-500/15 text-green-300 border-green-500/30 whitespace-nowrap">
                            <CheckCircle className="w-3 h-3" /> {status === 'completed' ? 'Completed' : 'Enrolled'}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize whitespace-nowrap ${getDifficultyColor(path.difficulty_level)}`}>
                          {path.difficulty_level || 'N/A'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-neutral-800 text-neutral-300 border-neutral-700 whitespace-nowrap tabular-nums">
                          <Clock className="w-3 h-3" /> {getPathDuration(path)}
                        </span>
                      </div>
                    </div>

                    {/* Title with arrow */}
                    <h3 className="text-base sm:text-lg font-semibold text-white leading-snug mb-1.5" title={getPathTitle(path)}>
                      <span className="line-clamp-2">
                        {getPathTitle(path)}
                        <ArrowUpRight className="inline-block w-4 h-4 ml-1 -mt-0.5 text-neutral-600 transition-all group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </h3>

                    {/* Description */}
                    <p className="text-neutral-400 text-sm leading-relaxed line-clamp-3 mb-4">
                      {path.description || 'No description available'}
                    </p>

                    {/* Footer: meta + progress — pinned to bottom */}
                    <div className="mt-auto">
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-500 tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />{getPathModules(path)} modules
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />{getPathEnrolled(path)} enrolled
                        </span>
                      </div>
                      {isEnrolled && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-neutral-400">Your progress</span>
                            <span className="text-neutral-200 font-semibold tabular-nums">{progress}%</span>
                          </div>
                          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full transition-[width] duration-500"
                              style={{ width: `${Math.max(progress, 2)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
            </div>
          </div>

          {/* Mobile filters modal */}
          <Modal
            open={showFilters}
            onClose={() => setShowFilters(false)}
            title="Filters"
            footer={
              <>
                <Button variant="secondary" onClick={clearFilters}>Clear all</Button>
                <Button onClick={() => setShowFilters(false)}>Done</Button>
              </>
            }
          >
            {courseFilterGroups}
          </Modal>
        </div>
      )}

      {/* Video Courses Tab */}
      {activeTab === 'videos' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Page header (DESIGN_SYSTEM.md §11) */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 mb-6 sm:mb-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">Video library</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Video Courses</h1>
            <p className="mt-2 text-neutral-400 max-w-3xl leading-relaxed">
              Learn from expert instructors with curated YouTube video tutorials
            </p>
          </div>

          {/* Toolbar: filters (mobile), search, sort */}
          <div className="flex gap-3 mb-6 sm:mb-8">
            <button
              onClick={() => setShowVideoFilters(true)}
              className="lg:hidden inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 text-sm font-medium text-neutral-300 hover:border-neutral-600 hover:text-white transition-colors"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveVideoFilters && (
                <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-1.5 text-xs text-purple-300 tabular-nums">
                  {videoLevelFilters.length + videoCategoryFilters.length + videoLengthFilters.length}
                </span>
              )}
            </button>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search videos or instructors"
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                className="w-full h-11 bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>
            <select
              value={videoSort}
              onChange={(e) => setVideoSort(e.target.value as typeof videoSort)}
              className="h-11 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 text-sm text-neutral-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              aria-label="Sort video courses"
            >
              <option value="default">Most relevant</option>
              <option value="title">Title A–Z</option>
              <option value="shortest">Shortest first</option>
              <option value="lessons">Most lessons</option>
            </select>
          </div>

          {/* Sidebar + catalog */}
          <div className="flex items-start gap-8">
            <FiltersSidebar hasActive={hasActiveVideoFilters} onClear={clearVideoFilters}>
              {videoFilterGroups}
            </FiltersSidebar>

            <div className="flex-1 min-w-0">
              <div className="mb-4 text-xs sm:text-sm text-neutral-500 tabular-nums">
                Showing {filteredVideos.length} of {videoCourses.length} video courses
              </div>

              {videosLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                      <Skeleton className="aspect-video w-full rounded-none" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="text-center py-16 bg-neutral-900/30 rounded-xl border border-neutral-800/50">
                  <Video className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-400 text-sm">
                    {videoSearch || hasActiveVideoFilters ? 'No video courses match your filters.' : 'No video courses available yet'}
                  </p>
                  {(videoSearch || hasActiveVideoFilters) ? (
                    <button
                      onClick={() => { setVideoSearch(''); clearVideoFilters(); }}
                      className="text-purple-400 hover:text-purple-300 text-sm mt-1"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <p className="text-neutral-600 text-xs mt-1">Check back soon!</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {filteredVideos.map(course => (
                    <div
                      key={course.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(`/learning/videos/${course.slug}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/learning/videos/${course.slug}`) }}
                      className="group flex flex-col cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden transition-all duration-200 hover:border-neutral-700 hover:shadow-card-hover"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-neutral-850 overflow-hidden">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt={course.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-12 h-12 text-neutral-700" />
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded tabular-nums">
                          {course.lessons_count} lessons
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="text-sm font-semibold text-white leading-snug" title={course.title}>
                          <span className="line-clamp-2">
                            {course.title}
                            <ArrowUpRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5 text-neutral-600 transition-all group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1">{course.instructor_name}</p>
                        <div className="mt-auto pt-3 flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize whitespace-nowrap ${getDifficultyColor(course.difficulty)}`}>
                            {course.difficulty}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-neutral-800 text-neutral-300 border-neutral-700 whitespace-nowrap tabular-nums">
                            <Clock className="w-3 h-3" /> {formatMinutes(course.total_duration_minutes ?? 0)}
                          </span>
                        </div>
                        {course.user_progress > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-neutral-400">Your progress</span>
                              <span className="text-neutral-200 font-semibold tabular-nums">{Math.min(100, course.user_progress)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                              <div className="h-1.5 bg-purple-500 rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, course.user_progress)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile filters modal */}
          <Modal
            open={showVideoFilters}
            onClose={() => setShowVideoFilters(false)}
            title="Filters"
            footer={
              <>
                <Button variant="secondary" onClick={clearVideoFilters}>Clear all</Button>
                <Button onClick={() => setShowVideoFilters(false)}>Done</Button>
              </>
            }
          >
            {videoFilterGroups}
          </Modal>
        </div>
      )}

      {/* Hands On Tab */}
      {activeTab === 'hands-on' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Page header (DESIGN_SYSTEM.md §11) */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 mb-6 sm:mb-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">Practice</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Hands On Practice</h1>
            <p className="mt-2 text-neutral-400 max-w-3xl leading-relaxed">
              Solve coding challenges and sharpen your skills
            </p>
          </div>

          {/* Toolbar: filters (mobile), search, sort */}
          <div className="flex gap-3 mb-6 sm:mb-8">
            <button
              onClick={() => setShowChallengeFilters(true)}
              className="lg:hidden inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 text-sm font-medium text-neutral-300 hover:border-neutral-600 hover:text-white transition-colors"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveChallengeFilters && (
                <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-1.5 text-xs text-purple-300 tabular-nums">
                  {challengeDifficultyFilters.length + challengeCategoryFilters.length + challengeStatusFilters.length}
                </span>
              )}
            </button>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search challenges"
                value={challengeSearch}
                onChange={(e) => setChallengeSearch(e.target.value)}
                className="w-full h-11 bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>
            <select
              value={challengeSort}
              onChange={(e) => setChallengeSort(e.target.value as typeof challengeSort)}
              className="h-11 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 text-sm text-neutral-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              aria-label="Sort challenges"
            >
              <option value="default">Most relevant</option>
              <option value="title">Title A–Z</option>
              <option value="difficulty">Easiest first</option>
              <option value="acceptance">Highest acceptance</option>
            </select>
          </div>

          {/* Sidebar + list */}
          <div className="flex items-start gap-8">
            <FiltersSidebar hasActive={hasActiveChallengeFilters} onClear={clearChallengeFilters}>
              {challengeFilterGroups}
            </FiltersSidebar>

            <div className="flex-1 min-w-0">
              {/* Your stats strip */}
              {codingStats && (
                <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 shrink-0">
                      <svg className="w-14 h-14 transform -rotate-90">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="#27272a" strokeWidth="5" />
                        <circle
                          cx="28" cy="28" r="24" fill="none" stroke="#10b981" strokeWidth="5"
                          strokeDasharray={`${codingStats.total_challenges > 0 ? (codingStats.solved / codingStats.total_challenges) * 150.8 : 0} 150.8`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-white tabular-nums">{codingStats.solved}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" /> Your stats
                      </p>
                      <p className="text-xs text-neutral-500 tabular-nums">
                        {codingStats.solved} of {codingStats.total_challenges} solved
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs tabular-nums">
                    <span className="text-green-400">Easy <strong className="text-white font-semibold">{codingStats.easy_solved}</strong></span>
                    <span className="text-amber-400">Medium <strong className="text-white font-semibold">{codingStats.medium_solved}</strong></span>
                    <span className="text-red-400">Hard <strong className="text-white font-semibold">{codingStats.hard_solved}</strong></span>
                  </div>
                  <div className="ms-auto flex items-center gap-4 text-xs tabular-nums">
                    <span className="text-neutral-500">Submissions <strong className="text-white font-semibold">{codingStats.total_submissions}</strong></span>
                    <span className="text-neutral-500">Points <strong className="text-amber-400 font-semibold">{codingStats.total_points}</strong></span>
                  </div>
                </div>
              )}

              <div className="mb-4 text-xs sm:text-sm text-neutral-500 tabular-nums">
                Showing {filteredChallenges.length} of {challenges.length} challenges
              </div>

              {challengesLoading ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 divide-y divide-neutral-800/70">
                  {[0, 1, 2, 3, 4].map(i => <SkeletonListRow key={i} />)}
                </div>
              ) : filteredChallenges.length === 0 ? (
                <div className="text-center py-16 bg-neutral-900/30 rounded-xl border border-neutral-800/50">
                  <Code className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-400 text-sm">
                    {challengeSearch || hasActiveChallengeFilters ? 'No challenges match your filters.' : 'No challenges available yet'}
                  </p>
                  {(challengeSearch || hasActiveChallengeFilters) ? (
                    <button
                      onClick={() => { setChallengeSearch(''); clearChallengeFilters(); }}
                      className="text-purple-400 hover:text-purple-300 text-sm mt-1"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <p className="text-neutral-600 text-xs mt-1">Check back soon!</p>
                  )}
                </div>
              ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800 bg-neutral-900/60">
                    <div className="col-span-1">Status</div>
                    <div className="col-span-5">Title</div>
                    <div className="col-span-2">Difficulty</div>
                    <div className="col-span-2 hidden sm:block">Category</div>
                    <div className="col-span-2 text-right">Acceptance</div>
                  </div>
                  {/* Rows */}
                  {filteredChallenges.map(c => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/learning/challenges/${c.slug}`)}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/40 cursor-pointer transition-colors group"
                    >
                      <div className="col-span-1">
                        {c.user_status === 'solved' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : c.user_status === 'attempted' ? (
                          <Circle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-700" />
                        )}
                      </div>
                      <div className="col-span-5">
                        <span className="text-sm text-neutral-300 group-hover:text-white transition-colors truncate block">{c.title}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border capitalize ${
                          c.difficulty === 'easy' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                          c.difficulty === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                          'text-red-400 bg-red-500/10 border-red-500/30'
                        }`}>
                          {c.difficulty}
                        </span>
                      </div>
                      <div className="col-span-2 hidden sm:block">
                        <span className="text-xs text-neutral-500">{categoryLabel(c.category)}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs text-neutral-500 tabular-nums">{c.acceptance_rate ?? 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile filters modal */}
          <Modal
            open={showChallengeFilters}
            onClose={() => setShowChallengeFilters(false)}
            title="Filters"
            footer={
              <>
                <Button variant="secondary" onClick={clearChallengeFilters}>Clear all</Button>
                <Button onClick={() => setShowChallengeFilters(false)}>Done</Button>
              </>
            }
          >
            {challengeFilterGroups}
          </Modal>
        </div>
      )}
    </div>
  )
}
