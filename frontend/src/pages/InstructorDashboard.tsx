import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, BookOpen, ClipboardCheck, Award, TrendingUp,
  Calendar, FileText, Video, MessageCircle, Settings,
  PlusCircle, BarChart2, Clock, CheckCircle, GraduationCap, Wand2,
  Eye, ChevronRight, RefreshCw, Edit, Trash2, Play, X, Save, Upload, Home, Radio, Filter, Loader2, Copy, Link
} from 'lucide-react'
import DashboardLayout, { SidenavItem } from '../components/layout/DashboardLayout'
import PDFContentExtractor from '../components/PDFContentExtractor'
import ModuleFormWithEditor from '../components/ModuleFormWithEditor'
import QuizEditor from '../components/QuizEditor'
import LiveQuizQuestionEditor from '../components/LiveQuizQuestionEditor'
import api from '../services/api'
import liveQuizService, { LiveQuiz, CreateLiveQuizData } from '../services/liveQuizService'
import { useCurrentUser } from '../hooks/useApiCache'
import toast from 'react-hot-toast'
import { getMediaUrl } from '../utils/mediaUrl'

interface CareerPath {
  id: string
  name: string
  slug: string
  program_type: string
  difficulty_level: string
  is_active: boolean
  total_modules: number
  enrolled_count: number
  completed_count: number
  created_at: string
}

interface EnrolledStudent {
  id: string
  username: string
  email: string
  full_name: string
  profile_picture: string | null
  enrollment_id: string
  enrolled_at: string
  status: string
  progress_percentage: number
  completed_modules: number
  total_modules: number
  completed_at: string | null
}

interface RecentEnrollment {
  id: string
  student_name: string
  student_email: string
  career_path_name: string
  enrolled_at: string
  progress: number
  status: string
}

interface DashboardStats {
  total_paths: number
  active_paths: number
  total_modules: number
  total_quizzes: number
  total_enrollments: number
  completed_enrollments: number
  total_certificates: number
  avg_completion_rate: number
}

function InstructorDashboard() {
  const navigate = useNavigate()
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([])
  const [recentEnrollments, setRecentEnrollments] = useState<RecentEnrollment[]>([])
  const [selectedPathStudents, setSelectedPathStudents] = useState<EnrolledStudent[]>([])
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null)
  const [selectedPathName, setSelectedPathName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    total_paths: 0,
    active_paths: 0,
    total_modules: 0,
    total_quizzes: 0,
    total_enrollments: 0,
    completed_enrollments: 0,
    total_certificates: 0,
    avg_completion_rate: 0
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [showPDFExtractor, setShowPDFExtractor] = useState(false)
  const [learningStats, setLearningStats] = useState({
    careerPaths: 0,
    modules: 0,
    quizzes: 0
  })

  // Learning Admin specific states
  const [learningView, setLearningView] = useState('overview')
  const [paths, setPaths] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [showCreatePath, setShowCreatePath] = useState(false)
  const [showCreateModule, setShowCreateModule] = useState(false)
  const [showCreateQuiz, setShowCreateQuiz] = useState(false)
  const [showCreateLiveQuiz, setShowCreateLiveQuiz] = useState(false)
  const [showQuizEditor, setShowQuizEditor] = useState(false)
  const [showEditPath, setShowEditPath] = useState(false)
  const [showEditModule, setShowEditModule] = useState(false)
  const [showEditQuiz, setShowEditQuiz] = useState(false)
  const [creatingQuiz, setCreatingQuiz] = useState(false)
  const [updatingQuiz, setUpdatingQuiz] = useState(false)
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
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [filterPathId, setFilterPathId] = useState('')
  // Student filter/sort/search states
  const [studentSearch, setStudentSearch] = useState('')
  const [studentSortBy, setStudentSortBy] = useState<'name' | 'progress' | 'enrolled' | 'status'>('progress')
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('desc')
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'active' | 'completed' | 'inactive'>('all')
  const [filterModuleId, setFilterModuleId] = useState('')

  // Search and filter states for Learning Administration
  const [pathSearch, setPathSearch] = useState('')
  const [pathProgramFilter, setPathProgramFilter] = useState<string>('all')
  const [pathStatusFilter, setPathStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [pathDifficultyFilter, setPathDifficultyFilter] = useState<string>('all')

  const [moduleSearch, setModuleSearch] = useState('')
  const [moduleTypeFilter, setModuleTypeFilter] = useState<string>('all')
  const [moduleDifficultyFilter, setModuleDifficultyFilter] = useState<string>('all')

  const [quizSearch, setQuizSearch] = useState('')
  const [quizModuleFilter, setQuizModuleFilter] = useState<string>('all')
  const [quizPathFilter, setQuizPathFilter] = useState<string>('all')

  // Live Quiz pagination
  const [liveQuizPage, setLiveQuizPage] = useState(1)
  const liveQuizzesPerPage = 9 // 3x3 grid on desktop, responsive on mobile

  // Live Quiz states
  const [liveQuizzes, setLiveQuizzes] = useState<LiveQuiz[]>([])
  const [selectedLiveQuiz, setSelectedLiveQuiz] = useState<LiveQuiz | null>(null)
  const [showQuizTransition, setShowQuizTransition] = useState(false)
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)
  // Student Management - Path Search (reusing existing pathSearch, pathProgramFilter, pathStatusFilter)
  const [pathSearchQuery, setPathSearchQuery] = useState('')

  // Student Management - Recent Enrollments Filters
  const [enrollmentSearchQuery, setEnrollmentSearchQuery] = useState('')
  const [enrollmentPathFilter, setEnrollmentPathFilter] = useState('all')

  const [liveQuizForm, setLiveQuizForm] = useState<CreateLiveQuizData>({
    title: '',
    description: '',
    max_participants: 100,
    default_question_time: 30,
    show_leaderboard: true,
    show_correct_answers: true,
    require_fullscreen: true,
    allow_late_join: false,
    shuffle_questions: false,
    shuffle_answers: false,
    auto_pause_on_exit: true,
    max_violations: 3,
    violation_penalty_points: 5
  })
  const [creatingLiveQuiz, setCreatingLiveQuiz] = useState(false)

  useEffect(() => {
    checkInstructorAccess()
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (activeTab === 'learning') {
      fetchLearningData()
    }
  }, [activeTab])

  // Fetch data when learningView changes
  useEffect(() => {
    if (activeTab === 'learning') {
      if (learningView === 'modules') {
        fetchModules()
      } else if (learningView === 'quizzes') {
        fetchQuizzes()
      }
    }
  }, [learningView, activeTab])

  // Use cached user profile for access check  
  const { data: cachedProfile } = useCurrentUser()

  const checkInstructorAccess = async () => {
    // Use cached profile first if available, otherwise will fall back to API
    if (cachedProfile) {
      if (cachedProfile.role !== 'instructor' && cachedProfile.role !== 'admin') {
        navigate('/dashboard')
      }
      return
    }
    // Fallback to API call if cache not ready yet
    try {
      const response = await api.get('/auth/profile/')
      if (response.data.role !== 'instructor' && response.data.role !== 'admin') {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Access check failed:', error)
      navigate('/login')
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/learning/admin/career-paths/instructor_dashboard/')
      const data = response.data

      setStats(data.stats || {})
      setCareerPaths(data.career_paths || [])
      setRecentEnrollments(data.recent_enrollments || [])

      // Update learning stats
      setLearningStats({
        careerPaths: data.stats?.total_paths || 0,
        modules: data.stats?.total_modules || 0,
        quizzes: data.stats?.total_quizzes || 0
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchLearningData = async () => {
    try {
      setLoading(true)

      // Fetch paths
      let pathsData: any[] = []
      try {
        const pathsRes = await api.get('/learning/admin/career-paths/')
        pathsData = pathsRes.data.results || pathsRes.data || []
      } catch {
        const pathsRes = await api.get('/learning/career-paths/')
        pathsData = pathsRes.data.results || pathsRes.data || []
      }

      // Fetch modules
      let modulesData: any[] = []
      try {
        const modulesRes = await api.get('/learning/admin/modules/')
        modulesData = modulesRes.data.results || modulesRes.data || []
      } catch {
        const modulesRes = await api.get('/learning/modules/')
        modulesData = modulesRes.data.results || modulesRes.data || []
      }

      // Fetch quizzes
      let quizzesData: any[] = []
      try {
        const quizzesRes = await api.get('/learning/quizzes/')
        quizzesData = quizzesRes.data.results || quizzesRes.data || []
      } catch {
        quizzesData = []
      }

      setPaths(pathsData)
      setModules(modulesData)
      setQuizzes(quizzesData)

      setLearningStats({
        careerPaths: pathsData.length,
        modules: modulesData.length,
        quizzes: quizzesData.length
      })
    } catch (error) {
      console.error('Failed to fetch learning data:', error)
    } finally {
      setLoading(false)
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
      const response = await api.get('/learning/quizzes/')
      setQuizzes(response.data.results || response.data || [])
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
      setQuizzes([])
    }
  }

  const fetchEnrolledStudents = async (pathId: string, pathName: string) => {
    try {
      setLoadingStudents(true)
      setSelectedPathId(pathId)
      setSelectedPathName(pathName)

      const response = await api.get(`/learning/admin/career-paths/${pathId}/enrolled_students/`)
      setSelectedPathStudents(response.data.students || [])
      // Switch to Students tab to show the results
      setActiveTab('students')
    } catch (error) {
      console.error('Failed to fetch enrolled students:', error)
      toast.error('Failed to load students')
      setSelectedPathStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  // CRUD Functions for Career Paths
  const createCareerPath = async () => {
    try {
      console.log('Creating path with data:', pathForm)

      let response
      if (certificateFile) {
        const formData = new FormData()
        Object.entries(pathForm).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
        formData.append('certificate_template', certificateFile)
        console.log('Sending FormData with certificate')
        response = await api.post('/learning/admin/career-paths/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        console.log('Sending JSON:', pathForm)
        response = await api.post('/learning/admin/career-paths/', pathForm)
      }
      console.log('Path created successfully:', response.data)
      await fetchLearningData()
      setShowCreatePath(false)
      resetPathForm()
      setCertificateFile(null)
      toast.success('Career path created successfully')
    } catch (error: any) {
      console.error('Create path error:', error)
      console.error('Error response data:', error.response?.data)

      // Show detailed error message
      if (error.response?.data) {
        const errorData = error.response.data
        if (errorData.slug) {
          toast.error('A career path with this name already exists')
        } else if (errorData.error) {
          toast.error(errorData.error)
        } else if (errorData.details) {
          // Show validation details
          const details = typeof errorData.details === 'object'
            ? JSON.stringify(errorData.details)
            : errorData.details
          toast.error(`Validation error: ${details}`)
        } else {
          // Show all error fields
          const errorMsg = Object.entries(errorData)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val[0] : val}`)
            .join(', ')
          toast.error(errorMsg || 'Failed to create career path')
        }
      } else {
        toast.error('Failed to create career path')
      }
    }
  }

  const handleDeletePath = async (pathId: string) => {
    if (!confirm('Are you sure you want to delete this path?')) return
    try {
      await api.delete(`/learning/admin/career-paths/${pathId}/`)
      await fetchLearningData()
      toast.success('Path deleted successfully')
    } catch (error) {
      console.error('Failed to delete path:', error)
      toast.error('Failed to delete path')
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

  // CRUD Functions for Modules
  const createModule = async () => {
    try {
      let response
      if (uploadFile) {
        const formData = new FormData()
        Object.entries(moduleForm).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            formData.append(key, String(value))
          }
        })
        formData.append('file', uploadFile)
        formData.append('auto_generate_content', 'true')
        const processingToast = toast.loading('Processing file...')
        response = await api.post('/learning/admin/modules/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000
        })
        toast.dismiss(processingToast)
        toast.success('Module created with uploaded content!')
      } else {
        response = await api.post('/learning/admin/modules/', moduleForm)
        toast.success('Module created successfully')
      }
      await fetchLearningData()
      setShowCreateModule(false)
      resetModuleForm()
      setUploadFile(null)
    } catch (error: any) {
      console.error('Create module error:', error)
      toast.error(error.response?.data?.error || 'Failed to create module')
    }
  }

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return
    try {
      await api.delete(`/learning/admin/modules/${moduleId}/`)
      await fetchModules()
      toast.success('Module deleted successfully')
    } catch (error) {
      console.error('Failed to delete module:', error)
      toast.error('Failed to delete module')
    }
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

  // CRUD Functions for Quizzes
  const createQuiz = async () => {
    // Prevent duplicate submissions
    if (creatingQuiz) return

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

      await api.post('/learning/quizzes/', {
        ...quizForm,
        questions: quizQuestions
      })
      await fetchQuizzes()
      setShowCreateQuiz(false)
      setShowQuizEditor(false)
      resetQuizForm()
      toast.success('Quiz created successfully')
    } catch (error: any) {
      console.error('Create quiz error:', error)
      if (error.response?.status === 400) {
        const errorData = error.response.data
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value[0] : value}`)
          .join(', ')
        toast.error(`Validation error: ${errorMessages}`)
      } else {
        toast.error(error.response?.data?.error || 'Failed to create quiz')
      }
    } finally {
      setCreatingQuiz(false)
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return
    try {
      await api.delete(`/learning/quizzes/${quizId}/`)
      await fetchQuizzes()
      toast.success('Quiz deleted successfully')
    } catch (error) {
      console.error('Failed to delete quiz:', error)
      toast.error('Failed to delete quiz')
    }
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
    setQuizQuestions([])
  }

  // Live Quiz Functions
  const fetchLiveQuizzes = async () => {
    try {
      const data = await liveQuizService.getQuizzes()
      setLiveQuizzes(data)
    } catch (error: any) {
      console.error('Failed to fetch live quizzes:', error)
      toast.error('Failed to load live quizzes')
    }
  }

  const createLiveQuiz = async () => {
    if (creatingLiveQuiz) return

    if (!liveQuizForm.title) {
      toast.error('Please enter a quiz title')
      return
    }

    try {
      setCreatingLiveQuiz(true)
      const quiz = await liveQuizService.createQuiz(liveQuizForm)
      setShowCreateLiveQuiz(false)
      resetLiveQuizForm()

      // Show transition loading before opening detail view
      setShowQuizTransition(true)
      await fetchLiveQuizzes()

      // Brief delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 600))
      setShowQuizTransition(false)

      // Open detail view to add questions
      setSelectedLiveQuiz(quiz)
      toast.success('Quiz created successfully')
    } catch (error: any) {
      console.error('Failed to create live quiz:', error)
      toast.error(error.response?.data?.error || 'Failed to create live quiz')
    } finally {
      setCreatingLiveQuiz(false)
      setShowQuizTransition(false)
    }
  }

  const deleteLiveQuiz = async (id: string) => {
    if (!confirm('Are you sure you want to delete this live quiz?')) return

    try {
      await liveQuizService.deleteQuiz(id)
      toast.success('Live quiz deleted')
      await fetchLiveQuizzes()
    } catch (error: any) {
      console.error('Failed to delete live quiz:', error)
      toast.error('Failed to delete live quiz')
    }
  }

  const resetLiveQuizForm = () => {
    setLiveQuizForm({
      title: '',
      description: '',
      max_participants: 100,
      default_question_time: 30,
      show_leaderboard: true,
      show_correct_answers: true,
      require_fullscreen: true,
      allow_late_join: false,
      shuffle_questions: false,
      shuffle_answers: false,
      auto_pause_on_exit: true,
      max_violations: 3,
      violation_penalty_points: 5
    })
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
    setQuizForm(prev => ({ ...prev, content: htmlContent }))
  }

  const togglePathStatus = async (id: string) => {
    try {
      await api.post(`/learning/admin/career-paths/${id}/publish/`)
      await fetchLearningData()
      toast.success('Path status updated')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle status')
    }
  }

  // Edit/Update Functions for Career Paths
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
      setPaths(paths.map(p => p.id === editingPath.id ? response.data : p))
      setShowEditPath(false)
      setEditingPath(null)
      resetPathForm()
      setCertificateFile(null)
      toast.success('Career path updated successfully')
      await fetchLearningData()
    } catch (error: any) {
      console.error('Update path error:', error)
      toast.error(error.response?.data?.detail || 'Failed to update path')
    }
  }

  // Edit/Update Functions for Modules
  const handleEditModule = async (module: any) => {
    console.log('Editing module:', module)
    try {
      const response = await api.get(`/learning/admin/modules/${module.id}/`)
      const fullModule = response.data
      console.log('Fetched full module:', fullModule)
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
      setModules(modules.map(m => m.id === editingModule.id ? response.data : m))
      setShowEditModule(false)
      setEditingModule(null)
      setUploadFile(null)
      toast.success('Module updated successfully')
      await fetchModules()
    } catch (error: any) {
      console.error('Update module error:', error)
      toast.error(error.response?.data?.detail || 'Failed to update module')
    }
  }

  // Helper function to parse questions from HTML content
  const parseQuestionsFromContent = (content: string): any[] => {
    const questions: any[] = []
    const slides = content.split('<hr class="slide-separator"')

    slides.forEach((slide, index) => {
      const titleMatch = slide.match(/Question \d+: ([^<]+)/)
      const title = titleMatch ? titleMatch[1].trim() : `Question ${index + 1}`

      let type = 'multiple_choice'
      if (slide.includes('TRUE / FALSE')) type = 'true_false'
      else if (slide.includes('SHORT ANSWER')) type = 'short_answer'
      else if (slide.includes('ESSAY')) type = 'essay'

      const pointsMatch = slide.match(/(\d+) points?/)
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 1

      const choices: any[] = []
      const choiceMatches = slide.matchAll(/data-choice="([A-D])"[^>]*>([^<]+)</g)
      for (const match of choiceMatches) {
        choices.push({
          id: match[1],
          text: match[2].trim(),
          isCorrect: slide.includes(`data-correct="${match[1]}"`) || slide.includes(`correct.*${match[1]}`)
        })
      }

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

  // Edit/Update Functions for Quizzes
  const handleEditQuiz = (quiz: any) => {
    console.log('Editing quiz:', quiz)
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
  }

  const updateQuiz = async () => {
    if (updatingQuiz) {
      console.log('Quiz update already in progress')
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
      setShowEditQuiz(false)
      setEditingQuiz(null)
      setShowQuizEditor(false)
      setQuizQuestions([])
      toast.success('Quiz updated successfully')
      await fetchQuizzes()
    } catch (error: any) {
      console.error('Update quiz error:', error)
      toast.error(error.response?.data?.detail || 'Failed to update quiz')
    } finally {
      setUpdatingQuiz(false)
    }
  }


  const statCards = [
    { icon: Users, label: 'Total Students', value: stats.total_enrollments || 0, color: 'from-blue-500 to-blue-600' },
    { icon: BookOpen, label: 'Career Paths', value: stats.total_paths || 0, color: 'from-green-500 to-green-600' },
    { icon: CheckCircle, label: 'Completions', value: stats.completed_enrollments || 0, color: 'from-purple-500 to-purple-600' },
    { icon: Award, label: 'Certificates', value: stats.total_certificates || 0, color: 'from-yellow-500 to-yellow-600' }
  ]

  const learningAdminSections = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'paths', label: 'Career Paths', icon: BookOpen },
    { id: 'modules', label: 'Modules', icon: FileText },
    { id: 'quizzes', label: 'Quizzes', icon: ClipboardCheck }
  ]

  // Sidebar navigation items
  const sidenavItems: SidenavItem[] = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'learning', label: 'Learning Admin', icon: GraduationCap },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ]

  const handleSidenavClick = (id: string) => {
    setActiveTab(id)
  }

  // Quick action buttons component
  const QuickActionsBar = () => (
    <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
      <button
        onClick={() => { setActiveTab('paths'); setLearningView('paths'); setShowCreatePath(true); }}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
      >
        <PlusCircle className="h-4 w-4" />
        Create Path
      </button>
      <button
        onClick={() => { setActiveTab('modules'); setLearningView('modules'); setShowCreateModule(true); }}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
      >
        <FileText className="h-4 w-4" />
        Create Module
      </button>
      <button
        onClick={() => setShowPDFExtractor(true)}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-800/50 backdrop-blur-sm hover:bg-slate-700 border border-slate-700/50 rounded-lg text-white transition-colors text-sm whitespace-nowrap"
      >
        <Wand2 className="h-4 w-4" />
        AI Content
      </button>
      <button
        onClick={() => navigate('/community')}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-800/50 backdrop-blur-sm hover:bg-slate-700 border border-slate-700/50 rounded-lg text-white transition-colors text-sm whitespace-nowrap"
      >
        <MessageCircle className="h-4 w-4" />
        Community
      </button>
    </div>
  )

  return (
    <DashboardLayout
      title="Instructor Dashboard"
      subtitle="Manage your courses and track student progress"
      sidenavItems={sidenavItems}
      activeItem={activeTab}
      onItemClick={handleSidenavClick}
    >
      {/* Quick Actions Bar */}
      <QuickActionsBar />
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg hover:border-slate-600/50 transition-colors">
                  <div className={`inline-flex p-2 sm:p-2.5 md:p-3 rounded-lg bg-gradient-to-r ${stat.color} mb-2 sm:mb-3 md:mb-4`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <p className="text-slate-400 text-xs sm:text-sm mb-0.5 sm:mb-1">{stat.label}</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Quick Actions</h2>
                <p className="text-purple-100 text-sm">Manage your learning content and students</p>
              </div>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => navigate('/learning-admin')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  Learning Admin
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  View Students
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity - Real Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                Recent Enrollments
              </h3>
              {loading ? (
                <p className="text-slate-400 text-sm">Loading...</p>
              ) : recentEnrollments.length === 0 ? (
                <p className="text-slate-400 text-sm">No recent enrollments</p>
              ) : (
                <div className="space-y-3">
                  {recentEnrollments.slice(0, 4).map((enrollment) => (
                    <div key={enrollment.id} className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-white font-medium text-sm sm:text-base">{enrollment.student_name}</p>
                        <span className={`text-xs ${enrollment.status === 'completed' ? 'text-green-400' : 'text-blue-400'}`}>
                          {enrollment.progress}%
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs sm:text-sm">{enrollment.career_path_name} - {formatTimeAgo(enrollment.enrolled_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                Your Career Paths
              </h3>
              {loading ? (
                <p className="text-slate-400 text-sm">Loading...</p>
              ) : careerPaths.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-slate-400 text-sm mb-3">No career paths yet</p>
                  <button
                    onClick={() => navigate('/learning-admin')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                  >
                    Create First Path
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {careerPaths.slice(0, 4).map((path) => (
                    <div key={path.id} className="p-3 bg-slate-700/50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-white font-medium text-sm sm:text-base">{path.name}</p>
                        <p className="text-slate-400 text-xs">{path.enrolled_count} students · {path.total_modules} modules</p>
                      </div>
                      <button
                        onClick={() => fetchEnrolledStudents(path.id, path.name)}
                        className="text-purple-400 hover:text-purple-300 text-xs"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Learning Admin Tab - Full Embedded */}
      {activeTab === 'learning' && (
        <div className="space-y-6">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Learning Administration</h2>
            <div className="flex gap-2">
              {learningView === 'paths' && (
                <button
                  onClick={() => setShowCreatePath(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Path
                </button>
              )}
              {learningView === 'modules' && (
                <button
                  onClick={() => setShowCreateModule(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Module
                </button>
              )}
              {learningView === 'quizzes' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateQuiz(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create Quiz
                  </button>
                  <button
                    onClick={() => setShowCreateLiveQuiz(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
                  >
                    <Radio className="w-4 h-4" />
                    Quiz Online
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-Navigation - Scrollable on mobile */}
          <div className="overflow-x-auto scrollbar-hide touch-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 w-max sm:w-fit">
              {learningAdminSections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setLearningView(section.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-md transition-colors whitespace-nowrap ${learningView === section.id
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{section.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Overview Stats */}
          {learningView === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-8 h-8 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Career Paths</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-2">{paths.length}</p>
                <p className="text-slate-400 text-sm">Active learning paths</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-8 h-8 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Modules</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-2">{modules.length}</p>
                <p className="text-slate-400 text-sm">Learning modules</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ClipboardCheck className="w-8 h-8 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Quizzes</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-2">{quizzes.length}</p>
                <p className="text-slate-400 text-sm">Assessment quizzes</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-8 h-8 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Enrollments</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-2">{stats.total_enrollments}</p>
                <p className="text-slate-400 text-sm">Total enrollments</p>
              </div>
            </div>
          )}

          {/* Career Paths Table */}
          {learningView === 'paths' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <input
                    type="text"
                    placeholder="Search paths..."
                    value={pathSearch}
                    onChange={(e) => setPathSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={pathProgramFilter}
                  onChange={(e) => setPathProgramFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Programs</option>
                  <option value="bsit">BSIT</option>
                  <option value="bscs">BSCS</option>
                  <option value="bsis">BSIS</option>
                </select>
                <select
                  value={pathStatusFilter}
                  onChange={(e) => setPathStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Draft</option>
                </select>
                <select
                  value={pathDifficultyFilter}
                  onChange={(e) => setPathDifficultyFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                {paths.filter((path: any) => {
                  const matchesSearch = !pathSearch ||
                    path.name.toLowerCase().includes(pathSearch.toLowerCase()) ||
                    path.description?.toLowerCase().includes(pathSearch.toLowerCase())
                  const matchesProgram = pathProgramFilter === 'all' || path.program_type === pathProgramFilter
                  const matchesStatus = pathStatusFilter === 'all' ||
                    (pathStatusFilter === 'active' && path.is_active) ||
                    (pathStatusFilter === 'inactive' && !path.is_active)
                  const matchesDifficulty = pathDifficultyFilter === 'all' || path.difficulty_level === pathDifficultyFilter
                  return matchesSearch && matchesProgram && matchesStatus && matchesDifficulty
                }).length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">No career paths yet</p>
                    <button
                      onClick={() => setShowCreatePath(true)}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                      Create First Path
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Program</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Modules</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Enrolled</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {paths.filter((path: any) => {
                          const matchesSearch = !pathSearch ||
                            path.name.toLowerCase().includes(pathSearch.toLowerCase()) ||
                            path.description?.toLowerCase().includes(pathSearch.toLowerCase())
                          const matchesProgram = pathProgramFilter === 'all' || path.program_type === pathProgramFilter
                          const matchesStatus = pathStatusFilter === 'all' ||
                            (pathStatusFilter === 'active' && path.is_active) ||
                            (pathStatusFilter === 'inactive' && !path.is_active)
                          const matchesDifficulty = pathDifficultyFilter === 'all' || path.difficulty_level === pathDifficultyFilter
                          return matchesSearch && matchesProgram && matchesStatus && matchesDifficulty
                        }).map((path: any) => (
                          <tr key={path.id} className="hover:bg-slate-700/30">
                            <td className="px-4 py-3 text-white">{path.name}</td>
                            <td className="px-4 py-3 text-slate-400 uppercase text-sm">{path.program_type}</td>
                            <td className="px-4 py-3 text-slate-400">{path.modules_count || path.total_modules || 0}</td>
                            <td className="px-4 py-3 text-slate-400">{path.enrolled_count || 0}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${path.is_active ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
                                }`}>
                                {path.is_active ? 'Active' : 'Draft'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditPath(path)}
                                  className="p-1.5 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-900/20"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => togglePathStatus(path.id)}
                                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                                  title={path.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePath(path.id)}
                                  className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modules Table */}
          {learningView === 'modules' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={filterPathId}
                  onChange={(e) => setFilterPathId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Career Paths</option>
                  {paths.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={moduleTypeFilter}
                  onChange={(e) => setModuleTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="text">Text</option>
                  <option value="video">Video</option>
                  <option value="slides">Slides</option>
                  <option value="interactive">Interactive</option>
                </select>
                <select
                  value={moduleDifficultyFilter}
                  onChange={(e) => setModuleDifficultyFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                {modules.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">No modules yet</p>
                    <button
                      onClick={() => setShowCreateModule(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Create First Module
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Title</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Career Path</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Duration</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {modules.filter((module: any) => {
                          const matchesSearch = !moduleSearch ||
                            module.title.toLowerCase().includes(moduleSearch.toLowerCase()) ||
                            module.description?.toLowerCase().includes(moduleSearch.toLowerCase())
                          const matchesPath = !filterPathId || module.career_path === filterPathId
                          const matchesType = moduleTypeFilter === 'all' || module.module_type === moduleTypeFilter
                          const matchesDifficulty = moduleDifficultyFilter === 'all' || module.difficulty_level === moduleDifficultyFilter
                          return matchesSearch && matchesPath && matchesType && matchesDifficulty
                        }).map((module: any) => (
                          <tr key={module.id} className="hover:bg-slate-700/30">
                            <td className="px-4 py-3 text-white">{module.title}</td>
                            <td className="px-4 py-3 text-slate-400">{module.career_path_name || 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-400 capitalize">{module.module_type}</td>
                            <td className="px-4 py-3 text-slate-400">{module.duration_minutes} min</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditModule(module)}
                                  className="p-1.5 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-900/20"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteModule(module.id)}
                                  className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quizzes Table */}
          {learningView === 'quizzes' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search quizzes..."
                    value={quizSearch}
                    onChange={(e) => setQuizSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-500 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={quizPathFilter}
                  onChange={(e) => setQuizPathFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="all">All Career Paths</option>
                  {paths.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={quizModuleFilter}
                  onChange={(e) => setQuizModuleFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="all">All Modules</option>
                  {modules
                    .filter((m: any) => quizPathFilter === 'all' || m.career_path === quizPathFilter)
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                </select>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                {quizzes.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardCheck className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">No quizzes yet</p>
                    <button
                      onClick={() => setShowCreateQuiz(true)}
                      className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      Create First Quiz
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Title</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Module</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Time Limit</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Passing Score</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {quizzes.filter((quiz: any) => {
                          const matchesSearch = !quizSearch ||
                            quiz.title.toLowerCase().includes(quizSearch.toLowerCase()) ||
                            quiz.description?.toLowerCase().includes(quizSearch.toLowerCase())
                          const matchesModule = quizModuleFilter === 'all' || quiz.learning_module === quizModuleFilter
                          // Find the module to check its career path
                          const quizModule = modules.find((m: any) => m.id === quiz.learning_module)
                          const matchesPath = quizPathFilter === 'all' || quizModule?.career_path === quizPathFilter
                          return matchesSearch && matchesModule && matchesPath
                        }).map((quiz: any) => (
                          <tr key={quiz.id} className="hover:bg-slate-700/30">
                            <td className="px-4 py-3 text-white">{quiz.title}</td>
                            <td className="px-4 py-3 text-slate-400">{quiz.module_title || 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-400">{quiz.time_limit_minutes} min</td>
                            <td className="px-4 py-3 text-slate-400">{quiz.passing_score}%</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditQuiz(quiz)}
                                  className="p-1.5 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-900/20"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuiz(quiz.id)}
                                  className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Courses Tab - Now Career Paths */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Career Paths</h2>
            <button
              onClick={() => navigate('/learning-admin')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Create Path
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading career paths...</div>
          ) : careerPaths.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No career paths created yet</p>
              <button
                onClick={() => navigate('/learning-admin')}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Create Your First Path
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {careerPaths.map((path) => (
                <div key={path.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg hover:border-slate-600/50 transition-colors">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white">{path.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${path.is_active
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-yellow-900/50 text-yellow-400'
                      }`}>
                      {path.is_active ? 'Active' : 'Draft'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-400">Modules</span>
                      <span className="text-white">{path.total_modules}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-400">Enrolled Students</span>
                      <span className="text-white">{path.enrolled_count}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-400">Completions</span>
                      <span className="text-green-400">{path.completed_count}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-400">Program</span>
                      <span className="text-purple-400">{path.program_type.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => fetchEnrolledStudents(path.id, path.name)}
                      className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <Users className="w-4 h-4" />
                      Students
                    </button>
                    <button
                      onClick={() => navigate('/learning-admin')}
                      className="flex-1 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors text-sm"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live Quizzes Section */}
      {learningView === 'quizzes' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search live quizzes..."
              value={quizSearch}
              onChange={(e) => {
                setQuizSearch(e.target.value)
                setLiveQuizPage(1) // Reset to page 1 on search
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 text-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Quiz Grid with Pagination */}
          {(() => {
            const filteredQuizzes = liveQuizzes.filter((quiz) =>
              !quizSearch ||
              quiz.title.toLowerCase().includes(quizSearch.toLowerCase()) ||
              quiz.join_code.toLowerCase().includes(quizSearch.toLowerCase())
            )

            const totalPages = Math.ceil(filteredQuizzes.length / liveQuizzesPerPage)
            const startIndex = (liveQuizPage - 1) * liveQuizzesPerPage
            const endIndex = startIndex + liveQuizzesPerPage
            const paginatedQuizzes = filteredQuizzes.slice(startIndex, endIndex)

            if (filteredQuizzes.length === 0) {
              return (
                <div className="text-center py-12">
                  <Radio className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400 mb-4">
                    {quizSearch ? 'No quizzes match your search' : 'No live quizzes yet'}
                  </p>
                  {!quizSearch && (
                    <button
                      onClick={() => setShowCreateLiveQuiz(true)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                    >
                      Create First Live Quiz
                    </button>
                  )}
                </div>
              )
            }

            return (
              <>
                {/* Pagination Info */}
                <div className="flex justify-between items-center text-sm text-slate-400">
                  <span>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredQuizzes.length)} of {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'zes' : ''}
                  </span>
                  {totalPages > 1 && (
                    <span>Page {liveQuizPage} of {totalPages}</span>
                  )}
                </div>

                {/* Quiz Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      onClick={() => setSelectedLiveQuiz(quiz)}
                      className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-lg hover:border-orange-500/50 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-white group-hover:text-orange-400 transition truncate pr-2">{quiz.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${quiz.is_open ? 'bg-green-900/50 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
                          {quiz.status_text || (quiz.is_open ? 'Active' : 'Closed')}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-slate-900 text-orange-400 rounded font-mono text-sm">{quiz.join_code}</code>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Questions</span>
                          <span className="text-white">{quiz.questions_count || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Participants</span>
                          <span className="text-white">{quiz.max_participants}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-700 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLiveQuiz(quiz)
                          }}
                          className="flex-1 px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white rounded-lg transition text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
                    <button
                      onClick={() => setLiveQuizPage(Math.max(1, liveQuizPage - 1))}
                      disabled={liveQuizPage === 1}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      Previous
                    </button>

                    <div className="flex gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          return page === 1 ||
                            page === totalPages ||
                            Math.abs(page - liveQuizPage) <= 1
                        })
                        .map((page, idx, arr) => {
                          // Add ellipsis if there's a gap
                          const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1
                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsisBefore && <span className="text-slate-500 px-2">...</span>}
                              <button
                                onClick={() => setLiveQuizPage(page)}
                                className={`w-10 h-10 rounded-lg transition text-sm ${page === liveQuizPage
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                                  }`}
                              >
                                {page}
                              </button>
                            </div>
                          )
                        })}
                    </div>

                    <button
                      onClick={() => setLiveQuizPage(Math.min(totalPages, liveQuizPage + 1))}
                      disabled={liveQuizPage === totalPages}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Students Tab - Now with Path Selection */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Student Management</h2>
              {selectedPathName && (
                <p className="text-slate-400 text-sm mt-1">Viewing students in: <span className="text-purple-400">{selectedPathName}</span></p>
              )}
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Path Selection */}
          {!selectedPathId && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Select a Career Path to View Students</h3>
              {careerPaths.length === 0 ? (
                <p className="text-slate-400">No career paths available</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {careerPaths.map((path) => (
                    <button
                      key={path.id}
                      onClick={() => fetchEnrolledStudents(path.id, path.name)}
                      className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left transition group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{path.name}</p>
                          <p className="text-slate-400 text-sm">
                            {path.enrolled_count > 0 || path.completed_count > 0 ? (
                              <>
                                {path.enrolled_count > 0 && <span className="text-blue-400">{path.enrolled_count} active</span>}
                                {path.enrolled_count > 0 && path.completed_count > 0 && <span className="text-slate-500"> • </span>}
                                {path.completed_count > 0 && <span className="text-green-400">{path.completed_count} completed</span>}
                              </>
                            ) : (
                              <span>No students yet</span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Students Table */}
          {selectedPathId && (
            <>
              <button
                onClick={() => { setSelectedPathId(null); setSelectedPathStudents([]); setSelectedPathName(''); }}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
              >
                ← Back to all paths
              </button>
              {/* Search, Filter, Sort Controls */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search students by name, username, or email..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                  {/* Status Filter */}
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  {/* Sort By */}
                  <select
                    value={studentSortBy}
                    onChange={(e) => setStudentSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  >
                    <option value="progress">Sort by Progress</option>
                    <option value="name">Sort by Name</option>
                    <option value="enrolled">Sort by Enrolled Date</option>
                    <option value="status">Sort by Status</option>
                  </select>
                  {/* Sort Order */}
                  <button
                    onClick={() => setStudentSortOrder(studentSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white text-sm flex items-center gap-1"
                    title={studentSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {studentSortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
                {loadingStudents ? (
                  <div className="text-center py-12 text-slate-400">Loading students...</div>
                ) : selectedPathStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">No students enrolled in this path yet</p>
                  </div>
                ) : (() => {
                  // Filter and sort students
                  const filteredStudents = selectedPathStudents
                    .filter(student => {
                      // Search filter
                      if (studentSearch) {
                        const search = studentSearch.toLowerCase()
                        const matchName = student.full_name?.toLowerCase().includes(search)
                        const matchUsername = student.username?.toLowerCase().includes(search)
                        const matchEmail = student.email?.toLowerCase().includes(search)
                        if (!matchName && !matchUsername && !matchEmail) return false
                      }
                      // Status filter
                      if (studentStatusFilter !== 'all' && student.status !== studentStatusFilter) return false
                      return true
                    })
                    .sort((a, b) => {
                      let comparison = 0
                      switch (studentSortBy) {
                        case 'name':
                          comparison = (a.full_name || '').localeCompare(b.full_name || '')
                          break
                        case 'progress':
                          comparison = (a.progress_percentage || 0) - (b.progress_percentage || 0)
                          break
                        case 'enrolled':
                          comparison = new Date(a.enrolled_at || 0).getTime() - new Date(b.enrolled_at || 0).getTime()
                          break
                        case 'status':
                          comparison = (a.status || '').localeCompare(b.status || '')
                          break
                      }
                      return studentSortOrder === 'asc' ? comparison : -comparison
                    })

                  return filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                      <p className="text-slate-400">No students match your filters</p>
                      <button
                        onClick={() => { setStudentSearch(''); setStudentStatusFilter('all'); }}
                        className="text-purple-400 hover:text-purple-300 text-sm mt-2"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="px-4 py-2 border-b border-slate-700 text-sm text-slate-400">
                        Showing {filteredStudents.length} of {selectedPathStudents.length} students
                      </div>
                      <table className="w-full">
                        <thead className="bg-slate-700/50 border-b border-slate-700">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Student</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden sm:table-cell">Email</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Progress</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden md:table-cell">Status</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider hidden lg:table-cell">Enrolled</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {filteredStudents.map((student) => {
                            // Build proper profile picture URL
                            const profilePicUrl = getMediaUrl(student.profile_picture);

                            return (
                              <tr
                                key={student.id}
                                className="hover:bg-slate-700/50 transition-colors cursor-pointer group"
                                onClick={() => navigate(`/user/${student.id}`, {
                                  state: { from: '/instructor', fromTab: 'students', fromPath: selectedPathId }
                                })}
                                title={`View ${student.full_name}'s profile`}
                              >
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    {profilePicUrl ? (
                                      <img src={profilePicUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                        {student.full_name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-white font-medium text-sm sm:text-base group-hover:text-purple-400 transition-colors">{student.full_name}</p>
                                      <p className="text-slate-400 text-xs">@{student.username}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all ml-auto" />
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                  <p className="text-slate-400 text-sm">{student.email}</p>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-16 sm:w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${student.status === 'completed' ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
                                        style={{ width: `${student.progress_percentage}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-white text-xs sm:text-sm">{student.progress_percentage}%</span>
                                  </div>
                                  <p className="text-slate-500 text-xs mt-1">{student.completed_modules}/{student.total_modules} modules</p>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                  <span className={`px-2 py-1 text-xs rounded-full ${student.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                                    student.status === 'active' ? 'bg-blue-900/50 text-blue-400' :
                                      'bg-slate-700 text-slate-400'
                                    }`}>
                                    {student.status}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                                  <p className="text-slate-400 text-sm">{formatTimeAgo(student.enrolled_at)}</p>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            </>
          )}

          {/* Recent Enrollments Section */}
          {!selectedPathId && recentEnrollments.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Enrollments</h3>
              <div className="space-y-3">
                {recentEnrollments.slice(0, 5).map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{enrollment.student_name}</p>
                      <p className="text-slate-400 text-sm">{enrollment.career_path_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">{formatTimeAgo(enrollment.enrolled_at)}</p>
                      <p className="text-xs text-blue-400">{enrollment.progress}% complete</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab - Real Data */}
      {activeTab === 'analytics' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Analytics & Reports</h2>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
              <p className="text-slate-400 text-xs sm:text-sm mb-1">Total Career Paths</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{loading ? '...' : stats.total_paths}</p>
              <p className="text-xs text-green-400 mt-1">{stats.active_paths} active</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
              <p className="text-slate-400 text-xs sm:text-sm mb-1">Total Modules</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{loading ? '...' : stats.total_modules}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
              <p className="text-slate-400 text-xs sm:text-sm mb-1">Total Quizzes</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{loading ? '...' : stats.total_quizzes}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
              <p className="text-slate-400 text-xs sm:text-sm mb-1">Certificates Issued</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{loading ? '...' : stats.total_certificates}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Enrollment Statistics</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm sm:text-base">Active Enrollments</span>
                  <span className="text-white font-bold text-sm sm:text-base">{loading ? '...' : stats.total_enrollments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm sm:text-base">Completed Enrollments</span>
                  <span className="text-green-400 font-bold text-sm sm:text-base">{loading ? '...' : stats.completed_enrollments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm sm:text-base">Completion Rate</span>
                  <span className="text-white font-bold text-sm sm:text-base">{loading ? '...' : `${stats.avg_completion_rate}%`}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Top Career Paths</h3>
              {careerPaths.length === 0 ? (
                <p className="text-slate-400 text-sm">No career paths data available</p>
              ) : (
                <div className="space-y-3">
                  {careerPaths
                    .sort((a, b) => b.enrolled_count - a.enrolled_count)
                    .slice(0, 4)
                    .map((path, index) => (
                      <div key={path.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-sm">#{index + 1}</span>
                          <span className="text-slate-300 text-sm sm:text-base">{path.name}</span>
                        </div>
                        <span className="text-white font-bold text-sm sm:text-base">{path.enrolled_count} students</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Career Path Modal */}
      {showCreatePath && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Create New Career Path</h3>
              <button onClick={() => setShowCreatePath(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
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
                  required
                />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Program Type</label>
                  <select
                    value={pathForm.program_type}
                    onChange={(e) => setPathForm({ ...pathForm, program_type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="bsit">BSIT</option>
                    <option value="bscs">BSCS</option>
                    <option value="bsis">BSIS</option>
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Duration (weeks)</label>
                  <input
                    type="number"
                    value={pathForm.estimated_duration}
                    onChange={(e) => setPathForm({ ...pathForm, estimated_duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
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
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Points Reward</label>
                  <input
                    type="number"
                    value={pathForm.points_reward}
                    onChange={(e) => setPathForm({ ...pathForm, points_reward: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Certificate Template (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={pathForm.is_active}
                    onChange={(e) => setPathForm({ ...pathForm, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={pathForm.is_featured}
                    onChange={(e) => setPathForm({ ...pathForm, is_featured: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Featured
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium">
                  Create Path
                </button>
                <button type="button" onClick={() => setShowCreatePath(false)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )
      }

      {/* Create Module Modal - Using ModuleFormWithEditor with AI */}
      {
        showCreateModule && (
          <ModuleFormWithEditor
            careerPaths={paths}
            onClose={() => setShowCreateModule(false)}
            onSuccess={() => {
              fetchModules()
              setShowCreateModule(false)
            }}
          />
        )
      }

      {/* Create Quiz Modal */}
      {
        showCreateQuiz && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Create New Quiz</h3>
                <button onClick={() => setShowCreateQuiz(false)} className="text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createQuiz(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Learning Module</label>
                  <select
                    value={quizForm.learning_module}
                    onChange={(e) => setQuizForm({ ...quizForm, learning_module: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  >
                    <option value="">Select a module</option>
                    {modules.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Quiz Title</label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Time Limit (mins)</label>
                    <input
                      type="number"
                      value={quizForm.time_limit_minutes}
                      onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
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
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
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
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={quizForm.randomize_questions}
                    onChange={(e) => setQuizForm({ ...quizForm, randomize_questions: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Randomize Questions
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
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2"
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
                  <button type="button" onClick={() => { setShowCreateQuiz(false); setShowQuizEditor(false); }} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* PDF Extractor Modal */}
      {
        showPDFExtractor && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <PDFContentExtractor
                onContentCreated={(data) => {
                  console.log('Content created:', data)
                  fetchLearningData()
                }}
                onClose={() => setShowPDFExtractor(false)}
              />
            </div>
          </div>
        )
      }

      {/* Edit Path Modal */}
      {
        showEditPath && editingPath && (
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
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={pathForm.description}
                    onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Program Type</label>
                    <select
                      value={pathForm.program_type}
                      onChange={(e) => setPathForm({ ...pathForm, program_type: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="bsit">BSIT</option>
                      <option value="bscs">BSCS</option>
                      <option value="bsis">BSIS</option>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Duration (weeks)</label>
                    <input
                      type="number"
                      value={pathForm.estimated_duration}
                      onChange={(e) => setPathForm({ ...pathForm, estimated_duration: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
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
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Points Reward</label>
                    <input
                      type="number"
                      value={pathForm.points_reward}
                      onChange={(e) => setPathForm({ ...pathForm, points_reward: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Certificate Template</label>
                  <input
                    type="file"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                  {editingPath?.certificate_template && (
                    <p className="text-xs text-green-400 mt-1">Current: {editingPath.certificate_template.split('/').pop()}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={pathForm.is_active}
                      onChange={(e) => setPathForm({ ...pathForm, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={pathForm.is_featured}
                      onChange={(e) => setPathForm({ ...pathForm, is_featured: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Featured
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                    Update Path
                  </button>
                  <button type="button" onClick={() => setShowEditPath(false)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Edit Module Modal - Full Editor */}
      {
        showEditModule && editingModule && (
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
        )
      }

      {/* Edit Quiz Modal */}
      {
        showEditQuiz && editingQuiz && (
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
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Time Limit (min)</label>
                    <input
                      type="number"
                      value={quizForm.time_limit_minutes}
                      onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
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
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
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
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
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
                      className="w-4 h-4"
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
                    {showQuizEditor ? '📝 Hide Question Editor' : '✨ Edit Questions (Multiple Choice, T/F, Essay)'}
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
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2"
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
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Create Live Quiz Modal */}
      {showCreateLiveQuiz && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Radio className="w-6 h-6 text-orange-400" />
                Create Live Quiz
              </h3>
              <button
                onClick={() => {
                  setShowCreateLiveQuiz(false)
                  resetLiveQuizForm()
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Basic Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Quiz Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={liveQuizForm.title}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, title: e.target.value })}
                      placeholder="e.g., Python Basics Quiz"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={liveQuizForm.description || ''}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, description: e.target.value })}
                      placeholder="Brief description of the quiz..."
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quiz Settings */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Quiz Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      value={liveQuizForm.max_participants}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, max_participants: parseInt(e.target.value) })}
                      min={1}
                      max={500}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Question Time (seconds)
                    </label>
                    <input
                      type="number"
                      value={liveQuizForm.default_question_time}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, default_question_time: parseInt(e.target.value) })}
                      min={5}
                      max={300}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.show_leaderboard}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, show_leaderboard: e.target.checked })}
                      className="w-4 h-4 text-orange-600 bg-slate-800 border-slate-700 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-slate-300">Show leaderboard</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.require_fullscreen}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, require_fullscreen: e.target.checked })}
                      className="w-4 h-4 text-orange-600 bg-slate-800 border-slate-700 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-slate-300">Require fullscreen mode</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.show_correct_answers}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, show_correct_answers: e.target.checked })}
                      className="w-4 h-4 text-orange-600 bg-slate-800 border-slate-700 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-slate-300">Show correct answers after submission</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.allow_late_join}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, allow_late_join: e.target.checked })}
                      className="w-4 h-4 text-orange-600 bg-slate-800 border-slate-700 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-slate-300">Allow late join</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.shuffle_questions}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, shuffle_questions: e.target.checked })}
                      className="w-4 h-4 text-orange-600 bg-slate-800 border-slate-700 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-slate-300">Shuffle question order</span>
                  </label>
                </div>
              </div>

              {/* Info Notice */}
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  After creating the quiz, you'll be able to add questions manually, upload from PDF, or use AI to generate questions.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateLiveQuiz(false)
                    resetLiveQuizForm()
                  }}
                  disabled={creatingLiveQuiz}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createLiveQuiz}
                  disabled={creatingLiveQuiz || !liveQuizForm.title}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
                >
                  {creatingLiveQuiz ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      Create Live Quiz
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Quiz Detail Panel */}
      {selectedLiveQuiz && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 pt-6 sm:pt-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg sm:max-w-3xl mb-16 sm:mb-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-slate-700 bg-gradient-to-r from-orange-500/10 to-transparent gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{selectedLiveQuiz.title}</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                  <span className={`text-xs sm:text-sm px-2 py-0.5 rounded ${selectedLiveQuiz.is_open ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
                    {selectedLiveQuiz.status_text || (selectedLiveQuiz.is_open ? 'Active' : 'Closed')}
                  </span>
                  <span className="text-slate-400 text-xs sm:text-sm">{selectedLiveQuiz.questions_count} questions</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLiveQuiz(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Join Code Card */}
              <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm text-slate-400">Join Code</p>
                  <p className="text-2xl sm:text-3xl font-mono font-bold text-orange-400">{selectedLiveQuiz.join_code}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(selectedLiveQuiz.join_code).then(() => toast.success('Code copied!'))}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>

              {/* Shareable Link */}
              <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4">
                <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-slate-400 mb-1 flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5" />
                      Shareable Link
                    </p>
                    <p className="text-sm font-mono text-slate-300 break-all">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/join-quiz/{selectedLiveQuiz.join_code}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join-quiz/${selectedLiveQuiz.join_code}`
                      navigator.clipboard.writeText(shareUrl).then(() => toast.success('Link copied!'))
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Scheduling Info */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Scheduling
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Opens At</p>
                    <p className="text-white">{selectedLiveQuiz.scheduled_start ? new Date(selectedLiveQuiz.scheduled_start).toLocaleString() : 'Immediate'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Deadline</p>
                    <p className="text-white">{selectedLiveQuiz.deadline ? new Date(selectedLiveQuiz.deadline).toLocaleString() : 'No deadline'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Max Retakes</p>
                    <p className="text-white">{selectedLiveQuiz.max_retakes === 0 ? 'Unlimited' : selectedLiveQuiz.max_retakes}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Time Limit</p>
                    <p className="text-white">{selectedLiveQuiz.time_limit_minutes ? `${selectedLiveQuiz.time_limit_minutes} min` : 'No limit'}</p>
                  </div>
                </div>
              </div>

              {/* Questions Section */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
                  <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Questions
                  </h4>
                  <button
                    onClick={() => {
                      setShowQuestionEditor(true)
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {selectedLiveQuiz.questions_count > 0 ? 'Edit Questions' : 'Add Questions'}
                  </button>
                </div>
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No questions yet</p>
                  <p className="text-xs mt-1">Add questions to start the quiz</p>
                </div>
              </div>

              {/* Settings Summary */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Quiz Settings
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLiveQuiz.show_leaderboard && <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Leaderboard</span>}
                  {selectedLiveQuiz.require_fullscreen && <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Fullscreen</span>}
                  {selectedLiveQuiz.show_correct_answers && <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Show Answers</span>}
                  {selectedLiveQuiz.allow_late_join && <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Late Join</span>}
                  {selectedLiveQuiz.shuffle_questions && <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Shuffle Qs</span>}
                  {selectedLiveQuiz.shuffle_answers && <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Shuffle As</span>}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 border-t border-slate-700 bg-slate-800/30">
              <button
                onClick={() => {
                  deleteLiveQuiz(selectedLiveQuiz.id)
                  setSelectedLiveQuiz(null)
                }}
                className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Quiz
              </button>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setSelectedLiveQuiz(null)}
                  className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition"
                >
                  Close
                </button>
                {selectedLiveQuiz.questions_count > 0 && (
                  <button
                    onClick={() => toast('Start quiz session coming soon!', { icon: '🚀' })}
                    className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Quiz Question Editor */}
      {showQuestionEditor && selectedLiveQuiz && (
        <LiveQuizQuestionEditor
          quizId={selectedLiveQuiz.id}
          onClose={() => {
            setShowQuestionEditor(false)
            setSelectedLiveQuiz(null)
          }}
          onQuestionsChange={async () => {
            await fetchLiveQuizzes()
            toast.success('Questions updated successfully')
          }}
        />
      )}

      {/* Quiz Creation Transition Loading */}
      {showQuizTransition && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Opening quiz editor...</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default InstructorDashboard

