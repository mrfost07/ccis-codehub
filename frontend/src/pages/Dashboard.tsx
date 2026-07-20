import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, Trophy, BookOpen, FolderOpen, ArrowUpRight, Sparkles, LogOut } from 'lucide-react'
import { learningAPI, projectsAPI } from '../services/api'
import { useCurrentUser } from '../hooks/useApiCache'
import { LoadingState } from '../components/ui'

export default function Dashboard() {
  const [stats, setStats] = useState({
    points: 0,
    level: 1,
    courses: 0,
    projects: 0
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Use cached user profile for role checking
  const { data: profile, isLoading: profileLoading } = useCurrentUser()
  const userRole = profile?.role

  // Redirect based on role (once profile is loaded)
  useEffect(() => {
    if (!profileLoading && userRole) {
      if (userRole === 'admin') {
        navigate('/admin', { replace: true })
      } else if (userRole === 'instructor') {
        navigate('/instructor', { replace: true })
      } else if (userRole === 'student') {
        navigate('/student', { replace: true })
      }
    }
  }, [userRole, profileLoading, navigate])

  // Only load dashboard data if not redirecting to a role-specific dashboard
  useEffect(() => {
    if (!profileLoading && userRole && !['admin', 'instructor', 'student'].includes(userRole)) {
      loadDashboardData()
    }
  }, [profileLoading, userRole])

  const loadDashboardData = async () => {
    try {
      const [progress, projects] = await Promise.all([
        learningAPI.getProgress().catch(() => ({ data: [] })),
        projectsAPI.getProjects().catch(() => ({ data: [] }))
      ])

      setStats({
        points: user.points || 0,
        level: user.level || 1,
        courses: progress.data?.length || 0,
        projects: projects.data?.length || 0
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking role
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <LoadingState label="Loading your dashboard…" />
      </div>
    )
  }

  const statCards = [
    { icon: TrendingUp, label: 'Points', value: stats.points.toLocaleString(), chip: 'bg-purple-500/10 text-purple-400' },
    { icon: Trophy, label: 'Level', value: String(stats.level), chip: 'bg-amber-500/10 text-amber-400' },
    { icon: BookOpen, label: 'Courses', value: String(stats.courses), chip: 'bg-green-500/10 text-green-400' },
    { icon: FolderOpen, label: 'Projects', value: String(stats.projects), chip: 'bg-purple-500/10 text-purple-400' },
  ]

  const quickActions = [
    { icon: BookOpen, title: 'Continue Learning', description: 'Resume your learning journey', link: '/learning' },
    { icon: FolderOpen, title: 'View Projects', description: 'Check your active projects', link: '/projects' },
    { icon: Sparkles, title: 'Ask AI Mentor', description: 'Get help with coding problems', link: '/ai-mentor' },
  ]

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Navigation */}
      <nav className="bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <img src="/logo/ccis-logo.png" alt="CCIS" className="h-8 w-8" />
              <span className="text-lg font-bold text-white">CCIS CodeHub</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-400 hidden sm:inline">{user.username || 'User'}</span>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  navigate('/login')
                }}
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back, {user.username || 'Student'}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8" aria-hidden="true">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6 animate-pulse">
                <div className="h-10 w-10 bg-neutral-800 rounded-lg mb-4" />
                <div className="h-3 w-1/2 bg-neutral-800 rounded mb-2" />
                <div className="h-7 w-2/3 bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              {statCards.map(({ icon: Icon, label, value, chip }) => (
                <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
                  <div className={`inline-flex p-2.5 rounded-lg ${chip} mb-3 sm:mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-neutral-400 text-xs sm:text-sm">{label}</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tabular-nums mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {quickActions.map(({ icon: Icon, title, description, link }) => (
                <Link
                  key={title}
                  to={link}
                  className="group rounded-xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6 transition-all duration-200 hover:border-neutral-700 hover:shadow-card-hover"
                >
                  <div className="inline-flex p-2.5 rounded-lg bg-purple-500/10 text-purple-400 mb-3 sm:mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                    {title}
                    <ArrowUpRight className="inline-block w-4 h-4 ml-1 -mt-0.5 text-neutral-600 transition-all group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
