import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, BookOpen, FileText, CheckCircle, AlertCircle,
  TrendingUp, Activity, Upload, Settings, Search
} from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../services/api'

interface OverviewMetrics {
  total_users: number
  active_users: number
  new_users_today: number
  total_paths: number
  active_paths: number
  total_modules: number
  total_uploads: number
  pending_uploads: number
  total_quizzes: number
  total_enrollments: number
  active_enrollments: number
  avg_completion_rate: number
  recent_errors: any[]
  pending_moderation: number
}

export default function AdminDashboardComplete() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      const response = await api.get('/admin/overview/')
      setMetrics(response.data)
    } catch (error) {
      console.error('Failed to fetch overview:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin text-4xl sm:text-6xl">⏳</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-slate-400">Manage your learning platform</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link
              to="/admin/search"
              className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-slate-800 rounded-lg hover:bg-slate-700 transition flex items-center gap-2"
            >
              <Search size={18} />
              <span className="hidden sm:inline">Search</span>
            </Link>
            <Link
              to="/admin/settings"
              className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-slate-800 rounded-lg hover:bg-slate-700 transition flex items-center gap-2"
            >
              <Settings size={18} />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </div>
        </div>

        {/* Overview Stats - Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatCard
            icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
            title="Total Users"
            value={metrics?.total_users || 0}
            subtitle={`${metrics?.active_users || 0} active`}
            color="blue"
            link="/admin/users"
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />}
            title="Career Paths"
            value={metrics?.total_paths || 0}
            subtitle={`${metrics?.active_paths || 0} active`}
            color="purple"
            link="/admin/paths"
          />
          <StatCard
            icon={<FileText className="w-5 h-5 sm:w-6 sm:h-6" />}
            title="Modules"
            value={metrics?.total_modules || 0}
            subtitle={`${metrics?.total_uploads || 0} files`}
            color="indigo"
            link="/admin/modules"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
            title="Completion Rate"
            value={`${metrics?.avg_completion_rate || 0}%`}
            subtitle="Average"
            color="green"
          />
        </div>

        {/* Quick Actions - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <QuickActionCard
            icon={<BookOpen />}
            title="Manage Paths"
            description="Create and edit career paths"
            link="/admin/paths"
            color="blue"
          />
          <QuickActionCard
            icon={<Upload />}
            title="Upload Content"
            description="Upload new modules"
            link="/admin/modules/upload"
            color="purple"
          />
          <QuickActionCard
            icon={<Users />}
            title="User Management"
            description="Manage users and roles"
            link="/admin/users"
            color="indigo"
          />
          <QuickActionCard
            icon={<Activity />}
            title="Analytics"
            description="View platform analytics"
            link="/admin/analytics"
            color="pink"
          />
        </div>

        {/* Alerts Section - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Pending Actions */}
          <div className="bg-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-800">
            <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="text-yellow-500 w-5 h-5 sm:w-6 sm:h-6" />
              Pending Actions
            </h3>
            <div className="space-y-3">
              {metrics?.pending_uploads ? (
                <AlertItem
                  title="Pending Uploads"
                  count={metrics.pending_uploads}
                  link="/admin/modules?status=pending"
                  color="yellow"
                />
              ) : null}
              {metrics?.pending_moderation ? (
                <AlertItem
                  title="Content Moderation"
                  count={metrics.pending_moderation}
                  link="/admin/moderation"
                  color="orange"
                />
              ) : null}
              {metrics?.recent_errors && metrics.recent_errors.length > 0 ? (
                <AlertItem
                  title="System Errors"
                  count={metrics.recent_errors.length}
                  link="/admin/errors"
                  color="red"
                />
              ) : null}
              {!metrics?.pending_uploads && !metrics?.pending_moderation && metrics?.recent_errors?.length === 0 && (
                <p className="text-sm sm:text-base text-slate-400">No pending actions</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-800">
            <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-500 w-5 h-5 sm:w-6 sm:h-6" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              <ActivityItem
                text={`${metrics?.new_users_today || 0} new users registered today`}
                time="Today"
              />
              <ActivityItem
                text={`${metrics?.active_enrollments || 0} active enrollments`}
                time="Current"
              />
              <ActivityItem
                text={`${metrics?.total_quizzes || 0} quizzes available`}
                time="Total"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, subtitle, color, link }: any) {
  const colors = {
    blue: 'from-blue-600 to-blue-700',
    purple: 'from-purple-600 to-purple-700',
    indigo: 'from-indigo-600 to-indigo-700',
    green: 'from-green-600 to-green-700',
    pink: 'from-pink-600 to-pink-700',
  }

  const content = (
    <div className={`bg-gradient-to-br ${colors[color as keyof typeof colors]} rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 h-full`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-white/80">{icon}</div>
      </div>
      <div>
        <p className="text-white/80 text-xs sm:text-sm mb-1">{title}</p>
        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{value}</p>
        {subtitle && (
          <p className="text-xs sm:text-sm text-white/70 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )

  if (link) {
    return (
      <Link to={link} className="block hover:scale-105 transition-transform">
        {content}
      </Link>
    )
  }

  return content
}

function QuickActionCard({ icon, title, description, link, color }: any) {
  const colors = {
    blue: 'border-blue-500/50 hover:border-blue-500',
    purple: 'border-purple-500/50 hover:border-purple-500',
    indigo: 'border-indigo-500/50 hover:border-indigo-500',
    pink: 'border-pink-500/50 hover:border-pink-500',
  }

  return (
    <Link
      to={link}
      className={`bg-slate-900 border ${colors[color as keyof typeof colors]} rounded-lg sm:rounded-xl p-4 sm:p-6 transition hover:scale-105 active:scale-95`}
    >
      <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{icon}</div>
      <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1 sm:mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400">{description}</p>
    </Link>
  )
}

function AlertItem({ title, count, link, color }: any) {
  const colors = {
    yellow: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
    orange: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
    red: 'bg-red-500/20 text-red-500 border-red-500/50',
  }

  return (
    <Link
      to={link}
      className={`flex items-center justify-between p-3 rounded-lg border ${colors[color as keyof typeof colors]} hover:scale-105 transition`}
    >
      <span className="text-sm sm:text-base font-medium">{title}</span>
      <span className="px-2 py-1 rounded-full bg-white/10 text-xs sm:text-sm font-bold">
        {count}
      </span>
    </Link>
  )
}

function ActivityItem({ text, time }: any) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base text-slate-300">{text}</p>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">{time}</p>
      </div>
    </div>
  )
}
