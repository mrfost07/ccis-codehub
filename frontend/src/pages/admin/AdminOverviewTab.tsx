/**
 * Admin Overview Tab
 * 
 * Displays dashboard statistics cards for the admin overview
 */

import { Users, UserCheck, Shield, BookOpen, GitBranch, Trophy, MessageSquare, Brain } from 'lucide-react'
import type { DashboardStats, StatCard } from './types'

interface AdminOverviewTabProps {
    stats: DashboardStats
    loading: boolean
}

export default function AdminOverviewTab({ stats, loading }: AdminOverviewTabProps) {
    const statCards: StatCard[] = [
        { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'from-blue-500 to-blue-600' },
        { icon: UserCheck, label: 'Students', value: stats.totalStudents, color: 'from-green-500 to-green-600' },
        { icon: Shield, label: 'Instructors', value: stats.totalInstructors, color: 'from-purple-500 to-purple-600' },
        { icon: BookOpen, label: 'Courses', value: stats.totalCourses, color: 'from-yellow-500 to-yellow-600' },
        { icon: GitBranch, label: 'Projects', value: stats.totalProjects, color: 'from-indigo-500 to-indigo-600' },
        { icon: Trophy, label: 'Competitions', value: stats.activeCompetitions, color: 'from-red-500 to-red-600' },
        { icon: MessageSquare, label: 'Posts', value: stats.communityPosts, color: 'from-pink-500 to-pink-600' },
        { icon: Brain, label: 'AI Sessions', value: stats.aiInteractions, color: 'from-cyan-500 to-cyan-600' }
    ]

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 sm:p-4 md:p-6 animate-pulse shadow-lg">
                        <div className="h-8 sm:h-10 md:h-12 bg-slate-700 rounded mb-3 sm:mb-4"></div>
                        <div className="h-6 sm:h-8 bg-slate-700 rounded"></div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            {statCards.map((stat) => {
                const Icon = stat.icon
                return (
                    <div key={stat.label} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg hover:bg-slate-800/70 hover:border-slate-600/50 transition-all">
                        <div className={`inline-flex p-2 sm:p-2.5 md:p-3 rounded-lg bg-gradient-to-r ${stat.color} mb-2 sm:mb-3 md:mb-4`}>
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm mb-0.5 sm:mb-1">{stat.label}</p>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{stat.value.toLocaleString()}</p>
                    </div>
                )
            })}
        </div>
    )
}
