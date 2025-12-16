import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { publicAPI } from '../services/api'

interface Stats {
  total_users: number
  total_courses: number
  total_projects: number
  total_teams: number
  total_posts: number
  total_enrollments: number
  total_modules: number
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    total_users: 0,
    total_courses: 0,
    total_projects: 0,
    total_teams: 0,
    total_posts: 0,
    total_enrollments: 0,
    total_modules: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await publicAPI.getStats()
        setStats(response.data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden relative">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-indigo-600/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/15 via-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Zipper Animation - Top Right Corner */}
      <div className="absolute top-0 right-0 w-40 h-40 sm:w-56 sm:h-56 overflow-hidden pointer-events-none z-20">
        <div className="absolute top-0 right-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-sm"
              style={{
                width: '3px',
                height: '16px',
                background: `linear-gradient(135deg, ${i % 2 === 0 ? '#6366f1' : '#a855f7'}, ${i % 2 === 0 ? '#8b5cf6' : '#ec4899'})`,
                top: `${i * 14}px`,
                right: `${i * 14}px`,
                transform: 'rotate(-45deg)',
                opacity: 0.7,
                animation: `zipperPulse 2.5s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
              }}
            />
          ))}
        </div>
        {/* Corner Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/30 via-purple-500/20 to-transparent blur-2xl" />
      </div>

      {/* Shadow Effect - Right Side */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-900/20 via-purple-900/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-purple-900/30 via-indigo-900/15 to-transparent pointer-events-none blur-3xl" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Navigation */}
      <nav className="relative z-50 bg-slate-900/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform overflow-hidden">
                  <img src="/logo/ccis-logo.png" alt="CCIS" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-bold text-white">CCIS</span>
                <span className="text-xl sm:text-2xl font-light bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">CodeHub</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/login"
                className="px-4 py-2 text-sm sm:text-base text-slate-300 hover:text-white transition font-medium hidden sm:block"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="group relative px-4 py-2 sm:px-6 sm:py-2.5 overflow-hidden rounded-xl font-semibold text-sm sm:text-base"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white">Get Started</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 lg:pt-28 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-default">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-sm text-slate-300 font-medium">AI-Powered Learning Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            <span className="text-white">Level Up Your</span>
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"> Coding Journey</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4">
            The complete learning platform for SNSU CCIS students. Master programming with
            <span className="text-indigo-400"> AI mentorship</span>,
            <span className="text-purple-400"> real projects</span>, and a
            <span className="text-pink-400"> thriving community</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 px-4">
            <Link
              to="/register"
              className="group relative inline-flex items-center justify-center px-6 py-3.5 sm:px-8 sm:py-4 overflow-hidden rounded-2xl font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative text-white flex items-center gap-2">
                Start Learning Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <Link
              to="/learning"
              className="group px-6 py-3.5 sm:px-8 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl font-semibold text-base sm:text-lg text-white transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Explore Courses
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto px-4">
            <StatCard
              value={loading ? '-' : formatNumber(stats.total_users)}
              label="Active Learners"
              color="indigo"
            />
            <StatCard
              value={loading ? '-' : formatNumber(stats.total_courses)}
              label="Learning Paths"
              color="purple"
            />
            <StatCard
              value={loading ? '-' : formatNumber(stats.total_projects)}
              label="Projects Built"
              color="pink"
            />
            <StatCard
              value={loading ? '-' : formatNumber(stats.total_teams)}
              label="Active Teams"
              color="cyan"
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Everything You Need to Succeed</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Powerful tools and resources designed specifically for CCIS students</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          <FeatureCard
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            title="AI-Powered Learning"
            description="Get personalized guidance from our AI mentor. Debug code and understand concepts faster."
            gradient="from-amber-500 to-orange-500"
          />
          <FeatureCard
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            }
            title="Real-World Projects"
            description="Build portfolio-worthy projects with your team using our built-in management tools."
            gradient="from-indigo-500 to-purple-500"
          />
          <FeatureCard
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            title="Vibrant Community"
            description="Connect with fellow CCIS students. Share knowledge and grow together."
            gradient="from-cyan-500 to-blue-500"
          />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          <div className="relative px-6 py-10 sm:px-12 sm:py-14 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-base sm:text-lg text-white/80 mb-6 sm:mb-8 max-w-xl mx-auto">
              Join hundreds of CCIS students already learning and building amazing projects.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 sm:px-8 sm:py-4 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-white/95 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-xl"
            >
              Create Free Account
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © 2024 CCIS CodeHub. Made for SNSU Students.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-slate-500 hover:text-white transition">About</a>
              <a href="#" className="text-sm text-slate-500 hover:text-white transition">Contact</a>
              <a href="#" className="text-sm text-slate-500 hover:text-white transition">Privacy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes zipperPulse {
          0%, 100% { 
            opacity: 0.4; 
            transform: rotate(-45deg) scale(1); 
          }
          50% { 
            opacity: 0.9; 
            transform: rotate(-45deg) scale(1.15); 
          }
        }
      `}</style>
    </div>
  )
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  const colorClasses: Record<string, string> = {
    indigo: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 group-hover:border-indigo-500/40',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 group-hover:border-purple-500/40',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/20 group-hover:border-pink-500/40',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 group-hover:border-cyan-500/40',
  }

  const textColors: Record<string, string> = {
    indigo: 'text-indigo-400',
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    cyan: 'text-cyan-400',
  }

  return (
    <div className="group relative">
      <div className={`relative bg-gradient-to-b ${colorClasses[color]} backdrop-blur-sm border rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02]`}>
        <div className={`text-2xl sm:text-3xl font-bold ${textColors[color]} mb-1`}>{value}</div>
        <div className="text-xs sm:text-sm text-slate-400">{label}</div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description, gradient }: {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}) {
  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
      <div className="relative h-full bg-slate-900/60 backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${gradient} text-white mb-4 shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
