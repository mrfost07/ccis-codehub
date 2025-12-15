import { useState, useEffect } from 'react'
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'
import { RefreshCw, BookOpen, FileText, Award, Users, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import InstructorStudentsSection from './InstructorStudentsSection'

interface LearningAnalyticsData {
    career_paths: {
        total: number
        by_program: { name: string; value: number; color: string }[]
        by_difficulty: { name: string; value: number; color: string }[]
        active_count: number
        featured_count: number
    }
    modules: {
        total: number
        by_type: { name: string; value: number; color: string }[]
        avg_duration: number
        total_points: number
    }
    quizzes: {
        total: number
        total_questions: number
        avg_pass_score: number
        attempts_count: number
        pass_rate: number
    }
    enrollments: {
        total: number
        completed: number
        in_progress: number
        completion_rate: number
        by_month: { month: string; value: number }[]
    }
    quiz_performance: {
        avg_score: number
        total_attempts: number
        pass_count: number
        fail_count: number
    }
}

// Color palettes
const COLORS = {
    programs: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'],
    difficulties: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
    modules: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']
}

function LearningAnalytics() {
    const [data, setData] = useState<LearningAnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const response = await api.get('/admin/analytics/')
            const analytics = response.data

            // Safely get learning data with defaults
            const paths = analytics.learning?.paths || {}
            const modulesByType = analytics.learning?.modules_by_type || []
            const quizStats = analytics.learning?.quiz_stats || {}
            const enrollmentStats = analytics.learning?.enrollment_stats || {}
            const quizPerformance = analytics.learning?.quiz_performance || {}
            const summary = analytics.summary || {}

            // Process by_program array from API
            const byProgramData = (paths.by_program || []).map((p: any, i: number) => ({
                name: (p.program_type || 'Unknown').toUpperCase(),
                value: p.count || 0,
                color: COLORS.programs[i % COLORS.programs.length]
            })).filter((p: any) => p.value > 0)

            // Process by_difficulty array from API
            const byDifficultyData = (paths.by_difficulty || []).map((d: any, i: number) => ({
                name: (d.difficulty_level || 'Unknown').charAt(0).toUpperCase() + (d.difficulty_level || 'unknown').slice(1),
                value: d.count || 0,
                color: COLORS.difficulties[i % COLORS.difficulties.length]
            })).filter((d: any) => d.value > 0)

            // Process modules by type
            const modulesData = modulesByType.map((t: any, i: number) => ({
                name: (t.module_type || 'Unknown').charAt(0).toUpperCase() + (t.module_type || 'unknown').slice(1),
                value: t.count || 0,
                color: COLORS.modules[i % COLORS.modules.length]
            })).filter((m: any) => m.value > 0)

            const learningData: LearningAnalyticsData = {
                career_paths: {
                    total: paths.total || summary.total_career_paths || 0,
                    by_program: byProgramData,
                    by_difficulty: byDifficultyData,
                    active_count: paths.active || 0,
                    featured_count: 0
                },
                modules: {
                    total: summary.total_modules || 0,
                    by_type: modulesData,
                    avg_duration: 0,
                    total_points: 0
                },
                quizzes: {
                    total: quizStats.total || summary.total_quizzes || 0,
                    total_questions: 0,
                    avg_pass_score: quizStats.avg_passing_score || 70,
                    attempts_count: quizPerformance.total_attempts || 0,
                    pass_rate: quizPerformance.avg_score || 0
                },
                enrollments: {
                    total: enrollmentStats.total || summary.total_enrollments || 0,
                    completed: 0,
                    in_progress: enrollmentStats.recent || 0,
                    completion_rate: 0,
                    by_month: []
                },
                quiz_performance: {
                    avg_score: quizPerformance.avg_score || 0,
                    total_attempts: quizPerformance.total_attempts || 0,
                    pass_count: quizPerformance.passed || 0,
                    fail_count: quizPerformance.failed || 0
                }
            }

            setData(learningData)
        } catch (err: any) {
            console.error('Failed to fetch learning analytics:', err)
            toast.error('Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-20 text-slate-400">
                Failed to load analytics data
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header with Refresh */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Learning Analytics</h2>
                <button
                    onClick={fetchAnalytics}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                    <BookOpen className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{data.career_paths.total}</p>
                    <p className="text-slate-400 text-sm">Career Paths</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                    <FileText className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{data.modules.total}</p>
                    <p className="text-slate-400 text-sm">Modules</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                    <Award className="w-8 h-8 mx-auto text-green-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{data.quizzes.total}</p>
                    <p className="text-slate-400 text-sm">Quizzes</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                    <Users className="w-8 h-8 mx-auto text-yellow-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{data.enrollments.total}</p>
                    <p className="text-slate-400 text-sm">Enrollments</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{data.enrollments.completion_rate.toFixed(0)}%</p>
                    <p className="text-slate-400 text-sm">Completion Rate</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto text-pink-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{data.quiz_performance.avg_score.toFixed(0)}%</p>
                    <p className="text-slate-400 text-sm">Avg Quiz Score</p>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Career Paths by Program */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Career Paths by Program</h3>
                    {data.career_paths.by_program.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={data.career_paths.by_program}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                >
                                    {data.career_paths.by_program.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-slate-400">
                            No career path data available
                        </div>
                    )}
                </div>

                {/* Career Paths by Difficulty */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Career Paths by Difficulty</h3>
                    {data.career_paths.by_difficulty.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.career_paths.by_difficulty}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {data.career_paths.by_difficulty.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-slate-400">
                            No difficulty data available
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Modules by Type */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Modules by Type</h3>
                    {data.modules.by_type.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={data.modules.by_type}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                >
                                    {data.modules.by_type.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-slate-400">
                            No module data available
                        </div>
                    )}
                </div>

                {/* Quiz Performance */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Quiz Performance</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                            <p className="text-slate-400 text-sm">Total Attempts</p>
                            <p className="text-2xl font-bold text-white">{data.quiz_performance.total_attempts}</p>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                            <p className="text-slate-400 text-sm">Total Questions</p>
                            <p className="text-2xl font-bold text-white">{data.quizzes.total_questions}</p>
                        </div>
                        <div className="bg-green-900/30 rounded-lg p-4 text-center">
                            <p className="text-green-400 text-sm">Passed</p>
                            <p className="text-2xl font-bold text-green-400">{data.quiz_performance.pass_count}</p>
                        </div>
                        <div className="bg-red-900/30 rounded-lg p-4 text-center">
                            <p className="text-red-400 text-sm">Failed</p>
                            <p className="text-2xl font-bold text-red-400">{data.quiz_performance.fail_count}</p>
                        </div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400">Average Pass Score Threshold</span>
                            <span className="text-white font-semibold">{data.quizzes.avg_pass_score.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
                                style={{ width: `${data.quizzes.avg_pass_score}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Enrollment Stats */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Enrollment Statistics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                        <p className="text-slate-400 text-sm">Total Enrollments</p>
                        <p className="text-2xl font-bold text-white">{data.enrollments.total}</p>
                    </div>
                    <div className="bg-green-900/30 rounded-lg p-4 text-center">
                        <p className="text-green-400 text-sm">Completed</p>
                        <p className="text-2xl font-bold text-green-400">{data.enrollments.completed}</p>
                    </div>
                    <div className="bg-yellow-900/30 rounded-lg p-4 text-center">
                        <p className="text-yellow-400 text-sm">In Progress</p>
                        <p className="text-2xl font-bold text-yellow-400">{data.enrollments.in_progress}</p>
                    </div>
                    <div className="bg-purple-900/30 rounded-lg p-4 text-center">
                        <p className="text-purple-400 text-sm">Completion Rate</p>
                        <p className="text-2xl font-bold text-purple-400">{data.enrollments.completion_rate.toFixed(0)}%</p>
                    </div>
                </div>
            </div>

            {/* Module Stats */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Module Statistics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                        <Clock className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                        <p className="text-slate-400 text-sm">Avg Duration</p>
                        <p className="text-xl font-bold text-white">{data.modules.avg_duration.toFixed(0)} min</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                        <Award className="w-6 h-6 mx-auto text-yellow-400 mb-2" />
                        <p className="text-slate-400 text-sm">Total Points</p>
                        <p className="text-xl font-bold text-white">{data.modules.total_points}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                        <FileText className="w-6 h-6 mx-auto text-green-400 mb-2" />
                        <p className="text-slate-400 text-sm">Module Types</p>
                        <p className="text-xl font-bold text-white">{data.modules.by_type.length}</p>
                    </div>
                </div>
            </div>

            {/* Instructors & Students Section */}
            <div className="mt-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Instructors & Students</h2>
                <InstructorStudentsSection />
            </div>
        </div>
    )
}

export default LearningAnalytics
