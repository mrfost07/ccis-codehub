import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'
import { projectsAPI, teamsAPI, projectNotificationsAPI, communityAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useProjects, useTeams, useAllTasks } from '../hooks/useApiCache'
import {
  Plus, GitBranch, Users, Calendar, ExternalLink, Code, Star, X,
  CheckCircle2, Clock, AlertCircle, TrendingUp, BarChart3, Bell,
  FolderOpen, ListTodo, Activity, ChevronRight, Filter, Search,
  MoreVertical, Edit, Trash2, Eye, UserPlus, GitPullRequest,
  UsersRound, Crown, Mail, Check
} from 'lucide-react'
import ProfileAvatar from '../components/ProfileAvatar'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to: number | null
  assigned_to_name: string | null
  start_date: string | null
  due_date: string | null
  project: string
  project_name?: string
  created_by?: number
  created_by_name?: string
  can_edit?: boolean
  can_drag?: boolean
}

interface Member {
  id: string
  user: number
  user_name: string
  user_email: string
  role: string
  joined_at: string
}

interface Project {
  id: string
  slug: string
  name: string
  description: string
  project_type: string
  programming_language: string
  status: string
  visibility: string
  github_repo?: string
  owner: number
  owner_name: string
  team?: string
  team_name?: string
  team_slug?: string
  is_team_leader?: boolean
  start_date?: string
  deadline?: string
  created_at: string
  updated_at?: string
  member_count?: number
  task_count?: number
  memberships?: Member[]
  tasks?: Task[]
}

interface Invitation {
  id: string
  project_name: string
  inviter_name: string
  role: string
  message: string
  created_at: string
}

interface Team {
  id: string
  name: string
  slug: string
  description: string
  leader: number
  leader_name: string
  member_count: number
  project_count: number
  pending_count: number
  created_at: string
}

interface TeamInvitation {
  id: string
  team: string
  user: string
  user_name: string
  role: string
  status: string
  invited_by: string
  invited_by_name: string
  message: string
  invited_at: string
}

interface Follower {
  id: string
  username: string
  email: string
  profile_picture: string | null
}

interface ProjectStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  totalMembers: number
}

export default function ProjectsEnhanced() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([])
  const [followers, setFollowers] = useState<Follower[]>([])
  const [followerDisplayLimit, setFollowerDisplayLimit] = useState(5)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showTeamDetail, setShowTeamDetail] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [teamProjects, setTeamProjects] = useState<Project[]>([])
  const [activeTab, setActiveTab] = useState<'teams' | 'projects' | 'tasks' | 'analytics' | 'invitations' | 'notifications'>('teams')
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalMembers: 0
  })

  const [newTeam, setNewTeam] = useState({ name: '', description: '', selectedMembers: [] as { id: string, username: string, email: string }[] })
  const [inviteData, setInviteData] = useState({ user_id: '', role: 'member', message: '' })
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<Follower[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    team: '', // Team ID for the project
    project_type: 'web_application',
    programming_language: 'javascript',
    visibility: 'public',
    github_repo: '',
    start_date: '',
    deadline: ''
  })

  // Task creation state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectMembers, setProjectMembers] = useState<{ id: string, username: string }[]>([])
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    start_date: '',
    due_date: ''
  })

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Edit modals state
  const [showEditTeamModal, setShowEditTeamModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Drag state for Kanban
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  // Invite mode state (followers or global search)
  const [inviteMode, setInviteMode] = useState<'followers' | 'search'>('followers')

  // Use cached queries for core data
  const { data: cachedProjects, isLoading: projectsLoading, refetch: refetchProjects } = useProjects()
  const { data: cachedTeams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams()
  const { data: cachedTasks, isLoading: tasksLoading, refetch: refetchTasks } = useAllTasks()

  // Sync cached data to local state (for mutations and other features)
  useEffect(() => {
    if (cachedProjects) {
      setProjects(Array.isArray(cachedProjects) ? cachedProjects : [])
    }
  }, [cachedProjects])

  useEffect(() => {
    if (cachedTeams) {
      setTeams(Array.isArray(cachedTeams) ? cachedTeams : [])
    }
  }, [cachedTeams])

  useEffect(() => {
    if (cachedTasks) {
      setAllTasks(Array.isArray(cachedTasks) ? cachedTasks : [])
    }
  }, [cachedTasks])

  // Loading state combines all cached loading states
  useEffect(() => {
    setLoading(projectsLoading || teamsLoading || tasksLoading)
  }, [projectsLoading, teamsLoading, tasksLoading])

  // Calculate stats when data changes
  useEffect(() => {
    if (projects.length > 0 || allTasks.length > 0) {
      calculateStats(projects, allTasks)
    }
  }, [projects, allTasks])

  // Fetch non-cached data (invitations, followers, notifications)
  const fetchSecondaryData = useCallback(async () => {
    try {
      // Fetch project invitations
      try {
        const invRes = await projectsAPI.getMyInvitations()
        setInvitations(invRes.data || [])
      } catch {
        setInvitations([])
      }

      // Fetch team invitations
      try {
        const teamInvRes = await teamsAPI.getMyTeamInvitations()
        setTeamInvitations(teamInvRes.data || [])
      } catch {
        setTeamInvitations([])
      }

      // Fetch followers for inviting to teams
      try {
        const followersRes = await communityAPI.getFollowers()
        // Transform nested data: API returns {follower: {id, username, profile_picture...}} but UI expects flat structure
        const rawData = followersRes.data || []
        const transformedFollowers = rawData.map((item: any) => ({
          id: String(item.follower?.id || item.id),
          username: item.follower?.username || item.username || '',
          email: item.follower?.email || item.email || `@${item.follower?.username || item.username || ''}`,
          profile_picture: item.follower?.profile_picture || item.profile_picture || null
        }))
        setFollowers(transformedFollowers)
      } catch {
        setFollowers([])
      }

      // Fetch notifications
      try {
        const notifRes = await projectNotificationsAPI.getNotifications()
        const notifData = notifRes.data.results || notifRes.data || []
        setNotifications(notifData)
        setUnreadCount(notifData.filter((n: any) => !n.is_read).length)
      } catch {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to fetch secondary data:', error)
    }
  }, [])

  useEffect(() => {
    fetchSecondaryData()
  }, [fetchSecondaryData])

  // Refetch all data (for after mutations)
  const fetchData = useCallback(async () => {
    refetchProjects()
    refetchTeams()
    refetchTasks()
    fetchSecondaryData()
  }, [refetchProjects, refetchTeams, refetchTasks, fetchSecondaryData])

  const calculateStats = (projectsData: Project[], tasksData: Task[]) => {
    const totalMembers = projectsData.reduce((acc, p) => acc + (p.member_count || 1), 0)

    setStats({
      totalProjects: projectsData.length,
      activeProjects: projectsData.filter(p => p.status === 'active' || p.status === 'in_progress').length,
      completedProjects: projectsData.filter(p => p.status === 'completed').length,
      totalTasks: tasksData.length,
      completedTasks: tasksData.filter(t => t.status === 'done').length,
      inProgressTasks: tasksData.filter(t => t.status === 'in_progress').length,
      totalMembers
    })
  }

  // Team handlers
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeam.name.trim()) {
      toast.error('Team name is required')
      return
    }

    try {
      // Create the team first
      const response = await teamsAPI.createTeam({
        name: newTeam.name,
        description: newTeam.description
      })
      const createdTeam = response.data

      // Invite selected members (they will be pending)
      if (newTeam.selectedMembers.length > 0) {
        const invitePromises = newTeam.selectedMembers.map(member =>
          teamsAPI.inviteMember(createdTeam.slug, {
            user_id: member.id,
            role: 'member',
            message: `You've been invited to join ${createdTeam.name}`
          }).catch((err) => {
            console.error(`Failed to invite ${member.username}:`, err)
            return null
          })
        )
        await Promise.all(invitePromises)
        toast.success(`Team created! ${newTeam.selectedMembers.length} invitation(s) sent.`)
      } else {
        toast.success('Team created! You can invite members anytime.')
      }

      setTeams(prev => [createdTeam, ...prev])
      setShowCreateTeamModal(false)
      setNewTeam({ name: '', description: '', selectedMembers: [] })
      setUserSearchQuery('')
      setUserSearchResults([])
      fetchData() // Refresh to get updated data
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create team')
    }
  }

  const toggleMemberSelection = (user: { id: string, username: string, email: string }) => {
    setNewTeam(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.find(m => m.id === user.id)
        ? prev.selectedMembers.filter(m => m.id !== user.id)
        : [...prev.selectedMembers, user]
    }))
  }

  const removeMember = (userId: string) => {
    setNewTeam(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.filter(m => m.id !== userId)
    }))
  }

  const searchUsers = async (query: string) => {
    setUserSearchQuery(query)
    if (query.length < 2) {
      setUserSearchResults([])
      return
    }

    setSearchingUsers(true)
    try {
      const response = await communityAPI.searchCoders(query)
      const results = response.data?.results || response.data || []
      // Filter out already selected members and current user
      const filtered = results.filter((u: any) =>
        u.id !== user?.id &&
        !newTeam.selectedMembers.find(m => m.id === String(u.id))
      )
      setUserSearchResults(filtered.map((u: any) => ({
        id: String(u.id),
        username: u.username,
        email: u.email || ''
      })))
    } catch (error) {
      console.error('Failed to search users:', error)
      setUserSearchResults([])
    } finally {
      setSearchingUsers(false)
    }
  }

  const openTeamDetail = async (team: Team) => {
    if (!team || !team.slug) {
      console.error('Invalid team data:', team)
      toast.error('Failed to open team details')
      return
    }

    console.log('Opening team detail for:', team.name, team.slug)
    toast.success(`Opening ${team.name}...`)

    // Set state first to show modal immediately
    setSelectedTeam(team)
    setShowTeamDetail(true)
    setTeamMembers([])
    setTeamProjects([])

    try {
      // Fetch team members and projects
      const [membersRes, projectsRes] = await Promise.all([
        teamsAPI.getMembers(team.slug),
        teamsAPI.getTeamProjects(team.slug)
      ])
      console.log('Team members:', membersRes.data)
      console.log('Team projects:', projectsRes.data)
      setTeamMembers(Array.isArray(membersRes.data) ? membersRes.data : [])
      setTeamProjects(Array.isArray(projectsRes.data) ? projectsRes.data : [])
    } catch (error) {
      console.error('Failed to load team details:', error)
      toast.error('Failed to load team details')
      setTeamMembers([])
      setTeamProjects([])
    }
  }

  const closeTeamDetail = () => {
    setShowTeamDetail(false)
    setSelectedTeam(null)
    setTeamMembers([])
    setTeamProjects([])
    setUserSearchQuery('')
    setUserSearchResults([])
    setInviteMode('followers')
  }

  const handleInviteToTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam || !inviteData.user_id) {
      toast.error('Please select a follower to invite')
      return
    }

    try {
      await teamsAPI.inviteMember(selectedTeam.slug, inviteData)
      setShowInviteModal(false)
      setInviteData({ user_id: '', role: 'member', message: '' })
      toast.success('Invitation sent! Waiting for user to accept.')
      fetchData()
      // Refresh team detail if open
      if (showTeamDetail && selectedTeam) {
        const membersRes = await teamsAPI.getMembers(selectedTeam.slug)
        setTeamMembers(membersRes.data || [])
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send invitation')
    }
  }

  const handleAcceptTeamInvitation = async (invitationId: string) => {
    try {
      await teamsAPI.acceptTeamInvitation(invitationId)
      setTeamInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      toast.success('You joined the team!')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept invitation')
    }
  }

  const handleDeclineTeamInvitation = async (invitationId: string) => {
    try {
      await teamsAPI.declineTeamInvitation(invitationId)
      setTeamInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      toast.success('Invitation declined')
    } catch (error: any) {
      toast.error('Failed to decline invitation')
    }
  }

  // Task Management Functions
  const openCreateTaskModal = async (project: Project) => {
    setSelectedProject(project)
    setShowCreateTaskModal(true)

    // Fetch team members who can be assigned tasks
    try {
      if (project.team && project.team_slug) {
        const membersRes = await teamsAPI.getMembers(project.team_slug)
        const members = membersRes.data || []
        // Only include accepted members and leader
        const assignable = members.filter((m: any) => m.status === 'accepted' || m.is_leader).map((m: any) => ({
          id: String(m.user),
          username: m.user_name
        }))
        setProjectMembers(assignable)
        console.log('Assignable members:', assignable)
      } else if (project.team) {
        // If team exists but no slug, try to get team by ID
        const teamData = teams.find(t => String(t.id) === String(project.team))
        if (teamData) {
          const membersRes = await teamsAPI.getMembers(teamData.slug)
          const members = membersRes.data || []
          const assignable = members.filter((m: any) => m.status === 'accepted' || m.is_leader).map((m: any) => ({
            id: String(m.user),
            username: m.user_name
          }))
          setProjectMembers(assignable)
        } else {
          setProjectMembers([{ id: String(project.owner), username: project.owner_name }])
        }
      } else {
        // If no team, only owner can be assigned
        setProjectMembers([{ id: String(project.owner), username: project.owner_name }])
      }
    } catch (error) {
      console.error('Failed to fetch project members:', error)
      // Fallback to owner only
      setProjectMembers([{ id: String(project.owner), username: project.owner_name }])
    }
  }

  const closeCreateTaskModal = () => {
    setShowCreateTaskModal(false)
    setSelectedProject(null)
    setProjectMembers([])
    setNewTask({
      title: '',
      description: '',
      assigned_to: '',
      priority: 'medium',
      start_date: '',
      due_date: ''
    })
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject) return

    if (!newTask.title.trim()) {
      toast.error('Task title is required')
      return
    }
    if (!newTask.assigned_to) {
      toast.error('Task must be assigned to a team member')
      return
    }

    try {
      const taskData = {
        project: selectedProject.id,
        title: newTask.title,
        description: newTask.description,
        assigned_to: newTask.assigned_to,
        priority: newTask.priority,
        start_date: newTask.start_date || null,
        due_date: newTask.due_date || null
      }

      await projectsAPI.createTask(taskData)
      toast.success('Task created and assigned!')
      closeCreateTaskModal()
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.response?.data?.error || 'Failed to create task')
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await projectsAPI.updateTask(taskId, { status: newStatus })
      setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))
      toast.success('Task status updated')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update task')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      await projectsAPI.deleteTask(taskId)
      setAllTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success('Task deleted')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete task')
    }
  }

  // Team CRUD handlers
  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTeam) return

    try {
      const response = await teamsAPI.updateTeam(editingTeam.slug, {
        name: editingTeam.name,
        description: editingTeam.description
      })
      setTeams(prev => prev.map(t => t.id === editingTeam.id ? { ...t, ...response.data } : t))
      setShowEditTeamModal(false)
      setEditingTeam(null)
      toast.success('Team updated successfully')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update team')
    }
  }

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete "${team.name}"? This will remove all projects and tasks.`)) return

    try {
      await teamsAPI.deleteTeam(team.slug)
      setTeams(prev => prev.filter(t => t.id !== team.id))
      closeTeamDetail()
      toast.success('Team deleted')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete team')
    }
  }

  // Project CRUD handlers
  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    try {
      const response = await projectsAPI.updateProject(editingProject.slug, {
        name: editingProject.name,
        description: editingProject.description,
        status: editingProject.status,
        project_type: editingProject.project_type,
        programming_language: editingProject.programming_language,
        visibility: editingProject.visibility,
        github_repo: editingProject.github_repo
      })
      setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...response.data } : p))
      setShowEditProjectModal(false)
      setEditingProject(null)
      toast.success('Project updated successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update project')
    }
  }

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"?`)) return

    try {
      await projectsAPI.deleteProject(project.slug)
      setProjects(prev => prev.filter(p => p.id !== project.id))
      toast.success('Project deleted')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete project')
    }
  }

  // Notification handlers
  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await projectNotificationsAPI.markRead(notificationId)
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read')
    }
  }

  const handleMarkAllNotificationsRead = async () => {
    try {
      await projectNotificationsAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark all as read')
    }
  }

  // Drag and Drop handlers for Kanban
  const handleDragStart = (task: Task) => {
    if (!task.can_drag) return
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggedTask || !draggedTask.can_drag) return

    if (draggedTask.status !== newStatus) {
      try {
        await projectsAPI.updateTask(draggedTask.id, { status: newStatus })
        setAllTasks(prev => prev.map(t =>
          t.id === draggedTask.id ? { ...t, status: newStatus as Task['status'] } : t
        ))
        toast.success(`Task moved to ${newStatus.replace('_', ' ')}`)
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Failed to move task')
      }
    }
    setDraggedTask(null)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProject.name.trim()) {
      toast.error('Project name is required')
      return
    }

    try {
      // Prepare data - only include team if selected
      const projectData: any = {
        name: newProject.name,
        description: newProject.description,
        project_type: newProject.project_type,
        programming_language: newProject.programming_language,
        visibility: newProject.visibility,
        github_repo: newProject.github_repo
      }
      if (newProject.team) {
        projectData.team = newProject.team
      }

      const response = await projectsAPI.createProject(projectData)
      setProjects(prev => [response.data, ...prev])
      setShowCreateModal(false)
      setNewProject({
        name: '',
        description: '',
        team: '',
        project_type: 'web_application',
        programming_language: 'javascript',
        visibility: 'public',
        github_repo: '',
        start_date: '',
        deadline: ''
      })
      toast.success('Project created successfully!')
      calculateStats([response.data, ...projects], allTasks)
      // Refresh all cached data to ensure consistency
      refetchProjects()
      refetchTasks()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create project')
    }
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await projectsAPI.acceptInvitation(invitationId)
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      toast.success('Invitation accepted! You are now a team member.')
      fetchData() // Refresh to show new project
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept invitation')
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      await projectsAPI.declineInvitation(invitationId)
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      toast.success('Invitation declined')
    } catch (error) {
      toast.error('Failed to decline invitation')
    }
  }

  const filteredProjects = projects
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p =>
      searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'text-green-400 bg-green-500/20',
      'in_progress': 'text-blue-400 bg-blue-500/20',
      'planning': 'text-yellow-400 bg-yellow-500/20',
      'completed': 'text-purple-400 bg-purple-500/20',
      'on_hold': 'text-orange-400 bg-orange-500/20'
    }
    return colors[status] || 'text-slate-400 bg-slate-500/20'
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'high': 'text-red-400 bg-red-500/20',
      'medium': 'text-yellow-400 bg-yellow-500/20',
      'low': 'text-green-400 bg-green-500/20'
    }
    return colors[priority] || 'text-slate-400 bg-slate-500/20'
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-400" />
      case 'review': return <Eye className="w-4 h-4 text-purple-400" />
      default: return <AlertCircle className="w-4 h-4 text-slate-400" />
    }
  }

  const taskCompletionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0

  // TaskCard Component for Kanban with Drag and Drop
  const TaskCard = ({ task, onStatusChange, onDelete, readOnly = false }: {
    task: Task,
    onStatusChange?: (id: string, status: string) => void,
    onDelete?: (id: string) => void,
    readOnly?: boolean
  }) => {
    const canDrag = !readOnly && task.can_drag
    const canEdit = !readOnly && task.can_edit
    const isAssignedToMe = task.assigned_to === Number(user?.id)

    const statusOptions = ['todo', 'in_progress', 'review', 'done']
    const currentIndex = statusOptions.indexOf(task.status)

    return (
      <div
        draggable={canDrag}
        onDragStart={() => canDrag && handleDragStart(task)}
        onDragEnd={() => setDraggedTask(null)}
        className={`bg-slate-900/70 rounded-lg p-3 border transition-all ${isAssignedToMe ? 'border-cyan-500/50' : 'border-slate-700'
          } ${canDrag ? 'hover:border-cyan-500/30 cursor-grab active:cursor-grabbing' : readOnly ? 'cursor-default' : 'opacity-75 cursor-not-allowed'}
        ${draggedTask?.id === task.id ? 'opacity-50 scale-95' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h5 className="text-sm font-medium text-white line-clamp-2">{task.title}</h5>
          {canEdit && onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-slate-500 hover:text-red-400 transition"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          {task.project_name && (
            <span className="text-xs text-slate-500 truncate">{task.project_name}</span>
          )}
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          {task.assigned_to_name && (
            <p className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {task.assigned_to_name}
              {isAssignedToMe && <span className="text-cyan-400">(You)</span>}
            </p>
          )}
          {(task.start_date || task.due_date) && (
            <p className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {task.start_date && new Date(task.start_date).toLocaleDateString()}
              {task.start_date && task.due_date && ' - '}
              {task.due_date && new Date(task.due_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Quick status change buttons (only if can drag and has handler) */}
        {canDrag && onStatusChange && (
          <div className="flex gap-1 mt-2 pt-2 border-t border-slate-700/50">
            {currentIndex > 0 && (
              <button
                onClick={() => onStatusChange(task.id, statusOptions[currentIndex - 1])}
                className="flex-1 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
              >
                ← {statusOptions[currentIndex - 1].replace('_', ' ')}
              </button>
            )}
            {currentIndex < statusOptions.length - 1 && (
              <button
                onClick={() => onStatusChange(task.id, statusOptions[currentIndex + 1])}
                className="flex-1 py-1 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition"
              >
                {statusOptions[currentIndex + 1].replace('_', ' ')} →
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Stats Overview */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Projects Hub
              </h1>
              <p className="text-slate-400">
                Manage your projects, tasks, and team collaborations
              </p>
            </div>

            <div className="flex items-center gap-3">
              {(invitations.length > 0 || teamInvitations.length > 0) && (
                <button
                  onClick={() => setActiveTab('invitations')}
                  className="relative p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                >
                  <Bell className="w-5 h-5 text-slate-400" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {invitations.length + teamInvitations.length}
                  </span>
                </button>
              )}
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg font-medium text-white hover:bg-slate-700 transition-all"
              >
                <UsersRound className="w-5 h-5" />
                New Team
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium text-white hover:from-cyan-600 hover:to-purple-600 transition-all"
              >
                <Plus className="w-5 h-5" />
                New Project
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <FolderOpen className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
                  <p className="text-xs text-slate-400">Total Projects</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Activity className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.activeProjects}</p>
                  <p className="text-xs text-slate-400">Active Projects</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <ListTodo className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalTasks}</p>
                  <p className="text-xs text-slate-400">Total Tasks</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalMembers}</p>
                  <p className="text-xs text-slate-400">Team Members</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Overall Task Completion</span>
              <span className="text-sm font-medium text-white">{taskCompletionRate}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{stats.completedTasks} completed</span>
              <span>{stats.inProgressTasks} in progress</span>
              <span>{stats.totalTasks - stats.completedTasks - stats.inProgressTasks} pending</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 overflow-x-auto">
          {[
            { id: 'teams', label: 'My Teams', icon: UsersRound },
            { id: 'projects', label: 'Projects', icon: FolderOpen },
            { id: 'tasks', label: 'All Tasks', icon: ListTodo },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'invitations', label: 'Invitations', icon: Mail, count: invitations.length + teamInvitations.length > 0 ? invitations.length + teamInvitations.length : undefined },
            { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadCount > 0 ? unreadCount : undefined }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 rounded-full text-xs text-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <>
            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <div className="space-y-6">
                {/* Teams I Lead */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      Teams I Lead
                    </h3>
                    <button
                      onClick={() => setShowCreateTeamModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 rounded-lg text-sm font-medium text-white hover:bg-cyan-600 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Create Team
                    </button>
                  </div>

                  {teams.filter(t => String(t.leader) === String(user?.id)).length === 0 ? (
                    <div className="text-center py-10 bg-slate-800/30 rounded-xl border border-slate-700">
                      <UsersRound className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <h4 className="text-white font-medium mb-1">No teams yet</h4>
                      <p className="text-sm text-slate-400 mb-4">
                        Create a team to invite your followers and start collaborating
                      </p>
                      <button
                        onClick={() => setShowCreateTeamModal(true)}
                        className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm"
                      >
                        Create Your First Team
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {teams.filter(t => String(t.leader) === String(user?.id)).map(team => (
                        <div
                          key={team.id}
                          onClick={() => openTeamDetail(team)}
                          className="bg-slate-800/50 backdrop-blur rounded-xl p-5 border border-yellow-500/30 hover:border-yellow-500/50 hover:bg-slate-800/70 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                                <Crown className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white group-hover:text-yellow-400 transition">{team.name}</h3>
                                <span className="text-xs text-yellow-400">You are the leader</span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-yellow-400 transition" />
                          </div>

                          <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                            {team.description || 'No description'}
                          </p>

                          {/* Stacked Member Avatars */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex -space-x-2">
                              {/* Leader avatar */}
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 border-2 border-slate-800 flex items-center justify-center z-10 relative" title={team.leader_name}>
                                <span className="text-xs font-bold text-white">
                                  {team.leader_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                              {/* Placeholder for members */}
                              {team.member_count > 1 && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 border-2 border-slate-800 flex items-center justify-center z-[9] relative">
                                  <span className="text-xs font-bold text-white">+{team.member_count - 1}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" /> {team.project_count}
                              </span>
                              {team.pending_count > 0 && (
                                <span className="flex items-center gap-1 text-yellow-400">
                                  <Clock className="w-3 h-3" /> {team.pending_count} pending
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedTeam(team)
                                setShowInviteModal(true)
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition text-sm font-medium"
                            >
                              <UserPlus className="w-4 h-4" />
                              Invite
                            </button>
                            <button
                              onClick={() => {
                                setNewProject({ ...newProject, team: team.id })
                                setShowCreateModal(true)
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition text-sm font-medium"
                            >
                              <Plus className="w-4 h-4" />
                              Project
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teams I'm a Member Of */}
                {teams.filter(t => String(t.leader) !== String(user?.id)).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-cyan-400" />
                      Teams I'm In
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {teams.filter(t => String(t.leader) !== String(user?.id)).map(team => (
                        <div
                          key={team.id}
                          onClick={() => openTeamDetail(team)}
                          className="bg-slate-800/50 backdrop-blur rounded-xl p-5 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/70 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                                <UsersRound className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition">{team.name}</h3>
                                <span className="text-xs text-slate-400">Led by {team.leader_name}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition" />
                          </div>

                          <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                            {team.description || 'No description'}
                          </p>

                          {/* Stacked Member Avatars */}
                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-2">
                              {/* Leader avatar */}
                              <div
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 border-2 border-slate-800 flex items-center justify-center z-10 relative cursor-pointer hover:scale-110 transition"
                                title={team.leader_name}
                                onClick={(e) => { e.stopPropagation(); navigate(`/user/${team.leader}`); }}
                              >
                                <span className="text-xs font-bold text-white">
                                  {team.leader_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                              {/* Members count */}
                              {team.member_count > 1 && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 border-2 border-slate-800 flex items-center justify-center z-[9] relative">
                                  <span className="text-xs font-bold text-white">+{team.member_count - 1}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" /> {team.project_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Info */}
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-white font-medium mb-2">How Teams Work</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Create a team and invite your followers to join</li>
                    <li>• As team leader, you can create projects and assign tasks to members</li>
                    <li>• Team members can only update tasks assigned to them</li>
                    <li>• Everyone in the team gets notified of updates</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <div>
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {['all', 'active', 'planning', 'completed', 'on_hold'].map(status => (
                      <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === status
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Projects List */}
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700">
                    <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No projects found</h3>
                    <p className="text-slate-400 mb-6">
                      {searchTerm ? 'Try a different search term' : 'Create your first project to get started'}
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
                    >
                      Create Project
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredProjects.map(project => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onView={() => navigate(`/projects/${project.slug}`)}
                        onEdit={() => {
                          setEditingProject(project)
                          setShowEditProjectModal(true)
                        }}
                        onDelete={() => handleDeleteProject(project)}
                        onAddTask={() => openCreateTaskModal(project)}
                        isLeader={project.is_team_leader || project.owner === Number(user?.id)}
                        getStatusColor={getStatusColor}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                {/* Task Filters Header */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  {/* Project Filter */}
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  {/* Status Filter */}
                  <select
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                    onChange={(e) => {
                      // Filter tasks by status - can be enhanced with state
                    }}
                    defaultValue="all"
                  >
                    <option value="all">All Status</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                {/* Info Bar */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Task Overview</h3>
                    <p className="text-sm text-slate-400">{allTasks.length} total tasks from all projects (read-only)</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    🔒 To update task status, open the project's Kanban board
                  </p>
                </div>

                {/* Kanban Columns - Read Only View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* To Do Column */}
                  <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-3 border-b border-slate-700 bg-slate-700/30">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        To Do
                        <span className="ml-auto text-xs text-slate-400">
                          {allTasks.filter(t => t.status === 'todo').length}
                        </span>
                      </h4>
                    </div>
                    <div className="p-2 space-y-2 min-h-[200px]">
                      {allTasks.filter(t => t.status === 'todo').map(task => (
                        <TaskCard key={task.id} task={task} readOnly />
                      ))}
                      {allTasks.filter(t => t.status === 'todo').length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>

                  {/* In Progress Column */}
                  <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-3 border-b border-slate-700 bg-blue-500/10">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        In Progress
                        <span className="ml-auto text-xs text-slate-400">
                          {allTasks.filter(t => t.status === 'in_progress').length}
                        </span>
                      </h4>
                    </div>
                    <div className="p-2 space-y-2 min-h-[200px]">
                      {allTasks.filter(t => t.status === 'in_progress').map(task => (
                        <TaskCard key={task.id} task={task} readOnly />
                      ))}
                      {allTasks.filter(t => t.status === 'in_progress').length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Column */}
                  <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-3 border-b border-slate-700 bg-yellow-500/10">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Review
                        <span className="ml-auto text-xs text-slate-400">
                          {allTasks.filter(t => t.status === 'review').length}
                        </span>
                      </h4>
                    </div>
                    <div className="p-2 space-y-2 min-h-[200px]">
                      {allTasks.filter(t => t.status === 'review').map(task => (
                        <TaskCard key={task.id} task={task} readOnly />
                      ))}
                      {allTasks.filter(t => t.status === 'review').length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Done Column */}
                  <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-3 border-b border-slate-700 bg-green-500/10">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Done
                        <span className="ml-auto text-xs text-slate-400">
                          {allTasks.filter(t => t.status === 'done').length}
                        </span>
                      </h4>
                    </div>
                    <div className="p-2 space-y-2 min-h-[200px]">
                      {allTasks.filter(t => t.status === 'done').map(task => (
                        <TaskCard key={task.id} task={task} readOnly />
                      ))}
                      {allTasks.filter(t => t.status === 'done').length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Status Distribution */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    Project Status Distribution
                  </h3>
                  <div className="space-y-4">
                    {[
                      { status: 'Active', count: stats.activeProjects, color: 'bg-green-500' },
                      { status: 'Completed', count: stats.completedProjects, color: 'bg-purple-500' },
                      { status: 'Planning', count: projects.filter(p => p.status === 'planning').length, color: 'bg-yellow-500' },
                      { status: 'On Hold', count: projects.filter(p => p.status === 'on_hold').length, color: 'bg-orange-500' }
                    ].map(item => (
                      <div key={item.status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">{item.status}</span>
                          <span className="text-white font-medium">{item.count}</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} transition-all`}
                            style={{ width: `${stats.totalProjects > 0 ? (item.count / stats.totalProjects) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Progress */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Task Progress
                  </h3>
                  <div className="flex items-center justify-center py-4">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke="#334155"
                          strokeWidth="12"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${taskCompletionRate * 4.4} 440`}
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{taskCompletionRate}%</span>
                        <span className="text-xs text-slate-400">Complete</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{stats.completedTasks}</p>
                      <p className="text-xs text-slate-400">Done</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">{stats.inProgressTasks}</p>
                      <p className="text-xs text-slate-400">In Progress</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-400">
                        {stats.totalTasks - stats.completedTasks - stats.inProgressTasks}
                      </p>
                      <p className="text-xs text-slate-400">Pending</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Your Contribution Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-cyan-400">
                        {projects.filter(p => p.owner === Number(user?.id)).length}
                      </p>
                      <p className="text-sm text-slate-400">Projects Owned</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-purple-400">
                        {allTasks.filter(t => t.status === 'done').length}
                      </p>
                      <p className="text-sm text-slate-400">Tasks Completed</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-green-400">{stats.totalProjects}</p>
                      <p className="text-sm text-slate-400">Projects Joined</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-yellow-400">{stats.activeProjects}</p>
                      <p className="text-sm text-slate-400">Active Now</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invitations Tab */}
            {activeTab === 'invitations' && (
              <div className="space-y-6">
                {/* Team Invitations */}
                {teamInvitations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <UsersRound className="w-5 h-5 text-cyan-400" />
                      Team Invitations
                    </h3>
                    <div className="space-y-4">
                      {teamInvitations.map(inv => (
                        <div key={inv.id} className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/30">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                                <UsersRound className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="text-white font-medium">Team Invitation</h4>
                                <p className="text-sm text-slate-400">
                                  {inv.invited_by_name} invited you as <span className="text-cyan-400">{inv.role}</span>
                                </p>
                                {inv.message && (
                                  <p className="text-sm text-slate-300 mt-1 italic">"{inv.message}"</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptTeamInvitation(inv.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                              >
                                <Check className="w-4 h-4" /> Join
                              </button>
                              <button
                                onClick={() => handleDeclineTeamInvitation(inv.id)}
                                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Invitations */}
                {invitations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-purple-400" />
                      Project Invitations
                    </h3>
                    <div className="space-y-4">
                      {invitations.map(inv => (
                        <div key={inv.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-white font-medium">{inv.project_name}</h4>
                              <p className="text-sm text-slate-400">
                                Invited by {inv.inviter_name} as <span className="text-cyan-400">{inv.role}</span>
                              </p>
                              {inv.message && (
                                <p className="text-sm text-slate-300 mt-2 italic">"{inv.message}"</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptInvitation(inv.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDeclineInvitation(inv.id)}
                                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Invitations */}
                {invitations.length === 0 && teamInvitations.length === 0 && (
                  <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700">
                    <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No pending invitations</h3>
                    <p className="text-slate-400">You'll see team and project invitations here when someone invites you.</p>
                  </div>
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700">
                    <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No notifications yet</h3>
                    <p className="text-slate-400">You'll see task updates and team activity here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => !notif.is_read && handleMarkNotificationRead(notif.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${notif.is_read
                          ? 'bg-slate-800/30 border-slate-700'
                          : 'bg-slate-800/70 border-cyan-500/30 hover:border-cyan-500/50'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.notification_type === 'task_assigned' ? 'bg-cyan-500/20' :
                            notif.notification_type === 'task_status_changed' ? 'bg-blue-500/20' :
                              notif.notification_type === 'task_completed' ? 'bg-green-500/20' :
                                notif.notification_type === 'team_invite' ? 'bg-purple-500/20' :
                                  'bg-slate-700'
                            }`}>
                            {notif.notification_type === 'task_assigned' && <ListTodo className="w-5 h-5 text-cyan-400" />}
                            {notif.notification_type === 'task_status_changed' && <Activity className="w-5 h-5 text-blue-400" />}
                            {notif.notification_type === 'task_completed' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                            {notif.notification_type === 'team_invite' && <UsersRound className="w-5 h-5 text-purple-400" />}
                            {!['task_assigned', 'task_status_changed', 'task_completed', 'team_invite'].includes(notif.notification_type) && (
                              <Bell className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-medium">{notif.title}</h4>
                              {!notif.is_read && (
                                <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mt-1">{notif.message}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              {notif.sender_name && <span>From: {notif.sender_name}</span>}
                              <span>{new Date(notif.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 pb-24 sm:pb-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl max-h-[calc(100vh-120px)] sm:max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-700 shrink-0">
              <h3 className="text-lg sm:text-xl font-semibold text-white">Create New Project</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs sm:text-sm text-slate-400 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="My Awesome Project"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-cyan-500"
                  rows={2}
                  placeholder="What is this project about?"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-slate-400 mb-1">Team (optional)</label>
                <select
                  value={newProject.team}
                  onChange={(e) => setNewProject({ ...newProject, team: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">No Team (Personal Project)</option>
                  {teams.filter(t => String(t.leader) === String(user?.id)).map(team => (
                    <option key={team.id} value={team.id}>{team.name} (You are leader)</option>
                  ))}
                </select>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                  {teams.filter(t => String(t.leader) === String(user?.id)).length === 0
                    ? 'Create a team first to add team projects'
                    : 'You can only create team projects for teams you lead'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Type</label>
                  <select
                    value={newProject.project_type}
                    onChange={(e) => setNewProject({ ...newProject, project_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="web_application">Web Application</option>
                    <option value="mobile_app">Mobile App</option>
                    <option value="desktop_app">Desktop App</option>
                    <option value="api">API/Backend</option>
                    <option value="machine_learning">Machine Learning</option>
                    <option value="game">Game</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Language</label>
                  <select
                    value={newProject.programming_language}
                    onChange={(e) => setNewProject({ ...newProject, programming_language: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="csharp">C#</option>
                    <option value="cpp">C++</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="php">PHP</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Visibility</label>
                <select
                  value={newProject.visibility}
                  onChange={(e) => setNewProject({ ...newProject, visibility: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="public">Public - Anyone can see</option>
                  <option value="private">Private - Only members can see</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">GitHub Repository (optional)</label>
                <input
                  type="url"
                  value={newProject.github_repo}
                  onChange={(e) => setNewProject({ ...newProject, github_repo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="https://github.com/username/repo"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal - Enhanced with Member Selection */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <UsersRound className="w-5 h-5 text-cyan-400" />
                Create New Team
              </h3>
              <button
                onClick={() => {
                  setShowCreateTeamModal(false)
                  setNewTeam({ name: '', description: '', selectedMembers: [] })
                  setUserSearchQuery('')
                  setUserSearchResults([])
                }}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Team Name *</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="My Awesome Team"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-cyan-500"
                  rows={2}
                  placeholder="What is this team about?"
                />
              </div>

              {/* Member Selection - Search Based */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Invite Members (Optional)
                </label>

                {/* Selected Members */}
                {newTeam.selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {newTeam.selectedMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/50 rounded-full px-3 py-1"
                      >
                        <span className="text-sm text-cyan-400">{member.username}</span>
                        <button
                          type="button"
                          onClick={() => removeMember(member.id)}
                          className="text-cyan-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => searchUsers(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    placeholder="Search users by name or email..."
                  />
                  {searchingUsers && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {userSearchQuery.length >= 2 && (
                  <div className="mt-2 bg-slate-900/50 rounded-lg max-h-40 overflow-y-auto">
                    {userSearchResults.length === 0 ? (
                      <div className="p-3 text-center text-sm text-slate-400">
                        {searchingUsers ? 'Searching...' : 'No users found'}
                      </div>
                    ) : (
                      <div className="p-1 space-y-1">
                        {userSearchResults.map(searchUser => (
                          <div
                            key={searchUser.id}
                            onClick={() => {
                              toggleMemberSelection(searchUser)
                              setUserSearchQuery('')
                              setUserSearchResults([])
                            }}
                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-800 transition"
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                              <span className="text-xs font-medium text-slate-300">
                                {searchUser.username?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{searchUser.username || 'Unknown'}</p>
                              <p className="text-xs text-slate-400 truncate">{searchUser.email || ''}</p>
                            </div>
                            <Plus className="w-4 h-4 text-cyan-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-2">
                  Search and select users to invite. They will receive an invitation and must accept to join.
                </p>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400">
                <p className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  You will be the team leader
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTeamModal(false)
                    setNewTeam({ name: '', description: '', selectedMembers: [] })
                    setUserSearchQuery('')
                    setUserSearchResults([])
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition"
                >
                  {newTeam.selectedMembers.length > 0
                    ? `Create & Invite ${newTeam.selectedMembers.length}`
                    : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                Invite to {selectedTeam.name}
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setSelectedTeam(null)
                }}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInviteToTeam} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Select Follower *</label>
                <select
                  value={inviteData.user_id}
                  onChange={(e) => setInviteData({ ...inviteData, user_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">Choose a follower to invite</option>
                  {followers.map(follower => (
                    <option key={follower.id} value={follower.id}>
                      {follower.username} ({follower.email})
                    </option>
                  ))}
                </select>
                {followers.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    You have no followers yet. Only followers can be invited to teams.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Role</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Message (optional)</label>
                <textarea
                  value={inviteData.message}
                  onChange={(e) => setInviteData({ ...inviteData, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-cyan-500"
                  rows={2}
                  placeholder="Add a personal message..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    setSelectedTeam(null)
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={followers.length === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Detail Modal */}
      {showTeamDetail && selectedTeam && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTeamDetail()
          }}
        >
          <div
            className="bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${String(selectedTeam.leader) === String(user?.id)
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                  }`}>
                  {String(selectedTeam.leader) === String(user?.id)
                    ? <Crown className="w-5 h-5 text-white" />
                    : <UsersRound className="w-5 h-5 text-white" />
                  }
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedTeam.name}</h3>
                  <p className="text-xs text-slate-400">
                    {String(selectedTeam.leader) === String(user?.id) ? 'You are the leader' : `Led by ${selectedTeam.leader_name}`}
                  </p>
                </div>
              </div>
              <button
                onClick={closeTeamDetail}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              {/* Team Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-cyan-400">{teamMembers.length}</p>
                  <p className="text-xs text-slate-400">Members</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-400">{teamProjects.length}</p>
                  <p className="text-xs text-slate-400">Projects</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {teamMembers.filter(m => m.status === 'pending').length}
                  </p>
                  <p className="text-xs text-slate-400">Pending</p>
                </div>
              </div>

              {/* Description */}
              {selectedTeam.description && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">About</h4>
                  <p className="text-sm text-white">{selectedTeam.description}</p>
                </div>
              )}

              {/* Members */}
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-3">Team Members</h4>

                {/* Add Member - Only for Leaders */}
                {String(selectedTeam.leader) === String(user?.id) && (
                  <div className="mb-4">
                    {/* Toggle between Followers and Search */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => {
                          setInviteMode('followers')
                          setUserSearchQuery('')
                          setUserSearchResults([])
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${inviteMode === 'followers'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                          : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
                          }`}
                      >
                        <Users className="w-4 h-4 inline mr-2" />
                        My Followers
                      </button>
                      <button
                        onClick={() => setInviteMode('search')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${inviteMode === 'search'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                          : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
                          }`}
                      >
                        <Search className="w-4 h-4 inline mr-2" />
                        Search All Users
                      </button>
                    </div>

                    {/* Followers List */}
                    {inviteMode === 'followers' && (
                      <div className="bg-slate-900 rounded-lg border border-slate-700 max-h-48 overflow-y-auto">
                        {followers.length === 0 ? (
                          <div className="p-3 text-center text-sm text-slate-400">
                            No followers yet
                          </div>
                        ) : (
                          <div className="p-1 space-y-1">
                            {followers
                              .filter(f => !teamMembers.find(m => String(m.user) === String(f.id)))
                              .slice(0, followerDisplayLimit)
                              .map(follower => (
                                <div
                                  key={follower.id}
                                  onClick={async () => {
                                    try {
                                      await teamsAPI.inviteMember(selectedTeam.slug, {
                                        user_id: follower.id,
                                        role: 'member',
                                        message: `You've been invited to join ${selectedTeam.name}`
                                      })
                                      toast.success(`Invitation sent to ${follower.username}`)
                                      const membersRes = await teamsAPI.getMembers(selectedTeam.slug)
                                      setTeamMembers(membersRes.data || [])
                                    } catch (error: any) {
                                      toast.error(error.response?.data?.error || 'Failed to invite')
                                    }
                                  }}
                                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-800 transition"
                                >
                                  {/* Profile Picture with error fallback */}
                                  <ProfileAvatar
                                    src={follower.profile_picture}
                                    alt={follower.username}
                                    fallbackText={follower.username}
                                    size="sm"
                                    variant="cyan"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{follower.username || 'Unknown'}</p>
                                    <p className="text-xs text-slate-400 truncate">@{follower.username}</p>
                                  </div>
                                  <div className="flex items-center gap-1 text-cyan-400 text-xs">
                                    <UserPlus className="w-4 h-4" />
                                    Invite
                                  </div>
                                </div>
                              ))}
                            {/* Show More Button */}
                            {followers.filter(f => !teamMembers.find(m => String(m.user) === String(f.id))).length > followerDisplayLimit && (
                              <button
                                onClick={() => setFollowerDisplayLimit(prev => prev + 5)}
                                className="w-full py-2 text-center text-xs text-purple-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition"
                              >
                                Show More ({followers.filter(f => !teamMembers.find(m => String(m.user) === String(f.id))).length - followerDisplayLimit} remaining)
                              </button>
                            )}
                            {followers.filter(f => !teamMembers.find(m => String(m.user) === String(f.id))).length === 0 && (
                              <div className="p-3 text-center text-sm text-slate-400">
                                All followers already invited
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Global Search */}
                    {inviteMode === 'search' && (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => searchUsers(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                            placeholder="Search by username or email..."
                          />
                          {searchingUsers && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>

                        {/* Search Results */}
                        {userSearchQuery.length >= 2 && (
                          <div className="mt-2 bg-slate-900 rounded-lg border border-slate-700 max-h-40 overflow-y-auto">
                            {userSearchResults.length === 0 ? (
                              <div className="p-3 text-center text-sm text-slate-400">
                                {searchingUsers ? 'Searching...' : 'No users found'}
                              </div>
                            ) : (
                              <div className="p-1 space-y-1">
                                {userSearchResults
                                  .filter(u => !teamMembers.find(m => String(m.user) === String(u.id)))
                                  .map(searchUser => (
                                    <div
                                      key={searchUser.id}
                                      onClick={async () => {
                                        try {
                                          await teamsAPI.inviteMember(selectedTeam.slug, {
                                            user_id: searchUser.id,
                                            role: 'member',
                                            message: `You've been invited to join ${selectedTeam.name}`
                                          })
                                          toast.success(`Invitation sent to ${searchUser.username}`)
                                          setUserSearchQuery('')
                                          setUserSearchResults([])
                                          const membersRes = await teamsAPI.getMembers(selectedTeam.slug)
                                          setTeamMembers(membersRes.data || [])
                                        } catch (error: any) {
                                          toast.error(error.response?.data?.error || 'Failed to invite')
                                        }
                                      }}
                                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-800 transition"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                        <span className="text-xs font-medium text-white">
                                          {searchUser.username?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{searchUser.username || 'Unknown'}</p>
                                        <p className="text-xs text-slate-400 truncate">{searchUser.email || ''}</p>
                                      </div>
                                      <div className="flex items-center gap-1 text-purple-400 text-xs">
                                        <UserPlus className="w-4 h-4" />
                                        Invite
                                      </div>
                                    </div>
                                  ))}
                                {userSearchResults.filter(u => !teamMembers.find(m => String(m.user) === String(u.id))).length === 0 && (
                                  <div className="p-3 text-center text-sm text-slate-400">
                                    All found users already invited
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {userSearchQuery.length < 2 && userSearchQuery.length > 0 && (
                          <p className="text-xs text-slate-500 mt-2">Type at least 2 characters to search</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Member List */}
                <div className="space-y-2">
                  {teamMembers && teamMembers.length > 0 ? teamMembers.map((member, index) => (
                    <div
                      key={member?.id || `member-${index}`}
                      className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg hover:bg-slate-800/50 transition group"
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (member?.user) navigate(`/user/${member.user}`)
                        }}
                      >
                        <div className="relative">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.user_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 group-hover:border-cyan-500 transition"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${member.is_leader
                              ? 'bg-gradient-to-br from-yellow-500 to-orange-500 border-yellow-400'
                              : 'bg-gradient-to-br from-slate-600 to-slate-700 border-slate-500 group-hover:border-cyan-500'
                              }`}>
                              <span className="text-sm font-bold text-white">
                                {member.user_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          {member.is_leader && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                              <Crown className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition">
                            {member.user_name}
                          </p>
                          <p className="text-xs text-slate-400">{member.user_email || member.role}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${member.status === 'accepted'
                        ? 'bg-green-500/20 text-green-400'
                        : member.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-slate-500/20 text-slate-400'
                        }`}>
                        {member.is_leader ? 'Leader' : member.status}
                      </span>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      Loading members...
                    </div>
                  )}
                </div>
              </div>

              {/* Projects */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-400">Team Projects</h4>
                  {String(selectedTeam.leader) === String(user?.id) && (
                    <button
                      onClick={() => {
                        setNewProject({ ...newProject, team: selectedTeam.id })
                        closeTeamDetail()
                        setShowCreateModal(true)
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> New Project
                    </button>
                  )}
                </div>
                {teamProjects.length === 0 ? (
                  <div className="text-center py-6 bg-slate-900/30 rounded-lg">
                    <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No projects yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamProjects.map(project => (
                      <div
                        key={project.id}
                        onClick={() => {
                          closeTeamDetail()
                          navigate(`/projects/${project.slug}`)
                        }}
                        className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 cursor-pointer transition"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{project.name}</p>
                          <p className="text-xs text-slate-400">
                            {project.task_count || 0} tasks • {project.status}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button
                onClick={closeTeamDetail}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
              >
                Close
              </button>
              {String(selectedTeam.leader) === String(user?.id) && (
                <>
                  <button
                    onClick={() => {
                      setEditingTeam(selectedTeam)
                      setShowEditTeamModal(true)
                    }}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(selectedTeam)}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && editingTeam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-cyan-400" />
                Edit Team
              </h3>
              <button
                onClick={() => { setShowEditTeamModal(false); setEditingTeam(null); }}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditTeam} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Team Name *</label>
                <input
                  type="text"
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={editingTeam.description}
                  onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditTeamModal(false); setEditingTeam(null); }}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && editingProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-cyan-400" />
                Edit Project
              </h3>
              <button
                onClick={() => { setShowEditProjectModal(false); setEditingProject(null); }}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditProject} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Status</label>
                  <select
                    value={editingProject.status}
                    onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Visibility</label>
                  <select
                    value={editingProject.visibility}
                    onChange={(e) => setEditingProject({ ...editingProject, visibility: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="private">Private</option>
                    <option value="team">Team Only</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">GitHub Repository URL</label>
                <input
                  type="url"
                  value={editingProject.github_repo || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, github_repo: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="https://github.com/..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditProjectModal(false); setEditingProject(null); }}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pt-8 sm:pt-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl my-auto max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-cyan-400" />
                  Add Task
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">Project: {selectedProject.name}</p>
              </div>
              <button
                onClick={closeCreateTaskModal}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-4 space-y-4 overflow-y-auto flex-1 pb-8">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                  rows={2}
                  placeholder="Task description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Assign To *</label>
                <select
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">Select team member</option>
                  {projectMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.username}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newTask.start_date}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Task will be added to "To Do" column
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateTaskModal}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Project Card Component
function ProjectCard({
  project,
  onView,
  onEdit,
  onDelete,
  onAddTask,
  isLeader,
  getStatusColor
}: {
  project: Project
  onView: () => void
  onEdit?: () => void
  onDelete?: () => void
  onAddTask?: () => void
  isLeader?: boolean
  getStatusColor: (status: string) => string
}) {
  const getLanguageEmoji = (lang: string) => {
    const emojis: Record<string, string> = {
      javascript: '🟨', typescript: '🔷', python: '🐍', java: '☕',
      csharp: '🟪', cpp: '🔧', go: '🐹', rust: '🦀', php: '🐘'
    }
    return emojis[lang.toLowerCase()] || '💻'
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      web_application: '🌐', mobile_app: '📱', desktop_app: '🖥️',
      api: '⚡', machine_learning: '🤖', game: '🎮'
    }
    return icons[type] || '📁'
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl p-5 border border-slate-700 hover:border-cyan-500/50 transition-all group">
      <div
        onClick={onView}
        className="cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getTypeIcon(project.project_type)}</span>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition">
                {project.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-500">by {project.owner_name}</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition" />
        </div>

        <p className="text-sm text-slate-400 line-clamp-2 mb-4">{project.description || 'No description'}</p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1">
            {getLanguageEmoji(project.programming_language)} {project.programming_language}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {project.member_count || 1}
          </span>
          <span className="flex items-center gap-1">
            <ListTodo className="w-3.5 h-3.5" /> {project.task_count || 0}
          </span>
        </div>
        {project.github_repo && (
          <GitBranch className="w-4 h-4 text-slate-500" />
        )}
      </div>

      {/* Action buttons for leaders */}
      {isLeader && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
          <button
            onClick={(e) => { e.stopPropagation(); onAddTask?.(); }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition text-xs font-medium"
          >
            <Plus className="w-3 h-3" /> Add Task
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-xs"
          >
            <Edit className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-xs"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
