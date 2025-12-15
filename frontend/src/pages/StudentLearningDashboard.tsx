import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { 
  BookOpen, TrendingUp, Award, Clock, Target, 
  Play, CheckCircle, Trophy, Zap, Calendar,
  BarChart3, Star, ArrowRight
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface Enrollment {
  id: string
  career_path: string
  career_path_name: string
  career_path_details: {
    id: string
    name: string
    description: string
    difficulty_level: string
    estimated_duration: number
    total_modules: number
    points_reward: number
  }
  status: string
  progress_percentage: number
  enrolled_at: string
  completed_at?: string
}

interface UserStats {
  total_enrollments: number
  active_enrollments: number
  completed_paths: number
  total_modules_completed: number
  total_points: number
  certificates_earned: number
  current_streak: number
}

export default function StudentLearningDashboard() {
  const navigate = useNavigate()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [stats, setStats] = useState<UserStats>({
    total_enrollments: 0,
    active_enrollments: 0,
    completed_paths: 0,
    total_modules_completed: 0,
    total_points: 0,
    certificates_earned: 0,
    current_streak: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch enrollments
      const enrollmentsResponse = await api.get('/learning/enrollments/')
      const enrollmentsData = enrollmentsResponse.data.results || enrollmentsResponse.data || []
      setEnrollments(enrollmentsData)
      
      // Calculate stats
      const activeCount = enrollmentsData.filter((e: Enrollment) => e.status === 'active').length
      const completedCount = enrollmentsData.filter((e: Enrollment) => e.status === 'completed').length
      
      // Fetch user profile for points
      try {
        const profileResponse = await api.get('/auth/profile/')
        const profile = profileResponse.data
        
        setStats({
          total_enrollments: enrollmentsData.length,
          active_enrollments: activeCount,
          completed_paths: completedCount,
          total_modules_completed: profile.total_courses_completed || 0,
          total_points: profile.total_points || 0,
          certificates_earned: completedCount,
          current_streak: 3 // TODO: Calculate actual streak
        })
      } catch (profileError) {
        console.log('Could not fetch profile:', profileError)
      }
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const continueLearning = (enrollment: Enrollment) => {
    navigate(`/learning/paths/${enrollment.career_path}`)
  }

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'text-green-400 bg-green-600/20'
      case 'intermediate': return 'text-yellow-400 bg-yellow-600/20'
      case 'advanced': return 'text-red-400 bg-red-600/20'
      default: return 'text-slate-400 bg-slate-600/20'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600/20 text-green-400'
      case 'active': return 'bg-blue-600/20 text-blue-400'
      case 'paused': return 'bg-yellow-600/20 text-yellow-400'
      case 'dropped': return 'bg-red-600/20 text-red-400'
      default: return 'bg-slate-600/20 text-slate-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Learning Journey</h1>
          <p className="text-slate-300">Track your progress and continue learning</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Enrolled Paths */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">{stats.total_enrollments}</span>
            </div>
            <h3 className="text-blue-100 font-semibold">Enrolled Paths</h3>
            <p className="text-blue-200 text-sm">{stats.active_enrollments} active</p>
          </div>

          {/* Completed Paths */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">{stats.completed_paths}</span>
            </div>
            <h3 className="text-green-100 font-semibold">Completed Paths</h3>
            <p className="text-green-200 text-sm">{stats.certificates_earned} certificates</p>
          </div>

          {/* Total Points */}
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">{stats.total_points}</span>
            </div>
            <h3 className="text-yellow-100 font-semibold">Total Points</h3>
            <p className="text-yellow-200 text-sm">{stats.total_modules_completed} modules done</p>
          </div>

          {/* Current Streak */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">{stats.current_streak}</span>
            </div>
            <h3 className="text-purple-100 font-semibold">Day Streak</h3>
            <p className="text-purple-200 text-sm">Keep it going!</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Ready to learn?</h3>
              <p className="text-blue-100">Explore new career paths and expand your skills</p>
            </div>
            <button
              onClick={() => navigate('/learning')}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg flex items-center gap-2"
            >
              <Star className="w-5 h-5" />
              Explore Paths
            </button>
          </div>
        </div>

        {/* Enrollments */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">My Learning Paths</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition">
                All
              </button>
              <button className="px-4 py-2 bg-slate-700/50 text-slate-400 rounded-lg hover:bg-slate-700 transition">
                Active
              </button>
              <button className="px-4 py-2 bg-slate-700/50 text-slate-400 rounded-lg hover:bg-slate-700 transition">
                Completed
              </button>
            </div>
          </div>

          {enrollments.length === 0 ? (
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Enrollments Yet</h3>
              <p className="text-slate-400 mb-6">Start your learning journey by enrolling in a career path</p>
              <button
                onClick={() => navigate('/learning')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition"
              >
                Browse Career Paths
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-blue-600/50 transition-all shadow-lg hover:shadow-xl"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {enrollment.career_path_details?.name || 'Career Path'}
                      </h3>
                      <p className="text-slate-400 text-sm line-clamp-2">
                        {enrollment.career_path_details?.description}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(enrollment.status)}`}>
                      {enrollment.status}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                      <span>Progress</span>
                      <span className="font-semibold text-white">{enrollment.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${enrollment.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {enrollment.career_path_details && (
                      <>
                        <div className="text-center p-2 bg-slate-700/50 rounded">
                          <div className="text-sm text-slate-400">Modules</div>
                          <div className="text-lg font-semibold text-white">
                            {enrollment.career_path_details.total_modules}
                          </div>
                        </div>
                        <div className="text-center p-2 bg-slate-700/50 rounded">
                          <div className="text-sm text-slate-400">Duration</div>
                          <div className="text-lg font-semibold text-white">
                            {enrollment.career_path_details.estimated_duration}w
                          </div>
                        </div>
                        <div className="text-center p-2 bg-slate-700/50 rounded">
                          <div className="text-sm text-slate-400">Points</div>
                          <div className="text-lg font-semibold text-white">
                            {enrollment.career_path_details.points_reward}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-3 mb-4 text-sm text-slate-400">
                    {enrollment.career_path_details && (
                      <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(enrollment.career_path_details.difficulty_level)}`}>
                        {enrollment.career_path_details.difficulty_level}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => continueLearning(enrollment)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    {enrollment.status === 'completed' ? (
                      <>
                        <Trophy className="w-5 h-5" />
                        View Certificate
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Continue Learning
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements Section */}
        {stats.completed_paths > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">Achievements</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-white font-semibold mb-1">First Steps</h4>
                <p className="text-slate-400 text-sm">Complete your first module</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 text-center opacity-50">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-white font-semibold mb-1">Dedicated Learner</h4>
                <p className="text-slate-400 text-sm">7-day learning streak</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 text-center opacity-50">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-white font-semibold mb-1">Master</h4>
                <p className="text-slate-400 text-sm">Complete 5 career paths</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 text-center opacity-50">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-white font-semibold mb-1">Quiz Master</h4>
                <p className="text-slate-400 text-sm">Score 100% on 10 quizzes</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
