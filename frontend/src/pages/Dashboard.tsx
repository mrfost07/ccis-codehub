import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { learningAPI, projectsAPI } from '../services/api'
import { useCurrentUser } from '../hooks/useApiCache'

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
        points: user.points || 1250,
        level: user.level || 5,
        courses: progress.data?.length || 3,
        projects: projects.data?.length || 7
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl sm:text-6xl mb-4">⏳</div>
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="text-xl sm:text-2xl">💻</div>
              <span className="text-lg sm:text-xl font-bold">CCIS CodeHub</span>
            </div>
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
              <Link to="/learning" className="text-slate-300 hover:text-white transition text-sm lg:text-base">📚 Learning</Link>
              <Link to="/projects" className="text-slate-300 hover:text-white transition text-sm lg:text-base">💻 Projects</Link>
              <Link to="/community" className="text-slate-300 hover:text-white transition text-sm lg:text-base">👥 Community</Link>
              <div className="border-l border-slate-700 pl-4 lg:pl-6 flex items-center space-x-2 lg:space-x-4">
                <Link to="/dashboard" className="text-xs lg:text-sm text-slate-400 hover:text-white">👤 {user.username || 'User'}</Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    navigate('/login')
                  }}
                  className="text-xs lg:text-sm text-red-400 hover:text-red-300"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-8">
          Welcome Back, {user.username || 'Student'}! 👋
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl sm:text-6xl">⏳</div>
            <p className="mt-4 text-sm sm:text-base text-slate-400">Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid - Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              <StatCard icon="📈" title="Points" value={stats.points.toLocaleString()} color="indigo" />
              <StatCard icon="🏆" title="Level" value={stats.level.toString()} color="pink" />
              <StatCard icon="📚" title="Courses" value={stats.courses.toString()} color="purple" />
              <StatCard icon="💻" title="Projects" value={stats.projects.toString()} color="blue" />
            </div>

            {/* Quick Actions - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <QuickActionCard
                icon="📖"
                title="Continue Learning"
                description="Resume your learning journey"
                link="/learning"
                color="indigo"
              />
              <QuickActionCard
                icon="🚀"
                title="View Projects"
                description="Check your active projects"
                link="/projects"
                color="pink"
              />
              <QuickActionCard
                icon="✨"
                title="Ask AI Mentor"
                description="Get help with coding problems"
                link="/ai-mentor"
                color="purple"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, color }: any) {
  const colors = {
    indigo: 'from-indigo-600 to-indigo-700',
    pink: 'from-pink-600 to-pink-700',
    purple: 'from-purple-600 to-purple-700',
    blue: 'from-blue-600 to-blue-700',
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color as keyof typeof colors]} rounded-lg sm:rounded-xl p-4 sm:p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-xs sm:text-sm">{title}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-2xl sm:text-3xl lg:text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  )
}

function QuickActionCard({ icon, title, description, link, color }: any) {
  const colors = {
    indigo: 'border-indigo-500/50 hover:border-indigo-500',
    pink: 'border-pink-500/50 hover:border-pink-500',
    purple: 'border-purple-500/50 hover:border-purple-500',
  }

  return (
    <Link
      to={link}
      className={`bg-slate-900 border ${colors[color as keyof typeof colors]} rounded-lg sm:rounded-xl p-4 sm:p-6 transition hover:transform hover:scale-105 active:scale-95`}
    >
      <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{icon}</div>
      <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-slate-400">{description}</p>
    </Link>
  )
}
