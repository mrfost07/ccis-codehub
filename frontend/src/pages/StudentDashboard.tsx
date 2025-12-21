import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout, { SidenavItem } from '../components/layout/DashboardLayout'
import {
  BookOpen, Award, Target, CheckCircle, Play, Trophy, Users, Briefcase,
  FolderOpen, ListTodo, GitPullRequest, TrendingUp, ChevronRight, Bell, Home,
  Search, Filter, ArrowUpDown, X
} from 'lucide-react'
import api from '../services/api'
import { projectsAPI } from '../services/api'
import toast from 'react-hot-toast'

interface Enrollment {
  id: string
  career_path: string
  career_path_name: string
  career_path_details: {
    name: string
    description: string
    total_modules: number
    estimated_duration: number
    points_reward: number
  }
  progress_percentage: number
  status: string
  enrolled_at: string
}

interface Project {
  id: string
  name: string
  slug: string
  status: string
  task_count?: number
  member_count?: number
  owner: number
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
}

interface Invitation {
  id: string
  project_name: string
  inviter_name: string
  role: string
}

interface Stats {
  coursesEnrolled: number
  coursesCompleted: number
  totalPoints: number
  modulesCompleted: number
  certificatesEarned: number
  quizzesTaken: number
}

interface ProjectStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  pendingInvitations: number
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  // Sidebar navigation items
  const sidenavItems: SidenavItem[] = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'community', label: 'Community', icon: Users }
  ]

  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [stats, setStats] = useState<Stats>({
    coursesEnrolled: 0,
    coursesCompleted: 0,
    totalPoints: 0,
    modulesCompleted: 0,
    certificatesEarned: 0,
    quizzesTaken: 0
  })
  const [projectStats, setProjectStats] = useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingInvitations: 0
  })
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Course search, sort, filter state
  const [courseSearch, setCourseSearch] = useState('')
  const [courseSort, setCourseSort] = useState<'name' | 'progress' | 'recent'>('recent')
  const [courseFilter, setCourseFilter] = useState<'all' | 'in_progress' | 'completed'>('all')

  // Certificate search and sort state
  const [certSearch, setCertSearch] = useState('')
  const [certSort, setCertSort] = useState<'name' | 'date'>('date')

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

      // Fetch user profile for points
      const profileResponse = await api.get('/auth/profile/')
      const profile = profileResponse.data

      // Fetch certificates
      let certificatesData: any[] = []
      try {
        const certsResponse = await api.get('/learning/certificates/')
        certificatesData = certsResponse.data.results || certsResponse.data || []
        setCertificates(certificatesData)
      } catch (error) {
        console.log('No certificates yet')
      }

      // Fetch projects
      let projectsData: Project[] = []
      let tasksData: Task[] = []
      let invitationsData: Invitation[] = []
      try {
        const projectsRes = await projectsAPI.getProjects()
        projectsData = projectsRes.data.results || projectsRes.data || []
        setProjects(projectsData)

        const tasksRes = await projectsAPI.getTasks()
        tasksData = tasksRes.data.results || tasksRes.data || []
        setRecentTasks(tasksData.slice(0, 5))

        try {
          const invRes = await projectsAPI.getMyInvitations()
          invitationsData = invRes.data || []
          setInvitations(invitationsData)
        } catch {
          // No invitations
        }
      } catch (error) {
        console.log('Failed to fetch projects')
      }

      // Calculate learning stats
      const completedCount = enrollmentsData.filter((e: Enrollment) => e.status === 'completed').length

      setStats({
        coursesEnrolled: enrollmentsData.length,
        coursesCompleted: completedCount,
        totalPoints: profile.total_points || 0,
        modulesCompleted: profile.total_courses_completed || 0,
        certificatesEarned: certificatesData.length,
        quizzesTaken: 0
      })

      // Calculate project stats
      setProjectStats({
        totalProjects: projectsData.length,
        activeProjects: projectsData.filter(p => p.status === 'active' || p.status === 'in_progress').length,
        totalTasks: tasksData.length,
        completedTasks: tasksData.filter(t => t.status === 'done').length,
        pendingInvitations: invitationsData.length
      })

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort courses
  const filteredCourses = useMemo(() => {
    let result = [...enrollments]

    // Search filter
    if (courseSearch) {
      result = result.filter(e =>
        e.career_path_details?.name?.toLowerCase().includes(courseSearch.toLowerCase())
      )
    }

    // Status filter
    if (courseFilter !== 'all') {
      result = result.filter(e => e.status === courseFilter)
    }

    // Sort
    result.sort((a, b) => {
      if (courseSort === 'name') {
        return (a.career_path_details?.name || '').localeCompare(b.career_path_details?.name || '')
      } else if (courseSort === 'progress') {
        return b.progress_percentage - a.progress_percentage
      }
      return new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()
    })

    return result
  }, [enrollments, courseSearch, courseFilter, courseSort])

  // Filter and sort certificates
  const filteredCerts = useMemo(() => {
    let result = [...certificates]

    if (certSearch) {
      result = result.filter(c =>
        c.career_path_name?.toLowerCase().includes(certSearch.toLowerCase())
      )
    }

    result.sort((a, b) => {
      if (certSort === 'name') {
        return (a.career_path_name || '').localeCompare(b.career_path_name || '')
      }
      return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
    })

    return result
  }, [certificates, certSearch, certSort])

  if (loading) {
    return (
      <DashboardLayout
        title="Student Dashboard"
        sidenavItems={sidenavItems}
        activeItem={activeTab}
        onItemClick={setActiveTab}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Student Dashboard"
      sidenavItems={sidenavItems}
      activeItem={activeTab}
      onItemClick={setActiveTab}
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid - Mobile Responsive */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 md:p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-blue-600/20 rounded-lg">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs sm:text-sm">Enrolled</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats.coursesEnrolled}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 md:p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-green-600/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs sm:text-sm">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats.coursesCompleted}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 md:p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-yellow-600/20 rounded-lg">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs sm:text-sm">Total Points</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalPoints}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 md:p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-purple-600/20 rounded-lg">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs sm:text-sm">Modules Done</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats.modulesCompleted}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions - Mobile Responsive */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Ready to learn?</h3>
                <p className="text-sm sm:text-base text-blue-100">Explore new career paths and expand your skills</p>
              </div>
              <button
                onClick={() => navigate('/learning')}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition text-sm sm:text-base whitespace-nowrap"
              >
                Explore Paths
              </button>
            </div>
          </div>

          {/* Grid for Courses, Certificates, Projects, Community - Mobile Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Enrolled Courses */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-6">My Courses</h2>

              {enrollments.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Enrollments Yet</h3>
                  <p className="text-slate-400 mb-6">Start your learning journey by enrolling in a career path</p>
                  <button
                    onClick={() => navigate('/learning')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Browse Career Paths
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrollments.map(enrollment => (
                    <div key={enrollment.id} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {enrollment.career_path_details?.name || 'Career Path'}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {enrollment.career_path_details?.description}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${enrollment.status === 'completed'
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-blue-600/20 text-blue-400'
                          }`}>
                          {enrollment.status}
                        </span>
                      </div>

                      {enrollment.career_path_details && (
                        <div className="flex gap-4 text-sm text-slate-400 mb-3">
                          <span>{enrollment.career_path_details.total_modules} modules</span>
                          <span>{enrollment.career_path_details.estimated_duration} weeks</span>
                          <span>{enrollment.career_path_details.points_reward} points</span>
                        </div>
                      )}

                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{enrollment.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${enrollment.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/learning/paths/${enrollment.career_path}`)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Continue Learning
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certificates */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">My Certificates</h2>
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>

              {certificates.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Certificates Yet</h3>
                  <p className="text-slate-400 text-sm">Complete career paths to earn certificates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.slice(0, 3).map((cert: any) => (
                    <div key={cert.id} className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-600/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-yellow-600/30 rounded-lg">
                          <Trophy className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-1">{cert.career_path_name || 'Certificate'}</h4>
                          <p className="text-xs text-slate-400">
                            Issued: {new Date(cert.issued_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-yellow-400 mt-1">ID: {cert.certificate_id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {certificates.length > 3 && (
                    <p className="text-sm text-slate-400 text-center pt-2">
                      + {certificates.length - 3} more certificate{certificates.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Projects */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">My Projects</h2>
                <div className="flex items-center gap-2">
                  {invitations.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                      <Bell className="w-3 h-3" />
                      {invitations.length} invites
                    </span>
                  )}
                  <Briefcase className="w-6 h-6 text-blue-400" />
                </div>
              </div>

              {/* Project Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-cyan-400">{projectStats.totalProjects}</p>
                  <p className="text-xs text-slate-400">Projects</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{projectStats.completedTasks}</p>
                  <p className="text-xs text-slate-400">Tasks Done</p>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Projects Yet</h3>
                  <p className="text-slate-400 text-sm mb-4">Start collaborating on projects</p>
                  <button
                    onClick={() => navigate('/projects')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Browse Projects
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 3).map(project => (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.slug}`)}
                      className="bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">{project.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {project.member_count || 1}
                            </span>
                            <span className="flex items-center gap-1">
                              <ListTodo className="w-3 h-3" /> {project.task_count || 0} tasks
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
                  {projects.length > 3 && (
                    <button
                      onClick={() => navigate('/projects')}
                      className="w-full py-2 text-sm text-cyan-400 hover:text-cyan-300 transition"
                    >
                      View all {projects.length} projects →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Recent Tasks */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Recent Tasks</h2>
                <ListTodo className="w-6 h-6 text-purple-400" />
              </div>

              {recentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <ListTodo className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Tasks Yet</h3>
                  <p className="text-slate-400 text-sm mb-4">Tasks from your projects will appear here</p>
                  <button
                    onClick={() => navigate('/projects')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                  >
                    View Projects
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTasks.map(task => (
                    <div key={task.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-400' :
                        task.status === 'in_progress' ? 'bg-blue-400' :
                          task.status === 'review' ? 'bg-purple-400' : 'bg-slate-400'
                        }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{task.title}</p>
                        <p className="text-xs text-slate-400">{task.status.replace('_', ' ')}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/projects')}
                    className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 transition"
                  >
                    View all tasks →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Community Section */}
          <div className="mt-6 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-xl p-6 border border-slate-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-600/30 rounded-lg">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Join the Community</h3>
                  <p className="text-slate-400">Connect with other students and share knowledge</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/community')}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
              >
                View Community
              </button>
            </div>
          </div>
        </>
      )}

      {/* My Courses Tab */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {/* Header with count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">My Courses</h2>
              <span className="text-sm text-slate-400">({enrollments.length})</span>
            </div>
            <button onClick={() => navigate('/learning')} className="text-sm text-blue-400 hover:text-blue-300">
              + Browse Paths
            </button>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              {courseSearch && (
                <button onClick={() => setCourseSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={courseSort}
              onChange={(e) => setCourseSort(e.target.value as any)}
              className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="recent">Recent</option>
              <option value="progress">Progress</option>
              <option value="name">Name</option>
            </select>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'in_progress', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setCourseFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${courseFilter === f
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:text-white'
                  }`}
              >
                {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : 'Completed'}
              </button>
            ))}
          </div>

          {/* Course List */}
          {enrollments.length === 0 ? (
            <div className="text-center py-10 bg-slate-800/20 rounded-xl border border-slate-700/30">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm mb-3">No enrollments yet</p>
              <button onClick={() => navigate('/learning')} className="text-sm text-blue-400 hover:text-blue-300">
                Browse Paths →
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No courses match your filters</div>
          ) : (
            <div className="space-y-2">
              {filteredCourses.map(enrollment => (
                <div
                  key={enrollment.id}
                  onClick={() => navigate(`/learning/paths/${enrollment.career_path}`)}
                  className="flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-700/40 rounded-xl border border-slate-700/30 hover:border-slate-600/50 cursor-pointer transition group"
                >
                  {/* Progress Circle */}
                  <div className="relative w-10 h-10 shrink-0">
                    <svg className="w-10 h-10 -rotate-90">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-700" />
                      <circle
                        cx="20" cy="20" r="16" fill="none" strokeWidth="3"
                        strokeDasharray={`${enrollment.progress_percentage} 100`}
                        className="text-blue-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
                      {enrollment.progress_percentage}%
                    </span>
                  </div>

                  {/* Course Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{enrollment.career_path_details?.name || 'Course'}</h4>
                    <p className="text-xs text-slate-500 truncate">{enrollment.career_path_details?.total_modules || 0} modules</p>
                  </div>

                  {/* Status Badge */}
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${enrollment.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                    {enrollment.status === 'completed' ? 'Done' : 'Active'}
                  </span>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certificates Tab */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          {/* Header with count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">My Certificates</h2>
              <span className="text-sm text-slate-400">({certificates.length})</span>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search certificates..."
                value={certSearch}
                onChange={(e) => setCertSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              {certSearch && (
                <button onClick={() => setCertSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>
            <select
              value={certSort}
              onChange={(e) => setCertSort(e.target.value as any)}
              className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
            </select>
          </div>

          {/* Certificate List */}
          {certificates.length === 0 ? (
            <div className="text-center py-10 bg-slate-800/20 rounded-xl border border-slate-700/30">
              <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Complete courses to earn certificates</p>
            </div>
          ) : filteredCerts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No certificates match your search</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCerts.map((cert: any) => (
                <div key={cert.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition">
                  <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{cert.career_path_name || 'Certificate'}</h4>
                    <p className="text-xs text-slate-500">{new Date(cert.issued_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/30">
              <p className="text-3xl font-bold text-cyan-400">{projectStats.totalProjects}</p>
              <p className="text-sm text-slate-400 mt-1">Total Projects</p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/30">
              <p className="text-3xl font-bold text-emerald-400">{projectStats.activeProjects}</p>
              <p className="text-sm text-slate-400 mt-1">Active</p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/30">
              <p className="text-3xl font-bold text-purple-400">{projectStats.totalTasks}</p>
              <p className="text-sm text-slate-400 mt-1">Tasks</p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/30">
              <p className="text-3xl font-bold text-amber-400">{projectStats.completedTasks}</p>
              <p className="text-sm text-slate-400 mt-1">Completed</p>
            </div>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 rounded-xl">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">My Projects</h2>
              </div>
              <button onClick={() => navigate('/projects')} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium">
                Browse All
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">No Projects Yet</h3>
                <p className="text-slate-400 text-sm">Start collaborating on projects</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map(project => (
                  <div key={project.id} onClick={() => navigate(`/projects/${project.slug}`)} className="group bg-slate-700/30 hover:bg-slate-700/50 rounded-xl p-4 border border-slate-600/20 hover:border-slate-600/40 transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">{project.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {project.member_count || 1}</span>
                          <span className="flex items-center gap-1"><ListTodo className="w-4 h-4" /> {project.task_count || 0} tasks</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Community Tab */}
      {activeTab === 'community' && (
        <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Join the Community</h2>
            <p className="text-slate-400 text-lg mb-8">Connect with other students, share knowledge, and collaborate together.</p>
            <button onClick={() => navigate('/community')} className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium text-lg">
              Explore Community
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

