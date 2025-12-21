import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, GitBranch, GitPullRequest, Settings, Plus, CheckCircle2,
  Clock, AlertCircle, MoreHorizontal, UserPlus, X, MessageSquare, Merge,
  Search, Filter, Calendar, Flag, Trash2, Edit, Eye, ChevronDown,
  FolderOpen, ListTodo, Activity, RefreshCw, Save, Globe, Lock
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { projectsAPI, communityAPI, teamsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import ProfileAvatar from '../components/ProfileAvatar'

interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  assigned_to: number | null
  assigned_to_name: string | null
  due_date: string | null
  created_at: string
  order: number
  can_edit?: boolean
  can_drag?: boolean
}

interface TaskComment {
  id: string
  content: string
  author_name: string
  author_picture: string | null
  created_at: string
}

interface Branch {
  id: string
  name: string
  description: string
  is_default: boolean
  is_protected: boolean
  commit_count: number
  created_by_name: string
  created_at: string
}

interface PullRequest {
  id: string
  title: string
  description: string
  source_branch: string
  source_branch_name: string
  target_branch: string
  target_branch_name: string
  author_name: string
  author_picture: string | null
  status: 'open' | 'merged' | 'closed'
  created_at: string
}

interface TeamMember {
  id: string
  user: number
  user_name: string
  user_email: string
  user_picture?: string | null
  role: string
  joined_at: string
}

interface Follower {
  id: string
  follower: number
  follower_username: string
  follower_picture: string | null
}

interface Project {
  id: string
  name: string
  slug: string
  description: string
  project_type: string
  programming_language: string
  status: string
  visibility: string
  github_repo: string | null
  owner: number
  owner_name: string
  owner_picture: string | null
  memberships: TeamMember[]
  tasks: Task[]
  branches: Branch[]
  is_member: boolean
  user_role: string | null
  member_count: number
  task_count: number
  open_pr_count: number
  created_at: string
  updated_at: string
  team?: string | null
  team_name?: string | null
  team_members?: Array<{
    id: number
    user: number
    user_name: string
    role: string
    user_picture: string | null
  }>
}

const TASK_STATUSES = [
  { id: 'todo', label: 'To Do', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/20' },
  { id: 'in_progress', label: 'In Progress', icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { id: 'review', label: 'Review', icon: Eye, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' }
]

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'repository' | 'team' | 'settings'>('overview')

  // Task state
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [taskSearch, setTaskSearch] = useState('')
  const [taskFilter, setTaskFilter] = useState<string>('all')
  const [taskSort, setTaskSort] = useState<'newest' | 'oldest' | 'priority'>('newest')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskComments, setTaskComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'medium', status: 'todo',
    due_date: '', assigned_to: ''
  })

  // Repository state
  const [branches, setBranches] = useState<Branch[]>([])
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [showPRModal, setShowPRModal] = useState(false)
  const [newBranch, setNewBranch] = useState({ name: '', description: '' })
  const [newPR, setNewPR] = useState({ title: '', description: '', source_branch: '', target_branch: '' })

  // Team state
  const [followers, setFollowers] = useState<Follower[]>([])
  const [teamSearch, setTeamSearch] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState({ invitee: '', role: 'developer', message: '' })
  const [fetchedTeamMembers, setFetchedTeamMembers] = useState<Array<{ id: string, user: string, name: string, role: string }>>([])

  // Settings state
  const [projectSettings, setProjectSettings] = useState({
    name: '', description: '', visibility: 'public', status: 'active', github_repo: ''
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Drag state for Kanban
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [touchDragActive, setTouchDragActive] = useState(false)
  const touchLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPosRef = useRef<{ x: number, y: number } | null>(null)
  const touchGhostRef = useRef<HTMLDivElement | null>(null)
  const touchDraggedElementRef = useRef<HTMLDivElement | null>(null)

  const fetchProject = useCallback(async () => {
    if (!slug) return
    try {
      setLoading(true)
      const response = await projectsAPI.getProject(slug)
      const projectData = response.data

      // Debug: log member data to understand what's available
      console.log('Project data:', {
        team: projectData.team,
        team_name: projectData.team_name,
        team_members: projectData.team_members,
        memberships: projectData.memberships,
        owner: projectData.owner,
        owner_name: projectData.owner_name
      })

      setProject(projectData)
      setTasks(projectData.tasks || [])
      setBranches(projectData.branches || [])
      setProjectSettings({
        name: projectData.name,
        description: projectData.description || '',
        visibility: projectData.visibility,
        status: projectData.status,
        github_repo: projectData.github_repo || ''
      })

      // Fetch PRs
      try {
        const prResponse = await projectsAPI.getPullRequests(projectData.id)
        setPullRequests(prResponse.data.results || prResponse.data || [])
      } catch {
        setPullRequests([])
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  // Refetch project and team members when task modal opens
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!project?.team || !project?.team_name) {
        setFetchedTeamMembers([])
        return
      }

      try {
        // Derive team slug from team_name
        const teamSlug = project.team_name.toLowerCase().replace(/\s+/g, '-')
        const membersRes = await teamsAPI.getMembers(teamSlug)
        const members = membersRes.data || []
        console.log('Fetched team members:', members)

        // Filter to only accepted members and map to our format
        const assignable = members
          .filter((m: any) => m.status === 'accepted' || m.is_leader)
          .map((m: any) => ({
            id: `team-${m.id}`,
            user: String(m.user),
            name: m.user_name,
            role: m.is_leader ? 'leader' : m.role
          }))
        setFetchedTeamMembers(assignable)
      } catch (error) {
        console.error('Failed to fetch team members:', error)
        setFetchedTeamMembers([])
      }
    }

    if (showTaskModal) {
      fetchProject()
      fetchTeamMembers()
    }
  }, [showTaskModal, fetchProject, project?.team, project?.team_name])

  // Filter and sort tasks
  useEffect(() => {
    let result = [...tasks]

    // Search
    if (taskSearch) {
      const search = taskSearch.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search)
      )
    }

    // Filter by status
    if (taskFilter !== 'all') {
      result = result.filter(t => t.status === taskFilter)
    }

    // Sort
    switch (taskSort) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
        break
    }

    setFilteredTasks(result)
  }, [tasks, taskSearch, taskFilter, taskSort])

  const fetchFollowers = async () => {
    try {
      const response = await communityAPI.getFollowers()
      setFollowers(response.data || [])
    } catch (error) {
      console.error('Failed to fetch followers:', error)
    }
  }

  const fetchTaskComments = async (taskId: string) => {
    try {
      const response = await projectsAPI.getTaskComments(taskId)
      setTaskComments(response.data.results || response.data || [])
    } catch {
      setTaskComments([])
    }
  }

  // Task CRUD
  const createTask = async () => {
    if (!project || !newTask.title.trim()) {
      toast.error('Task title is required')
      return
    }
    try {
      const response = await projectsAPI.createTask({
        project: project.id,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTask.status,
        due_date: newTask.due_date || null,
        assigned_to: newTask.assigned_to || null
      })
      setTasks(prev => [...prev, response.data])
      setShowTaskModal(false)
      resetTaskForm()
      toast.success('Task created!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create task')
    }
  }

  const updateTask = async () => {
    if (!editingTask) return
    try {
      const response = await projectsAPI.updateTask(editingTask.id, {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTask.status,
        due_date: newTask.due_date || null,
        assigned_to: newTask.assigned_to || null
      })
      setTasks(prev => prev.map(t => t.id === editingTask.id ? response.data : t))
      setShowTaskModal(false)
      setEditingTask(null)
      resetTaskForm()
      toast.success('Task updated!')
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    // Optimistic update - update UI immediately for faster feedback
    const previousTasks = tasks
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
    ))
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus as Task['status'] } : null)
    }

    try {
      await projectsAPI.updateTask(taskId, { status: newStatus })
    } catch (error) {
      // Revert on error
      setTasks(previousTasks)
      toast.error('Failed to update task')
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await projectsAPI.deleteTask(taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setSelectedTask(null)
      toast.success('Task deleted!')
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const addTaskComment = async () => {
    if (!selectedTask || !newComment.trim()) return
    try {
      const response = await projectsAPI.createTaskComment({
        task: selectedTask.id,
        content: newComment
      })
      setTaskComments(prev => [...prev, response.data])
      setNewComment('')
      toast.success('Comment added!')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const resetTaskForm = () => {
    setNewTask({ title: '', description: '', priority: 'medium', status: 'todo', due_date: '', assigned_to: '' })
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to?.toString() || ''
    })
    setShowTaskModal(true)
  }

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task)
    fetchTaskComments(task.id)
  }

  // Drag and Drop handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    if (draggedTask && draggedTask.status !== newStatus) {
      // Optimistic update - update UI immediately
      const taskId = draggedTask.id
      setDraggedTask(null)
      setTouchDragActive(false)
      await updateTaskStatus(taskId, newStatus)
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}`)
    } else {
      setDraggedTask(null)
      setTouchDragActive(false)
    }
  }

  // Touch handlers for mobile long-press drag with visual ghost
  const handleTouchStart = (e: React.TouchEvent, task: Task) => {
    if (!task.can_drag && !task.can_edit) return

    const touch = e.touches[0]
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    touchDraggedElementRef.current = e.currentTarget as HTMLDivElement

    // Start long press timer (300ms)
    touchLongPressRef.current = setTimeout(() => {
      setDraggedTask(task)
      setTouchDragActive(true)

      // Vibrate if supported for haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }

      // Create visual ghost element that follows finger - clone the actual card
      if (touchDraggedElementRef.current) {
        const rect = touchDraggedElementRef.current.getBoundingClientRect()
        const ghost = touchDraggedElementRef.current.cloneNode(true) as HTMLDivElement
        ghost.style.cssText = `
          position: fixed;
          left: ${rect.left}px;
          top: ${rect.top}px;
          width: ${rect.width}px;
          height: auto;
          background: rgba(15, 23, 42, 0.98);
          border: 2px solid #06b6d4;
          border-radius: 0.5rem;
          box-shadow: 0 10px 40px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3);
          z-index: 9999;
          pointer-events: none;
          transform: scale(1.02) rotate(1deg);
          transition: transform 0.1s ease;
          overflow: hidden;
        `
        // Remove the mobile status buttons from the ghost if present
        const mobileButtons = ghost.querySelector('.sm\\:hidden')
        if (mobileButtons) {
          mobileButtons.remove()
        }
        document.body.appendChild(ghost)
        touchGhostRef.current = ghost
      }
    }, 300)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]

    // Cancel long press if moved more than 10px before timer fires
    if (touchStartPosRef.current && touchLongPressRef.current) {
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)
      if (dx > 10 || dy > 10) {
        clearTimeout(touchLongPressRef.current)
        touchLongPressRef.current = null
      }
    }

    // Move ghost element if we're actively dragging
    if (touchDragActive && touchGhostRef.current) {
      // CSS touch-action:none handles scroll prevention
      const ghost = touchGhostRef.current
      const width = ghost.offsetWidth
      const height = ghost.offsetHeight
      ghost.style.left = `${touch.clientX - width / 2}px`
      ghost.style.top = `${touch.clientY - height / 2}px`

      // Auto-scroll when near edges of viewport
      const edgeThreshold = 80 // pixels from edge to trigger scroll
      const maxScrollSpeed = 15 // max pixels to scroll per frame
      const viewportHeight = window.innerHeight

      if (touch.clientY < edgeThreshold) {
        // Near top - scroll up
        const scrollSpeed = Math.max(5, maxScrollSpeed * (1 - touch.clientY / edgeThreshold))
        window.scrollBy({ top: -scrollSpeed, behavior: 'auto' })
      } else if (touch.clientY > viewportHeight - edgeThreshold) {
        // Near bottom - scroll down
        const distanceFromBottom = viewportHeight - touch.clientY
        const scrollSpeed = Math.max(5, maxScrollSpeed * (1 - distanceFromBottom / edgeThreshold))
        window.scrollBy({ top: scrollSpeed, behavior: 'auto' })
      }

      // Highlight drop target column
      const dropElement = document.elementFromPoint(touch.clientX, touch.clientY)
      const column = dropElement?.closest('[data-status]')

      // Remove highlight from all columns
      document.querySelectorAll('[data-status]').forEach(col => {
        const el = col as HTMLElement
        el.style.borderColor = ''
        el.style.background = ''
      })

      // Add highlight to current column
      if (column) {
        const el = column as HTMLElement
        el.style.borderColor = '#06b6d4'
        el.style.background = 'rgba(6, 182, 212, 0.1)'
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear long press timer
    if (touchLongPressRef.current) {
      clearTimeout(touchLongPressRef.current)
      touchLongPressRef.current = null
    }

    // Remove ghost element
    if (touchGhostRef.current) {
      touchGhostRef.current.remove()
      touchGhostRef.current = null
    }

    // Reset column highlights
    document.querySelectorAll('[data-status]').forEach(col => {
      const el = col as HTMLElement
      el.style.borderColor = ''
      el.style.background = ''
    })

    // If we were dragging, find drop target
    if (touchDragActive && draggedTask) {
      const touch = e.changedTouches[0]
      const dropElement = document.elementFromPoint(touch.clientX, touch.clientY)

      // Find the status column by looking for data-status attribute
      const column = dropElement?.closest('[data-status]')
      if (column) {
        const newStatus = column.getAttribute('data-status')
        if (newStatus && newStatus !== draggedTask.status) {
          updateTaskStatus(draggedTask.id, newStatus)
          toast.success(`Task moved to ${newStatus.replace('_', ' ')}`)
        }
      }
    }

    // ALWAYS reset drag state - moved outside if block to ensure cleanup
    setDraggedTask(null)
    setTouchDragActive(false)
    touchStartPosRef.current = null
    touchDraggedElementRef.current = null
  }

  // Branch functions
  const createBranch = async () => {
    if (!project || !newBranch.name.trim()) {
      toast.error('Branch name is required')
      return
    }
    try {
      const response = await projectsAPI.createBranch({
        project: project.id,
        name: newBranch.name.replace(/\s+/g, '-').toLowerCase(),
        description: newBranch.description
      })
      setBranches(prev => [...prev, response.data])
      setShowBranchModal(false)
      setNewBranch({ name: '', description: '' })
      toast.success('Branch created!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create branch')
    }
  }

  // PR functions
  const createPullRequest = async () => {
    if (!project || !newPR.title.trim() || !newPR.source_branch || !newPR.target_branch) {
      toast.error('Please fill all required fields')
      return
    }
    if (newPR.source_branch === newPR.target_branch) {
      toast.error('Source and target branches must be different')
      return
    }
    try {
      const response = await projectsAPI.createPullRequest({
        project: project.id,
        title: newPR.title,
        description: newPR.description,
        source_branch: newPR.source_branch,
        target_branch: newPR.target_branch
      })
      setPullRequests(prev => [...prev, response.data])
      setShowPRModal(false)
      setNewPR({ title: '', description: '', source_branch: '', target_branch: '' })
      toast.success('Pull request created!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create pull request')
    }
  }

  const mergePullRequest = async (prId: string) => {
    if (!confirm('Are you sure you want to merge this pull request?')) return
    try {
      await projectsAPI.mergePullRequest(prId)
      setPullRequests(prev => prev.map(pr =>
        pr.id === prId ? { ...pr, status: 'merged' } : pr
      ))
      toast.success('Pull request merged!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to merge PR')
    }
  }

  const closePullRequest = async (prId: string) => {
    try {
      await projectsAPI.closePullRequest(prId)
      setPullRequests(prev => prev.map(pr =>
        pr.id === prId ? { ...pr, status: 'closed' } : pr
      ))
      toast.success('Pull request closed')
    } catch (error) {
      toast.error('Failed to close PR')
    }
  }

  // Team functions
  const sendInvitation = async () => {
    if (!project || !inviteData.invitee) {
      toast.error('Please select a follower to invite')
      return
    }
    try {
      await projectsAPI.sendInvitation({
        project: project.id,
        invitee: inviteData.invitee,
        role: inviteData.role,
        message: inviteData.message
      })
      setShowInviteModal(false)
      setInviteData({ invitee: '', role: 'developer', message: '' })
      toast.success('Invitation sent!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.response?.data?.[0] || 'Failed to send invitation')
    }
  }

  // Settings functions
  const saveSettings = async () => {
    if (!project) return
    setSavingSettings(true)
    try {
      const response = await projectsAPI.updateProject(project.slug, projectSettings)
      setProject(prev => prev ? { ...prev, ...response.data } : null)
      toast.success('Settings saved!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const deleteProject = async () => {
    if (!project) return
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return
    try {
      await projectsAPI.deleteProject(project.slug)
      toast.success('Project deleted')
      navigate('/projects')
    } catch (error) {
      toast.error('Failed to delete project')
    }
  }

  const [syncing, setSyncing] = useState(false)

  const syncGitHub = async () => {
    if (!project?.github_repo) {
      toast.error('No GitHub repository URL set for this project')
      return
    }
    setSyncing(true)
    try {
      const response = await projectsAPI.syncGitHub(project.slug)
      const data = response.data
      toast.success(`Synced from GitHub: ${data.imported.branches} branches, ${data.imported.commits} commits`)
      // Refresh project to get updated branches
      fetchProject()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to sync from GitHub')
    } finally {
      setSyncing(false)
    }
  }

  // Helper functions
  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status)

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'text-red-400 bg-red-500/20 border-red-500/30',
      medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
      low: 'text-green-400 bg-green-500/20 border-green-500/30'
    }
    return colors[priority] || 'text-slate-400 bg-slate-500/20'
  }

  const isOwnerOrAdmin = project?.user_role === 'owner' || project?.user_role === 'admin' ||
    project?.owner === Number(user?.id || 0)

  const canManageTasks = project?.is_member || isOwnerOrAdmin

  const allMembers = project ? (() => {
    // Start with project owner
    const members: Array<{ id: string, user: string, name: string, role: string, user_picture: string | null | undefined }> = [
      { id: `owner-${project.owner}`, user: String(project.owner), name: project.owner_name, role: 'owner', user_picture: project.owner_picture }
    ];

    // Add project memberships (direct project members)
    if (project.memberships) {
      project.memberships.filter(m => m.user !== project.owner).forEach(m => {
        members.push({ id: `member-${m.id}`, user: String(m.user), name: m.user_name, role: m.role, user_picture: m.user_picture });
      });
    }

    // Add team members fetched from API (instead of relying on project.team_members from serializer)
    if (fetchedTeamMembers.length > 0) {
      const existingUserIds = new Set(members.map(m => m.user));
      fetchedTeamMembers.forEach((tm) => {
        if (!existingUserIds.has(tm.user)) {  // Avoid duplicates
          members.push({ id: tm.id, user: tm.user, name: tm.name, role: tm.role, user_picture: undefined });
          existingUserIds.add(tm.user);
        }
      });
    }

    return members;
  })() : []

  const filteredTeam = allMembers.filter(m =>
    teamSearch === '' || m.name.toLowerCase().includes(teamSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading project...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Project not found</h2>
          <p className="text-slate-400 mb-6">The project you're looking for doesn't exist or you don't have access.</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${project.visibility === 'public'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                  {project.visibility === 'public' ? <Globe className="w-3 h-3 inline mr-1" /> : <Lock className="w-3 h-3 inline mr-1" />}
                  {project.visibility}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">{project.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${project.status === 'active' ? 'bg-green-500/20 text-green-400' :
              project.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                project.status === 'planning' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-slate-500/20 text-slate-400'
              }`}>
              {project.status}
            </span>
            <span className="text-sm text-slate-500">{project.programming_language}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Team</span>
            </div>
            <p className="text-xl font-bold text-white">{project.member_count || allMembers.length}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <ListTodo className="w-4 h-4" />
              <span className="text-xs">Tasks</span>
            </div>
            <p className="text-xl font-bold text-white">{tasks.length}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <GitBranch className="w-4 h-4" />
              <span className="text-xs">Branches</span>
            </div>
            <p className="text-xl font-bold text-white">{branches.length}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <GitPullRequest className="w-4 h-4" />
              <span className="text-xs">Open PRs</span>
            </div>
            <p className="text-xl font-bold text-white">{pullRequests.filter(pr => pr.status === 'open').length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-700 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'kanban', label: 'Kanban', icon: ListTodo },
            { id: 'repository', label: 'Repository', icon: GitBranch },
            { id: 'team', label: 'Team', icon: Users },
            ...(isOwnerOrAdmin ? [{ id: 'settings', label: 'Settings', icon: Settings }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                if (tab.id === 'team') fetchFollowers()
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400 -mb-px'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Info */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Project Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Type</span>
                    <span className="text-white capitalize">{project.project_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Language</span>
                    <span className="text-white">{project.programming_language}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Owner</span>
                    <span className="text-white">{project.owner_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Created</span>
                    <span className="text-white">{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                  {project.github_repo && (
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400">GitHub</span>
                      <a href={project.github_repo} target="_blank" rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 truncate max-w-[200px]">
                        {project.github_repo}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Progress */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Task Progress</h3>
                <div className="space-y-4">
                  {TASK_STATUSES.map(status => {
                    const count = getTasksByStatus(status.id).length
                    const percentage = tasks.length > 0 ? (count / tasks.length) * 100 : 0
                    return (
                      <div key={status.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={status.color}>{status.label}</span>
                          <span className="text-white">{count}</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${status.bg.replace('/20', '')} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {tasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700 text-center">
                    <p className="text-2xl font-bold text-green-400">
                      {Math.round((getTasksByStatus('done').length / tasks.length) * 100)}%
                    </p>
                    <p className="text-xs text-slate-400">Completed</p>
                  </div>
                )}
              </div>

              {/* Recent Tasks */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Recent Tasks</h3>
                  <button
                    onClick={() => setActiveTab('kanban')}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    View all →
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No tasks yet</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.slice(0, 5).map(task => (
                      <div
                        key={task.id}
                        onClick={() => openTaskDetail(task)}
                        className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 cursor-pointer transition"
                      >
                        <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-400' :
                          task.status === 'in_progress' ? 'bg-blue-400' :
                            task.status === 'review' ? 'bg-purple-400' : 'bg-slate-400'
                          }`} />
                        <span className="flex-1 text-white truncate">{task.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KANBAN TAB */}
          {activeTab === 'kanban' && (
            <div>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={taskSearch}
                    onChange={e => setTaskSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={taskFilter}
                    onChange={e => setTaskFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All Status</option>
                    {TASK_STATUSES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <select
                    value={taskSort}
                    onChange={e => setTaskSort(e.target.value as any)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="priority">By Priority</option>
                  </select>
                  <button
                    onClick={() => { resetTaskForm(); setEditingTask(null); setShowTaskModal(true) }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Task</span>
                  </button>
                </div>
              </div>

              {/* Kanban Board */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TASK_STATUSES.map(status => (
                  <div
                    key={status.id}
                    data-status={status.id}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, status.id)}
                    className={`bg-slate-800/50 rounded-xl p-4 border border-slate-700 min-h-[300px] ${draggedTask ? 'border-dashed border-cyan-500/50' : ''
                      } ${touchDragActive ? 'border-cyan-500' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <status.icon className={`w-4 h-4 ${status.color}`} />
                        <h4 className="font-medium text-white">{status.label}</h4>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                        {getTasksByStatus(status.id).length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {getTasksByStatus(status.id).map(task => (
                        <div
                          key={task.id}
                          draggable={task.can_drag ?? false}
                          onDragStart={() => handleDragStart(task)}
                          onTouchStart={(e) => handleTouchStart(e, task)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onTouchCancel={handleTouchEnd}
                          onClick={() => !touchDragActive && openTaskDetail(task)}
                          className={`bg-slate-900/70 rounded-lg p-3 border border-slate-700 cursor-pointer hover:border-slate-600 transition select-none touch-none sm:touch-auto ${draggedTask?.id === task.id ? 'opacity-50' : ''
                            } ${!task.can_drag && !task.can_edit ? 'cursor-default' : ''} ${touchDragActive && draggedTask?.id === task.id ? 'ring-2 ring-cyan-500' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h5 className="text-sm text-white font-medium line-clamp-2">{task.title}</h5>
                            {task.can_edit && (
                              <button
                                onClick={e => { e.stopPropagation(); openEditTask(task) }}
                                className="p-1 text-slate-400 hover:text-white shrink-0"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {task.assigned_to_name && (
                            <div className="mt-2 pt-2 border-t border-slate-700">
                              <span className="text-xs text-slate-400">
                                Assigned to: <span className="text-cyan-400">{task.assigned_to_name}</span>
                              </span>
                            </div>
                          )}

                          {/* Mobile-friendly status change buttons - visible on small screens or when can't drag */}
                          {(task.can_drag || task.can_edit) && (
                            <div className="flex gap-1 mt-2 pt-2 border-t border-slate-700 sm:hidden">
                              {(() => {
                                const statusOrder = ['todo', 'in_progress', 'review', 'done']
                                const currentIndex = statusOrder.indexOf(task.status)
                                return (
                                  <>
                                    {currentIndex > 0 && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, statusOrder[currentIndex - 1]) }}
                                        className="flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition flex items-center justify-center gap-1"
                                      >
                                        ← {statusOrder[currentIndex - 1].replace('_', ' ')}
                                      </button>
                                    )}
                                    {currentIndex < statusOrder.length - 1 && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, statusOrder[currentIndex + 1]) }}
                                        className="flex-1 py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition flex items-center justify-center gap-1"
                                      >
                                        {statusOrder[currentIndex + 1].replace('_', ' ')} →
                                      </button>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Task List View */}
              {taskFilter !== 'all' && (
                <div className="mt-6 bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="p-4 border-b border-slate-700">
                    <h3 className="font-semibold text-white">
                      {TASK_STATUSES.find(s => s.id === taskFilter)?.label} Tasks ({filteredTasks.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {filteredTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => openTaskDetail(task)}
                        className="p-4 hover:bg-slate-800/50 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${task.status === 'done' ? 'bg-green-400' :
                            task.status === 'in_progress' ? 'bg-blue-400' :
                              task.status === 'review' ? 'bg-purple-400' : 'bg-slate-400'
                            }`} />
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-slate-400 line-clamp-1">{task.description}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {canManageTasks && (
                            <div className="flex gap-1">
                              <button
                                onClick={e => { e.stopPropagation(); openEditTask(task) }}
                                className="p-1 text-slate-400 hover:text-cyan-400"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); deleteTask(task.id) }}
                                className="p-1 text-slate-400 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REPOSITORY TAB */}
          {activeTab === 'repository' && (
            <div className="space-y-6">
              {/* GitHub Connection Status */}
              {project.github_repo ? (
                <div className="bg-gradient-to-r from-purple-900/50 to-slate-800/50 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <GitBranch className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Connected to GitHub</p>
                        <a
                          href={project.github_repo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 font-medium"
                        >
                          {project.github_repo.replace('https://github.com/', '')} ↗
                        </a>
                      </div>
                    </div>
                    {isOwnerOrAdmin && (
                      <button
                        onClick={syncGitHub}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync from GitHub'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
                  <GitBranch className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">Connect to GitHub</h3>
                  <p className="text-slate-400 mb-4">
                    Link this project to a GitHub repository to sync branches and commits.
                  </p>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
                    >
                      Go to Settings →
                    </button>
                  )}
                </div>
              )}

              {/* Branches */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-white">Branches</h3>
                    <span className="text-xs text-slate-400">({branches.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.github_repo && canManageTasks && (
                      <button
                        onClick={syncGitHub}
                        disabled={syncing}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync from GitHub'}
                      </button>
                    )}
                    {canManageTasks && (
                      <button
                        onClick={() => setShowBranchModal(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-white text-sm rounded hover:bg-slate-600 transition"
                      >
                        <Plus className="w-4 h-4" />
                        New Branch
                      </button>
                    )}
                  </div>
                </div>
                {branches.length === 0 ? (
                  <div className="p-8 text-center">
                    <GitBranch className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No branches yet. Create your first branch.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700">
                    {branches.map(branch => (
                      <div key={branch.id} className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition">
                        <div className="flex items-center gap-3">
                          <GitBranch className="w-4 h-4 text-cyan-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{branch.name}</span>
                              {branch.is_default && (
                                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">default</span>
                              )}
                              {branch.is_protected && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">protected</span>
                              )}
                            </div>
                            {branch.description && (
                              <p className="text-xs text-slate-400 mt-1">{branch.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-slate-400">
                          {branch.commit_count} commits
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pull Requests */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-white">Pull Requests</h3>
                    <span className="text-xs text-slate-400">({pullRequests.length})</span>
                  </div>
                  {canManageTasks && branches.length >= 2 && (
                    <button
                      onClick={() => setShowPRModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                      New PR
                    </button>
                  )}
                </div>
                {pullRequests.length === 0 ? (
                  <div className="p-8 text-center">
                    <GitPullRequest className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No pull requests yet.</p>
                    {branches.length < 2 && (
                      <p className="text-xs text-slate-500 mt-2">Create at least 2 branches to open a PR.</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700">
                    {pullRequests.map(pr => (
                      <div key={pr.id} className="p-4 hover:bg-slate-800/50 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <GitPullRequest className={`w-5 h-5 mt-0.5 ${pr.status === 'open' ? 'text-green-400' :
                              pr.status === 'merged' ? 'text-purple-400' : 'text-red-400'
                              }`} />
                            <div>
                              <h4 className="text-white font-medium">{pr.title}</h4>
                              <p className="text-xs text-slate-400 mt-1">
                                {pr.source_branch_name} → {pr.target_branch_name} • by {pr.author_name}
                              </p>
                              {pr.description && (
                                <p className="text-sm text-slate-400 mt-2 line-clamp-2">{pr.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-1 rounded ${pr.status === 'open' ? 'bg-green-500/20 text-green-400' :
                              pr.status === 'merged' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                              {pr.status}
                            </span>
                            {pr.status === 'open' && isOwnerOrAdmin && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => mergePullRequest(pr.id)}
                                  className="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                                  title="Merge PR"
                                >
                                  <Merge className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => closePullRequest(pr.id)}
                                  className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                  title="Close PR"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <div>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search team members..."
                    value={teamSearch}
                    onChange={e => setTeamSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => { fetchFollowers(); setShowInviteModal(true) }}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                  </button>
                )}
              </div>

              {/* Team List */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="font-semibold text-white">Team Members ({filteredTeam.length})</h3>
                </div>
                <div className="divide-y divide-slate-700">
                  {filteredTeam.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition cursor-pointer"
                      onClick={() => navigate(`/user/${member.user}`)}
                    >
                      <div className="flex items-center gap-3">
                        <ProfileAvatar
                          src={member.user_picture}
                          alt={member.name}
                          size="md"
                          className="ring-2 ring-slate-700 hover:ring-purple-500 transition-all"
                        />
                        <div>
                          <p className="text-white font-medium hover:text-purple-400 transition">{member.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{member.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${member.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                          member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                            member.role === 'developer' ? 'bg-cyan-500/20 text-cyan-400' :
                              'bg-slate-500/20 text-slate-400'
                          }`}>
                          {member.role}
                        </span>
                        <span className="text-slate-500 text-xs">View Profile →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && isOwnerOrAdmin && (
            <div className="max-w-2xl">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-6">Project Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={projectSettings.name}
                      onChange={e => setProjectSettings(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Description</label>
                    <textarea
                      value={projectSettings.description}
                      onChange={e => setProjectSettings(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Visibility</label>
                      <select
                        value={projectSettings.visibility}
                        onChange={e => setProjectSettings(prev => ({ ...prev, visibility: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Status</label>
                      <select
                        value={projectSettings.status}
                        onChange={e => setProjectSettings(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="planning">Planning</option>
                        <option value="active">Active</option>
                        <option value="on_hold">On Hold</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    {/* GitHub Integration */}
                    <div className="pt-4 border-t border-slate-700">
                      <label className="block text-sm text-slate-400 mb-1">
                        GitHub Repository URL
                      </label>
                      <input
                        type="url"
                        value={projectSettings.github_repo}
                        onChange={e => setProjectSettings(prev => ({ ...prev, github_repo: e.target.value }))}
                        placeholder="https://github.com/username/repo"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Connect to GitHub to sync branches and commits in the Repository tab
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={saveSettings}
                      disabled={savingSettings}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingSettings ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="mt-6 bg-red-500/10 rounded-xl p-6 border border-red-500/30">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Once you delete a project, there is no going back. Please be certain.
                </p>
                <button
                  onClick={deleteProject}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Modal (Create/Edit) */}
      {showTaskModal && (
        <Modal onClose={() => { setShowTaskModal(false); setEditingTask(null); resetTaskForm() }}
          title={editingTask ? 'Edit Task' : 'Create Task'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Title *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="Task title"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                value={newTask.description}
                onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-cyan-500"
                rows={3}
                placeholder="Task description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <select
                  value={newTask.status}
                  onChange={e => setNewTask(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  {TASK_STATUSES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={e => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Assign To</label>
                <select
                  value={newTask.assigned_to}
                  onChange={e => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Unassigned</option>
                  {allMembers.map(m => (
                    <option key={m.id} value={m.user}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowTaskModal(false); setEditingTask(null); resetTaskForm() }}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={editingTask ? updateTask : createTask}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <Modal onClose={() => setSelectedTask(null)} title="Task Details" large>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedTask.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority} priority
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${TASK_STATUSES.find(s => s.id === selectedTask.status)?.bg
                    } ${TASK_STATUSES.find(s => s.id === selectedTask.status)?.color}`}>
                    {TASK_STATUSES.find(s => s.id === selectedTask.status)?.label}
                  </span>
                </div>
              </div>
              {canManageTasks && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { openEditTask(selectedTask); setSelectedTask(null) }}
                    className="p-2 text-slate-400 hover:text-cyan-400 transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTask(selectedTask.id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {selectedTask.description && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-1">Description</h4>
                <p className="text-slate-300">{selectedTask.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-700">
              <div>
                <span className="text-xs text-slate-400">Assigned To</span>
                <p className="text-white">{selectedTask.assigned_to_name || 'Unassigned'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Due Date</span>
                <p className="text-white">
                  {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No due date'}
                </p>
              </div>
            </div>

            {/* Status Change */}
            {canManageTasks && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-2">Change Status</h4>
                <div className="flex gap-2">
                  {TASK_STATUSES.map(status => (
                    <button
                      key={status.id}
                      onClick={() => updateTaskStatus(selectedTask.id, status.id)}
                      className={`px-3 py-1.5 text-xs rounded transition ${selectedTask.status === status.id
                        ? `${status.bg} ${status.color} border border-current`
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">
                Comments ({taskComments.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {taskComments.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No comments yet</p>
                ) : (
                  taskComments.map(comment => (
                    <div key={comment.id} className="bg-slate-900/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-cyan-400">{comment.author_name}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  onKeyDown={e => e.key === 'Enter' && addTaskComment()}
                />
                <button
                  onClick={addTaskComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Branch Modal */}
      {showBranchModal && (
        <Modal onClose={() => setShowBranchModal(false)} title="Create Branch">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Branch Name *</label>
              <input
                type="text"
                value={newBranch.name}
                onChange={e => setNewBranch(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="feature/my-feature"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                value={newBranch.description}
                onChange={e => setNewBranch(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-cyan-500"
                rows={2}
                placeholder="What this branch is for"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBranchModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={createBranch}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
              >
                Create Branch
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PR Modal */}
      {showPRModal && (
        <Modal onClose={() => setShowPRModal(false)} title="Create Pull Request">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Title *</label>
              <input
                type="text"
                value={newPR.title}
                onChange={e => setNewPR(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="PR title"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                value={newPR.description}
                onChange={e => setNewPR(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-cyan-500"
                rows={3}
                placeholder="Describe your changes"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Source Branch *</label>
                <select
                  value={newPR.source_branch}
                  onChange={e => setNewPR(prev => ({ ...prev, source_branch: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Target Branch *</label>
                <select
                  value={newPR.target_branch}
                  onChange={e => setNewPR(prev => ({ ...prev, target_branch: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPRModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={createPullRequest}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Create PR
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <Modal onClose={() => setShowInviteModal(false)} title="Invite Team Member">
          <div className="space-y-4">
            <p className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded-lg">
              You can only invite users who follow you. They will receive an invitation to join the project.
            </p>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Select Follower *</label>
              <select
                value={inviteData.invitee}
                onChange={e => setInviteData(prev => ({ ...prev, invitee: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Choose a follower</option>
                {followers.map(f => (
                  <option key={f.id} value={f.follower}>{f.follower_username}</option>
                ))}
              </select>
              {followers.length === 0 && (
                <p className="text-xs text-yellow-400 mt-1">You don't have any followers yet.</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Role</label>
              <select
                value={inviteData.role}
                onChange={e => setInviteData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Message (optional)</label>
              <textarea
                value={inviteData.message}
                onChange={e => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-cyan-500"
                rows={2}
                placeholder="Join our awesome project!"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={sendInvitation}
                disabled={!inviteData.invitee}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition disabled:opacity-50"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Modal Component
function Modal({
  children,
  onClose,
  title,
  large = false
}: {
  children: React.ReactNode
  onClose: () => void
  title: string
  large?: boolean
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pb-24 sm:pb-4 pt-4 sm:pt-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`bg-slate-800 rounded-xl border border-slate-700 shadow-2xl my-4 max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col ${large ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 pb-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
