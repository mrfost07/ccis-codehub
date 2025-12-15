import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts'
import {
    RefreshCw, Briefcase, Users, ListTodo, Activity, BarChart3,
    ChevronDown, ChevronRight, Search, CheckCircle,
    FolderKanban, Filter, X
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

// Interfaces matching exact backend serializer structure
interface Project {
    id: string
    name: string
    slug: string
    description: string
    status: string
    project_type: string
    team: string | null // UUID
    team_name: string | null
    team_slug: string | null
    owner: string // UUID
    owner_name: string
    owner_picture: string | null
    member_count: number
    task_count: number
    created_at: string
    memberships: ProjectMember[]
}

interface ProjectMember {
    id: string
    user: string // UUID
    user_name: string
    user_email: string
    user_picture: string | null
    role: string
}

interface Task {
    id: string
    title: string
    description: string
    status: string
    priority: string
    project: string // UUID
    project_name: string
    assigned_to: string | null // UUID
    assigned_to_name: string | null
    assigned_to_picture: string | null
    due_date: string | null
    created_at: string
}

interface Team {
    id: string
    name: string
    slug: string
    description: string
    is_active: boolean
    leader: string // UUID
    leader_name: string
    leader_picture: string | null
    member_count: number
    project_count: number
    accepted_members: TeamMember[]
    created_at: string
}

interface TeamMember {
    id: string
    user: string // UUID
    user_name: string
    user_email: string
    user_picture: string | null
    role: string
    status: string
}

interface ProjectAnalyticsData {
    total_projects: number
    total_tasks: number
    total_teams: number
    projects_by_status: { name: string; value: number; color: string }[]
    projects_by_type: { name: string; value: number; color: string }[]
    tasks_by_status: { name: string; value: number; color: string }[]
    active_teams: number
}

const COLORS = {
    status: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
    types: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
    tasks: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']
}

const STATUS_COLORS: Record<string, string> = {
    'planning': 'bg-blue-500/20 text-blue-400',
    'in_progress': 'bg-yellow-500/20 text-yellow-400',
    'active': 'bg-green-500/20 text-green-400',
    'completed': 'bg-green-500/20 text-green-400',
    'on_hold': 'bg-orange-500/20 text-orange-400',
    'cancelled': 'bg-red-500/20 text-red-400',
    'todo': 'bg-slate-500/20 text-slate-400',
    'done': 'bg-green-500/20 text-green-400',
    'review': 'bg-purple-500/20 text-purple-400',
    'blocked': 'bg-red-500/20 text-red-400'
}

function ProjectAdmin() {
    const navigate = useNavigate()
    const [view, setView] = useState<'overview' | 'projects' | 'tasks' | 'teams' | 'analytics'>('overview')
    const [loading, setLoading] = useState(true)
    const [projects, setProjects] = useState<Project[]>([])
    const [teams, setTeams] = useState<Team[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [analytics, setAnalytics] = useState<ProjectAnalyticsData | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Filters
    const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('')
    const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('')

    // Team expansion
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch analytics data
            const analyticsRes = await api.get('/admin/analytics/')
            const data = analyticsRes.data

            // Process analytics
            const projectsByStatus = (data.projects?.by_status || []).map((s: any, i: number) => ({
                name: formatLabel(s.status),
                value: s.count || 0,
                color: COLORS.status[i % COLORS.status.length]
            })).filter((p: any) => p.value > 0)

            const projectsByType = (data.projects?.by_type || []).map((t: any, i: number) => ({
                name: formatLabel(t.project_type),
                value: t.count || 0,
                color: COLORS.types[i % COLORS.types.length]
            })).filter((p: any) => p.value > 0)

            const tasksByStatus = (data.projects?.tasks_by_status || []).map((t: any, i: number) => ({
                name: formatLabel(t.status),
                value: t.count || 0,
                color: COLORS.tasks[i % COLORS.tasks.length]
            })).filter((t: any) => t.value > 0)

            setAnalytics({
                total_projects: data.summary?.total_projects || 0,
                total_tasks: data.summary?.total_tasks || 0,
                total_teams: data.summary?.total_teams || data.projects?.teams?.total || 0,
                projects_by_status: projectsByStatus,
                projects_by_type: projectsByType,
                tasks_by_status: tasksByStatus,
                active_teams: data.projects?.teams?.active || 0
            })

            // Fetch ALL projects using admin endpoint
            try {
                const projectsRes = await api.get('/admin/projects/')
                const projData = Array.isArray(projectsRes.data) ? projectsRes.data : []
                console.log('Admin Projects fetched:', projData.length, projData)
                setProjects(projData)
            } catch (err) {
                console.error('Admin Projects fetch error:', err)
                setProjects([])
            }

            // Fetch teams
            try {
                const teamsRes = await api.get('/projects/teams/')
                const teamsData = Array.isArray(teamsRes.data) ? teamsRes.data :
                    teamsRes.data?.results || []
                console.log('Teams fetched:', teamsData.length, teamsData)
                setTeams(teamsData)
            } catch (err) {
                console.error('Teams fetch error:', err)
                setTeams([])
            }

            // Fetch ALL tasks using admin endpoint
            try {
                const tasksRes = await api.get('/admin/tasks/')
                const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : []
                console.log('Admin Tasks fetched:', tasksData.length, tasksData)
                setTasks(tasksData)
            } catch (err) {
                console.error('Admin Tasks fetch error:', err)
                setTasks([])
            }

        } catch (err) {
            console.error('Failed to fetch project data:', err)
            toast.error('Failed to load project data')
        } finally {
            setLoading(false)
        }
    }

    // Helper to format label
    const formatLabel = (str: string | null | undefined): string => {
        if (!str) return 'Unknown'
        return str.replace(/_/g, ' ').split(' ').map(w =>
            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' ')
    }

    // Helper to get profile picture URL
    const getProfilePicUrl = (pic: string | null | undefined): string | null => {
        if (!pic) return null
        return pic.startsWith('http') ? pic : `http://localhost:8000${pic}`
    }

    // Navigate to user profile
    const handleViewProfile = (userId: string) => {
        if (userId) {
            navigate(`/user/${userId}`)
        }
    }

    // Avatar component
    const UserAvatar = ({
        userId,
        userName,
        userPicture,
        size = 'sm',
        clickable = true
    }: {
        userId?: string | null
        userName?: string | null
        userPicture?: string | null
        size?: 'xs' | 'sm' | 'md'
        clickable?: boolean
    }) => {
        const sizeClasses = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base' }
        const picUrl = getProfilePicUrl(userPicture)
        const initial = (userName?.[0] || '?').toUpperCase()

        const handleClick = () => {
            if (clickable && userId) {
                handleViewProfile(userId)
            }
        }

        if (picUrl) {
            return (
                <img
                    src={picUrl}
                    alt={userName || 'User'}
                    className={`${sizeClasses[size]} rounded-full object-cover ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-purple-500' : ''} transition`}
                    onClick={handleClick}
                    onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none'
                    }}
                />
            )
        }

        return (
            <div
                className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-purple-500' : ''} transition`}
                onClick={handleClick}
            >
                {initial}
            </div>
        )
    }

    // Clickable user name
    const UserLink = ({ userId, userName }: { userId?: string | null; userName?: string | null }) => {
        if (!userId || !userName) return <span className="text-slate-500">N/A</span>
        return (
            <span
                className="text-slate-300 hover:text-purple-400 cursor-pointer transition"
                onClick={() => handleViewProfile(userId)}
            >
                {userName}
            </span>
        )
    }

    const subTabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'projects', label: 'Projects', icon: Briefcase },
        { id: 'tasks', label: 'Tasks', icon: ListTodo },
        { id: 'teams', label: 'Teams', icon: Users },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 }
    ]

    // Create unique teams list for filter dropdown
    const uniqueTeams = projects.reduce((acc: { id: string; name: string }[], p) => {
        if (p.team && p.team_name && !acc.find(t => t.id === p.team)) {
            acc.push({ id: p.team, name: p.team_name })
        }
        return acc
    }, [])

    // Filtered data
    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesTeam = !selectedTeamFilter || p.team === selectedTeamFilter
        return matchesSearch && matchesTeam
    })

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesProject = !selectedProjectFilter || t.project === selectedProjectFilter
        return matchesSearch && matchesProject
    })

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex flex-wrap gap-2 sm:gap-3 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-2">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setView(tab.id as any)
                            setSearchTerm('')
                            setSelectedProjectFilter('')
                            setSelectedTeamFilter('')
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${view === tab.id
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Overview */}
            {view === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                            <Briefcase className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{analytics?.total_projects || projects.length}</p>
                            <p className="text-slate-400 text-sm">Projects</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                            <ListTodo className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{analytics?.total_tasks || tasks.length}</p>
                            <p className="text-slate-400 text-sm">Tasks</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                            <Users className="w-8 h-8 mx-auto text-green-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{analytics?.total_teams || teams.length}</p>
                            <p className="text-slate-400 text-sm">Teams</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                            <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{analytics?.active_teams || 0}</p>
                            <p className="text-slate-400 text-sm">Active Teams</p>
                        </div>
                    </div>

                    {/* Recent Projects */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Recent Projects</h3>
                        <div className="space-y-3">
                            {projects.slice(0, 5).map(project => (
                                <div key={project.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FolderKanban className="w-5 h-5 text-purple-400" />
                                        <div>
                                            <p className="text-white font-medium">{project.name}</p>
                                            <p className="text-slate-400 text-xs">
                                                {project.team_name || 'No team'} • {formatLabel(project.project_type)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[project.status] || 'bg-slate-600 text-slate-300'}`}>
                                        {formatLabel(project.status)}
                                    </span>
                                </div>
                            ))}
                            {projects.length === 0 && (
                                <p className="text-slate-400 text-center py-4">No projects found</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Projects List */}
            {view === 'projects' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={selectedTeamFilter}
                                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            >
                                <option value="">All Teams</option>
                                {uniqueTeams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            {selectedTeamFilter && (
                                <button onClick={() => setSelectedTeamFilter('')} className="p-1 text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button onClick={fetchData} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
                            <RefreshCw className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-700/50">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm">Project</th>
                                        <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm hidden sm:table-cell">Team</th>
                                        <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm hidden md:table-cell">Owner</th>
                                        <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {filteredProjects.map(project => (
                                        <tr key={project.id} className="hover:bg-slate-700/30 transition">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <FolderKanban className="w-5 h-5 text-purple-400 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-white font-medium truncate">{project.name}</p>
                                                        <p className="text-slate-400 text-xs truncate">{formatLabel(project.project_type)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 text-sm hidden sm:table-cell">
                                                {project.team_name || <span className="text-slate-500">No team</span>}
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <UserAvatar userId={project.owner} userName={project.owner_name} userPicture={project.owner_picture} size="xs" />
                                                    <UserLink userId={project.owner} userName={project.owner_name} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[project.status] || 'bg-slate-600 text-slate-300'}`}>
                                                    {formatLabel(project.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProjects.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-slate-400">
                                                No projects found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tasks List */}
            {view === 'tasks' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={selectedProjectFilter}
                                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            >
                                <option value="">All Projects</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {selectedProjectFilter && (
                                <button onClick={() => setSelectedProjectFilter('')} className="p-1 text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-700/50">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm">Task</th>
                                        <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm hidden sm:table-cell">Project</th>
                                        <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm">Status</th>
                                        <th className="text-left px-4 py-3 text-slate-300 font-medium text-sm hidden md:table-cell">Assignee</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {filteredTasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-700/30 transition">
                                            <td className="px-4 py-3">
                                                <p className="text-white font-medium">{task.title}</p>
                                                <p className="text-slate-400 text-xs capitalize">{task.priority} priority</p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 text-sm hidden sm:table-cell">
                                                {task.project_name || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[task.status] || 'bg-slate-600 text-slate-300'}`}>
                                                    {formatLabel(task.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                {task.assigned_to && task.assigned_to_name ? (
                                                    <div className="flex items-center gap-2">
                                                        <UserAvatar userId={task.assigned_to} userName={task.assigned_to_name} userPicture={task.assigned_to_picture} size="xs" />
                                                        <UserLink userId={task.assigned_to} userName={task.assigned_to_name} />
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 text-sm">Unassigned</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTasks.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-slate-400">
                                                No tasks found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Teams List */}
            {view === 'teams' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search teams..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <button onClick={fetchData} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
                            <RefreshCw className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {filteredTeams.map(team => {
                            const isExpanded = expandedTeam === team.id
                            // accepted_members from serializer + leader
                            const members = team.accepted_members || []

                            return (
                                <div
                                    key={team.id}
                                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl overflow-hidden"
                                >
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition"
                                        onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                                <Users className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-semibold">{team.name}</h3>
                                                <p className="text-slate-400 text-sm">
                                                    {team.member_count || 0} members • {team.project_count || 0} projects
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Leader */}
                                            <div
                                                className="hidden sm:flex items-center gap-2 cursor-pointer hover:text-purple-400"
                                                onClick={(e) => { e.stopPropagation(); handleViewProfile(team.leader) }}
                                            >
                                                <UserAvatar userId={team.leader} userName={team.leader_name} userPicture={team.leader_picture} size="xs" />
                                                <span className="text-slate-300 text-xs">Leader</span>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs ${team.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                                                {team.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            {isExpanded ? (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-slate-400" />
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-slate-700/50 p-4 bg-slate-900/30">
                                            <h4 className="text-slate-400 text-sm mb-3">Team Members</h4>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {/* Leader first */}
                                                <div
                                                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition cursor-pointer"
                                                    onClick={() => handleViewProfile(team.leader)}
                                                >
                                                    <UserAvatar userId={team.leader} userName={team.leader_name} userPicture={team.leader_picture} size="md" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-sm font-medium truncate hover:text-purple-400">
                                                            {team.leader_name}
                                                        </p>
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                                                            Leader
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Other members */}
                                                {members.filter(m => m.status === 'accepted').map(member => (
                                                    <div
                                                        key={member.id}
                                                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition cursor-pointer"
                                                        onClick={() => handleViewProfile(member.user)}
                                                    >
                                                        <UserAvatar userId={member.user} userName={member.user_name} userPicture={member.user_picture} size="md" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm font-medium truncate hover:text-purple-400">
                                                                {member.user_name}
                                                            </p>
                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${member.role === 'admin'
                                                                ? 'bg-purple-500/20 text-purple-400'
                                                                : 'bg-slate-600 text-slate-300'
                                                                }`}>
                                                                {member.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {members.filter(m => m.status === 'accepted').length === 0 && (
                                                <p className="text-slate-500 text-sm text-center py-4">
                                                    No other members yet
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {filteredTeams.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                No teams found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Analytics */}
            {view === 'analytics' && analytics && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                            <Briefcase className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{analytics.total_projects}</p>
                            <p className="text-slate-400 text-sm">Total Projects</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                            <ListTodo className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{analytics.total_tasks}</p>
                            <p className="text-slate-400 text-sm">Total Tasks</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                            <Users className="w-8 h-8 mx-auto text-green-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{analytics.total_teams}</p>
                            <p className="text-slate-400 text-sm">Total Teams</p>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-4 text-center">
                            <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{analytics.active_teams}</p>
                            <p className="text-slate-400 text-sm">Active Teams</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Projects by Status */}
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Projects by Status</h3>
                            {analytics.projects_by_status.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={analytics.projects_by_status}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                        >
                                            {analytics.projects_by_status.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[250px] flex items-center justify-center text-slate-400">
                                    No project data available
                                </div>
                            )}
                        </div>

                        {/* Projects by Type */}
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Projects by Type</h3>
                            {analytics.projects_by_type.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={analytics.projects_by_type}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
                                        <YAxis stroke="#9CA3AF" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
                                            labelStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {analytics.projects_by_type.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[250px] flex items-center justify-center text-slate-400">
                                    No type data available
                                </div>
                            )}
                        </div>

                        {/* Tasks by Status */}
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-6 lg:col-span-2">
                            <h3 className="text-lg font-semibold text-white mb-4">Tasks by Status</h3>
                            {analytics.tasks_by_status.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={analytics.tasks_by_status}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" stroke="#9CA3AF" />
                                        <YAxis stroke="#9CA3AF" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
                                            labelStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {analytics.tasks_by_status.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[250px] flex items-center justify-center text-slate-400">
                                    No task data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProjectAdmin
