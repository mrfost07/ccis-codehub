import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'
import { useCareerPaths, useEnrollments } from '../hooks/useApiCache'
import { ChevronRight, ArrowRight, Search, BookOpen, Video, Code, Trophy, Medal, Star, Clock } from 'lucide-react'

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
    { id: 'videos' as const, label: 'Video Courses', icon: Video, active: false },
    { id: 'hands-on' as const, label: 'Hands On', icon: Code, active: false }
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
  const getPathDuration = (path: CareerPath) => path.duration || (path.estimated_duration ? `${path.estimated_duration} weeks` : 'N/A')
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
    <div className="min-h-screen bg-slate-950">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
                    className={`group bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-xl overflow-hidden transition-all duration-300 hover:border-slate-700/80 hover:bg-slate-900/80 ${isEnrolled ? 'cursor-pointer ring-1 ring-emerald-500/20' : ''
                      }`}
                  >
                    {/* Card Header - Gradient Accent */}
                    <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>

                    {/* Card Content */}
                    <div className="p-4 sm:p-5">
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
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Video Courses Tab (Coming Soon) */}
      {activeTab === 'videos' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
              Video Courses
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl">
              Learn from expert instructors with high-quality video tutorials
            </p>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-8 sm:p-12 text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
              <Video className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Coming Soon</h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto mb-6">
              We're working hard to bring you an amazing collection of video courses.
              Expert-led tutorials covering web development, mobile apps, data science, and more!
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs sm:text-sm">
              <span className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-300">
                🎬 HD Video Lessons
              </span>
              <span className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-300">
                👨‍🏫 Expert Instructors
              </span>
              <span className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-300">
                📱 Watch Anywhere
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hands On Tab (Coming Soon) */}
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
                  Solve coding challenges and build real-world projects
                </p>
              </div>

              {/* Coming Soon Card */}
              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-8 sm:p-12 text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-full flex items-center justify-center">
                  <Code className="w-10 h-10 sm:w-12 sm:h-12 text-green-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Coming Soon</h2>
                <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto mb-6">
                  Put your skills to the test with interactive coding challenges!
                  Practice algorithms, data structures, and build real projects.
                </p>
                <div className="flex flex-wrap justify-center gap-3 text-xs sm:text-sm">
                  <span className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-300">
                    💻 Live Code Editor
                  </span>
                  <span className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-300">
                    🧪 Automated Tests
                  </span>
                  <span className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-300">
                    🏆 Earn Badges
                  </span>
                </div>
              </div>
            </div>

            {/* Leaderboard Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-5 sm:p-6 sticky top-24">
                <div className="flex items-center gap-3 mb-5">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Leaderboard</h3>
                </div>

                <p className="text-slate-400 text-sm mb-5">
                  Top problem solvers this week
                </p>

                {/* Static Leaderboard - Coming Soon */}
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((rank) => (
                    <div key={rank} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rank === 1 ? 'bg-amber-500/20 text-amber-400' :
                        rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                          rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-slate-700/50 text-slate-400'
                        }`}>
                        {rank <= 3 ? (
                          rank === 1 ? <Trophy className="w-4 h-4" /> :
                            rank === 2 ? <Medal className="w-4 h-4" /> :
                              <Star className="w-4 h-4" />
                        ) : (
                          <span className="text-sm font-bold">{rank}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-slate-700/50 rounded w-24 mb-1"></div>
                        <div className="h-2 bg-slate-700/30 rounded w-16"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-3 bg-slate-700/50 rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-5 border-t border-slate-700/50 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Coming Soon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
