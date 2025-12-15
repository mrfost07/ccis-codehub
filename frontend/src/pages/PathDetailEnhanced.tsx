import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ModuleTimeline from '../components/ModuleTimeline'
import {
  BookOpen, Clock, Award, Users, Play, CheckCircle,
  Lock, ArrowRight, Video, FileText, Trophy, Target,
  TrendingUp, Calendar, Zap, ArrowLeft
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface Module {
  id: string
  title: string
  description: string
  module_type: string
  difficulty_level: string
  duration_minutes: number
  points_reward: number
  order: number
  is_locked: boolean
  is_completed: boolean
  progress_percentage?: number
  current_slide?: number
  quiz_available: boolean
  quiz_passed: boolean
}

interface Enrollment {
  id: string
  status: string
  progress_percentage: number
  enrolled_at: string
}

interface PathDetails {
  id: string
  name: string
  slug: string
  description: string
  program_type: string
  difficulty_level: string
  estimated_duration: number
  points_reward: number
  total_modules: number
  required_skills: string[]
  icon?: string
  color?: string
  is_featured: boolean
}

export default function PathDetailEnhanced() {
  const { pathId } = useParams<{ pathId: string }>()
  const navigate = useNavigate()
  const [path, setPath] = useState<PathDetails | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    fetchPathDetails()
  }, [pathId])

  const fetchPathDetails = async () => {
    try {
      setLoading(true)

      // Fetch path details
      const pathResponse = await api.get(`/learning/career-paths/${pathId}/`)
      setPath(pathResponse.data)

      // Fetch modules for this path - try both admin and regular endpoints
      let modulesData = []
      try {
        const modulesResponse = await api.get(`/learning/admin/modules/?career_path=${pathId}`)
        modulesData = modulesResponse.data.results || modulesResponse.data || []
        console.log('Fetched modules (admin):', modulesData.length)
      } catch (adminError) {
        console.log('Admin endpoint failed, trying regular endpoint')
        const modulesResponse = await api.get(`/learning/modules/?career_path=${pathId}`)
        modulesData = modulesResponse.data.results || modulesResponse.data || []
        console.log('Fetched modules (regular):', modulesData.length)
      }

      // Sort by order
      const sortedModules = modulesData.sort((a: any, b: any) => a.order - b.order)
      console.log('Sorted modules:', sortedModules)

      // Check enrollment status
      try {
        const enrollmentResponse = await api.get(`/learning/enrollments/?career_path=${pathId}`)
        const enrollments = enrollmentResponse.data.results || enrollmentResponse.data || []

        if (enrollments.length > 0) {
          setEnrollment(enrollments[0])

          // Fetch module progress
          try {
            const progressResponse = await api.get(`/learning/enrollments/${enrollments[0].id}/progress/`)
            const progressData = progressResponse.data || []

            // Also check UserProgress for completion status
            let userProgressMap: Record<string, any> = {}
            try {
              const userProgressResponse = await api.get(`/learning/progress/?career_path=${pathId}`)
              const userProgressData = userProgressResponse.data.results || userProgressResponse.data || []
              console.log('Raw user progress data:', userProgressData)

              userProgressMap = userProgressData.reduce((acc: any, up: any) => {
                // learning_module can be an object or an ID
                const moduleId = up.learning_module?.id || up.learning_module
                if (moduleId) {
                  acc[moduleId] = up
                  console.log(`Mapped progress for module ${moduleId}:`, up.is_completed)
                }
                return acc
              }, {})
              console.log('User progress map:', userProgressMap)
            } catch (upError) {
              console.log('Could not fetch user progress:', upError)
            }

            // Fetch slide progress for each module
            const slideProgressMap: Record<string, { current_slide: number; total_slides: number }> = {}
            for (const module of sortedModules) {
              try {
                const slideProgressRes = await api.get(`/learning/modules/${module.id}/get_progress/`)
                if (slideProgressRes.data && slideProgressRes.data.total_slides) {
                  slideProgressMap[module.id] = {
                    current_slide: slideProgressRes.data.current_slide || 0,
                    total_slides: slideProgressRes.data.total_slides || 0
                  }
                  console.log(`Slide progress for module ${module.id}:`, slideProgressMap[module.id])
                }
              } catch (slideErr) {
                // No slide progress for this module yet
              }
            }

            // Map progress to modules
            const modulesWithProgress = sortedModules.map((module: any, index: number) => {
              const progress = progressData.find((p: any) => p.module === module.id)
              const userProgress = userProgressMap[module.id]
              const slideProgress = slideProgressMap[module.id]

              // Check completion from either ModuleProgress or UserProgress
              const isCompleted = progress?.status === 'completed' || userProgress?.is_completed || false

              // Calculate slide-based progress percentage
              const slideProgressPercentage = slideProgress?.total_slides
                ? Math.round(((slideProgress.current_slide || 0) + 1) / slideProgress.total_slides * 100)
                : 0

              // Previous module for locking logic
              const prevModule = index > 0 ? sortedModules[index - 1] : null
              const prevModuleProgress = prevModule ? progressData.find((p: any) => p.module === prevModule.id) : null
              const prevModuleUserProgress = prevModule ? userProgressMap[prevModule.id] : null
              const prevCompleted = prevModuleProgress?.status === 'completed' || prevModuleUserProgress?.is_completed || index === 0

              return {
                ...module,
                is_completed: isCompleted,
                is_locked: !prevCompleted,
                current_slide: slideProgress?.current_slide,
                total_slides: slideProgress?.total_slides,
                progress_percentage: slideProgressPercentage,
                quiz_available: module.quizzes && module.quizzes.length > 0,
                quiz_passed: false // TODO: Check quiz attempts
              }
            })

            setModules(modulesWithProgress)
          } catch (progressError) {
            console.log('Could not fetch progress:', progressError)
            setModules(sortedModules.map((m: any, i: number) => ({
              ...m,
              is_completed: false,
              is_locked: i > 0,
              quiz_available: false,
              quiz_passed: false
            })))
          }
        } else {
          // Not enrolled - all locked except first
          setModules(sortedModules.map((m: any, i: number) => ({
            ...m,
            is_completed: false,
            is_locked: i > 0,
            quiz_available: false,
            quiz_passed: false
          })))
        }
      } catch (enrollmentError) {
        console.log('Not enrolled yet')
        setModules(sortedModules.map((m: any, i: number) => ({
          ...m,
          is_completed: false,
          is_locked: i > 0,
          quiz_available: false,
          quiz_passed: false
        })))
      }

    } catch (error) {
      console.error('Failed to fetch path details:', error)
      toast.error('Failed to load path details')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!pathId) {
      toast.error('Invalid career path')
      return
    }

    try {
      setEnrolling(true)

      console.log('Enrolling in path:', pathId)

      const response = await api.post('/learning/enrollments/', {
        career_path: pathId
      })

      console.log('Enrollment response:', response.data)

      setEnrollment(response.data.enrollment || response.data)
      toast.success(response.data.message || 'Successfully enrolled! Start learning now! 🎉')

      // Refresh to update module lock states
      await fetchPathDetails()

    } catch (error: any) {
      console.error('Enrollment failed:', error)
      console.error('Error response:', error.response?.data)

      if (error.response?.status === 200) {
        // Already enrolled
        toast.success('Already enrolled! Continue learning!')
        await fetchPathDetails()
      } else {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to enroll'
        toast.error(errorMessage)
      }
    } finally {
      setEnrolling(false)
    }
  }

  const startModule = (module: Module) => {
    if (module.is_locked) {
      toast.error('Complete the previous modules to unlock this one')
      return
    }
    navigate(`/learning/modules/${module.id}`)
  }

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'text-green-400 bg-green-600/20'
      case 'intermediate': return 'text-yellow-400 bg-yellow-600/20'
      case 'advanced': return 'text-red-400 bg-red-600/20'
      default: return 'text-slate-400 bg-slate-600/20'
    }
  }

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5 text-blue-400" />
      case 'text': return <BookOpen className="w-5 h-5 text-green-400" />
      case 'interactive': return <Target className="w-5 h-5 text-purple-400" />
      case 'project': return <Award className="w-5 h-5 text-yellow-400" />
      case 'quiz': return <Trophy className="w-5 h-5 text-orange-400" />
      default: return <FileText className="w-5 h-5 text-slate-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">Loading path details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!path) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-screen text-white">
          <h1 className="text-2xl font-bold mb-4">Path Not Found</h1>
          <button
            onClick={() => navigate('/learning')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Back to Learning
          </button>
        </div>
      </div>
    )
  }

  const completedModules = modules.filter(m => m.is_completed).length
  const progressPercentage = modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <button
          onClick={() => navigate('/learning')}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Learning</span>
        </button>
      </div>

      {/* Hero Section - Dark Glass */}
      <div className="relative bg-slate-900/80 backdrop-blur-xl px-6 py-12 border-b border-slate-800/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(path.difficulty_level)}`}>
                  {path.difficulty_level}
                </span>
                <span className="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-sm font-medium text-white">
                  {path.program_type.toUpperCase()}
                </span>
                {path.is_featured && (
                  <span className="px-3 py-1 bg-yellow-500/20 backdrop-blur rounded-full text-sm font-medium text-yellow-300 flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    Featured
                  </span>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{path.name}</h1>
              <p className="text-slate-400 text-lg mb-6">{path.description}</p>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 text-slate-300">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span>{modules.length} modules</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-5 h-5 text-green-400" />
                  <span>{path.estimated_duration} weeks</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>{path.points_reward} points</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <span>{modules.reduce((acc, m) => acc + m.duration_minutes, 0)} min total</span>
                </div>
              </div>

              {/* Required Skills */}
              {path.required_skills && path.required_skills.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-blue-100 font-semibold mb-2">Required Skills:</h3>
                  <div className="flex flex-wrap gap-2">
                    {path.required_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-sm text-blue-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Enroll Button */}
              {!enrollment ? (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {enrolling ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Enroll Now
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-300 rounded-lg font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    Enrolled
                  </div>
                  <span className="text-blue-100">
                    Enrolled on {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Card - Dark Glass */}
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50 shadow-xl h-fit">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Your Progress
              </h3>

              {enrollment ? (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-300 mb-2">
                      <span>Completion</span>
                      <span className="font-semibold">{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-300">
                      <span>Modules Completed</span>
                      <span className="font-semibold text-white">{completedModules} / {modules.length}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Points Earned</span>
                      <span className="font-semibold text-amber-400">
                        {modules.filter(m => m.is_completed).reduce((acc, m) => acc + m.points_reward, 0)} pts
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Status</span>
                      <span className="font-semibold capitalize text-green-400">{enrollment.status}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-400 mb-4">Enroll to track your progress</p>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
                  >
                    Enroll Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modules Timeline */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Learning Path</h2>
            <p className="text-slate-400">Follow the timeline to complete your journey</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{completedModules}/{modules.length}</div>
            <div className="text-sm text-slate-400">Modules Completed</div>
          </div>
        </div>

        <ModuleTimeline modules={modules} onModuleClick={startModule} />

        {/* Empty State */}
        {modules.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Modules Yet</h3>
            <p className="text-slate-400">Modules for this path haven't been added yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
