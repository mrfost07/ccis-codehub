import { useState, useEffect } from 'react'
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { Users, BookOpen, Briefcase, MessageSquare, TrendingUp, Award, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface AnalyticsData {
    summary: {
        total_users: number
        total_students: number
        total_instructors: number
        total_admins: number
        total_career_paths: number
        total_modules: number
        total_quizzes: number
        total_enrollments: number
        total_projects: number
        total_teams: number
        total_tasks: number
        total_posts: number
        total_comments: number
        active_users_30d: number
    }
    users: {
        by_role: Array<{ role: string; count: number }>
        by_program: Array<{ program: string; count: number }>
        by_year: Array<{ year_level: string; count: number }>
        registration_trend: Array<{ month: string; count: number }>
        instructors: any[]
        students: any[]
    }
    learning: {
        paths: any
        modules_by_type: Array<{ module_type: string; count: number }>
        quiz_stats: any
        enrollment_stats: any
        quiz_performance: any
    }
    projects: {
        by_status: Array<{ status: string; count: number }>
        by_type: Array<{ project_type: string; count: number }>
        teams: any
        tasks_by_status: Array<{ status: string; count: number }>
    }
    community: {
        posts_by_type: Array<{ post_type: string; count: number }>
        engagement: any
        post_trend: any[]
    }
}

// Chart colors
const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']
const ROLE_COLORS = { admin: '#ef4444', instructor: '#8b5cf6', student: '#10b981' }
const STATUS_COLORS = { planning: '#f59e0b', in_progress: '#06b6d4', completed: '#10b981', on_hold: '#64748b' }

function AdminAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAnalytics = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await api.get('/admin/analytics/')
            setData(response.data)
        } catch (err: any) {
            console.error('Failed to fetch analytics:', err)
            setError(err.response?.data?.error || 'Failed to load analytics')
            toast.error('Failed to load analytics data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 animate-pulse">
                            <div className="h-6 bg-slate-700 rounded mb-3"></div>
                            <div className="h-10 bg-slate-700 rounded"></div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6 h-80 animate-pulse">
                            <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
                            <div className="h-full bg-slate-700/50 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-red-700/30 rounded-2xl p-8 text-center">
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Failed to Load Analytics</h3>
                <p className="text-slate-400 mb-4">{error}</p>
                <button
                    onClick={fetchAnalytics}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 mx-auto"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                </button>
            </div>
        )
    }

    // Helper to format role/program names
    const formatLabel = (label: string) => {
        if (!label) return 'Unknown'
        return label.charAt(0).toUpperCase() + label.slice(1).replace(/_/g, ' ')
    }

    // Prepare pie chart data
    const usersByRole = data.users.by_role.map(item => ({
        name: formatLabel(item.role),
        value: item.count,
        color: ROLE_COLORS[item.role as keyof typeof ROLE_COLORS] || COLORS[0]
    }))

    const usersByProgram = data.users.by_program.map((item, index) => ({
        name: item.program || 'Unknown',
        value: item.count,
        color: COLORS[index % COLORS.length]
    }))

    const usersByYear = data.users.by_year.map((item, index) => ({
        name: `Year ${item.year_level}`,
        value: item.count,
        color: COLORS[index % COLORS.length]
    }))

    const projectsByStatus = data.projects.by_status.map(item => ({
        name: formatLabel(item.status),
        value: item.count,
        color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || COLORS[0]
    }))

    const modulesByType = data.learning.modules_by_type.map((item, index) => ({
        name: formatLabel(item.module_type),
        value: item.count,
        color: COLORS[index % COLORS.length]
    }))

    const postsByType = data.community.posts_by_type.map((item, index) => ({
        name: formatLabel(item.post_type),
        value: item.count,
        color: COLORS[index % COLORS.length]
    }))

    // Summary stats
    const summaryStats = [
        { icon: Users, label: 'Total Users', value: data.summary.total_users, color: 'from-blue-500 to-blue-600' },
        { icon: Users, label: 'Students', value: data.summary.total_students, color: 'from-green-500 to-green-600' },
        { icon: Users, label: 'Instructors', value: data.summary.total_instructors, color: 'from-purple-500 to-purple-600' },
        { icon: TrendingUp, label: 'Active (30d)', value: data.summary.active_users_30d, color: 'from-cyan-500 to-cyan-600' },
        { icon: BookOpen, label: 'Career Paths', value: data.summary.total_career_paths, color: 'from-indigo-500 to-indigo-600' },
        { icon: Award, label: 'Modules', value: data.summary.total_modules, color: 'from-yellow-500 to-yellow-600' },
        { icon: CheckCircle, label: 'Quizzes', value: data.summary.total_quizzes, color: 'from-pink-500 to-pink-600' },
        { icon: Briefcase, label: 'Projects', value: data.summary.total_projects, color: 'from-orange-500 to-orange-600' },
        { icon: MessageSquare, label: 'Posts', value: data.summary.total_posts, color: 'from-teal-500 to-teal-600' },
        { icon: Users, label: 'Enrollments', value: data.summary.total_enrollments, color: 'from-red-500 to-red-600' },
    ]

    // Custom tooltip component
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
                    <p className="text-white font-medium">{payload[0].name}: {payload[0].value}</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="space-y-6">
            {/* Header with Refresh */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Platform Analytics</h2>
                <button
                    onClick={fetchAnalytics}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 text-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Summary Stats Grid - Mobile Responsive */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
                {summaryStats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={stat.label}
                            className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-3 sm:p-4 shadow-lg hover:bg-slate-800/70 hover:border-slate-600/50 transition-all"
                        >
                            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${stat.color} mb-2`}>
                                <Icon className="h-4 w-4 text-white" />
                            </div>
                            <p className="text-slate-400 text-xs mb-0.5">{stat.label}</p>
                            <p className="text-lg sm:text-xl font-bold text-white">{stat.value.toLocaleString()}</p>
                        </div>
                    )
                })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Users by Role - Pie Chart */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Users by Role</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={usersByRole}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                >
                                    {usersByRole.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Users by Program - Pie Chart */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Users by Program</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={usersByProgram}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                >
                                    {usersByProgram.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Users by Year Level - Bar Chart */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Students by Year Level</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={usersByYear}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Projects by Status - Pie Chart */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Projects by Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={projectsByStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                >
                                    {projectsByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Modules by Type - Bar Chart */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Modules by Type</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={modulesByType} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 12 }} width={100} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Posts by Type - Pie Chart */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Posts by Type</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={postsByType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                >
                                    {postsByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Quiz Performance Stats */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Quiz Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                        <p className="text-2xl font-bold text-white">{data.learning.quiz_performance.total_attempts}</p>
                        <p className="text-slate-400 text-sm">Total Attempts</p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                        <p className="text-2xl font-bold text-cyan-400">{data.learning.quiz_performance.avg_score?.toFixed(1) || 0}%</p>
                        <p className="text-slate-400 text-sm">Average Score</p>
                    </div>
                    <div className="text-center p-4 bg-green-900/30 rounded-xl">
                        <p className="text-2xl font-bold text-green-400">{data.learning.quiz_performance.passed}</p>
                        <p className="text-slate-400 text-sm">Passed</p>
                    </div>
                    <div className="text-center p-4 bg-red-900/30 rounded-xl">
                        <p className="text-2xl font-bold text-red-400">{data.learning.quiz_performance.failed}</p>
                        <p className="text-slate-400 text-sm">Failed</p>
                    </div>
                </div>
            </div>

            {/* Community Engagement */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Community Engagement</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                        <p className="text-2xl font-bold text-white">{data.community.engagement.total_posts}</p>
                        <p className="text-slate-400 text-sm">Total Posts</p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                        <p className="text-2xl font-bold text-white">{data.community.engagement.total_comments}</p>
                        <p className="text-slate-400 text-sm">Total Comments</p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                        <p className="text-2xl font-bold text-pink-400">{data.community.engagement.total_likes}</p>
                        <p className="text-slate-400 text-sm">Total Likes</p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                        <p className="text-2xl font-bold text-cyan-400">{data.community.engagement.recent_posts}</p>
                        <p className="text-slate-400 text-sm">Posts (30d)</p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                        <p className="text-2xl font-bold text-green-400">{data.summary.total_teams}</p>
                        <p className="text-slate-400 text-sm">Teams</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdminAnalytics
