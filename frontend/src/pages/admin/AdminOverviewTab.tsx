/**
 * Admin Overview Tab
 *
 * Dashboard statistics cards + recent platform activity feed
 */

import { Users, UserCheck, Shield, BookOpen, GitBranch, Trophy, MessageSquare, Brain, Activity, UserPlus } from 'lucide-react'
import type { DashboardStats, StatCard } from './types'

interface AdminOverviewTabProps {
    stats: DashboardStats
    loading: boolean
}

/** Compact relative timestamp ("now", "5m", "3h", "2d"). */
function timeAgo(iso: string) {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (seconds < 60) return 'now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminOverviewTab({ stats, loading }: AdminOverviewTabProps) {
    // Tinted icon chips per DESIGN_SYSTEM.md — no gradient slabs
    const statCards: (StatCard & { chip: string })[] = [
        { icon: Users, label: 'Total Users', value: stats.totalUsers, color: '', chip: 'bg-purple-500/10 text-purple-400' },
        { icon: UserCheck, label: 'Students', value: stats.totalStudents, color: '', chip: 'bg-green-500/10 text-green-400' },
        { icon: Shield, label: 'Instructors', value: stats.totalInstructors, color: '', chip: 'bg-purple-500/10 text-purple-400' },
        { icon: BookOpen, label: 'Courses', value: stats.totalCourses, color: '', chip: 'bg-amber-500/10 text-amber-400' },
        { icon: GitBranch, label: 'Projects', value: stats.totalProjects, color: '', chip: 'bg-purple-500/10 text-purple-400' },
        { icon: Trophy, label: 'Competitions', value: stats.activeCompetitions, color: '', chip: 'bg-amber-500/10 text-amber-400' },
        { icon: MessageSquare, label: 'Posts', value: stats.communityPosts, color: '', chip: 'bg-purple-500/10 text-purple-400' },
        { icon: Brain, label: 'AI Sessions', value: stats.aiInteractions, color: '', chip: 'bg-purple-500/10 text-purple-400' }
    ]

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8" aria-hidden="true">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 sm:p-4 md:p-6 animate-pulse">
                        <div className="h-10 w-10 bg-neutral-800 rounded-lg mb-4"></div>
                        <div className="h-3 w-2/3 bg-neutral-800 rounded mb-2"></div>
                        <div className="h-7 w-1/2 bg-neutral-800 rounded"></div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {statCards.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div key={stat.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 sm:p-4 md:p-6 hover:border-neutral-700 transition-colors">
                            <div className={`inline-flex p-2 sm:p-2.5 md:p-3 rounded-lg ${stat.chip} mb-2 sm:mb-3 md:mb-4`}>
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                            </div>
                            <p className="text-neutral-400 text-xs sm:text-sm mb-0.5 sm:mb-1">{stat.label}</p>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white tabular-nums">{stat.value.toLocaleString()}</p>
                        </div>
                    )
                })}
            </div>

            {/* Recent activity — served by the dashboard endpoint */}
            {stats.recentActivities && stats.recentActivities.length > 0 && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                    <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-900/60">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-purple-400" /> Recent Activity
                        </span>
                    </div>
                    <div className="divide-y divide-neutral-800/60">
                        {stats.recentActivities.slice(0, 10).map((activity: any, index: number) => (
                            <div key={index} className="flex items-center gap-3 px-5 py-3">
                                <div className={`p-2 rounded-lg shrink-0 ${activity.type === 'community_post'
                                    ? 'bg-purple-500/10 text-purple-400'
                                    : 'bg-green-500/10 text-green-400'
                                    }`}>
                                    {activity.type === 'community_post'
                                        ? <MessageSquare className="w-4 h-4" />
                                        : <UserPlus className="w-4 h-4" />}
                                </div>
                                <p className="flex-1 min-w-0 text-sm text-neutral-300 truncate">{activity.message}</p>
                                {activity.timestamp && (
                                    <span className="text-xs text-neutral-600 tabular-nums shrink-0">{timeAgo(activity.timestamp)}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
