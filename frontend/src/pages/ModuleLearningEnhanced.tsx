import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import Navbar from '../components/Navbar'
import SlideViewer from '../components/SlideViewer'
import QuizViewer from '../components/QuizViewer'
import BadgeUnlockToast from '../components/BadgeUnlockToast'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft, ArrowRight, CheckCircle, Clock, Award,
  FileText, Download, Play, BookOpen, Target, Video, Lock, ClipboardList
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { LoadingState } from '../components/ui'
import 'react-quill/dist/quill.snow.css'
import '../styles/module-content.css'

interface ModuleData {
  id: string
  title: string
  description: string
  content: string
  module_type: string
  difficulty_level: string
  duration_minutes: number
  points_reward: number
  order: number
  file?: string
  career_path: string
  career_path_name?: string
  is_completed?: boolean
  is_locked?: boolean
}

export default function ModuleLearningEnhanced() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const [module, setModule] = useState<ModuleData | null>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const [moduleCompleted, setModuleCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [readingTime, setReadingTime] = useState(0)
  const [startTime] = useState(Date.now())
  const [allModules, setAllModules] = useState<ModuleData[]>([])
  const [allSlidesViewed, setAllSlidesViewed] = useState(false)
  const [earnedBadges, setEarnedBadges] = useState<string[]>([])

  useEffect(() => {
    console.log('=== MODULE ID CHANGED:', moduleId, '===')
    // Reset state when changing modules
    setShowQuiz(false)
    setModuleCompleted(false)
    setQuiz(null)
    setAllSlidesViewed(false) // Reset slide progress for new module

    // Fetch module data
    fetchModule()
  }, [moduleId])

  useEffect(() => {
    // Track reading time
    const interval = setInterval(() => {
      setReadingTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const fetchModule = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/learning/modules/${moduleId}/`)
      const moduleData = response.data

      console.log('Module data:', moduleData)
      setModule(moduleData)

      // Fetch quiz for this module
      try {
        console.log('=== FETCHING QUIZ FOR MODULE:', moduleId, '===')
        const quizResponse = await api.get(`/learning/quizzes/?learning_module=${moduleId}`)
        console.log('Quiz API response:', quizResponse.data)

        const quizzes = quizResponse.data.results || quizResponse.data || []
        console.log('Number of quizzes found:', quizzes.length)

        if (quizzes.length > 0) {
          const quizData = quizzes[0]
          console.log('Quiz ID:', quizData.id)
          console.log('Quiz title:', quizData.title)
          console.log('Quiz has content:', !!quizData.content)
          console.log('Quiz content length:', quizData.content?.length || 0)
          console.log('Quiz content preview:', quizData.content?.substring(0, 100) || 'EMPTY')

          setQuiz(quizData)
          console.log('✅ Quiz set successfully:', quizData.id)
        } else {
          console.log('⚠️ No quiz found for this module')
          setQuiz(null)
        }
      } catch (quizError) {
        console.error('❌ Error fetching quiz:', quizError)
        setQuiz(null)
      }

      // Fetch all modules in this path for navigation
      if (moduleData.career_path) {
        try {
          const modulesResponse = await api.get(`/learning/modules/?career_path=${moduleData.career_path}`)
          const modules = modulesResponse.data.results || modulesResponse.data || []
          setAllModules(modules.sort((a: ModuleData, b: ModuleData) => a.order - b.order))
        } catch (err) {
          console.log('Could not fetch related modules:', err)
        }
      }

    } catch (error) {
      console.error('Failed to fetch module:', error)
      toast.error('Failed to load module')
    } finally {
      setLoading(false)
    }
  }

  const markAsCompleted = async () => {
    if (!module) return

    console.log('=== MARK AS COMPLETED CALLED ===')
    console.log('Quiz state variable:', quiz)
    console.log('Quiz exists:', !!quiz)
    console.log('Quiz has content:', !!quiz?.content)
    console.log('Quiz content length:', quiz?.content?.length || 0)
    console.log('Quiz content preview:', quiz?.content?.substring(0, 200))

    if (module.is_completed) {
      toast('Module already completed!', { icon: 'ℹ️' })
      return
    }

    setModuleCompleted(true)

    // Check if quiz exists and has content
    const hasValidQuiz = quiz && quiz.content && quiz.content.trim().length > 0
    console.log('Has valid quiz:', hasValidQuiz)

    if (hasValidQuiz) {
      console.log('✅ QUIZ EXISTS - SHOWING QUIZ NOW')
      toast.success('Module content completed! Time to test your knowledge! 📝', { duration: 3000 })
      setShowQuiz(true)
      console.log('setShowQuiz called with true')
      return
    }

    console.log('❌ NO QUIZ - Marking module as complete directly')

    try {
      setCompleting(true)

      const res = await api.post(`/learning/modules/${moduleId}/complete/`, {
        time_spent_seconds: readingTime
      })

      // Show badge unlock toast if earned
      const badges = res.data?.badges_earned || []
      if (badges.length > 0) {
        setEarnedBadges(badges)
      }

      setModule(prev => prev ? { ...prev, is_completed: true } : null)
      toast.success(`✅ Module completed! You earned ${module.points_reward} points!`, { duration: 4000 })

      const currentIndex = allModules.findIndex(m => m.id === moduleId)
      const nextModule = allModules[currentIndex + 1]

      if (nextModule && !nextModule.is_locked) {
        setTimeout(() => {
          const continueToNext = window.confirm(`Great job! Ready to continue to "${nextModule.title}"?`)
          if (continueToNext) {
            navigate(`/learning/modules/${nextModule.id}`)
            window.location.reload()
          } else {
            navigate(`/learning/paths/${module.career_path}`)
          }
        }, 1500)
      } else {
        toast.success('🎉 Congratulations! You completed all available modules!', { duration: 5000 })
        setTimeout(() => {
          navigate(`/learning/paths/${module.career_path}`)
        }, 2000)
      }
    } catch (error: any) {
      console.error('Failed to mark as completed:', error)
      toast.error(error.response?.data?.error || 'Failed to mark as completed')
    } finally {
      setCompleting(false)
    }
  }

  const handleQuizComplete = async (score: number, passed: boolean) => {
    if (!module) return

    // If failed, user can retry from the QuizViewer (it has retry button)
    // Don't hide quiz - let user see results and retry
    if (!passed) {
      console.log('Quiz not passed. User can retry from quiz screen.')
      return
    }

    // Quiz passed - mark module as complete
    try {
      setCompleting(true)
      console.log('Quiz passed! Marking module as complete...')

      const completeResponse = await api.post(`/learning/modules/${moduleId}/complete/`, {
        time_spent_seconds: readingTime
      })

      console.log('Complete response:', completeResponse.data)

      // Show badge unlock toast if earned
      const badges = completeResponse.data?.badges_earned || []
      if (badges.length > 0) {
        setEarnedBadges(badges)
      }

      setModule(prev => prev ? { ...prev, is_completed: true } : null)

      // Wait 3 seconds then navigate
      setTimeout(() => {
        setShowQuiz(false)

        const currentIndex = allModules.findIndex(m => m.id === moduleId)
        const nextModule = allModules[currentIndex + 1]

        if (nextModule && !nextModule.is_locked) {
          const continueToNext = window.confirm(
            `🎉 Module completed! Ready to continue to "${nextModule.title}"?`
          )
          if (continueToNext) {
            navigate(`/learning/modules/${nextModule.id}`)
          } else {
            navigate(`/learning/paths/${module.career_path}`)
          }
        } else {
          toast.success('🎉 You completed all modules in this path!', { duration: 4000 })
          setTimeout(() => navigate(`/learning/paths/${module.career_path}`), 1500)
        }
      }, 3000)

    } catch (error: any) {
      console.error('Failed to complete module:', error)
      toast.error(error.response?.data?.error || 'Failed to complete module')
    } finally {
      setCompleting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const renderModuleContent = () => {
    if (!module) return null

    // Video Module
    if (module.module_type === 'video') {
      // Check for YouTube URL
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      const match = module.content?.match(youtubeRegex)

      if (match && match[1]) {
        return (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${match[1]}`}
                title={module.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
            {module.description && (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{module.description}</ReactMarkdown>
              </div>
            )}
          </div>
        )
      } else if (module.file) {
        // Uploaded video file
        return (
          <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
            <video
              src={module.file}
              controls
              className="w-full h-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )
      }
    }

    // Text/Interactive Module  
    if (module.module_type === 'text' || module.module_type === 'interactive') {
      // Check if content has slides
      if (module.content && module.content.includes('module-slide')) {
        return (
          <SlideViewer
            content={module.content}
            moduleId={moduleId || ''}
            onAllSlidesViewed={() => setAllSlidesViewed(true)}
          />
        )
      }

      // Regular content without slides
      return (
        <div
          className="prose prose-invert prose-lg max-w-none module-content-display"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(module.content || module.description || '') }}
        />
      )
    }

    // Project Module
    if (module.module_type === 'project') {
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-600/20 to-amber-600/20 border border-amber-600/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-6 h-6 text-amber-400" />
              <h3 className="text-xl font-semibold text-white">Project Assignment</h3>
            </div>
            <p className="text-amber-100">
              This is a hands-on project module. Complete the project requirements below to finish this module.
            </p>
          </div>
          <div
            className="prose prose-invert prose-lg max-w-none module-content-display"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(module.content || module.description || '') }}
          />
        </div>
      )
    }

    // File-based Module
    if (module.file) {
      const fileName = module.file.split('/').pop() || 'file'
      const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      const isPdf = fileName.match(/\.pdf$/i)

      if (isImage) {
        return (
          <div className="space-y-4">
            <img src={module.file} alt={module.title} className="w-full rounded-lg shadow-lg" />
            {module.description && (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{module.description}</ReactMarkdown>
              </div>
            )}
          </div>
        )
      }

      if (isPdf) {
        return (
          <div className="space-y-4">
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-neutral-900/50">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="text-white font-semibold">PDF Document</h3>
                    <p className="text-neutral-400 text-sm">{fileName}</p>
                  </div>
                </div>
                <a
                  href={module.file}
                  download={fileName}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
              <iframe
                src={module.file}
                className="w-full h-[700px]"
                title={module.title}
              />
            </div>
            {module.description && (
              <div className="prose prose-invert max-w-none mt-4">
                <ReactMarkdown>{module.description}</ReactMarkdown>
              </div>
            )}
          </div>
        )
      }

      // Other file types
      return (
        <div className="space-y-4">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-purple-400" />
                <div>
                  <h3 className="text-white font-semibold">Module File</h3>
                  <p className="text-neutral-400 text-sm">{fileName}</p>
                </div>
              </div>
              <a
                href={module.file}
                download={fileName}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          </div>
          {module.description && (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{module.description}</ReactMarkdown>
            </div>
          )}
        </div>
      )
    }

    // Fallback - show description/content
    return (
      <div
        className="prose prose-invert prose-lg max-w-none module-content-display"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(module.content || module.description || '') }}
      />
    )
  }

  const navigateToModule = (direction: 'prev' | 'next') => {
    const currentIndex = allModules.findIndex(m => m.id === moduleId)
    const targetModule = direction === 'prev'
      ? allModules[currentIndex - 1]
      : allModules[currentIndex + 1]

    if (targetModule) {
      if (targetModule.is_locked) {
        toast.error('Complete the previous modules to unlock this one')
        return
      }
      navigate(`/learning/modules/${targetModule.id}`)
      window.location.reload() // Refresh to load new module
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Navbar />
        <LoadingState label="Loading module…" />
      </div>
    )
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-screen text-white">
          <h1 className="text-2xl font-bold mb-4">Module Not Found</h1>
          <button
            onClick={() => navigate('/learning')}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
          >
            Back to Learning
          </button>
        </div>
      </div>
    )
  }

  const currentIndex = allModules.findIndex(m => m.id === moduleId)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allModules.length - 1

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      {/* Badge Unlock Celebration */}
      {earnedBadges.length > 0 && (
        <BadgeUnlockToast
          badgeNames={earnedBadges}
          onComplete={() => setEarnedBadges([])}
        />
      )}

      {/* Header — clean dark bar with a subtle purple accent line */}
      <div className="relative border-b border-neutral-800 bg-neutral-900/40">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button
            onClick={() => navigate(`/learning/paths/${module.career_path}`)}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition mb-5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {module.career_path_name || 'Career Path'}
          </button>

          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-5">
            <div className="flex-1 w-full">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">{module.title}</h1>
              <p className="text-neutral-400 text-sm sm:text-base max-w-3xl leading-relaxed">{module.description}</p>
            </div>

            <div className="flex flex-col gap-1.5 text-sm shrink-0">
              <div className="flex items-center gap-2 text-neutral-400">
                <Clock className="w-4 h-4 text-purple-400" />
                Reading: {formatTime(readingTime)}
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <Target className="w-4 h-4 text-purple-400" />
                Expected: {module.duration_minutes} min
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-sm text-neutral-300">
              {module.module_type === 'video' && <Video className="w-4 h-4" />}
              {module.module_type === 'text' && <BookOpen className="w-4 h-4" />}
              {module.module_type === 'project' && <Award className="w-4 h-4" />}
              <span className="capitalize">{module.module_type}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-300">
              <Award className="w-4 h-4" />
              {module.points_reward} points
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-sm text-neutral-300 capitalize">
              {module.difficulty_level}
            </span>
            {module.is_completed && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-300">
                <CheckCircle className="w-4 h-4" />
                Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Desktop Optimized */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Learning Content or Quiz - Mobile Responsive */}
        {showQuiz && quiz && quiz.content ? (
          <div className="bg-neutral-800/50 backdrop-blur border border-neutral-700 rounded-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 shadow-xl">
            <QuizViewer
              content={quiz.content}
              quizId={quiz.id}
              passingScore={quiz.passing_score}
              timeLimit={quiz.time_limit_minutes}
              maxAttempts={quiz.max_attempts}
              onComplete={handleQuizComplete}
            />
          </div>
        ) : (
          <div className="bg-neutral-800/50 backdrop-blur border border-neutral-700 rounded-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 shadow-xl">
            {renderModuleContent()}
          </div>
        )}

        {/* Actions - Mobile Responsive */}
        <div className="bg-neutral-800/50 backdrop-blur border border-neutral-700 rounded-xl p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col gap-4">
            {/* Navigation */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => navigateToModule('prev')}
                disabled={!hasPrev}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base ${hasPrev
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                  : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                  }`}
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>
              <button
                onClick={() => navigateToModule('next')}
                disabled={!hasNext || allModules[currentIndex + 1]?.is_locked}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base ${hasNext && !allModules[currentIndex + 1]?.is_locked
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                  : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                  }`}
              >
                Next
                {allModules[currentIndex + 1]?.is_locked ? (
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : (
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
              </button>
            </div>

            {/* Complete Button (shown when quiz is NOT displayed) */}
            {!module.is_completed && !showQuiz && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  console.log('=== COMPLETE BUTTON CLICKED ===')
                  console.log('Module completed:', module.is_completed)
                  console.log('Show quiz:', showQuiz)
                  console.log('Quiz exists:', !!quiz)
                  markAsCompleted()
                }}
                disabled={completing || moduleCompleted || (module.content?.includes('module-slide') && !allSlidesViewed)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition shadow-lg disabled:opacity-50 ${module.content?.includes('module-slide') && !allSlidesViewed
                  ? 'bg-neutral-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                  }`}
              >
                {completing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Completing...
                  </>
                ) : module.content?.includes('module-slide') && !allSlidesViewed ? (
                  <>
                    <Lock className="w-5 h-5" />
                    View All Slides First
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Mark as Complete
                  </>
                )}
              </button>
            )}



            {module.is_completed && (
              <div className="flex items-center gap-2 px-6 py-3 bg-green-600/20 text-green-400 rounded-lg font-semibold">
                <CheckCircle className="w-5 h-5" />
                Completed
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {allModules.length > 0 && (
            <div className="mt-6 pt-6 border-t border-neutral-700">
              <div className="flex items-center justify-between text-sm text-neutral-400 mb-2">
                <span>Module {currentIndex + 1} of {allModules.length}</span>
                <span>{Math.round(((currentIndex + 1) / allModules.length) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentIndex + 1) / allModules.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
