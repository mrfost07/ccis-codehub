import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'
import { useCareerPaths, useEnrollments } from '../hooks/useApiCache'
import { ChevronRight, ArrowRight, Search, BookOpen, Video, Code, Trophy, Medal, Star, Clock, CheckCircle, Circle, Loader2, Play } from 'lucide-react'
import codingService, { CodingChallenge, CodingStats } from '../services/codingService'
import videoService, { VideoCourse } from '../services/videoService'

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
}

export default function LearningEnhanced() {
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'courses' | 'videos' | 'hands-on'>('courses')

  // Coding challenges state
  const [challenges, setChallenges] = useState<CodingChallenge[]>([])
  const [codingStats, setCodingStats] = useState<CodingStats | null>(null)
  const [challengesLoading, setChallengesLoading] = useState(false)
  const [codingDifficulty, setCodingDifficulty] = useState('')
  const [codingCategory, setCodingCategory] = useState('')
  const [codingSearch, setCodingSearch] = useState('')

  // Video courses state
  const [videoCourses, setVideoCourses] = useState<VideoCourse[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [videoCategory, setVideoCategory] = useState('')
  const [videoDifficulty, setVideoDifficulty] = useState('')
  const [videoSearch, setVideoSearch] = useState('')

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
      const data = await codingService.getChallenges({
        difficulty: codingDifficulty || undefined,
        category: codingCategory || undefined,
        search: codingSearch || undefined,
      })
      setChallenges(data)
    } catch { /* ignore */ } finally { setChallengesLoading(false) }
  }

  const loadCodingStats = async () => {
    try { setCodingStats(await codingService.getStats()) } catch { /* ignore */ }
  }

  const loadVideoCourses = async () => {
    setVideosLoading(true)
    try {
      const data = await videoService.getCourses({
        category: videoCategory || undefined,
        difficulty: videoDifficulty || undefined,
        search: videoSearch || undefined,
      })
      setVideoCourses(data)
    } catch { /* ignore */ } finally { setVideosLoading(false) }
  }

  // Reload on filter changes
  useEffect(() => { if (activeTab === 'hands-on') loadChallenges() }, [codingDifficulty, codingCategory, codingSearch])
  useEffect(() => { if (activeTab === 'videos') loadVideoCourses() }, [videoCategory, videoDifficulty, videoSearch])
  const navigate = useNavigate()

  // Use cached queries instead of manual useEffect
  const { data: careerPathsData, isLoading: pathsLoading } = useCareerPaths({
    difficulty: difficultyFilter || undefined,
    search: searchQuery || undefined,
  })
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

  const handleEnroll = async (pathId: string) => {
    toast.success('Opening learning path...')
    navigate(`/learning/paths/${pathId}`)
  }

  const getEnrollmentProgress = (pathId: string) => {
    const enrollment = enrollments.find(e => {
      const enrolledPathId = e.career_path?.id || e.career_path || e.path_id
      return String(enrolledPathId) === String(pathId)
    })
    return enrollment?.progress_percentage || 0
  }

  const getDifficultyColor = (level: string) => {
    const lowerLevel = level?.toLowerCase() || ''
    if (lowerLevel.includes('beginner')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (lowerLevel.includes('intermediate')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    if (lowerLevel.includes('advanced')) return 'text-rose-400 bg-rose-500/10 border-rose-500/30'
    return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
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

  // Filter paths based on search and difficulty
  const filteredPaths = careerPaths.filter(path => {
    const matchesSearch = searchQuery === '' ||
      getPathTitle(path).toLowerCase().includes(searchQuery.toLowerCase()) ||
      path.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDifficulty = difficultyFilter === '' ||
      path.difficulty_level?.toLowerCase().includes(difficultyFilter.toLowerCase())

    return matchesSearch && matchesDifficulty
  })

  return (
    <div className="min-h-screen bg-slate-950 pb-24 sm:pb-8">
      <Navbar />

      {/* Tab Navigation */}
      <div className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 sm:py-3 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-sm sm:text-base transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
              Learning Center
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl">
              Choose your career path and start your journey to become a professional developer
            </p>
          </div>

          {/* Stats Row - Simple 2 columns */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4 sm:p-5">
              <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{careerPaths.length}</p>
              <p className="text-xs sm:text-sm text-slate-500">Total Courses</p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4 sm:p-5">
              <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{enrolledPathIds.size}</p>
              <p className="text-xs sm:text-sm text-slate-500">Your Enrollments</p>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              {/* Difficulty Filter */}
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors min-w-[140px]"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Results count */}
            {(searchQuery || difficultyFilter) && (
              <div className="mt-3 text-xs sm:text-sm text-slate-500">
                Showing {filteredPaths.length} of {careerPaths.length} courses
              </div>
            )}
          </div>

          {/* Career Paths Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16 sm:py-24">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-2 border-slate-700 border-t-blue-500"></div>
            </div>
          ) : filteredPaths.length === 0 ? (
            <div className="text-center py-16 sm:py-24 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <p className="text-slate-400 text-base sm:text-lg mb-2">
                {searchQuery || difficultyFilter ? 'No courses match your search.' : 'No courses available yet.'}
              </p>
              {(searchQuery || difficultyFilter) && (
                <button
                  onClick={() => { setSearchQuery(''); setDifficultyFilter(''); }}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              {filteredPaths.map((path) => {
                // More robust enrollment check - try multiple ID formats
                const isEnrolled = enrollments.some((e: any) => {
                  const enrolledPathId = e.career_path?.id || e.career_path || e.path_id
                  return String(enrolledPathId) === String(path.id)
                })
                const progress = getEnrollmentProgress(path.id)

                return (
                  <div
                    key={path.id}
                    onClick={() => isEnrolled && navigate(`/learning/paths/${path.id}`)}
                    className={`group bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-slate-700/80 hover:bg-slate-900/80 flex flex-col h-full ${isEnrolled ? 'cursor-pointer ring-1 ring-emerald-500/20' : ''
                      }`}
                  >
                    {/* Card Header - Gradient Accent */}
                    <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>

                    {/* Card Content */}
                    <div className="p-4 sm:p-5 flex flex-col flex-1">
                      {/* Title & Difficulty */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-blue-300 transition-colors leading-tight line-clamp-1">
                          {getPathTitle(path)}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0 ${getDifficultyColor(path.difficulty_level)}`}>
                          {path.difficulty_level || 'N/A'}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-3 line-clamp-2">
                        {path.description || 'No description available'}
                      </p>

                      {/* Stats Row */}
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-500 mb-4">
                        <span className="text-white font-medium">{getPathDuration(path)}</span>
                        <span className="text-slate-600">•</span>
                        <span><span className="text-white font-medium">{getPathModules(path)}</span> modules</span>
                        <span className="text-slate-600">•</span>
                        <span><span className="text-white font-medium">{getPathEnrolled(path)}</span> enrolled</span>
                      </div>

                      {/* Progress + Action — pinned to bottom */}
                      <div className="mt-auto pt-2">
                        {/* Progress Bar (if enrolled) */}
                        {isEnrolled && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-slate-400">Your Progress</span>
                              <span className="text-emerald-400 font-semibold">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(progress, 2)}%` }}
                              />
                            </div>
                          </div>
                        )}

                      {/* Action Button */}
                      {isEnrolled ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/learning/paths/${path.id}`);
                          }}
                          className="w-full py-2.5 rounded-lg font-medium text-sm text-white transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                        >
                          <span>Continue Learning</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnroll(path.id);
                          }}
                          className="w-full py-2.5 rounded-lg font-medium text-sm text-white transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                        >
                          <span>Start Learning</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                        {/* Enrolled Badge */}
                        {isEnrolled && (
                          <div className="mt-2 text-center">
                            <span className="text-xs text-emerald-500/80">✓ Enrolled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Video Courses Tab */}
      {activeTab === 'videos' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
              Video Courses
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl">
              Learn from expert instructors with curated YouTube video tutorials
            </p>
          </div>

          {/* Search & Filters */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text" placeholder="Search video courses..."
                  value={videoSearch} onChange={(e) => setVideoSearch(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <select value={videoCategory} onChange={(e) => setVideoCategory(e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none min-w-[140px]">
                <option value="">All Categories</option>
                <option value="web_dev">Web Development</option>
                <option value="mobile">Mobile</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="data_science">Data Science</option>
                <option value="algorithms">Algorithms</option>
              </select>
              <select value={videoDifficulty} onChange={(e) => setVideoDifficulty(e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none min-w-[140px]">
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Course Grid */}
          {videosLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
          ) : videoCourses.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800/50">
              <Video className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No video courses available yet</p>
              <p className="text-slate-600 text-xs mt-1">Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videoCourses.map(course => (
                <div
                  key={course.id}
                  onClick={() => navigate(`/learning/videos/${course.slug}`)}
                  className="group bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500/40 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-slate-800/50 overflow-hidden">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-12 h-12 text-slate-700" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {course.lessons_count} lessons
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{course.instructor_name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getDifficultyColor(course.difficulty)}`}>
                        {course.difficulty}
                      </span>
                      <span className="text-[10px] text-slate-600">{course.total_duration_minutes} min</span>
                    </div>
                    {course.user_progress > 0 && (
                      <div className="mt-2">
                        <div className="w-full h-1 bg-slate-800 rounded-full">
                          <div className="h-1 bg-purple-500 rounded-full transition-all" style={{ width: `${course.user_progress}%` }} />
                        </div>
                        <p className="text-[10px] text-purple-400 mt-0.5">{course.user_progress}% complete</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hands On Tab */}
      {activeTab === 'hands-on' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
                  Hands On Practice
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl">
                  Solve coding challenges and sharpen your skills
                </p>
              </div>

              {/* Filters */}
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text" placeholder="Search challenges..."
                      value={codingSearch} onChange={(e) => setCodingSearch(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <select value={codingDifficulty} onChange={(e) => setCodingDifficulty(e.target.value)}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
                    <option value="">All Levels</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <select value={codingCategory} onChange={(e) => setCodingCategory(e.target.value)}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
                    <option value="">All Categories</option>
                    <option value="basics">Basics</option>
                    <option value="arrays">Arrays</option>
                    <option value="strings">Strings</option>
                    <option value="math">Math</option>
                    <option value="sorting">Sorting</option>
                    <option value="dp">Dynamic Programming</option>
                    <option value="algorithms">Algorithms</option>
                  </select>
                </div>
              </div>

              {/* Challenge List */}
              {challengesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                </div>
              ) : challenges.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800/50">
                  <Code className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No challenges available yet</p>
                  <p className="text-slate-600 text-xs mt-1">Check back soon!</p>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] text-slate-600 uppercase tracking-wider border-b border-slate-800/50">
                    <div className="col-span-1">Status</div>
                    <div className="col-span-5">Title</div>
                    <div className="col-span-2">Difficulty</div>
                    <div className="col-span-2 hidden sm:block">Category</div>
                    <div className="col-span-2 text-right">Acceptance</div>
                  </div>
                  {/* Rows */}
                  {challenges.map(c => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/learning/challenges/${c.slug}`)}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-slate-800/30 hover:bg-slate-800/30 cursor-pointer transition group"
                    >
                      <div className="col-span-1">
                        {c.user_status === 'solved' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : c.user_status === 'attempted' ? (
                          <Circle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-700" />
                        )}
                      </div>
                      <div className="col-span-5">
                        <span className="text-sm text-slate-300 group-hover:text-white transition truncate block">{c.title}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${
                          c.difficulty === 'easy' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                          c.difficulty === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                          'text-rose-400 bg-rose-500/10 border-rose-500/30'
                        }`}>
                          {c.difficulty}
                        </span>
                      </div>
                      <div className="col-span-2 hidden sm:block">
                        <span className="text-xs text-slate-500">{c.category}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs text-slate-500">{c.acceptance_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-5 sm:p-6 sticky top-24">
                <div className="flex items-center gap-3 mb-5">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Your Stats</h3>
                </div>

                {codingStats ? (
                  <div className="space-y-4">
                    {/* Solved Ring */}
                    <div className="text-center">
                      <div className="relative w-24 h-24 mx-auto">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="#1e293b" strokeWidth="6" />
                          <circle
                            cx="48" cy="48" r="40" fill="none" stroke="#10b981" strokeWidth="6"
                            strokeDasharray={`${codingStats.total_challenges > 0 ? (codingStats.solved / codingStats.total_challenges) * 251.2 : 0} 251.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-bold text-white">{codingStats.solved}</span>
                          <span className="text-[10px] text-slate-500">/ {codingStats.total_challenges}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Problems Solved</p>
                    </div>

                    {/* Difficulty Breakdown */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400">Easy</span>
                        <span className="text-white font-medium">{codingStats.easy_solved}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-400">Medium</span>
                        <span className="text-white font-medium">{codingStats.medium_solved}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-rose-400">Hard</span>
                        <span className="text-white font-medium">{codingStats.hard_solved}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/50 pt-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Total Submissions</span>
                        <span className="text-white">{codingStats.total_submissions}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Total Points</span>
                        <span className="text-amber-400 font-medium">{codingStats.total_points}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-700" />
                    Loading stats...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
