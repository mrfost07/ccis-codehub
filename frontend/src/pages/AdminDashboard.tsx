import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, BookOpen, Briefcase, Trophy, MessageSquare,
  BarChart3, Settings, Activity, TrendingUp, AlertCircle,
  FileText, UserCheck, GitBranch, Brain, Shield, Search,
  Filter, Trash2, Eye, Plus, Edit, Award, X, Power
} from 'lucide-react'
import Navbar from '../components/Navbar'
import ModuleFormWithEditor from '../components/ModuleFormWithEditor'
import QuizEditor from '../components/QuizEditor'
import AdminAnalytics from '../components/AdminAnalytics'
import LearningAnalytics from '../components/LearningAnalytics'
import ProjectAdmin from '../components/ProjectAdmin'
import ContentModeration from '../components/ContentModeration'
import api from '../services/api'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalUsers: number
  totalStudents: number
  totalInstructors: number
  totalCourses: number
  totalProjects: number
  activeCompetitions: number
  communityPosts: number
  aiInteractions: number
  recentActivities: any[]
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalCourses: 0,
    totalProjects: 0,
    activeCompetitions: 0,
    communityPosts: 0,
    aiInteractions: 0,
    recentActivities: []
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState<any[]>([])
  const [contentData, setContentData] = useState<any>(null)
  const [paths, setPaths] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [learningStats, setLearningStats] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProgram, setFilterProgram] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userProgramFilter, setUserProgramFilter] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [selectedPathId, setSelectedPathId] = useState('')
  const [quizzes, setQuizzes] = useState<any[]>([])

  // Learning Admin specific states
  const [learningView, setLearningView] = useState('overview') // overview, paths, modules, quizzes, analytics
  const [showCreatePath, setShowCreatePath] = useState(false)
  const [showCreateModule, setShowCreateModule] = useState(false)
  const [showCreateQuiz, setShowCreateQuiz] = useState(false)
  const [showEditPath, setShowEditPath] = useState(false)
  const [showEditModule, setShowEditModule] = useState(false)
  const [showEditQuiz, setShowEditQuiz] = useState(false)
  const [editingPath, setEditingPath] = useState<any>(null)
  const [editingModule, setEditingModule] = useState<any>(null)
  const [editingQuiz, setEditingQuiz] = useState<any>(null)
  const [pathForm, setPathForm] = useState({
    name: '',
    description: '',
    program_type: 'bsit',
    difficulty_level: 'beginner',
    estimated_duration: 4,
    max_modules: 0,
    points_reward: 100,
    is_active: true,
    is_featured: false
  })
  const [moduleForm, setModuleForm] = useState({
    career_path: '',
    title: '',
    description: '',
    module_type: 'text',
    difficulty_level: 'beginner',
    content: '',
    duration_minutes: 30,
    points_reward: 10,
    order: 0,
    is_locked: false
  })
  const [quizForm, setQuizForm] = useState({
    learning_module: '',
    title: '',
    description: '',
    content: '',
    time_limit_minutes: 30,
    passing_score: 70,
    max_attempts: 3,
    randomize_questions: true
  })
  const [showQuizEditor, setShowQuizEditor] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [creatingQuiz, setCreatingQuiz] = useState(false)
  const [updatingQuiz, setUpdatingQuiz] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)

  useEffect(() => {
    fetchDashboardStats()
    checkAdminAccess()
  }, [])

  useEffect(() => {
    console.log('Tab changed to:', activeTab)
    // Fetch data based on active tab
    if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'content') {
      fetchContent()
    } else if (activeTab === 'learning') {
      console.log('Learning tab active, fetching learning data...')
      fetchLearningData()
    } else if (activeTab === 'paths') {
      fetchLearningData()
    } else if (activeTab === 'modules') {
      fetchModules()
    } else if (activeTab === 'quizzes') {
      fetchQuizzes()
    }
  }, [activeTab])

  // Fetch data when learningView changes (for Learning Admin sub-tabs)
  useEffect(() => {
    if (activeTab === 'learning') {
      console.log('Learning view changed to:', learningView)
      if (learningView === 'paths') {
        console.log('Fetching paths...')
        // fetchPaths() if you have it
      } else if (learningView === 'modules') {
        console.log('Fetching modules...')
        fetchModules()
      } else if (learningView === 'quizzes') {
        console.log('Fetching quizzes for quiz view...')
        fetchQuizzes()
      }
    }
  }, [learningView, activeTab])

  const checkAdminAccess = async () => {
    try {
      const response = await api.get('/auth/profile/')
      if (response.data.role !== 'admin') {
        navigate('/dashboard')
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/login')
      }
      console.error('Access check failed:', error)
      navigate('/login')
    }
  }

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      // Fetch multiple data sources in parallel
      const [dashboardRes, pathsRes, modulesRes, postsRes] = await Promise.all([
        api.get('/auth/admin/dashboard/').catch(() => ({ data: {} })),
        api.get('/learning/career-paths/').catch(() => ({ data: [] })),
        api.get('/learning/modules/').catch(() => ({ data: [] })),
        api.get('/community/posts/').catch(() => ({ data: [] }))
      ])

      const paths = pathsRes.data.results || pathsRes.data || []
      const modules = modulesRes.data.results || modulesRes.data || []
      const posts = postsRes.data.results || postsRes.data || []

      if (dashboardRes.data) {
        setStats({
          totalUsers: dashboardRes.data.totalUsers || 0,
          totalStudents: dashboardRes.data.totalStudents || 0,
          totalInstructors: dashboardRes.data.totalInstructors || 0,
          totalCourses: paths.length || 0,
          totalProjects: dashboardRes.data.totalProjects || 0,
          activeCompetitions: dashboardRes.data.activeCompetitions || 0,
          communityPosts: posts.length || 0,
          aiInteractions: dashboardRes.data.aiInteractions || 0,
          recentActivities: dashboardRes.data.recentActivities || []
        })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/admin/users/')
      const allUsers = response.data.results || []
      setUsers(allUsers)
      setFilteredUsers(allUsers)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchContent = async () => {
    try {
      const response = await api.get('/auth/admin/content/')
      setContentData(response.data)
    } catch (error) {
      console.error('Failed to fetch content:', error)
    }
  }

  const fetchLearningData = async () => {
    try {
      console.log('Fetching learning data...')

      // Try both admin and regular endpoints
      let pathsRes, modulesRes

      try {
        // Try admin endpoint first
        pathsRes = await api.get('/learning/admin/career-paths/')
        console.log('Admin paths response:', pathsRes.data)
      } catch (adminError) {
        console.log('Admin endpoint failed, trying regular endpoint:', adminError)
        pathsRes = await api.get('/learning/career-paths/')
        console.log('Regular paths response:', pathsRes.data)
      }

      try {
        modulesRes = await api.get('/learning/admin/modules/')
        console.log('Admin modules response:', modulesRes.data)
      } catch (adminError) {
        console.log('Admin modules endpoint failed, trying regular:', adminError)
        modulesRes = await api.get('/learning/modules/')
        console.log('Regular modules response:', modulesRes.data)
      }

      const pathsData = pathsRes.data.results || pathsRes.data || []
      const modulesData = modulesRes.data.results || modulesRes.data || []

      console.log('Processed paths data:', pathsData)
      console.log('Processed modules data:', modulesData)

      setPaths(pathsData)
      setModules(modulesData)

      setLearningStats({
        totalPaths: pathsData.length,
        activePaths: pathsData.filter((p: any) => p.is_active).length,
        totalModules: modulesData.length,
        totalEnrollments: stats.totalCourses
      })

      console.log('Learning data fetch completed successfully')
    } catch (error: any) {
      console.error('Failed to fetch learning data:', error)
      console.error('Error details:', error?.response?.data)
    }
  }

  const fetchModules = async () => {
    try {
      const response = await api.get('/learning/modules/')
      setModules(response.data.results || response.data || [])
    } catch (error) {
      console.error('Failed to fetch modules:', error)
    }
  }

  const fetchQuizzes = async () => {
    try {
      console.log('Fetching quizzes...')
      const response = await api.get('/learning/quizzes/')
      console.log('Quiz API response:', response.data)

      const quizzesData = response.data.results || response.data || []
      console.log('Extracted quizzes:', quizzesData)
      console.log('Number of quizzes:', quizzesData.length)

      setQuizzes(quizzesData)

      if (quizzesData.length === 0) {
        console.warn('No quizzes found in response')
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
      setQuizzes([])
    }
  }

  const filterUsers = (searchTerm: string, roleFilter: string, programFilter: string) => {
    let filtered = users

    // Filter by search term (username or email)
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by role
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Filter by program
    if (programFilter) {
      filtered = filtered.filter(user => user.program === programFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const response = await api.post(`/auth/users/${userId}/toggle_status/`)

      // Update local user list
      const updatedUser = response.data.user
      setUsers(users.map(u => u.id === userId ? updatedUser : u))
      setFilteredUsers(filteredUsers.map(u => u.id === userId ? updatedUser : u))

      toast.success(response.data.message)
      fetchDashboardStats() // Refresh stats
    } catch (error: any) {
      console.error('Failed to toggle user status:', error)
      toast.error(error.response?.data?.error || 'Failed to toggle user status')
    }
  }

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await api.post(`/auth/users/${userId}/change_role/`, { role: newRole })

      // Update local user list
      setUsers(users.map(u => u.id === userId ? response.data.user : u))
      setFilteredUsers(filteredUsers.map(u => u.id === userId ? response.data.user : u))

      toast.success(`User role changed to ${newRole}`)
      fetchDashboardStats() // Refresh stats
    } catch (error: any) {
      console.error('Failed to change user role:', error)
      toast.error(error.response?.data?.error || 'Failed to change user role')
    }
  }

  // Feature flag for delete button
  const isUserDeleteEnabled = import.meta.env.VITE_ENABLE_USER_DELETE === 'true'

  // Delete user modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string; username: string }>({
    isOpen: false,
    userId: '',
    username: ''
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const openDeleteModal = (userId: string, username: string) => {
    setDeleteModal({ isOpen: true, userId, username })
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({ isOpen: false, userId: '', username: '' })
    }
  }

  const handleDeleteUser = async () => {
    if (!isUserDeleteEnabled || !deleteModal.userId) return

    setIsDeleting(true)

    try {
      await api.delete(`/auth/users/${deleteModal.userId}/`)

      // Remove from local lists
      setUsers(users.filter(u => u.id !== deleteModal.userId))
      setFilteredUsers(filteredUsers.filter(u => u.id !== deleteModal.userId))

      toast.success(`User "${deleteModal.username}" has been deleted`)
      fetchDashboardStats() // Refresh stats
      setDeleteModal({ isOpen: false, userId: '', username: '' })
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      toast.error(error.response?.data?.error || 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeletePath = async (pathId: string) => {
    if (!confirm('Are you sure you want to delete this path? This action cannot be undone.')) return

    try {
      // Try admin delete endpoint first
      await api.delete(`/learning/admin/career-paths/${pathId}/`)

      // Refresh the data after deletion
      await fetchLearningData()

      toast.success('Path deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete path:', error)

      // Try regular endpoint as fallback
      try {
        await api.delete(`/learning/career-paths/${pathId}/`)
        await fetchLearningData()
        toast.success('Path deleted successfully')
      } catch (fallbackError) {
        console.error('Fallback delete also failed:', fallbackError)
        toast.error('Failed to delete path - check permissions')
      }
    }
  }

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) return

    try {
      await api.delete(`/learning/admin/modules/${moduleId}/`)

      // Refresh the modules list
      await fetchModules()

      toast.success('Module deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete module:', error)

      // Try regular endpoint as fallback
      try {
        await api.delete(`/learning/modules/${moduleId}/`)
        await fetchModules()
        toast.success('Module deleted successfully')
      } catch (fallbackError) {
        console.error('Fallback delete also failed:', fallbackError)
        toast.error('Failed to delete module - check permissions')
      }
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) return

    try {
      await api.delete(`/learning/quizzes/${quizId}/`)

      // Refresh the quizzes list
      await fetchQuizzes()

      toast.success('Quiz deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete quiz:', error)
      toast.error('Failed to delete quiz - check permissions')
    }
  }

  // Learning Admin CRUD Functions
  const handleEditPath = (path: any) => {
    console.log('Editing path:', path)
    setEditingPath(path)
    setPathForm({
      name: path.name || '',
      description: path.description || '',
      program_type: path.program_type || 'bsit',
      difficulty_level: path.difficulty_level || 'beginner',
      estimated_duration: path.estimated_duration || 4,
      max_modules: path.max_modules || 0,
      points_reward: path.points_reward || 100,
      is_active: path.is_active ?? true,
      is_featured: path.is_featured ?? false
    })
    setShowEditPath(true)
    console.log('Edit modal should open, showEditPath:', true)
  }

  const updateCareerPath = async () => {
    try {
      let response

      if (certificateFile) {
        const formData = new FormData()
        Object.entries(pathForm).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
        formData.append('certificate_template', certificateFile)

        response = await api.patch(`/learning/admin/career-paths/${editingPath.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        response = await api.patch(`/learning/admin/career-paths/${editingPath.id}/`, pathForm)
      }

      console.log('Update successful:', response.data)

      // Update local state
      setPaths(paths.map(p => p.id === editingPath.id ? response.data : p))

      // Close modal and reset
      setShowEditPath(false)
      setEditingPath(null)
      resetPathForm()
      setCertificateFile(null)

      toast.success('Career path updated successfully')

      // Optionally refresh the entire list to ensure consistency
      await fetchLearningData()
    } catch (error: any) {
      console.error('Update path error:', error)
      toast.error(error.response?.data?.detail || 'Failed to update path')
    }
  }

  const handleEditModule = async (module: any) => {
    console.log('Editing module:', module)

    try {
      // Fetch full module data including content
      const response = await api.get(`/learning/admin/modules/${module.id}/`)
      const fullModule = response.data
      console.log('Fetched full module:', fullModule)
      console.log('Module content length:', fullModule.content?.length || 0)

      setEditingModule(fullModule)
      setModuleForm({
        career_path: fullModule.career_path || '',
        title: fullModule.title || '',
        description: fullModule.description || '',
        module_type: fullModule.module_type || 'text',
        difficulty_level: fullModule.difficulty_level || 'beginner',
        content: fullModule.content || '',
        duration_minutes: fullModule.duration_minutes || 30,
        points_reward: fullModule.points_reward || 10,
        order: fullModule.order || 0,
        is_locked: fullModule.is_locked ?? false
      })
      setShowEditModule(true)
    } catch (error: any) {
      console.error('Failed to fetch module:', error)
      toast.error('Failed to load module for editing')
    }
    console.log('Edit modal should open, showEditModule:', true)
  }

  const updateModule = async () => {
    try {
      let response

      if (uploadFile) {
        const formData = new FormData()
        Object.entries(moduleForm).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
        formData.append('video_file', uploadFile)

        response = await api.patch(`/learning/admin/modules/${editingModule.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        response = await api.patch(`/learning/admin/modules/${editingModule.id}/`, moduleForm)
      }

      console.log('Module update successful:', response.data)

      // Update local state
      setModules(modules.map(m => m.id === editingModule.id ? response.data : m))

      // Close modal and reset
      setShowEditModule(false)
      setEditingModule(null)
      setUploadFile(null)

      toast.success('Module updated successfully')

      // Refresh the list to ensure consistency
      await fetchModules()
    } catch (error: any) {
      console.error('Update module error:', error)
      toast.error(error.response?.data?.detail || 'Failed to update module')
    }
  }

  const handleEditQuiz = (quiz: any) => {
    console.log('Editing quiz:', quiz)
    console.log('Quiz content:', quiz.content)
    setEditingQuiz(quiz)
    setQuizForm({
      learning_module: quiz.learning_module || '',
      title: quiz.title || '',
      description: quiz.description || '',
      content: quiz.content || '',
      time_limit_minutes: quiz.time_limit_minutes || 30,
      passing_score: quiz.passing_score || 70,
      max_attempts: quiz.max_attempts || 3,
      randomize_questions: quiz.randomize_questions ?? true
    })

    // Parse existing questions from content if available
    if (quiz.content) {
      try {
        const parsedQuestions = parseQuestionsFromContent(quiz.content)
        console.log('Parsed questions:', parsedQuestions)
        setQuizQuestions(parsedQuestions)
      } catch (e) {
        console.error('Failed to parse questions:', e)
        setQuizQuestions([])
      }
    } else {
      setQuizQuestions([])
    }

    setShowQuizEditor(true)
    setShowEditQuiz(true)
    console.log('Edit modal should open, showEditQuiz:', true)
  }

  // Helper function to parse questions from HTML content
  const parseQuestionsFromContent = (content: string): any[] => {
    const questions: any[] = []

    // Split by slide separator
    const slides = content.split('<hr class="slide-separator"')

    slides.forEach((slide, index) => {
      // Extract question title
      const titleMatch = slide.match(/Question \d+: ([^<]+)/)
      const title = titleMatch ? titleMatch[1].trim() : `Question ${index + 1}`

      // Extract question type
      let type = 'multiple_choice'
      if (slide.includes('TRUE / FALSE')) type = 'true_false'
      else if (slide.includes('SHORT ANSWER')) type = 'short_answer'
      else if (slide.includes('ESSAY')) type = 'essay'

      // Extract points
      const pointsMatch = slide.match(/(\d+) points?/)
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 1

      // Extract choices for multiple choice
      const choices: any[] = []
      const choiceMatches = slide.matchAll(/data-choice="([A-D])"[^>]*>([^<]+)</g)
      for (const match of choiceMatches) {
        choices.push({
          id: match[1],
          text: match[2].trim(),
          isCorrect: slide.includes(`data-correct="${match[1]}"`) || slide.includes(`correct.*${match[1]}`)
        })
      }

      // Check for correct answer marker
      const correctMatch = slide.match(/data-correct="([A-D])"/)
      if (correctMatch && choices.length > 0) {
        choices.forEach(c => {
          c.isCorrect = c.id === correctMatch[1]
        })
      }

      if (choices.length === 0 && type === 'multiple_choice') {
        choices.push(
          { id: 'A', text: 'Option A', isCorrect: true },
          { id: 'B', text: 'Option B', isCorrect: false },
          { id: 'C', text: 'Option C', isCorrect: false },
          { id: 'D', text: 'Option D', isCorrect: false }
        )
      }

      questions.push({
        id: Date.now().toString() + index,
        title,
        content: '',
        type,
        choices: type === 'multiple_choice' ? choices : undefined,
        points
      })
    })

    return questions.length > 0 ? questions : [{
      id: '1',
      title: 'Question 1',
      content: '',
      type: 'multiple_choice',
      choices: [
        { id: 'A', text: 'Option A', isCorrect: true },
        { id: 'B', text: 'Option B', isCorrect: false },
        { id: 'C', text: 'Option C', isCorrect: false },
        { id: 'D', text: 'Option D', isCorrect: false }
      ],
      points: 1
    }]
  }

  const updateQuiz = async () => {
    // Prevent duplicate submissions
    if (updatingQuiz) {
      console.log('Quiz update already in progress, ignoring click')
      return
    }

    try {
      setUpdatingQuiz(true)

      const quizData = {
        ...quizForm,
        content: quizForm.content || ''
      }

      const response = await api.patch(`/learning/quizzes/${editingQuiz.id}/`, quizData)

      console.log('Quiz update successful:', response.data)

      // Close modal and reset
      setShowEditQuiz(false)
      setEditingQuiz(null)
      setShowQuizEditor(false)
      setQuizQuestions([])

      toast.success('Quiz updated successfully')

      // Refresh the list to ensure consistency
      await fetchQuizzes()
    } catch (error: any) {
      console.error('Update quiz error:', error)
      toast.error(error.response?.data?.detail || 'Failed to update quiz')
    } finally {
      setUpdatingQuiz(false)
    }
  }

  const handleQuizQuestionsChange = (questions: any[]) => {
    console.log('=== handleQuizQuestionsChange called ===')
    console.log('Number of questions:', questions.length)
    setQuizQuestions(questions)

    // Generate HTML content from questions
    const htmlContent = questions.map((q, index) => {
      let choicesHtml = ''

      if (q.type === 'multiple_choice' && q.choices) {
        choicesHtml = `
          <div class="quiz-choices" style="margin-top: 1rem;">
            ${q.choices.map((choice: any, i: number) => `
              <div class="quiz-choice" style="padding: 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; cursor: pointer;" data-choice-id="${choice.id}" data-correct="${choice.isCorrect}">
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="radio" name="question-${q.id}" value="${choice.id}" style="margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;">
                  <span style="font-size: 1rem;">${String.fromCharCode(65 + i)}. ${choice.text}</span>
                </label>
              </div>
            `).join('')}
          </div>
        `
      } else if (q.type === 'true_false') {
        choicesHtml = `
          <div class="quiz-choices" style="margin-top: 1rem;">
            <div class="quiz-choice" style="padding: 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="radio" name="question-${q.id}" value="true" style="margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;">
                <span>True</span>
              </label>
            </div>
            <div class="quiz-choice" style="padding: 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="radio" name="question-${q.id}" value="false" style="margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;">
                <span>False</span>
              </label>
            </div>
          </div>
        `
      } else if (q.type === 'enumeration' || q.type === 'short_answer') {
        choicesHtml = `
          <div style="margin-top: 1rem;">
            <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.5rem;">ENUMERATION - Type your answer:</p>
            <input type="text" placeholder="Enter your answer..." style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 0.5rem; color: white;" />
          </div>
        `
      } else {
        choicesHtml = `
          <div style="margin-top: 1rem;">
            <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.5rem;">ESSAY - Write your answer:</p>
            <textarea placeholder="Type your answer here..." rows="4" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 0.5rem; color: white;"></textarea>
          </div>
        `
      }

      return `
        <div class="module-slide" data-slide="${index + 1}">
          <h2 style="color: #60a5fa; margin-bottom: 1rem; font-size: 1.5rem; font-weight: bold;">
            Question ${index + 1}: ${q.title}
          </h2>
          <div class="question-content" style="margin-bottom: 1.5rem;">
            ${q.content}
          </div>
          <div class="question-info" style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.875rem; color: #94a3b8;">
            <span>📝 ${q.type.replace('_', ' ').toUpperCase()}</span>
            <span>⭐ ${q.points} ${q.points === 1 ? 'point' : 'points'}</span>
          </div>
          ${choicesHtml}
        </div>
        ${index < questions.length - 1 ? '<hr class="slide-separator" />' : ''}
      `
    }).join('\n')

    console.log('Generated HTML content length:', htmlContent.length)
    console.log('HTML preview:', htmlContent.substring(0, 200))
    setQuizForm(prev => ({ ...prev, content: htmlContent }))
  }

  const createCareerPath = async () => {
    try {
      let response

      if (certificateFile) {
        const formData = new FormData()
        Object.entries(pathForm).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
        formData.append('certificate_template', certificateFile)

        response = await api.post('/learning/admin/career-paths/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        response = await api.post('/learning/admin/career-paths/', pathForm)
      }

      console.log('Created path response:', response.data)

      // Instead of manually adding, refresh the paths list to ensure correct data structure
      await fetchLearningData()

      setShowCreatePath(false)
      resetPathForm()
      setCertificateFile(null)
      toast.success('Career path created successfully')
    } catch (error: any) {
      console.error('Create path error:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)

      // Handle validation errors specifically
      if (error.response?.status === 400 && error.response?.data) {
        const errorData = error.response.data
        console.log('Full error data structure:', JSON.stringify(errorData, null, 2))

        // Handle slug conflict specifically
        if (errorData.slug) {
          const message = `Path name conflict: ${errorData.slug[0] || 'A career path with this name already exists. Please use a different name.'}`
          console.log('Showing slug error message:', message)
          toast.error(message)
          // Backup alert in case toast doesn't show
          alert(`CAREER PATH ERROR: ${message}`)
        }
        // Handle other field errors
        else if (errorData.name) {
          toast.error(`Name error: ${errorData.name[0]}`)
        }
        // Handle general validation errors
        else {
          const firstError = Object.values(errorData)[0]
          if (Array.isArray(firstError)) {
            toast.error(`Validation error: ${firstError[0]}`)
          } else {
            toast.error('Please check your input and try again')
          }
        }
      } else {
        toast.error(error.response?.data?.error || 'Failed to create career path')
      }

      // Always show some error message as fallback
      console.log('Error handling completed - user should see toast notification')
    }
  }

  const createModule = async () => {
    try {
      let response

      console.log('Creating module with data:', moduleForm)
      console.log('File attached:', uploadFile ? uploadFile.name : 'No file')

      if (uploadFile) {
        // Use FormData for file upload with AI processing
        const formData = new FormData()

        // Add all form fields carefully
        Object.entries(moduleForm).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            formData.append(key, String(value))
          }
        })

        // Add file and processing flags
        formData.append('file', uploadFile)
        formData.append('auto_generate_content', 'true') // Enable AI content generation
        formData.append('create_slides', 'true') // Enable slide creation

        // Show processing toast
        const processingToast = toast.loading('Processing file and generating content...')

        // Try admin endpoint first, fallback to regular
        try {
          response = await api.post('/learning/admin/modules/', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 120000 // 2 minutes for AI processing
          })
        } catch (adminError) {
          console.log('Admin endpoint failed, trying regular endpoint')
          response = await api.post('/learning/modules/', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 120000
          })
        }

        // Dismiss processing toast
        toast.dismiss(processingToast)

        // Show success with details about what was generated
        if (response.data.auto_generated_content) {
          toast.success('Module created with AI-generated content and slides!')
        } else {
          toast.success('Module created with uploaded file!')
        }

      } else {
        // Use JSON when no file is present
        console.log('No file - using JSON payload')
        try {
          response = await api.post('/learning/admin/modules/', moduleForm, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        } catch (adminError) {
          console.log('Admin endpoint failed for JSON, trying regular endpoint')
          response = await api.post('/learning/modules/', moduleForm, {
            headers: {
              'Content-Type': 'application/json'
            }
          })
        }

        toast.success('Module created successfully!')
      }

      console.log('Module created successfully:', response.data)

      // Refresh modules list
      await fetchModules()

      setShowCreateModule(false)
      resetModuleForm()
      setUploadFile(null)

    } catch (error: any) {
      console.error('Create module error:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)

      // Handle specific backend errors
      if (error.response?.status === 400 && error.response?.data) {
        const errorData = error.response.data
        console.log('Validation errors:', errorData)

        // Handle file upload errors
        if (errorData.file) {
          toast.error(`File error: ${errorData.file[0] || 'Invalid file upload'}`)
        }
        // Handle field validation errors
        else if (errorData.career_path) {
          toast.error(`Career path error: ${errorData.career_path[0] || 'Please select a valid career path'}`)
        }
        else if (errorData.title) {
          toast.error(`Title error: ${errorData.title[0] || 'Title is required'}`)
        }
        else if (errorData.non_field_errors) {
          toast.error(`Error: ${errorData.non_field_errors[0]}`)
        }
        // Handle other validation errors
        else {
          const firstErrorKey = Object.keys(errorData)[0]
          const firstError = errorData[firstErrorKey]
          if (Array.isArray(firstError)) {
            toast.error(`${firstErrorKey}: ${firstError[0]}`)
          } else {
            toast.error('Please check your input and try again')
          }
        }
      } else {
        toast.error(error.response?.data?.error || 'Failed to create module')
      }
    }
  }

  const createQuiz = async () => {
    // Prevent duplicate submissions
    if (creatingQuiz) {
      console.log('Quiz creation already in progress, ignoring click')
      return
    }

    try {
      setCreatingQuiz(true)

      // Validate required fields
      if (!quizForm.learning_module) {
        toast.error('Please select a learning module')
        return
      }
      if (!quizForm.title) {
        toast.error('Please enter a quiz title')
        return
      }

      const quizData = {
        ...quizForm,
        content: quizForm.content || ''
      }

      console.log('Creating quiz with data:', {
        title: quizData.title,
        learning_module: quizData.learning_module,
        has_content: !!quizData.content,
        content_length: quizData.content?.length || 0
      })

      const response = await api.post('/learning/quizzes/', quizData)

      console.log('Quiz created successfully:', response.data)

      // Don't add to state manually, let fetchQuizzes handle it
      setShowCreateQuiz(false)
      setShowQuizEditor(false)
      setQuizQuestions([])
      resetQuizForm()
      toast.success('Quiz created successfully')

      // Refresh quizzes list from server
      await fetchQuizzes()
    } catch (error: any) {
      console.error('Failed to create quiz:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)

      if (error.response?.status === 401) {
        toast.error('⚠️ You need to be logged in. Please refresh the page and log in again.')
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else if (error.response?.status === 400) {
        const errorData = error.response.data
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value[0] : value}`)
          .join(', ')
        toast.error(`Validation error: ${errorMessages}`)
      } else {
        toast.error(error.response?.data?.error || error.response?.data?.detail || 'Failed to create quiz')
      }
    } finally {
      setCreatingQuiz(false)
    }
  }

  const resetPathForm = () => {
    setPathForm({
      name: '',
      description: '',
      program_type: 'bsit',
      difficulty_level: 'beginner',
      estimated_duration: 4,
      max_modules: 0,
      points_reward: 100,
      is_active: true,
      is_featured: false
    })
  }

  const resetModuleForm = () => {
    setModuleForm({
      career_path: '',
      title: '',
      description: '',
      module_type: 'text',
      difficulty_level: 'beginner',
      content: '',
      duration_minutes: 30,
      points_reward: 10,
      order: 0,
      is_locked: false
    })
  }

  const resetQuizForm = () => {
    setQuizForm({
      learning_module: '',
      title: '',
      description: '',
      content: '',
      time_limit_minutes: 30,
      passing_score: 70,
      max_attempts: 3,
      randomize_questions: true
    })
  }

  const togglePathStatus = async (id: string) => {
    try {
      console.log('Toggling status for path ID:', id)

      if (!id || id === 'undefined') {
        toast.error('Invalid path ID')
        return
      }

      const response = await api.post(`/learning/admin/career-paths/${id}/publish/`)

      // Refresh the paths list to get updated data
      await fetchLearningData()

      toast.success(response.data.message || 'Path status updated successfully')
    } catch (error: any) {
      console.error('Toggle path status error:', error)
      toast.error(error.response?.data?.error || 'Failed to toggle status')
    }
  }

  // Filter modules based on selected path
  const filteredModules = selectedPathId
    ? modules.filter((m: any) => m.career_path === selectedPathId)
    : modules

  const statCards = [
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'from-blue-500 to-blue-600' },
    { icon: UserCheck, label: 'Students', value: stats.totalStudents, color: 'from-green-500 to-green-600' },
    { icon: Shield, label: 'Instructors', value: stats.totalInstructors, color: 'from-purple-500 to-purple-600' },
    { icon: BookOpen, label: 'Courses', value: stats.totalCourses, color: 'from-yellow-500 to-yellow-600' },
    { icon: GitBranch, label: 'Projects', value: stats.totalProjects, color: 'from-indigo-500 to-indigo-600' },
    { icon: Trophy, label: 'Competitions', value: stats.activeCompetitions, color: 'from-red-500 to-red-600' },
    { icon: MessageSquare, label: 'Posts', value: stats.communityPosts, color: 'from-pink-500 to-pink-600' },
    { icon: Brain, label: 'AI Sessions', value: stats.aiInteractions, color: 'from-cyan-500 to-cyan-600' }
  ]

  const managementSections = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'learning', label: 'Learning Admin', icon: BookOpen },
    { id: 'projects', label: 'Project Admin', icon: Briefcase },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'content', label: 'Content Moderation', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: Settings }
  ]

  const learningAdminSections = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'paths', label: 'Career Paths', icon: BookOpen },
    { id: 'modules', label: 'Modules', icon: FileText },
    { id: 'quizzes', label: 'Quizzes', icon: Award },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ]

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      <Navbar />

      {/* Admin Header - Responsive */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            Admin Dashboard
          </h1>
          <p className="text-red-100 mt-1 sm:mt-2 text-sm sm:text-base">System administration and management panel</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Quick Actions - Scrollable on mobile */}
        <div className="mb-6 sm:mb-8 overflow-x-auto scrollbar-hide touch-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 sm:gap-4 min-w-max sm:min-w-0 sm:flex-wrap">
            {managementSections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base ${activeTab === section.id
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                    }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{section.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 sm:p-4 md:p-6 animate-pulse shadow-lg">
                    <div className="h-8 sm:h-10 md:h-12 bg-slate-700 rounded mb-3 sm:mb-4"></div>
                    <div className="h-6 sm:h-8 bg-slate-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </>
        )}

        {activeTab === 'users' && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">User Management</h2>

            {/* User Search and Filters */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearchTerm}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value)
                      filterUsers(e.target.value, userRoleFilter, userProgramFilter)
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value)
                  filterUsers(userSearchTerm, e.target.value, userProgramFilter)
                }}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="">All Roles</option>
                <option value="student">Students</option>
                <option value="instructor">Instructors</option>
                <option value="admin">Admins</option>
              </select>
              <select
                value={userProgramFilter}
                onChange={(e) => {
                  setUserProgramFilter(e.target.value)
                  filterUsers(userSearchTerm, userRoleFilter, e.target.value)
                }}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="">All Programs</option>
                <option value="BSIT">BSIT</option>
                <option value="BSCS">BSCS</option>
                <option value="BSIS">BSIS</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(userSearchTerm || userRoleFilter || userProgramFilter ? filteredUsers : users).map((user) => (
                    <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium text-white">{user.username}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.program || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeUserRole(user.id, e.target.value)}
                          className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                          }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleUserStatus(user.id)}
                            className={`p-1.5 rounded transition flex items-center gap-1 text-xs ${user.is_active
                              ? 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'
                              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                              }`}
                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            <Power size={16} />
                            <span className="hidden sm:inline">{user.is_active ? 'Deactivate' : 'Activate'}</span>
                          </button>
                          {isUserDeleteEnabled && (
                            <button
                              onClick={() => openDeleteModal(user.id, user.username)}
                              className="p-1.5 rounded transition flex items-center gap-1 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30"
                              title="Delete User Permanently"
                            >
                              <Trash2 size={16} />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(userSearchTerm || userRoleFilter || userProgramFilter ? filteredUsers : users).length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  No users found matching your criteria
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <ContentModeration />
        )}

        {activeTab === 'learning' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Learning Admin Header - Responsive */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Learning Administration</h2>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                {learningView === 'paths' && (
                  <button
                    onClick={() => setShowCreatePath(true)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden xs:inline">Create</span> Path
                  </button>
                )}
                {learningView === 'modules' && (
                  <button
                    onClick={() => setShowCreateModule(true)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden xs:inline">Create</span> Module
                  </button>
                )}
                {learningView === 'quizzes' && (
                  <button
                    onClick={() => setShowCreateQuiz(true)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden xs:inline">Create</span> Quiz
                  </button>
                )}
              </div>
            </div>

            {/* Learning Admin Sub-Navigation - Scrollable on mobile */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 shadow-lg min-w-max sm:min-w-0">
                {learningAdminSections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setLearningView(section.id)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md transition-colors whitespace-nowrap ${learningView === section.id
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{section.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Learning Admin Content */}
            {learningView === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg hover:border-slate-600/50 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-8 h-8 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Career Paths</h3>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{paths.length}</p>
                  <p className="text-slate-400 text-sm">Active learning paths</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg hover:border-slate-600/50 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-8 h-8 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Modules</h3>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{modules.length}</p>
                  <p className="text-slate-400 text-sm">Learning modules</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg hover:border-slate-600/50 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="w-8 h-8 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Quizzes</h3>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{quizzes.length}</p>
                  <p className="text-slate-400 text-sm">Assessment quizzes</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg hover:border-slate-600/50 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-8 h-8 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">Enrollments</h3>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{stats.totalCourses}</p>
                  <p className="text-slate-400 text-sm">Total enrollments</p>
                </div>
              </div>
            )}

            {learningView === 'paths' && (
              <div className="space-y-6">
                {/* Search and Filters */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Search career paths..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={filterProgram}
                        onChange={(e) => setFilterProgram(e.target.value)}
                        className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      >
                        <option value="">All Programs</option>
                        <option value="bsit">BSIT</option>
                        <option value="bscs">BSCS</option>
                        <option value="general">General</option>
                      </select>
                      <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      >
                        <option value="">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                      <button
                        onClick={fetchLearningData}
                        className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>

                {/* Paths List - Enhanced UI */}
                <div className="space-y-3 sm:space-y-4">
                  {paths.map((path: any) => {
                    // Count modules for this path
                    const pathModuleCount = modules.filter((m: any) => m.career_path === path.id).length

                    return (
                      <div key={path.id} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 sm:p-6 hover:border-purple-500/30 transition-all duration-300 group">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                              {/* Path Icon */}
                              <span className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-white" />
                              </span>
                              <h3 className="text-lg sm:text-xl font-semibold text-white truncate group-hover:text-purple-300 transition-colors">{path.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 border ${path.is_active
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                                }`}>
                                {path.is_active ? '✓ Active' : '✗ Inactive'}
                              </span>
                              {path.is_featured && (
                                <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  ⭐ Featured
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 mb-3 text-sm sm:text-base line-clamp-2 ml-12">{path.description}</p>
                            <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm ml-12">
                              {/* Program Type */}
                              <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg border border-blue-500/30">
                                🎓 {path.program_type?.toUpperCase() || 'General'}
                              </span>
                              {/* Difficulty */}
                              <span className={`px-3 py-1 rounded-lg border ${path.difficulty_level === 'advanced'
                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                : path.difficulty_level === 'intermediate'
                                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                  : 'bg-green-500/20 text-green-300 border-green-500/30'
                                }`}>
                                📊 {path.difficulty_level || 'Beginner'}
                              </span>
                              {/* Duration */}
                              <span className="bg-slate-700/50 text-slate-300 px-3 py-1 rounded-lg">
                                📅 {path.estimated_duration || 4} weeks
                              </span>
                              {/* Module Count */}
                              <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg border border-purple-500/30">
                                📚 {pathModuleCount} modules
                              </span>
                              {/* Points */}
                              {path.points_reward && (
                                <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg border border-amber-500/30">
                                  ⭐ {path.points_reward}pts
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                // View modules for this path
                                setSelectedPathId(path.id)
                                setLearningView('modules')
                              }}
                              className="p-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 rounded-lg transition border border-purple-500/30"
                              title="View Modules"
                              type="button"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleEditPath(path)
                              }}
                              className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg transition border border-blue-500/30"
                              title="Edit Path"
                              type="button"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (path.id) togglePathStatus(path.id)
                                else toast.error('Path ID is missing')
                              }}
                              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition border border-slate-600"
                              title="Toggle Status"
                            >
                              <Settings className="w-4 h-4 text-slate-300" />
                            </button>
                            <button
                              onClick={() => {
                                if (path.id) handleDeletePath(path.id)
                                else toast.error('Path ID is missing')
                              }}
                              className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg transition border border-red-500/30"
                              title="Delete Path"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {paths.length === 0 && (
                    <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                      <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                      <p className="text-slate-400 mb-2">No career paths found.</p>
                      <p className="text-slate-500 text-sm">Get started by creating your first learning path!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {learningView === 'modules' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Module Search and Filters - Responsive */}
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 sm:p-6">
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                      <input
                        type="text"
                        placeholder="Search modules..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-white text-sm sm:text-base"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <select
                        value={selectedPathId}
                        onChange={(e) => setSelectedPathId(e.target.value)}
                        className="flex-1 px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm sm:text-base"
                      >
                        <option value="">All Paths</option>
                        {paths.map((path: any) => (
                          <option key={path.id} value={path.id}>{path.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={fetchModules}
                        className="px-4 sm:px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modules List - Enhanced UI */}
                <div className="space-y-3 sm:space-y-4">
                  {filteredModules.map((module: any) => (
                    <div key={module.id} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 sm:p-6 hover:border-blue-500/30 transition-all duration-300 group">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {/* Module Order Badge */}
                            <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                              {module.order || 1}
                            </span>
                            <h3 className="text-lg sm:text-xl font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{module.title}</h3>
                            {module.is_locked && (
                              <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                                🔒 Locked
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 mb-3 text-sm sm:text-base line-clamp-2 ml-11">{module.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs sm:text-sm ml-11">
                            {/* Career Path */}
                            <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg border border-purple-500/30 truncate max-w-[150px]">
                              📚 {module.career_path_name}
                            </span>
                            {/* Module Type */}
                            <span className={`px-2 py-1 rounded-lg border ${module.module_type === 'video'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : module.module_type === 'quiz'
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}>
                              {module.module_type === 'video' ? '🎬' : module.module_type === 'quiz' ? '📝' : '📖'} {module.module_type}
                            </span>
                            {/* Difficulty */}
                            <span className={`px-2 py-1 rounded-lg border ${module.difficulty_level === 'advanced'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : module.difficulty_level === 'intermediate'
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                : 'bg-green-500/20 text-green-300 border-green-500/30'
                              }`}>
                              {module.difficulty_level}
                            </span>
                            {/* Duration */}
                            <span className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded-lg">
                              ⏱️ {module.duration_minutes}min
                            </span>
                            {/* Points */}
                            <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/30">
                              ⭐ {module.points_reward}pts
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleEditModule(module)
                            }}
                            className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg transition border border-blue-500/30"
                            title="Edit Module"
                            type="button"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteModule(module.id)}
                            className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg transition border border-red-500/30"
                            title="Delete Module"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredModules.length === 0 && (
                    <div className="text-center py-8 sm:py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                      <FileText className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                      <p className="text-slate-400 text-sm sm:text-base mb-2">
                        {selectedPathId ? 'No modules found for this path.' : 'No modules found.'}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {selectedPathId ? 'Try selecting a different path or create a new module.' : 'Get started by creating your first module!'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {learningView === 'quizzes' && (
              <div className="space-y-3 sm:space-y-4">
                {quizzes.map((quiz: any) => (
                  <div key={quiz.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 truncate">{quiz.title}</h3>
                        <p className="text-slate-400 mb-3 text-sm sm:text-base line-clamp-2">{quiz.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-slate-500">
                          <span className="bg-slate-700/50 px-2 py-1 rounded">{quiz.time_limit_minutes}m</span>
                          <span className="bg-slate-700/50 px-2 py-1 rounded">{quiz.passing_score}% pass</span>
                          <span className="bg-slate-700/50 px-2 py-1 rounded">{quiz.max_attempts} attempts</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleEditQuiz(quiz)
                          }}
                          className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition"
                          title="Edit Quiz"
                          type="button"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition"
                          title="Delete Quiz"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {quizzes.length === 0 && (
                  <div className="text-center py-8 sm:py-12 text-slate-400 text-sm sm:text-base">
                    No quizzes found.
                  </div>
                )}
              </div>
            )}

            {learningView === 'analytics' && (
              <LearningAnalytics />
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Project Admin</h2>
            <ProjectAdmin />
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Modules Management</h2>
            <div className="space-y-4">
              {modules.map((module: any) => (
                <div key={module.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{module.title}</h3>
                      <p className="text-slate-400 mb-3">{module.description}</p>
                      <div className="flex gap-4 text-sm text-slate-500">
                        <span>Duration: {module.duration_minutes} min</span>
                        <span>Points: {module.points_reward}</span>
                        <span>Type: {module.module_type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {modules.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  No modules found.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Content Moderation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-slate-400 text-sm">Total Posts</p>
                <p className="text-2xl font-bold text-white">{stats.communityPosts}</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-slate-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AdminAnalytics />
        )}

        {activeTab === 'settings' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">System Settings</h2>
            <p className="text-slate-400">System configuration coming soon</p>
          </div>
        )}

        {/* Create Path Modal */}
        {showCreatePath && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Create New Career Path</h3>
                <button
                  onClick={() => setShowCreatePath(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); createCareerPath(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Path Name</label>
                  <input
                    type="text"
                    value={pathForm.name}
                    onChange={(e) => setPathForm({ ...pathForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="Enter a unique career path name..."
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    ⚠️ Path name must be unique. Choose a distinctive name to avoid conflicts.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={pathForm.description}
                    onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Program Type</label>
                    <select
                      value={pathForm.program_type}
                      onChange={(e) => setPathForm({ ...pathForm, program_type: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="bsit">BSIT</option>
                      <option value="bscs">BSCS</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty Level</label>
                    <select
                      value={pathForm.difficulty_level}
                      onChange={(e) => setPathForm({ ...pathForm, difficulty_level: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Duration (weeks)</label>
                    <input
                      type="number"
                      value={pathForm.estimated_duration}
                      onChange={(e) => setPathForm({ ...pathForm, estimated_duration: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Max Modules</label>
                    <input
                      type="number"
                      value={pathForm.max_modules}
                      onChange={(e) => setPathForm({ ...pathForm, max_modules: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      min="0"
                      placeholder="0 = unlimited"
                    />
                    <p className="text-xs text-slate-400 mt-1">0 = unlimited</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Points Reward</label>
                    <input
                      type="number"
                      value={pathForm.points_reward}
                      onChange={(e) => setPathForm({ ...pathForm, points_reward: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Certificate Template (Optional)
                    <span className="text-xs text-slate-400 ml-2">- Awarded when all modules are completed</span>
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Upload certificate template (PDF, PNG, JPG)</p>
                  {certificateFile && (
                    <p className="text-sm text-green-400 mt-1">Selected: {certificateFile.name}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={pathForm.is_active}
                      onChange={(e) => setPathForm({ ...pathForm, is_active: e.target.checked })}
                      className="rounded bg-slate-700 border-slate-600 text-purple-600"
                    />
                    Active
                  </label>

                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={pathForm.is_featured}
                      onChange={(e) => setPathForm({ ...pathForm, is_featured: e.target.checked })}
                      className="rounded bg-slate-700 border-slate-600 text-purple-600"
                    />
                    Featured
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
                  >
                    Create Path
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePath(false)}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Module Modal - Rich Text Editor */}
        {showCreateModule && (
          <ModuleFormWithEditor
            careerPaths={paths}
            onClose={() => setShowCreateModule(false)}
            onSuccess={() => {
              fetchModules()
              setShowCreateModule(false)
            }}
          />
        )}

        {/* OLD CREATE MODULE MODAL - REMOVE THIS ENTIRE SECTION IF NEW EDITOR WORKS
        {showCreateModule && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Create New Module (OLD)</h3>
                <button
                  onClick={() => setShowCreateModule(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); createModule(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Career Path</label>
                  <select
                    value={moduleForm.career_path}
                    onChange={(e) => setModuleForm({...moduleForm, career_path: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  >
                    <option value="">Select a career path</option>
                    {paths.map((path: any) => (
                      <option key={path.id} value={path.id}>{path.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Module Title</label>
                  <input
                    type="text"
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm({...moduleForm, title: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({...moduleForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
                  <textarea
                    value={moduleForm.content}
                    onChange={(e) => setModuleForm({...moduleForm, content: e.target.value})}
                    rows={5}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Module content in markdown format..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Upload Learning Material</label>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (file) {
                        // Validate file size (max 10MB)
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('File size must be less than 10MB')
                          e.target.value = ''
                          return
                        }
                        
                        // Validate file type
                        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain']
                        if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.md')) {
                          toast.error('Invalid file type. Please upload PDF, DOCX, MD, or TXT files.')
                          e.target.value = ''
                          return
                        }
                        
                        setUploadFile(file)
                        console.log('File selected:', file.name, file.type, file.size)
                      } else {
                        setUploadFile(null)
                      }
                    }}
                    accept=".pdf,.docx,.md,.txt"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  
                  {uploadFile ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-green-600/10 border border-green-500/30 rounded-lg">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <p className="text-sm text-green-400">
                          Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)}MB)
                        </p>
                      </div>
                      
                      <div className="p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                        <p className="text-xs font-semibold text-blue-400 mb-1">🤖 AI Processing Enabled:</p>
                        <ul className="text-xs text-blue-300 space-y-1">
                          <li>• Auto-extract content from your file</li>
                          <li>• Generate interactive learning slides</li>
                          <li>• Create structured lesson flow</li>
                          <li>• Add study notes and summaries</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-slate-400">Supported: PDF, DOCX, MD, TXT (Max 10MB)</p>
                      <div className="p-3 bg-purple-600/10 border border-purple-500/30 rounded-lg">
                        <p className="text-xs font-semibold text-purple-400 mb-1">💡 Smart Features:</p>
                        <ul className="text-xs text-purple-300 space-y-1">
                          <li>• Upload any document - AI will process it automatically</li>
                          <li>• Or manually type content in the field above</li>
                          <li>• Files are converted to interactive learning modules</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Module Type</label>
                    <select
                      value={moduleForm.module_type}
                      onChange={(e) => setModuleForm({...moduleForm, module_type: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="text">Text</option>
                      <option value="video">Video</option>
                      <option value="interactive">Interactive</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Duration (mins)</label>
                    <input
                      type="number"
                      value={moduleForm.duration_minutes}
                      onChange={(e) => setModuleForm({...moduleForm, duration_minutes: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      min="1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Points</label>
                    <input
                      type="number"
                      value={moduleForm.points_reward}
                      onChange={(e) => setModuleForm({...moduleForm, points_reward: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      min="1"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                  >
                    Create Module
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModule(false)}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        */}

        {/* Create Quiz Modal */}
        {showCreateQuiz && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Create New Quiz</h3>
                <button
                  onClick={() => setShowCreateQuiz(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Learning Module</label>
                  <select
                    value={quizForm.learning_module}
                    onChange={(e) => setQuizForm({ ...quizForm, learning_module: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  >
                    <option value="">Select a module</option>
                    {modules.map((module: any) => (
                      <option key={module.id} value={module.id}>{module.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Quiz Title</label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Time Limit (mins)</label>
                    <input
                      type="number"
                      value={quizForm.time_limit_minutes}
                      onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Passing Score (%)</label>
                    <input
                      type="number"
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Attempts</label>
                  <input
                    type="number"
                    value={quizForm.max_attempts}
                    onChange={(e) => setQuizForm({ ...quizForm, max_attempts: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={quizForm.randomize_questions}
                      onChange={(e) => setQuizForm({ ...quizForm, randomize_questions: e.target.checked })}
                      className="rounded bg-slate-700 border-slate-600 text-green-600"
                    />
                    Randomize Questions
                  </label>
                </div>

                {/* Quiz Editor Toggle */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowQuizEditor(!showQuizEditor)
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold"
                  >
                    {showQuizEditor ? '📝 Hide Question Editor' : '✨ Create Questions (Multiple Choice, T/F, Essay)'}
                  </button>
                </div>

                {/* Quiz Editor Section */}
                {showQuizEditor && (
                  <div className="pt-6">
                    <QuizEditor
                      initialQuestions={quizQuestions}
                      onSave={handleQuizQuestionsChange}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={createQuiz}
                    disabled={creatingQuiz}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg transition font-semibold flex items-center justify-center gap-2"
                  >
                    {creatingQuiz ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Quiz'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateQuiz(false)
                      setShowQuizEditor(false)
                      setQuizQuestions([])
                    }}
                    disabled={creatingQuiz}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Path Modal */}
        {showEditPath && editingPath && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Edit Career Path</h3>
                <button onClick={() => setShowEditPath(false)} className="text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); updateCareerPath(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Path Name</label>
                  <input
                    type="text"
                    value={pathForm.name}
                    onChange={(e) => setPathForm({ ...pathForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={pathForm.description}
                    onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Program Type</label>
                    <select
                      value={pathForm.program_type}
                      onChange={(e) => setPathForm({ ...pathForm, program_type: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="bsit">BSIT</option>
                      <option value="bscs">BSCS</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty Level</label>
                    <select
                      value={pathForm.difficulty_level}
                      onChange={(e) => setPathForm({ ...pathForm, difficulty_level: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Duration (weeks)</label>
                    <input
                      type="number"
                      value={pathForm.estimated_duration}
                      onChange={(e) => setPathForm({ ...pathForm, estimated_duration: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Max Modules</label>
                    <input
                      type="number"
                      value={pathForm.max_modules}
                      onChange={(e) => setPathForm({ ...pathForm, max_modules: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      min="0"
                      placeholder="0 = unlimited"
                    />
                    <p className="text-xs text-slate-400 mt-1">0 = unlimited</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Points Reward</label>
                    <input
                      type="number"
                      value={pathForm.points_reward}
                      onChange={(e) => setPathForm({ ...pathForm, points_reward: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Certificate Template
                    <span className="text-xs text-slate-400 ml-2">- Awarded when all modules completed</span>
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                  {editingPath?.certificate_template && (
                    <p className="text-xs text-green-400 mt-1">Current: {editingPath.certificate_template.split('/').pop()}</p>
                  )}
                  {certificateFile && (
                    <p className="text-xs text-blue-400 mt-1">New file: {certificateFile.name}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={pathForm.is_active}
                      onChange={(e) => setPathForm({ ...pathForm, is_active: e.target.checked })}
                      className="rounded bg-slate-700 border-slate-600 text-purple-600"
                    />
                    Active
                  </label>

                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={pathForm.is_featured}
                      onChange={(e) => setPathForm({ ...pathForm, is_featured: e.target.checked })}
                      className="rounded bg-slate-700 border-slate-600 text-purple-600"
                    />
                    Featured
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                  >
                    Update Path
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditPath(false)}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Module Modal - Full Editor */}
        {showEditModule && editingModule && (
          <ModuleFormWithEditor
            careerPaths={paths}
            editingModule={editingModule}
            onClose={() => {
              setShowEditModule(false)
              setEditingModule(null)
            }}
            onSuccess={() => {
              fetchModules()
              setShowEditModule(false)
              setEditingModule(null)
            }}
          />
        )}

        {/* Edit Quiz Modal */}
        {showEditQuiz && editingQuiz && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Edit Quiz</h3>
                <button onClick={() => setShowEditQuiz(false)} className="text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Learning Module</label>
                  <select
                    value={quizForm.learning_module}
                    onChange={(e) => setQuizForm({ ...quizForm, learning_module: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  >
                    <option value="">Select a module</option>
                    {modules.map((module: any) => (
                      <option key={module.id} value={module.id}>{module.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Quiz Title</label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Time Limit (min)</label>
                    <input
                      type="number"
                      value={quizForm.time_limit_minutes}
                      onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Passing Score (%)</label>
                    <input
                      type="number"
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      min="0"
                      max="100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Max Attempts</label>
                    <input
                      type="number"
                      value={quizForm.max_attempts}
                      onChange={(e) => setQuizForm({ ...quizForm, max_attempts: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={quizForm.randomize_questions}
                      onChange={(e) => setQuizForm({ ...quizForm, randomize_questions: e.target.checked })}
                      className="rounded bg-slate-700 border-slate-600 text-green-600"
                    />
                    Randomize Questions
                  </label>
                </div>

                {/* Quiz Editor Toggle */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowQuizEditor(!showQuizEditor)
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold"
                  >
                    {showQuizEditor ? '📝 Hide Question Editor' : '✨ Create Questions (Multiple Choice, T/F, Essay)'}
                  </button>
                </div>

                {/* Quiz Editor Section */}
                {showQuizEditor && (
                  <div className="pt-6">
                    <QuizEditor
                      initialQuestions={quizQuestions}
                      onSave={handleQuizQuestionsChange}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={updateQuiz}
                    disabled={updatingQuiz}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition font-semibold flex items-center justify-center gap-2"
                  >
                    {updatingQuiz ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      'Update Quiz'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditQuiz(false)
                      setShowQuizEditor(false)
                      setQuizQuestions([])
                    }}
                    disabled={updatingQuiz}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete User Confirmation Modal - Minimal Design */}
      {deleteModal.isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon & Title - Centered */}
            <div className="pt-8 pb-4 px-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-1">Delete User?</h3>
              <p className="text-slate-400 text-sm">
                This will permanently remove <span className="text-white font-medium">{deleteModal.username}</span>
              </p>
            </div>

            {/* Buttons */}
            <div className="p-4 bg-slate-800/50 flex gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-xl transition-all font-medium flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard