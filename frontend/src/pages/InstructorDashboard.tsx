import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, BookOpen, ClipboardCheck, Award, TrendingUp,
  Calendar, FileText, Video, MessageCircle, Settings,
  PlusCircle, BarChart2, Clock, CheckCircle, GraduationCap, Wand2,
  Eye, ChevronRight, RefreshCw, Edit, Trash2, Play, X, Save, Upload, Home, Radio, Filter, Loader2, Copy, Link, Download,
  Camera, Code2, ShieldCheck, Shield
} from 'lucide-react'
import DashboardLayout, { SidenavItem } from '../components/layout/DashboardLayout'
import PDFContentExtractor from '../components/PDFContentExtractor'
import ModuleFormWithEditor from '../components/ModuleFormWithEditor'
import QuizEditor from '../components/QuizEditor'
import LiveQuizQuestionEditor from '../components/LiveQuizQuestionEditor'
import InstructorMonitorPanel from '../components/InstructorMonitorPanel'
import api from '../services/api'
import liveQuizService, { LiveQuiz, CreateLiveQuizData } from '../services/liveQuizService'
import { useCurrentUser } from '../hooks/useApiCache'
import toast from 'react-hot-toast'
import { Skeleton, SkeletonCard } from '../components/ui'
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
  const [isCreatingPath, setIsCreatingPath] = useState(false)
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
  const [detailTab, setDetailTab] = useState<'overview' | 'scores'>('overview')
  const [quizScores, setQuizScores] = useState<any[]>([])
  const [loadingScores, setLoadingScores] = useState(false)
  // Student Management - Path Search (reusing existing pathSearch, pathProgramFilter, pathStatusFilter)
  const [pathSearchQuery, setPathSearchQuery] = useState('')

  // Student Management - Recent Enrollments Filters
  const [enrollmentSearchQuery, setEnrollmentSearchQuery] = useState('')
  const [enrollmentPathFilter, setEnrollmentPathFilter] = useState('all')

  const [liveQuizForm, setLiveQuizForm] = useState<CreateLiveQuizData>({
    title: '',
    description: '',
    quiz_mode: 'live',
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
  const [showMonitorPanel, setShowMonitorPanel] = useState(false)
  const [isStartingQuiz, setIsStartingQuiz] = useState(false)

  // Coding Challenges states
  const [challengesList, setChallengesList] = useState<any[]>([])
  const [showCreateChallenge, setShowCreateChallenge] = useState(false)
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    difficulty: 'easy',
    category: 'basics',
    supported_languages: ['python', 'javascript'],
    starter_code: { python: '# Write your solution here\n', javascript: '// Write your solution here\n' },
    test_cases: [{ input: '', expected_output: '', is_hidden: false }],
    constraints: '',
    points: 10,
    time_limit_seconds: 300,
  })

  // Video Courses states
  const [videoCoursesList, setVideoCoursesList] = useState<any[]>([])
  const [showCreateVideoCourse, setShowCreateVideoCourse] = useState(false)
  const [videoCourseForm, setVideoCourseForm] = useState({
    title: '',
    description: '',
    instructor_name: '',
    category: 'general',
    difficulty: 'beginner',
    thumbnail_url: '',
    lessons: [{ title: '', video_url: '', duration_minutes: 0 }],
  })

  // Live Challenge states
  const [showLiveChallengeModal, setShowLiveChallengeModal] = useState(false)
  const [liveChallengeData, setLiveChallengeData] = useState<any>(null)
  const [goingLive, setGoingLive] = useState<string | null>(null) // slug of challenge being launched

  // Go Live Config Modal
  const [showGoLiveConfig, setShowGoLiveConfig] = useState(false)
  const [goLiveChallenge, setGoLiveChallenge] = useState<any>(null)
  const [goLiveConfig, setGoLiveConfig] = useState({
    require_fullscreen: true,
    fullscreen_exit_action: 'pause',
    alt_tab_action: 'warn',
    max_violations: 3,
    max_participants: 100,
    time_limit_seconds: 300,
  })

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
        fetchLiveQuizzes()
      } else if (learningView === 'challenges') {
        fetchChallenges()
      } else if (learningView === 'videos') {
        fetchVideoCourses()
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

  const fetchChallenges = async () => {
    try {
      const response = await api.get('/learning/challenges/')
      setChallengesList(response.data.results || response.data || [])
    } catch (error) {
      console.error('Failed to fetch challenges:', error)
      setChallengesList([])
    }
  }

  const handleGoLive = (challenge: any) => {
    // Open config modal instead of launching immediately
    setGoLiveChallenge(challenge)
    setGoLiveConfig(prev => ({
      ...prev,
      time_limit_seconds: challenge.time_limit_seconds || 300,
    }))
    setShowGoLiveConfig(true)
  }

  const confirmGoLive = async () => {
    if (!goLiveChallenge) return
    setShowGoLiveConfig(false)
    setGoingLive(goLiveChallenge.slug)
    try {
      const response = await api.post(`/learning/challenges/${goLiveChallenge.slug}/go-live/`, {
        time_limit_seconds: goLiveConfig.time_limit_seconds,
        max_participants: goLiveConfig.max_participants,
        require_fullscreen: goLiveConfig.require_fullscreen,
        fullscreen_exit_action: goLiveConfig.fullscreen_exit_action,
        alt_tab_action: goLiveConfig.alt_tab_action,
        max_violations: goLiveConfig.max_violations,
      })
      const quizId = response.data.quiz_id
      toast.success(`Live challenge created! Code: ${response.data.join_code}`)

      // Refresh the live quiz list and switch to Quiz Manager
      const quizList = await liveQuizService.getQuizzes()
      setLiveQuizzes(quizList)

      // Find and auto-select the newly created quiz
      const newQuiz = quizList.find((q: any) => String(q.id) === quizId)
      if (newQuiz) {
        setSelectedLiveQuiz(newQuiz)
        setDetailTab('overview')
      }

      // Navigate to the quizzes tab
      setLearningView('quizzes')
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to create live challenge'
      toast.error(msg)
    } finally {
      setGoingLive(null)
      setGoLiveChallenge(null)
    }
  }

  const fetchVideoCourses = async () => {
    try {
      const response = await api.get('/learning/video-courses/')
      setVideoCoursesList(response.data.results || response.data || [])
    } catch (error) {
      console.error('Failed to fetch video courses:', error)
      setVideoCoursesList([])
    }
  }

  const submitCreateChallenge = async () => {
    if (!challengeForm.title.trim()) { toast.error('Title is required'); return }
    if (!challengeForm.description.trim()) { toast.error('Description is required'); return }
    try {
      const payload = {
        ...challengeForm,
        tags: ((challengeForm as any).tags_raw || '')
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean),
        hints: (challengeForm as any).hints || [],
      }
      await api.post('/learning/challenges/', payload)
      toast.success('Challenge created!')
      setShowCreateChallenge(false)
      setChallengeForm({
        title: '', description: '', difficulty: 'easy', category: 'basics',
        supported_languages: ['python', 'javascript'],
        starter_code: { python: '# Write your solution here\n', javascript: '// Write your solution here\n' },
        test_cases: [{ input: '', expected_output: '', is_hidden: false }],
        constraints: '', points: 10, time_limit_seconds: 300,
      })
      fetchChallenges()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create challenge')
    }
  }

  // Extract YouTube video ID from various URL formats
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const p of patterns) {
      const match = url.match(p)
      if (match) return match[1]
    }
    return null
  }

  // Auto-fill thumbnail from first lesson's YouTube URL
  const updateLessonUrl = (index: number, url: string) => {
    const l = [...videoCourseForm.lessons]
    l[index] = { ...l[index], video_url: url }
    const updates: any = { lessons: l }
    // Auto-fill thumbnail from first lesson if thumbnail is empty
    if (index === 0 && !videoCourseForm.thumbnail_url) {
      const videoId = extractYouTubeId(url)
      if (videoId) {
        updates.thumbnail_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
    setVideoCourseForm({ ...videoCourseForm, ...updates })
  }

  const submitCreateVideoCourse = async () => {
    if (!videoCourseForm.title.trim()) { toast.error('Title is required'); return }
    if (!videoCourseForm.instructor_name.trim()) { toast.error('Instructor name is required'); return }
    try {
      await api.post('/learning/video-courses/', videoCourseForm)
      toast.success('Video course created!')
      setShowCreateVideoCourse(false)
      setVideoCourseForm({
        title: '', description: '', instructor_name: '', category: 'general',
        difficulty: 'beginner', thumbnail_url: '',
        lessons: [{ title: '', video_url: '', duration_minutes: 0 }],
      })
      fetchVideoCourses()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create course')
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
    if (isCreatingPath) return
    setIsCreatingPath(true)
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
    } finally {
      setIsCreatingPath(false)
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

      // Refresh the quiz list
      await fetchLiveQuizzes()

      // Brief pause so the spinner feels intentional before transitioning
      await new Promise(resolve => setTimeout(resolve, 800))

      setShowCreateLiveQuiz(false)
      resetLiveQuizForm()

      // Auto-open the quiz detail/editor view
      setSelectedLiveQuiz(quiz)
      toast.success(`Quiz "${quiz.title}" created! Add questions below.`)
    } catch (error: any) {
      console.error('Failed to create live quiz:', error)
      toast.error(error.response?.data?.error || 'Failed to create live quiz')
    } finally {
      setCreatingLiveQuiz(false)
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
      violation_penalty_points: 5,
      // Phase 2: Anti-cheat action configuration
      fullscreen_exit_action: 'pause',
      alt_tab_action: 'warn',
      enable_code_execution: true,
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
            <span>${q.points} ${q.points === 1 ? 'point' : 'points'}</span>
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
          { id: 'A', text: '', isCorrect: true },
          { id: 'B', text: '', isCorrect: false },
          { id: 'C', text: '', isCorrect: false },
          { id: 'D', text: '', isCorrect: false }
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
        { id: 'A', text: '', isCorrect: true },
        { id: 'B', text: '', isCorrect: false },
        { id: 'C', text: '', isCorrect: false },
        { id: 'D', text: '', isCorrect: false }
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
    { icon: Users, label: 'Total Students', value: stats.total_enrollments || 0, color: 'bg-purple-500/10 text-purple-400' },
    { icon: BookOpen, label: 'Career Paths', value: stats.total_paths || 0, color: 'bg-green-500/10 text-green-400' },
    { icon: CheckCircle, label: 'Completions', value: stats.completed_enrollments || 0, color: 'bg-purple-500/10 text-purple-400' },
    { icon: Award, label: 'Certificates', value: stats.total_certificates || 0, color: 'bg-amber-500/10 text-amber-400' }
  ]

  const learningAdminSections = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'paths', label: 'Career Paths', icon: BookOpen },
    { id: 'modules', label: 'Modules', icon: FileText },
    { id: 'quizzes', label: 'Quizzes', icon: ClipboardCheck },
    { id: 'challenges', label: 'Challenges', icon: Code2 },
    { id: 'videos', label: 'Video Courses', icon: Video }
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
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
      >
        <PlusCircle className="h-4 w-4" />
        Create Path
      </button>
      <button
        onClick={() => { setActiveTab('modules'); setLearningView('modules'); setShowCreateModule(true); }}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
      >
        <FileText className="h-4 w-4" />
        Create Module
      </button>
      <button
        onClick={() => setShowPDFExtractor(true)}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-neutral-800/50 backdrop-blur-sm hover:bg-neutral-700 border border-neutral-700/50 rounded-lg text-white transition-colors text-sm whitespace-nowrap"
      >
        <Wand2 className="h-4 w-4" />
        AI Content
      </button>
      <button
        onClick={() => navigate('/community')}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-neutral-800/50 backdrop-blur-sm hover:bg-neutral-700 border border-neutral-700/50 rounded-lg text-white transition-colors text-sm whitespace-nowrap"
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
          {/* Personalized greeting */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Welcome back, {cachedProfile?.first_name || cachedProfile?.username || 'Instructor'}
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · Here's how your courses are doing
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-4 md:p-6 hover:border-neutral-700 transition-colors">
                  <div className={`inline-flex p-2 sm:p-2.5 md:p-3 rounded-lg ${stat.color} mb-2 sm:mb-3 md:mb-4`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  </div>
                  <p className="text-neutral-400 text-xs sm:text-sm mb-0.5 sm:mb-1">{stat.label}</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white tabular-nums">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-600/15 to-transparent p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Quick Actions</h2>
                <p className="text-neutral-400 text-sm">Manage your learning content and students</p>
              </div>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('students')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  View Students
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity - Real Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                Recent Enrollments
              </h3>
              {loading ? (
                <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : recentEnrollments.length === 0 ? (
                <p className="text-neutral-400 text-sm">No recent enrollments</p>
              ) : (
                <div className="space-y-3">
                  {recentEnrollments.slice(0, 4).map((enrollment) => (
                    <div key={enrollment.id} className="p-3 bg-neutral-800/60 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-white font-medium text-sm sm:text-base">{enrollment.student_name}</p>
                        <span className={`text-xs ${enrollment.status === 'completed' ? 'text-green-400' : 'text-purple-400'}`}>
                          {enrollment.progress}%
                        </span>
                      </div>
                      <p className="text-neutral-400 text-xs sm:text-sm">{enrollment.career_path_name} - {formatTimeAgo(enrollment.enrolled_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                Your Career Paths
              </h3>
              {loading ? (
                <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : careerPaths.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-neutral-400 text-sm mb-3">No career paths yet</p>
                  <button
                    onClick={() => { setActiveTab('learning'); setLearningView('paths'); }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm"
                  >
                    Create First Path
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {careerPaths.slice(0, 4).map((path) => (
                    <div key={path.id} className="p-3 bg-neutral-800/60 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-white font-medium text-sm sm:text-base">{path.name}</p>
                        <p className="text-neutral-400 text-xs">{path.enrolled_count} students · {path.total_modules} modules</p>
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Path
                </button>
              )}
              {learningView === 'modules' && (
                <button
                  onClick={() => setShowCreateModule(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Module
                </button>
              )}
              {learningView === 'quizzes' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateQuiz(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create Quiz
                  </button>
                  <button
                    onClick={() => setShowCreateLiveQuiz(true)}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-100 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Radio className="w-4 h-4" />
                    Quiz Online
                  </button>
                </div>
              )}
              {learningView === 'challenges' && (
                <button
                  onClick={() => setShowCreateChallenge(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Challenge
                </button>
              )}
              {learningView === 'videos' && (
                <button
                  onClick={() => setShowCreateVideoCourse(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Video Course
                </button>
              )}
            </div>
          </div>

          {/* Sub-Navigation - Scrollable on mobile */}
          <div className="overflow-x-auto scrollbar-hide touch-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800 w-max sm:w-fit">
              {learningAdminSections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setLearningView(section.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${learningView === section.id
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{section.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Overview Stats */}
          {learningView === 'overview' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: BookOpen, chip: 'bg-purple-500/10 text-purple-400', value: paths.length, label: 'Career Paths', sub: 'Active learning paths' },
                { icon: FileText, chip: 'bg-purple-500/10 text-purple-400', value: modules.length, label: 'Modules', sub: 'Learning modules' },
                { icon: ClipboardCheck, chip: 'bg-green-500/10 text-green-400', value: quizzes.length, label: 'Quizzes', sub: 'Assessment quizzes' },
                { icon: Users, chip: 'bg-amber-500/10 text-amber-400', value: stats.total_enrollments, label: 'Enrollments', sub: 'Total enrollments' },
              ].map(({ icon: Icon, chip, value, label, sub }) => (
                <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-lg ${chip}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{value}</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-neutral-200">{label}</h3>
                  <p className="text-xs sm:text-sm text-neutral-500">{sub}</p>
                </div>
              ))}
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
                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-purple-500 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={pathProgramFilter}
                  onChange={(e) => setPathProgramFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Programs</option>
                  <option value="bsit">BSIT</option>
                  <option value="bscs">BSCS</option>
                  <option value="bsis">BSIS</option>
                </select>
                <select
                  value={pathStatusFilter}
                  onChange={(e) => setPathStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Draft</option>
                </select>
                <select
                  value={pathDifficultyFilter}
                  onChange={(e) => setPathDifficultyFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
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
                    <BookOpen className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                    <p className="text-neutral-400">No career paths yet</p>
                    <button
                      onClick={() => setShowCreatePath(true)}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                    >
                      Create First Path
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-900/60 border-b border-neutral-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Program</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Modules</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Enrolled</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/70">
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
                          <tr key={path.id} className="hover:bg-neutral-800/40">
                            <td className="px-4 py-3 text-white">{path.name}</td>
                            <td className="px-4 py-3 text-neutral-400 uppercase text-sm">{path.program_type}</td>
                            <td className="px-4 py-3 text-neutral-400">{path.modules_count || path.total_modules || 0}</td>
                            <td className="px-4 py-3 text-neutral-400">{path.enrolled_count || 0}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${path.is_active ? 'bg-green-500/15 text-green-300 border border-green-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                }`}>
                                {path.is_active ? 'Active' : 'Draft'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditPath(path)}
                                  className="p-1.5 text-purple-400 hover:text-purple-300 rounded hover:bg-purple-900/20"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => togglePathStatus(path.id)}
                                  className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-700"
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
                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-purple-500 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={filterPathId}
                  onChange={(e) => setFilterPathId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Career Paths</option>
                  {paths.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={moduleTypeFilter}
                  onChange={(e) => setModuleTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                {modules.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                    <p className="text-neutral-400">No modules yet</p>
                    <button
                      onClick={() => setShowCreateModule(true)}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                    >
                      Create First Module
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-900/60 border-b border-neutral-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Career Path</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/70">
                        {modules.filter((module: any) => {
                          const matchesSearch = !moduleSearch ||
                            module.title.toLowerCase().includes(moduleSearch.toLowerCase()) ||
                            module.description?.toLowerCase().includes(moduleSearch.toLowerCase())
                          const matchesPath = !filterPathId || module.career_path === filterPathId
                          const matchesType = moduleTypeFilter === 'all' || module.module_type === moduleTypeFilter
                          const matchesDifficulty = moduleDifficultyFilter === 'all' || module.difficulty_level === moduleDifficultyFilter
                          return matchesSearch && matchesPath && matchesType && matchesDifficulty
                        }).map((module: any) => (
                          <tr key={module.id} className="hover:bg-neutral-800/40">
                            <td className="px-4 py-3 text-white">{module.title}</td>
                            <td className="px-4 py-3 text-neutral-400">{module.career_path_name || 'N/A'}</td>
                            <td className="px-4 py-3 text-neutral-400 capitalize">{module.module_type}</td>
                            <td className="px-4 py-3 text-neutral-400">{module.duration_minutes} min</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditModule(module)}
                                  className="p-1.5 text-purple-400 hover:text-purple-300 rounded hover:bg-purple-900/20"
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
                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-green-500 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={quizPathFilter}
                  onChange={(e) => setQuizPathFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="all">All Career Paths</option>
                  {paths.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={quizModuleFilter}
                  onChange={(e) => setQuizModuleFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="all">All Modules</option>
                  {modules
                    .filter((m: any) => quizPathFilter === 'all' || m.career_path === quizPathFilter)
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                </select>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                {quizzes.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardCheck className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                    <p className="text-neutral-400">No quizzes yet</p>
                    <button
                      onClick={() => setShowCreateQuiz(true)}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                    >
                      Create First Quiz
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-900/60 border-b border-neutral-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Module</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Time Limit</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Passing Score</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/70">
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
                          <tr key={quiz.id} className="hover:bg-neutral-800/40">
                            <td className="px-4 py-3 text-white">{quiz.title}</td>
                            <td className="px-4 py-3 text-neutral-400">{quiz.module_title || 'N/A'}</td>
                            <td className="px-4 py-3 text-neutral-400">{quiz.time_limit_minutes} min</td>
                            <td className="px-4 py-3 text-neutral-400">{quiz.passing_score}%</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditQuiz(quiz)}
                                  className="p-1.5 text-purple-400 hover:text-purple-300 rounded hover:bg-purple-900/20"
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
              onClick={() => { setActiveTab('learning'); setLearningView('paths'); }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition flex items-center gap-2 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Create Path
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</div>
          ) : careerPaths.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
              <p className="text-neutral-400">No career paths created yet</p>
              <button
                onClick={() => { setActiveTab('learning'); setLearningView('paths'); }}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
              >
                Create Your First Path
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {careerPaths.map((path) => (
                <div key={path.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 hover:border-neutral-700 transition-colors">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white">{path.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${path.is_active
                      ? 'bg-green-500/15 text-green-300 border border-green-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                      {path.is_active ? 'Active' : 'Draft'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-neutral-400">Modules</span>
                      <span className="text-white">{path.total_modules}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-neutral-400">Enrolled Students</span>
                      <span className="text-white">{path.enrolled_count}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-neutral-400">Completions</span>
                      <span className="text-green-400">{path.completed_count}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-neutral-400">Program</span>
                      <span className="text-purple-400">{path.program_type.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => fetchEnrolledStudents(path.id, path.name)}
                      className="flex-1 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <Users className="w-4 h-4" />
                      Students
                    </button>
                    <button
                      onClick={() => { setActiveTab('learning'); setLearningView('paths'); }}
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
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-amber-500 text-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <Radio className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                  <p className="text-neutral-400 mb-4">
                    {quizSearch ? 'No quizzes match your search' : 'No live quizzes yet'}
                  </p>
                  {!quizSearch && (
                    <button
                      onClick={() => setShowCreateLiveQuiz(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
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
                <div className="flex justify-between items-center text-sm text-neutral-400">
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
                      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-lg hover:border-amber-500/50 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition truncate pr-2">{quiz.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${quiz.is_open ? 'bg-green-500/15 text-green-300 border border-green-500/30' : 'bg-neutral-600/50 text-neutral-400'}`}>
                          {quiz.status_text || (quiz.is_open ? 'Active' : 'Closed')}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-neutral-900 text-amber-400 rounded font-mono text-sm">{quiz.join_code}</code>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Questions</span>
                          <span className="text-white">{quiz.questions_count || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Participants</span>
                          <span className="text-white">{quiz.max_participants}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-700 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLiveQuiz(quiz)
                          }}
                          className="flex-1 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg transition text-sm"
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
                      className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
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
                              {showEllipsisBefore && <span className="text-neutral-500 px-2">...</span>}
                              <button
                                onClick={() => setLiveQuizPage(page)}
                                className={`w-10 h-10 rounded-lg transition text-sm ${page === liveQuizPage
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
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
                      className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition text-sm flex items-center justify-center gap-1"
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

          {/* Challenges Management */}
          {learningView === 'challenges' && (
            <div className="space-y-4">
              {challengesList.length === 0 ? (
                <div className="text-center py-12 bg-neutral-900/40 rounded-xl border border-dashed border-neutral-800">
                  <Code2 className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-400">No coding challenges yet</p>
                  <p className="text-neutral-500 text-sm mt-1">Create your first challenge to get started</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {challengesList.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-purple-500/30 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium text-sm truncate">{c.title}</h4>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            c.difficulty === 'easy' ? 'text-green-400 bg-green-500/10' :
                            c.difficulty === 'medium' ? 'text-amber-400 bg-amber-500/10' :
                            'text-red-400 bg-red-500/10'
                          }`}>{c.difficulty}</span>
                          <span className="text-[10px] text-neutral-500">{c.category}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {c.points} pts • {c.total_attempts} attempts • {c.total_solved} solved
                          {c.supported_languages?.length > 0 && (
                            <> • {c.supported_languages.join(', ')}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Go Live Button */}
                        <button
                          onClick={() => handleGoLive(c)}
                          disabled={goingLive === c.slug}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-1.5 text-xs font-medium"
                          title="Host a live coding competition with this challenge"
                        >
                          {goingLive === c.slug ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Radio className="w-3.5 h-3.5" />
                          )}
                          Go Live
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={async () => {
                            if (confirm('Delete this challenge?')) {
                              try {
                                await api.delete(`/learning/challenges/${c.slug}/`)
                                toast.success('Challenge deleted')
                                fetchChallenges()
                              } catch { toast.error('Failed to delete') }
                            }
                          }}
                          className="p-2 text-neutral-400 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}



          {/* Video Courses Management */}
          {learningView === 'videos' && (
            <div className="space-y-4">
              {videoCoursesList.length === 0 ? (
                <div className="text-center py-12 bg-neutral-900/40 rounded-xl border border-dashed border-neutral-800">
                  <Video className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-400">No video courses yet</p>
                  <p className="text-neutral-500 text-sm mt-1">Create your first video course to get started</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {videoCoursesList.map((vc: any) => (
                    <div key={vc.id} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-purple-500/30 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium text-sm truncate">{vc.title}</h4>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            vc.difficulty === 'beginner' ? 'text-green-400 bg-green-500/10' :
                            vc.difficulty === 'intermediate' ? 'text-amber-400 bg-amber-500/10' :
                            'text-red-400 bg-red-500/10'
                          }`}>{vc.difficulty}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">{vc.instructor_name} • {vc.lessons_count || 0} lessons • {vc.category}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this video course?')) {
                            try {
                              await api.delete(`/learning/video-courses/${vc.slug}/`)
                              toast.success('Course deleted')
                              fetchVideoCourses()
                            } catch { toast.error('Failed to delete') }
                          }
                        }}
                        className="p-2 text-neutral-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

      {/* Students Tab - Now with Path Selection */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Student Management</h2>
              {selectedPathName && (
                <p className="text-neutral-400 text-sm mt-1">Viewing students in: <span className="text-purple-400">{selectedPathName}</span></p>
              )}
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Path Selection */}
          {!selectedPathId && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Select a Career Path to View Students</h3>
              {careerPaths.length === 0 ? (
                <p className="text-neutral-400">No career paths available</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {careerPaths.map((path) => (
                    <button
                      key={path.id}
                      onClick={() => fetchEnrolledStudents(path.id, path.name)}
                      className="p-4 bg-neutral-700/50 hover:bg-neutral-700 rounded-lg text-left transition group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{path.name}</p>
                          <p className="text-neutral-400 text-sm">
                            {path.enrolled_count > 0 || path.completed_count > 0 ? (
                              <>
                                {path.enrolled_count > 0 && <span className="text-purple-400">{path.enrolled_count} active</span>}
                                {path.enrolled_count > 0 && path.completed_count > 0 && <span className="text-neutral-500"> • </span>}
                                {path.completed_count > 0 && <span className="text-green-400">{path.completed_count} completed</span>}
                              </>
                            ) : (
                              <span>No students yet</span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-white transition" />
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
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search students by name, username, or email..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full px-4 py-2 bg-neutral-700/50 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                  {/* Status Filter */}
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm"
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
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm"
                  >
                    <option value="progress">Sort by Progress</option>
                    <option value="name">Sort by Name</option>
                    <option value="enrolled">Sort by Enrolled Date</option>
                    <option value="status">Sort by Status</option>
                  </select>
                  {/* Sort Order */}
                  <button
                    onClick={() => setStudentSortOrder(studentSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-lg text-white text-sm flex items-center gap-1"
                    title={studentSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {studentSortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                  </button>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
                {loadingStudents ? (
                  <div className="space-y-3 py-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : selectedPathStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                    <p className="text-neutral-400">No students enrolled in this path yet</p>
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
                      <Users className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                      <p className="text-neutral-400">No students match your filters</p>
                      <button
                        onClick={() => { setStudentSearch(''); setStudentStatusFilter('all'); }}
                        className="text-purple-400 hover:text-purple-300 text-sm mt-2"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="px-4 py-2 border-b border-neutral-700 text-sm text-neutral-400">
                        Showing {filteredStudents.length} of {selectedPathStudents.length} students
                      </div>
                      <table className="w-full">
                        <thead className="bg-neutral-700/50 border-b border-neutral-700">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Student</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider hidden sm:table-cell">Email</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Progress</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider hidden md:table-cell">Status</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider hidden lg:table-cell">Enrolled</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-700">
                          {filteredStudents.map((student) => {
                            // Build proper profile picture URL
                            const profilePicUrl = getMediaUrl(student.profile_picture);

                            return (
                              <tr
                                key={student.id}
                                className="hover:bg-neutral-700/50 transition-colors cursor-pointer group"
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
                                      <p className="text-neutral-400 text-xs">@{student.username}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all ml-auto" />
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                  <p className="text-neutral-400 text-sm">{student.email}</p>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-16 sm:w-24 h-2 bg-neutral-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${student.status === 'completed' ? 'bg-green-500' : 'bg-purple-500'}`}
                                        style={{ width: `${student.progress_percentage}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-white text-xs sm:text-sm">{student.progress_percentage}%</span>
                                  </div>
                                  <p className="text-neutral-500 text-xs mt-1">{student.completed_modules}/{student.total_modules} modules</p>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                  <span className={`px-2 py-1 text-xs rounded-full ${student.status === 'completed' ? 'bg-green-500/15 text-green-300 border border-green-500/30' :
                                    student.status === 'active' ? 'bg-purple-900/50 text-purple-400' :
                                      'bg-neutral-700 text-neutral-400'
                                    }`}>
                                    {student.status}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                                  <p className="text-neutral-400 text-sm">{formatTimeAgo(student.enrolled_at)}</p>
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
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Enrollments</h3>
              <div className="space-y-3">
                {recentEnrollments.slice(0, 5).map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between p-3 bg-neutral-800/60 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{enrollment.student_name}</p>
                      <p className="text-neutral-400 text-sm">{enrollment.career_path_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-400 text-sm">{formatTimeAgo(enrollment.enrolled_at)}</p>
                      <p className="text-xs text-purple-400">{enrollment.progress}% complete</p>
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
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-lg">
              <p className="text-neutral-400 text-xs sm:text-sm mb-1">Total Career Paths</p>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{loading ? '...' : stats.total_paths}</p>
              <p className="text-xs text-green-400 mt-1">{stats.active_paths} active</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-lg">
              <p className="text-neutral-400 text-xs sm:text-sm mb-1">Total Modules</p>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{loading ? '...' : stats.total_modules}</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-lg">
              <p className="text-neutral-400 text-xs sm:text-sm mb-1">Total Quizzes</p>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{loading ? '...' : stats.total_quizzes}</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-lg">
              <p className="text-neutral-400 text-xs sm:text-sm mb-1">Certificates Issued</p>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{loading ? '...' : stats.total_certificates}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Enrollment Statistics</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-300 text-sm sm:text-base">Active Enrollments</span>
                  <span className="text-white font-bold text-sm sm:text-base">{loading ? '...' : stats.total_enrollments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-300 text-sm sm:text-base">Completed Enrollments</span>
                  <span className="text-green-400 font-bold text-sm sm:text-base">{loading ? '...' : stats.completed_enrollments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-300 text-sm sm:text-base">Completion Rate</span>
                  <span className="text-white font-bold text-sm sm:text-base">{loading ? '...' : `${stats.avg_completion_rate}%`}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Top Career Paths</h3>
              {careerPaths.length === 0 ? (
                <p className="text-neutral-400 text-sm">No career paths data available</p>
              ) : (
                <div className="space-y-3">
                  {careerPaths
                    .sort((a, b) => b.enrolled_count - a.enrolled_count)
                    .slice(0, 4)
                    .map((path, index) => (
                      <div key={path.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500 text-sm">#{index + 1}</span>
                          <span className="text-neutral-300 text-sm sm:text-base">{path.name}</span>
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
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Create New Career Path</h3>
              <button onClick={() => setShowCreatePath(false)} className="text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createCareerPath(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Path Name</label>
                <input
                  type="text"
                  value={pathForm.name}
                  onChange={(e) => setPathForm({ ...pathForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                <textarea
                  value={pathForm.description}
                  onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Program Type</label>
                  <select
                    value={pathForm.program_type}
                    onChange={(e) => setPathForm({ ...pathForm, program_type: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  >
                    <option value="bsit">BSIT</option>
                    <option value="bscs">BSCS</option>
                    <option value="bsis">BSIS</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Difficulty Level</label>
                  <select
                    value={pathForm.difficulty_level}
                    onChange={(e) => setPathForm({ ...pathForm, difficulty_level: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Duration (weeks)</label>
                  <input
                    type="number"
                    value={pathForm.estimated_duration}
                    onChange={(e) => setPathForm({ ...pathForm, estimated_duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Max Modules</label>
                  <input
                    type="number"
                    value={pathForm.max_modules}
                    onChange={(e) => setPathForm({ ...pathForm, max_modules: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Points Reward</label>
                  <input
                    type="number"
                    value={pathForm.points_reward}
                    onChange={(e) => setPathForm({ ...pathForm, points_reward: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Certificate Template (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-neutral-300">
                  <input
                    type="checkbox"
                    checked={pathForm.is_active}
                    onChange={(e) => setPathForm({ ...pathForm, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-neutral-300">
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
                <button
                  type="submit"
                  disabled={isCreatingPath}
                  className={`flex-1 px-6 py-3 text-white rounded-lg font-medium flex items-center justify-center gap-2 ${
                    isCreatingPath
                      ? 'bg-purple-600/50 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-500'
                  }`}
                >
                  {isCreatingPath ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Path'
                  )}
                </button>
                <button
                  type="button"
                  disabled={isCreatingPath}
                  onClick={() => !isCreatingPath && setShowCreatePath(false)}
                  className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Create New Quiz</h3>
                <button onClick={() => setShowCreateQuiz(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createQuiz(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Learning Module</label>
                  <select
                    value={quizForm.learning_module}
                    onChange={(e) => setQuizForm({ ...quizForm, learning_module: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    required
                  >
                    <option value="">Select a module</option>
                    {modules.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Quiz Title</label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Time Limit (mins)</label>
                    <input
                      type="number"
                      value={quizForm.time_limit_minutes}
                      onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Passing Score (%)</label>
                    <input
                      type="number"
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Max Attempts</label>
                    <input
                      type="number"
                      value={quizForm.max_attempts}
                      onChange={(e) => setQuizForm({ ...quizForm, max_attempts: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-neutral-300">
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
                    className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold"
                  >
                    {showQuizEditor ? 'Hide Question Editor' : 'Create Questions (Multiple Choice, T/F, Essay)'}
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
                  <button type="button" onClick={() => { setShowCreateQuiz(false); setShowQuizEditor(false); }} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg">
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
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Edit Career Path</h3>
                <button onClick={() => setShowEditPath(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); updateCareerPath(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Path Name</label>
                  <input
                    type="text"
                    value={pathForm.name}
                    onChange={(e) => setPathForm({ ...pathForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                  <textarea
                    value={pathForm.description}
                    onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Program Type</label>
                    <select
                      value={pathForm.program_type}
                      onChange={(e) => setPathForm({ ...pathForm, program_type: e.target.value })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    >
                      <option value="bsit">BSIT</option>
                      <option value="bscs">BSCS</option>
                      <option value="bsis">BSIS</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Difficulty Level</label>
                    <select
                      value={pathForm.difficulty_level}
                      onChange={(e) => setPathForm({ ...pathForm, difficulty_level: e.target.value })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Duration (weeks)</label>
                    <input
                      type="number"
                      value={pathForm.estimated_duration}
                      onChange={(e) => setPathForm({ ...pathForm, estimated_duration: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Max Modules</label>
                    <input
                      type="number"
                      value={pathForm.max_modules}
                      onChange={(e) => setPathForm({ ...pathForm, max_modules: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Points Reward</label>
                    <input
                      type="number"
                      value={pathForm.points_reward}
                      onChange={(e) => setPathForm({ ...pathForm, points_reward: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Certificate Template</label>
                  <input
                    type="file"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  />
                  {editingPath?.certificate_template && (
                    <p className="text-xs text-green-400 mt-1">Current: {editingPath.certificate_template.split('/').pop()}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-neutral-300">
                    <input
                      type="checkbox"
                      checked={pathForm.is_active}
                      onChange={(e) => setPathForm({ ...pathForm, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-neutral-300">
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
                  <button type="submit" className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium">
                    Update Path
                  </button>
                  <button type="button" onClick={() => setShowEditPath(false)} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg">
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
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Edit Quiz</h3>
                <button onClick={() => setShowEditQuiz(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Learning Module</label>
                  <select
                    value={quizForm.learning_module}
                    onChange={(e) => setQuizForm({ ...quizForm, learning_module: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    required
                  >
                    <option value="">Select a module</option>
                    {modules.map((module: any) => (
                      <option key={module.id} value={module.id}>{module.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Quiz Title</label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Time Limit (min)</label>
                    <input
                      type="number"
                      value={quizForm.time_limit_minutes}
                      onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Passing Score (%)</label>
                    <input
                      type="number"
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Max Attempts</label>
                    <input
                      type="number"
                      value={quizForm.max_attempts}
                      onChange={(e) => setQuizForm({ ...quizForm, max_attempts: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-neutral-300">
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
                    className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold"
                  >
                    {showQuizEditor ? 'Hide Question Editor' : 'Edit Questions (Multiple Choice, T/F, Essay)'}
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
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2"
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
                    className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 text-white rounded-lg"
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
          <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Radio className="w-6 h-6 text-amber-400" />
                Create Live Quiz
              </h3>
              <button
                onClick={() => {
                  setShowCreateLiveQuiz(false)
                  resetLiveQuizForm()
                }}
                className="text-neutral-400 hover:text-white"
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
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Quiz Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={liveQuizForm.title}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, title: e.target.value })}
                      placeholder="e.g., Python Basics Quiz"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Quiz Mode Selector */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Quiz Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setLiveQuizForm({ ...liveQuizForm, quiz_mode: 'live' })}
                        className={`p-3 rounded-lg border text-left transition-all ${liveQuizForm.quiz_mode === 'live'
                          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                          : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                          }`}
                      >
                        <div className="text-sm font-semibold text-white flex items-center gap-2"><Radio className="w-4 h-4 text-red-400" /> Live (Host Required)</div>
                        <div className="text-xs text-neutral-400 mt-1">Real-time, instructor-paced via WebSocket</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveQuizForm({ ...liveQuizForm, quiz_mode: 'self_paced' })}
                        className={`p-3 rounded-lg border text-left transition-all ${liveQuizForm.quiz_mode === 'self_paced'
                          ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30'
                          : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                          }`}
                      >
                        <div className="text-sm font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400" /> Self-Paced (Deadline)</div>
                        <div className="text-xs text-neutral-400 mt-1">Students take anytime before deadline</div>
                      </button>
                    </div>
                  </div>

                  {/* Self-paced extra fields */}
                  {liveQuizForm.quiz_mode === 'self_paced' && (
                    <div className="space-y-4 p-4 rounded-lg border border-purple-800/30 bg-purple-950/10">
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Deadline
                        </label>
                        <input
                          type="datetime-local"
                          value={liveQuizForm.deadline || ''}
                          onChange={(e) => setLiveQuizForm({ ...liveQuizForm, deadline: e.target.value || undefined })}
                          className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Time Limit (minutes) — leave empty for no limit
                        </label>
                        <input
                          type="number"
                          value={liveQuizForm.time_limit_minutes || ''}
                          onChange={(e) => setLiveQuizForm({ ...liveQuizForm, time_limit_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="e.g., 30"
                          min={1}
                          max={480}
                          className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={liveQuizForm.description || ''}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, description: e.target.value })}
                      placeholder="Brief description of the quiz..."
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quiz Settings */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Quiz Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      value={liveQuizForm.max_participants}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, max_participants: parseInt(e.target.value) })}
                      min={1}
                      max={500}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Question Time (seconds)
                    </label>
                    <input
                      type="number"
                      value={liveQuizForm.default_question_time}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, default_question_time: parseInt(e.target.value) })}
                      min={5}
                      max={300}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.show_leaderboard}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, show_leaderboard: e.target.checked })}
                      className="w-4 h-4 text-amber-600 bg-neutral-800 border-neutral-700 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-neutral-300">Show leaderboard</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.require_fullscreen}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, require_fullscreen: e.target.checked })}
                      className="w-4 h-4 text-amber-600 bg-neutral-800 border-neutral-700 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-neutral-300">Require fullscreen mode</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.show_correct_answers}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, show_correct_answers: e.target.checked })}
                      className="w-4 h-4 text-amber-600 bg-neutral-800 border-neutral-700 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-neutral-300">Show correct answers after submission</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.allow_late_join}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, allow_late_join: e.target.checked })}
                      className="w-4 h-4 text-amber-600 bg-neutral-800 border-neutral-700 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-neutral-300">Allow late join</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveQuizForm.shuffle_questions}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, shuffle_questions: e.target.checked })}
                      className="w-4 h-4 text-amber-600 bg-neutral-800 border-neutral-700 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-neutral-300">Shuffle question order</span>
                  </label>
                </div>
              </div>

              {/* Phase 2: Security & Anti-Cheat Settings */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" /> Security & Anti-Cheat
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Fullscreen Exit Action
                    </label>
                    <select
                      value={(liveQuizForm as any).fullscreen_exit_action || 'pause'}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, fullscreen_exit_action: e.target.value } as any)}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="warn">Warn only</option>
                      <option value="pause">Pause quiz</option>
                      <option value="close">Close session</option>
                    </select>
                    <p className="text-xs text-neutral-500 mt-1">Action when student exits fullscreen</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Tab Switch / Alt-Tab Action
                    </label>
                    <select
                      value={(liveQuizForm as any).alt_tab_action || 'warn'}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, alt_tab_action: e.target.value } as any)}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="warn">Warn only</option>
                      <option value="shuffle">Shuffle question</option>
                      <option value="close">Close session</option>
                    </select>
                    <p className="text-xs text-neutral-500 mt-1">Action when student switches tabs/windows</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(liveQuizForm as any).enable_code_execution ?? true}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, enable_code_execution: e.target.checked } as any)}
                      className="w-4 h-4 text-amber-600 bg-neutral-800 border-neutral-700 rounded focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-sm text-neutral-300">Enable Code Execution</span>
                      <p className="text-xs text-neutral-500">Allow code questions to be compiled and run against test cases</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(liveQuizForm as any).show_results_to_students ?? false}
                      onChange={(e) => setLiveQuizForm({ ...liveQuizForm, show_results_to_students: e.target.checked } as any)}
                      className="w-4 h-4 text-amber-600 bg-neutral-800 border-neutral-700 rounded focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-sm text-neutral-300">Show Results to Students</span>
                      <p className="text-xs text-neutral-500">If enabled, students see which questions they answered correctly after completing the quiz</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Info Notice */}
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                <p className="text-sm text-purple-300">
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
                  className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createLiveQuiz}
                  disabled={creatingLiveQuiz || !liveQuizForm.title}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
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

      {/* Live Quiz Detail Panel - Landscape Layout */}
      {selectedLiveQuiz && !showQuestionEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{selectedLiveQuiz.title}</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                  <span className={`text-xs sm:text-sm px-2 py-0.5 rounded ${selectedLiveQuiz.is_open ? 'bg-green-500/20 text-green-400' : 'bg-neutral-600/50 text-neutral-400'}`}>
                    {selectedLiveQuiz.status_text || (selectedLiveQuiz.is_open ? 'Active' : 'Closed')}
                  </span>
                  <span className="text-neutral-400 text-xs sm:text-sm">{selectedLiveQuiz.questions_count} questions</span>
                  <span className="text-neutral-500 text-xs font-mono">Code: {selectedLiveQuiz.join_code}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Monitor button — show whenever quiz is active/open */}
                {(selectedLiveQuiz.is_open || selectedLiveQuiz.is_active) && (
                  <button
                    onClick={() => setShowMonitorPanel(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition text-xs font-medium"
                    title="Live anti-cheat monitoring"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Monitor
                  </button>
                )}
                <button
                  onClick={() => { setSelectedLiveQuiz(null); setDetailTab('overview'); setQuizScores([]); }}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition text-neutral-400 hover:text-white flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-700 bg-neutral-800/50">
              <button
                onClick={() => setDetailTab('overview')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 ${detailTab === 'overview' ? 'border-amber-500 text-amber-400' : 'border-transparent text-neutral-400 hover:text-white'}`}
              >
                <Eye className="w-4 h-4" />
                Overview
              </button>
              <button
                onClick={async () => {
                  setDetailTab('scores')
                  if (quizScores.length === 0) {
                    setLoadingScores(true)
                    try {
                      const data = await liveQuizService.getFinalOverview(selectedLiveQuiz.id)
                      setQuizScores(data.leaderboard || [])
                    } catch {
                      setQuizScores([])
                    } finally {
                      setLoadingScores(false)
                    }
                  }
                }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 ${detailTab === 'scores' ? 'border-amber-500 text-amber-400' : 'border-transparent text-neutral-400 hover:text-white'}`}
              >
                <Award className="w-4 h-4" />
                Student Scores
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {detailTab === 'overview' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Join Code & Share */}
                    <div className="bg-neutral-800/50 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-amber-400" />
                        Join Information
                      </h4>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-neutral-500">Join Code</p>
                          <p className="text-2xl font-mono font-bold text-amber-400">{selectedLiveQuiz.join_code}</p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(selectedLiveQuiz.join_code).then(() => toast.success('Code copied!'))}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition flex items-center gap-1.5 text-sm"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </button>
                      </div>
                      <div className="bg-neutral-700/40 rounded-lg p-2.5 flex items-center justify-between gap-2">
                        <p className="text-xs font-mono text-neutral-400 truncate">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/join-quiz/{selectedLiveQuiz.join_code}
                        </p>
                        <button
                          onClick={() => {
                            const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/join-quiz/${selectedLiveQuiz.join_code}`
                            navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'))
                          }}
                          className="px-2 py-1 bg-neutral-600 hover:bg-neutral-500 text-white rounded text-xs flex items-center gap-1 flex-shrink-0"
                        >
                          <Link className="w-3 h-3" />
                          Link
                        </button>
                      </div>
                    </div>

                    {/* Scheduling */}
                    <div className="bg-neutral-800/50 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Scheduling
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-neutral-500 text-xs">Opens At</p>
                          <p className="text-white">{selectedLiveQuiz.scheduled_start ? new Date(selectedLiveQuiz.scheduled_start).toLocaleString() : 'Immediate'}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">Deadline</p>
                          <p className="text-white">{selectedLiveQuiz.deadline ? new Date(selectedLiveQuiz.deadline).toLocaleString() : 'No deadline'}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">Max Retakes</p>
                          <p className="text-white">{selectedLiveQuiz.max_retakes === 0 ? 'Unlimited' : selectedLiveQuiz.max_retakes}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500 text-xs">Time Limit</p>
                          <p className="text-white">{selectedLiveQuiz.time_limit_minutes ? `${selectedLiveQuiz.time_limit_minutes} min` : 'No limit'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="bg-neutral-800/50 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Quiz Settings
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedLiveQuiz.show_leaderboard && <span className="px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs">Leaderboard</span>}
                        {selectedLiveQuiz.require_fullscreen && <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs">Fullscreen</span>}
                        {selectedLiveQuiz.show_correct_answers && <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs">Show Answers</span>}
                        {selectedLiveQuiz.allow_late_join && <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs">Late Join</span>}
                        {selectedLiveQuiz.shuffle_questions && <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs">Shuffle Qs</span>}
                        {selectedLiveQuiz.shuffle_answers && <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs">Shuffle As</span>}
                        {/* Phase 2: anti-cheat badges — icon-only, no emojis */}
                        {selectedLiveQuiz.fullscreen_exit_action && selectedLiveQuiz.fullscreen_exit_action !== 'warn' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs">
                            <ShieldCheck className="w-3 h-3" />
                            FS: {selectedLiveQuiz.fullscreen_exit_action}
                          </span>
                        )}
                        {selectedLiveQuiz.alt_tab_action && selectedLiveQuiz.alt_tab_action !== 'warn' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs">
                            <Eye className="w-3 h-3" />
                            Tab: {selectedLiveQuiz.alt_tab_action}
                          </span>
                        )}
                        {selectedLiveQuiz.enable_code_execution && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs">
                            <Code2 className="w-3 h-3" />
                            Code Exec
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Questions */}
                    <div className="bg-neutral-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Questions
                        </h4>
                        <button
                          onClick={() => setShowQuestionEditor(true)}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg transition text-sm flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          {selectedLiveQuiz.questions_count > 0 ? 'Edit' : 'Add'}
                        </button>
                      </div>
                      {selectedLiveQuiz.questions_count > 0 ? (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-6 text-center">
                          <p className="text-3xl font-bold text-white">{selectedLiveQuiz.questions_count}</p>
                          <p className="text-sm text-neutral-400 mt-1">questions ready</p>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-neutral-500">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No questions yet</p>
                          <p className="text-xs mt-1">Click Add to get started</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-neutral-800/50 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" />
                        Quick Stats
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-neutral-700/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-neutral-500">Max Participants</p>
                          <p className="text-lg font-bold text-white">{selectedLiveQuiz.max_participants}</p>
                        </div>
                        <div className="bg-neutral-700/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-neutral-500">Question Time</p>
                          <p className="text-lg font-bold text-white">{selectedLiveQuiz.default_question_time}s</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-neutral-800/50 rounded-xl p-4 space-y-2">
                      <h4 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Actions
                      </h4>
                      {selectedLiveQuiz.questions_count > 0 && (
                        <button
                          disabled={isStartingQuiz}
                          onClick={async () => {
                            if (!selectedLiveQuiz) return;
                            setIsStartingQuiz(true);
                            try {
                              await api.post(`/learning/live-quiz/${selectedLiveQuiz.id}/start/`);
                              const questions = await liveQuizService.getQuestions(selectedLiveQuiz.id);
                              const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
                              const ws = new WebSocket(`${wsBase}/quiz/${selectedLiveQuiz.join_code}/`);

                              ws.onopen = () => {
                                ws.send(JSON.stringify({ type: 'instructor_join', join_code: selectedLiveQuiz.join_code }));
                                setTimeout(() => {
                                  ws.send(JSON.stringify({ type: 'start_quiz' }));
                                  if (questions.length > 0) {
                                    setTimeout(() => {
                                      ws.send(JSON.stringify({
                                        type: 'next_question',
                                        question: questions[0],
                                        timeLimit: questions[0].time_limit || selectedLiveQuiz.default_question_time || 30,
                                        totalQuestions: questions.length,
                                      }));
                                      setTimeout(() => ws.close(), 3000);
                                    }, 500);
                                  } else {
                                    setTimeout(() => ws.close(), 3000);
                                  }
                                }, 1000);
                                toast.success(`Session started! Code: ${selectedLiveQuiz.join_code}`);
                                setShowMonitorPanel(true);
                                fetchLiveQuizzes();
                              };
                              ws.onerror = () => toast.error('WS connection error.');
                            } catch (e: any) {
                              const msg = e?.response?.data?.error || '';
                              if (msg.includes('active session') || msg.includes('already in progress')) {
                                try {
                                  const questions = await liveQuizService.getQuestions(selectedLiveQuiz.id);
                                  const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
                                  const ws = new WebSocket(`${wsBase}/quiz/${selectedLiveQuiz.join_code}/`);
                                  ws.onopen = () => {
                                    ws.send(JSON.stringify({ type: 'instructor_join', join_code: selectedLiveQuiz.join_code }));
                                    setTimeout(() => {
                                      ws.send(JSON.stringify({ type: 'start_quiz' }));
                                      if (questions.length > 0) {
                                        setTimeout(() => {
                                          ws.send(JSON.stringify({
                                            type: 'next_question',
                                            question: questions[0],
                                            timeLimit: questions[0].time_limit || selectedLiveQuiz.default_question_time || 30,
                                            totalQuestions: questions.length,
                                          }));
                                          setTimeout(() => ws.close(), 3000);
                                        }, 500);
                                      }
                                      toast.success(`Quiz session live! Code: ${selectedLiveQuiz.join_code}`);
                                      fetchLiveQuizzes();
                                    }, 1000);
                                  };
                                } catch { toast.error('Failed to resume session'); }
                              } else {
                                toast.error(msg || 'Failed to start quiz session');
                              }
                            } finally {
                              setIsStartingQuiz(false);
                            }
                          }}
                          className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
                        >
                          {isStartingQuiz
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Play className="w-4 h-4" />
                          }
                          {isStartingQuiz ? 'Starting...' : 'Start Quiz Session'}
                        </button>
                      )}

                      {/* Pause / Resume Session */}
                      {selectedLiveQuiz.is_active && (() => {
                        const sendSessionMsg = (type: string) => {
                          const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
                          const ws = new WebSocket(`${wsBase}/quiz/${selectedLiveQuiz.join_code}/`);
                          ws.onopen = () => {
                            ws.send(JSON.stringify({ type: 'instructor_join' }));
                            setTimeout(() => {
                              ws.send(JSON.stringify({ type }));
                              setTimeout(() => ws.close(), 1500);
                            }, 500);
                          };
                        };
                        return (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                sendSessionMsg('pause_session');
                                toast('Session paused — students are frozen', { icon: '⏸️' });
                              }}
                              className="flex-1 px-3 py-2 bg-amber-600/80 hover:bg-amber-500 text-white rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                              </svg>
                              Pause
                            </button>
                            <button
                              onClick={() => {
                                sendSessionMsg('resume_session');
                                toast('Session resumed!', { icon: '▶️' });
                              }}
                              className="flex-1 px-3 py-2 bg-purple-600/80 hover:bg-purple-500 text-white rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium"
                            >
                              <Play className="w-4 h-4" />
                              Resume
                            </button>
                          </div>
                        );
                      })()}

                      {/* Stop Session */}
                      {selectedLiveQuiz.is_active && (
                        <button
                          onClick={async () => {
                            if (!confirm('Stop the session for all students?')) return;
                            const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
                            const ws = new WebSocket(`${wsBase}/quiz/${selectedLiveQuiz.join_code}/`);
                            ws.onopen = () => {
                              ws.send(JSON.stringify({ type: 'instructor_join' }));
                              setTimeout(() => {
                                ws.send(JSON.stringify({ type: 'end_quiz' }));
                                setTimeout(() => ws.close(), 1500);
                              }, 500);
                            };
                            toast.success('Session ended for all students');
                            fetchLiveQuizzes();
                          }}
                          className="w-full px-4 py-2 bg-red-700/60 hover:bg-red-600 text-red-200 hover:text-white rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="4" y="4" width="16" height="16" rx="2"/>
                          </svg>
                          Stop Session
                        </button>
                      )}


                      {/* Send Next Question button — for multi-question quizzes */}
                      {selectedLiveQuiz.is_active && selectedLiveQuiz.questions_count > 1 && (
                        <button
                          onClick={async () => {
                            if (!selectedLiveQuiz) return;
                            try {
                              const questions = await liveQuizService.getQuestions(selectedLiveQuiz.id);
                              if (questions.length === 0) {
                                toast.error('No questions found');
                                return;
                              }

                              // Prompt for which question to send
                              const currentIndex = prompt(`Enter question number to send (1-${questions.length}):`, '1');
                              if (!currentIndex) return;
                              const idx = parseInt(currentIndex, 10) - 1;
                              if (isNaN(idx) || idx < 0 || idx >= questions.length) {
                                toast.error(`Invalid question number. Must be 1-${questions.length}`);
                                return;
                              }

                              const q = questions[idx];
                              const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
                              const ws = new WebSocket(`${wsBase}/quiz/${selectedLiveQuiz.join_code}/`);
                              ws.onopen = () => {
                                ws.send(JSON.stringify({ type: 'instructor_join', join_code: selectedLiveQuiz.join_code }));
                                ws.send(JSON.stringify({
                                  type: 'next_question',
                                  question: q,
                                  timeLimit: q.time_limit || selectedLiveQuiz.default_question_time || 30,
                                  totalQuestions: questions.length,
                                }));
                                toast.success(`Question ${idx + 1} sent to all students!`);
                              };
                            } catch (err) {
                              toast.error('Failed to send question');
                            }
                          }}
                          className="w-full px-4 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                          Send Next Question
                        </button>
                      )}

                      <button
                        onClick={() => {
                          deleteLiveQuiz(selectedLiveQuiz.id)
                          setSelectedLiveQuiz(null)
                        }}
                        className="w-full px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition flex items-center justify-center gap-2 text-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Quiz
                      </button>
                    </div>
                  </div>
                </div>

              ) : (
                /* Student Scores Tab */
                <div>
                  {/* Header with CSV Export */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      Student Final Scores
                    </h3>
                    {quizScores.length > 0 && (
                      <button
                        onClick={() => {
                          const headers = ['Rank', 'Student Name', 'Score', 'Correct Answers', 'Total Attempted', 'Accuracy (%)', 'Avg Response Time (s)', 'Violations', 'Status']
                          const rows = quizScores.map((s: any, i: number) => [
                            i + 1,
                            '"' + (s.nickname || s.student_info?.username || 'Anonymous') + '"',
                            s.total_score,
                            s.total_correct,
                            s.total_attempted,
                            s.total_attempted > 0 ? ((s.total_correct / s.total_attempted) * 100).toFixed(1) : '0.0',
                            s.average_response_time?.toFixed(1) || '0.0',
                            (s.fullscreen_violations || 0) + (s.tab_switch_count || 0) + (s.copy_paste_attempts || 0),
                            s.is_flagged ? 'Flagged' : 'Clean'
                          ])
                          const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
                          const blob = new Blob([csv], { type: 'text/csv' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${selectedLiveQuiz.title.replace(/[^a-zA-Z0-9]/g, '_')}_scores.csv`
                          a.click()
                          URL.revokeObjectURL(url)
                          toast.success('CSV downloaded!')
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition flex items-center gap-2 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                    )}
                  </div>

                  {loadingScores ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                      <span className="ml-2 text-neutral-400">Loading scores...</span>
                    </div>
                  ) : quizScores.length === 0 ? (
                    <div className="text-center py-16 text-neutral-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-lg font-medium">No student results yet</p>
                      <p className="text-sm mt-1">Scores will appear here after students complete the quiz</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-neutral-700">
                            <th className="text-left py-3 px-3 text-neutral-400 font-medium text-xs uppercase tracking-wider">Rank</th>
                            <th className="text-left py-3 px-3 text-neutral-400 font-medium text-xs uppercase tracking-wider">Student</th>
                            <th className="text-center py-3 px-3 text-neutral-400 font-medium text-xs uppercase tracking-wider">Score</th>
                            <th className="text-center py-3 px-3 text-neutral-400 font-medium text-xs uppercase tracking-wider">Correct</th>
                            <th className="text-center py-3 px-3 text-neutral-400 font-medium text-xs uppercase tracking-wider">Attempted</th>
                            <th className="text-center py-3 px-3 text-neutral-400 font-medium text-xs uppercase tracking-wider">Accuracy</th>
                            <th className="text-center py-3 px-3 text-neutral-400 font-medium text-xs uppercase tracking-wider">Avg Time</th>
                            <th className="text-center py-3 px-3 text-neutral-400 font-medium text-xs uppercase tracking-wider">Violations</th>
                            <th className="text-center py-3 px-3 text-neutral-400 font-medium text-xs uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizScores.map((student: any, index: number) => {
                            const accuracy = student.total_attempted > 0 ? ((student.total_correct / student.total_attempted) * 100).toFixed(1) : '0.0'
                            const violations = (student.fullscreen_violations || 0) + (student.tab_switch_count || 0) + (student.copy_paste_attempts || 0)
                            return (
                              <tr key={student.id || index} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition">
                                <td className="py-3 px-3">
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' :
                                    index === 1 ? 'bg-neutral-400/20 text-neutral-300 ring-1 ring-neutral-400/30' :
                                      index === 2 ? 'bg-amber-600/20 text-amber-400 ring-1 ring-amber-600/30' :
                                        'bg-neutral-700/50 text-neutral-400'
                                    }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <p className="text-white font-medium">{student.nickname || student.student_info?.username || 'Anonymous'}</p>
                                  {student.student_info?.email && <p className="text-xs text-neutral-500">{student.student_info.email}</p>}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="text-white font-bold text-base">{student.total_score}</span>
                                </td>
                                <td className="py-3 px-3 text-center text-green-400">{student.total_correct}</td>
                                <td className="py-3 px-3 text-center text-neutral-300">{student.total_attempted}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${parseFloat(accuracy) >= 80 ? 'bg-green-500/20 text-green-400' :
                                    parseFloat(accuracy) >= 50 ? 'bg-amber-500/20 text-amber-400' :
                                      'bg-red-500/20 text-red-400'
                                    }`}>
                                    {accuracy}%
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center text-neutral-400">{student.average_response_time?.toFixed(1) || '0.0'}s</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={violations > 0 ? 'text-amber-400' : 'text-neutral-500'}>{violations}</span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {student.is_flagged ? (
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">Flagged</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">Clean</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {/* Summary Footer */}
                      <div className="mt-4 pt-4 border-t border-neutral-700 flex flex-wrap items-center gap-6 text-sm text-neutral-400">
                        <span><strong className="text-white">{quizScores.length}</strong> students</span>
                        <span>Avg Score: <strong className="text-white">{(quizScores.reduce((a: number, s: any) => a + s.total_score, 0) / quizScores.length).toFixed(1)}</strong></span>
                        <span>Highest: <strong className="text-green-400">{Math.max(...quizScores.map((s: any) => s.total_score))}</strong></span>
                        <span>Lowest: <strong className="text-red-400">{Math.min(...quizScores.map((s: any) => s.total_score))}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Quiz Question Editor - Full screen modal */}
      {showQuestionEditor && selectedLiveQuiz && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{selectedLiveQuiz.title} — Questions</h3>
              <button
                onClick={() => {
                  setShowQuestionEditor(false)
                }}
                className="p-2 hover:bg-neutral-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <LiveQuizQuestionEditor
              quizId={selectedLiveQuiz.id}
              onClose={() => {
                setShowQuestionEditor(false)
                setSelectedLiveQuiz(null)
              }}
              onQuestionsChange={async () => {
                await fetchLiveQuizzes()
                // Refresh selectedLiveQuiz with updated data from the list
                setLiveQuizzes(prev => {
                  const updated = prev.find(q => q.id === selectedLiveQuiz.id)
                  if (updated) setSelectedLiveQuiz(updated)
                  return prev
                })
                toast.success('Questions updated successfully')
              }}
            />
          </div>
        </div>
      )}

      {/* Quiz Creation Transition Loading */}
      {showQuizTransition && (
        <div className="fixed inset-0 bg-neutral-900/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
            <p className="text-neutral-400 text-sm font-medium">Opening quiz editor...</p>
          </div>
        </div>
      )}
      {/* InstructorMonitorPanel — real-time anti-cheat monitoring */}
      {showMonitorPanel && selectedLiveQuiz && (
        <InstructorMonitorPanel
          joinCode={selectedLiveQuiz.join_code}
          quizTitle={selectedLiveQuiz.title}
          onClose={() => setShowMonitorPanel(false)}
        />
      )}

      {/* Create Challenge Modal */}
      {showCreateChallenge && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Create New Coding Challenge</h3>
              <button onClick={() => setShowCreateChallenge(false)} className="text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitCreateChallenge(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Challenge Title</label>
                <input
                  type="text"
                  value={challengeForm.title}
                  onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g., Two Sum"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                <textarea
                  value={challengeForm.description}
                  onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Given an array of integers nums and an integer target..."
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Difficulty</label>
                  <select
                    value={challengeForm.difficulty}
                    onChange={(e) => setChallengeForm({ ...challengeForm, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Category</label>
                  <select
                    value={challengeForm.category}
                    onChange={(e) => setChallengeForm({ ...challengeForm, category: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  >
                    <option value="basics">Basics</option>
                    <option value="arrays">Arrays</option>
                    <option value="strings">Strings</option>
                    <option value="math">Math</option>
                    <option value="sorting">Sorting</option>
                    <option value="dp">Dynamic Programming</option>
                    <option value="algorithms">Algorithms</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Points Reward</label>
                  <input
                    type="number"
                    value={challengeForm.points}
                    onChange={(e) => setChallengeForm({ ...challengeForm, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Time Limit (seconds)</label>
                  <input
                    type="number"
                    value={challengeForm.time_limit_seconds}
                    onChange={(e) => setChallengeForm({ ...challengeForm, time_limit_seconds: parseInt(e.target.value) || 300 })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    min="10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Constraints (Optional)</label>
                <textarea
                  value={challengeForm.constraints}
                  onChange={(e) => setChallengeForm({ ...challengeForm, constraints: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                  placeholder="1 <= nums.length <= 10^4"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={(challengeForm as any).tags_raw || ''}
                    onChange={(e) => setChallengeForm({ ...challengeForm, tags_raw: e.target.value } as any)}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                    placeholder="hash-map, two-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-neutral-300">Hints (Optional)</label>
                    <button type="button"
                      onClick={() => setChallengeForm({ ...challengeForm, hints: [...((challengeForm as any).hints || []), ''] } as any)}
                      className="text-xs text-purple-400 hover:text-purple-300">+ Add Hint</button>
                  </div>
                  {((challengeForm as any).hints || []).map((hint: string, i: number) => (
                    <input key={i} type="text" value={hint}
                      onChange={(e) => { const h = [...((challengeForm as any).hints || [])]; h[i] = e.target.value; setChallengeForm({ ...challengeForm, hints: h } as any) }}
                      className="w-full px-3 py-1.5 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm mb-1"
                      placeholder={`Hint ${i + 1}...`} />
                  ))}
                </div>
              </div>

              {/* Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-neutral-300">Test Cases</label>
                  <button type="button"
                    onClick={() => setChallengeForm({ ...challengeForm, test_cases: [...challengeForm.test_cases, { input: '', expected_output: '', is_hidden: false }] })}
                    className="px-3 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 text-purple-400 rounded-lg border border-neutral-600 transition"
                  >
                    + Add Test Case
                  </button>
                </div>
                <div className="space-y-3">
                  {challengeForm.test_cases.map((tc, i) => (
                    <div key={i} className="p-3 bg-neutral-900/40 rounded-lg border border-neutral-700/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-500">Test Case {i + 1}</span>
                        <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
                          <input type="checkbox" checked={tc.is_hidden}
                            onChange={(e) => { const t = [...challengeForm.test_cases]; t[i] = { ...t[i], is_hidden: e.target.checked }; setChallengeForm({ ...challengeForm, test_cases: t }) }}
                            className="w-3.5 h-3.5 rounded" />
                          Hidden
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-neutral-500 mb-1 block">Input</label>
                          <input
                            value={tc.input}
                            onChange={(e) => { const t = [...challengeForm.test_cases]; t[i] = { ...t[i], input: e.target.value }; setChallengeForm({ ...challengeForm, test_cases: t }) }}
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            placeholder="e.g., [2,7,11,15], 9"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 mb-1 block">Expected Output</label>
                          <input
                            value={tc.expected_output}
                            onChange={(e) => { const t = [...challengeForm.test_cases]; t[i] = { ...t[i], expected_output: e.target.value }; setChallengeForm({ ...challengeForm, test_cases: t }) }}
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            placeholder="e.g., [0,1]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition">
                  Create Challenge
                </button>
                <button type="button" onClick={() => setShowCreateChallenge(false)} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Go Live Config Modal */}
      {showGoLiveConfig && goLiveChallenge && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Launch Live Challenge</h3>
                <p className="text-sm text-neutral-400 mt-1">{goLiveChallenge.title}</p>
              </div>
              <button onClick={() => setShowGoLiveConfig(false)} className="text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Time & Participants */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Time Limit (seconds)</label>
                  <input
                    type="number"
                    value={goLiveConfig.time_limit_seconds}
                    onChange={(e) => setGoLiveConfig({ ...goLiveConfig, time_limit_seconds: parseInt(e.target.value) || 300 })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    min="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Max Participants</label>
                  <input
                    type="number"
                    value={goLiveConfig.max_participants}
                    onChange={(e) => setGoLiveConfig({ ...goLiveConfig, max_participants: parseInt(e.target.value) || 100 })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    min="1"
                  />
                </div>
              </div>

              {/* Anti-Cheat Section */}
              <div className="border-t border-neutral-700 pt-4">
                <h4 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  Anti-Cheat Settings
                </h4>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={goLiveConfig.require_fullscreen}
                      onChange={(e) => setGoLiveConfig({ ...goLiveConfig, require_fullscreen: e.target.checked })}
                      className="w-4 h-4 text-green-600 bg-neutral-800 border-neutral-700 rounded focus:ring-green-500"
                    />
                    <div>
                      <span className="text-sm text-neutral-300">Require Fullscreen</span>
                      <p className="text-xs text-neutral-500">Students must stay in fullscreen during the challenge</p>
                    </div>
                  </label>

                </div>
              </div>

              {/* Action Selects */}
              {goLiveConfig.require_fullscreen && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Fullscreen Exit Action</label>
                    <select
                      value={goLiveConfig.fullscreen_exit_action}
                      onChange={(e) => setGoLiveConfig({ ...goLiveConfig, fullscreen_exit_action: e.target.value })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="warn">Warn only</option>
                      <option value="pause">Pause session</option>
                      <option value="close">Close session</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Tab Switch Action</label>
                    <select
                      value={goLiveConfig.alt_tab_action}
                      onChange={(e) => setGoLiveConfig({ ...goLiveConfig, alt_tab_action: e.target.value })}
                      className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    >
                      <option value="warn">Warn only</option>
                      <option value="shuffle">Shuffle question</option>
                      <option value="close">Close session</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Max Violations */}
              {goLiveConfig.require_fullscreen && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Max Violations Before Auto-Close</label>
                  <input
                    type="number"
                    value={goLiveConfig.max_violations}
                    onChange={(e) => setGoLiveConfig({ ...goLiveConfig, max_violations: parseInt(e.target.value) || 3 })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                    min="1"
                    max="20"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Student session closes after this many violations</p>
                </div>
              )}

              {/* Launch Button */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={confirmGoLive}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  Launch Live Challenge
                </button>
                <button
                  onClick={() => setShowGoLiveConfig(false)}
                  className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateVideoCourse && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Create New Video Course</h3>
              <button onClick={() => setShowCreateVideoCourse(false)} className="text-neutral-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitCreateVideoCourse(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Course Title</label>
                <input
                  type="text"
                  value={videoCourseForm.title}
                  onChange={(e) => setVideoCourseForm({ ...videoCourseForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g., Complete Python Bootcamp"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                <textarea
                  value={videoCourseForm.description}
                  onChange={(e) => setVideoCourseForm({ ...videoCourseForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Instructor Name</label>
                  <input
                    type="text"
                    value={videoCourseForm.instructor_name}
                    onChange={(e) => setVideoCourseForm({ ...videoCourseForm, instructor_name: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Thumbnail URL (Optional)</label>
                  <input
                    type="url"
                    value={videoCourseForm.thumbnail_url}
                    onChange={(e) => setVideoCourseForm({ ...videoCourseForm, thumbnail_url: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="https://img.youtube.com/..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Category</label>
                  <select
                    value={videoCourseForm.category}
                    onChange={(e) => setVideoCourseForm({ ...videoCourseForm, category: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  >
                    <option value="general">General</option>
                    <option value="web_dev">Web Development</option>
                    <option value="mobile">Mobile</option>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="data_science">Data Science</option>
                    <option value="algorithms">Algorithms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Difficulty Level</label>
                  <select
                    value={videoCourseForm.difficulty}
                    onChange={(e) => setVideoCourseForm({ ...videoCourseForm, difficulty: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Lessons */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-neutral-300">Course Lessons</label>
                  <button type="button"
                    onClick={() => setVideoCourseForm({ ...videoCourseForm, lessons: [...videoCourseForm.lessons, { title: '', video_url: '', duration_minutes: 0 }] })}
                    className="px-3 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 text-purple-400 rounded-lg border border-neutral-600 transition"
                  >
                    + Add Lesson
                  </button>
                </div>
                <div className="space-y-3">
                  {videoCourseForm.lessons.map((lesson, i) => (
                    <div key={i} className="p-3 bg-neutral-900/40 rounded-lg border border-neutral-700/50 space-y-2">
                      <span className="text-xs font-medium text-neutral-500">Lesson {i + 1}</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-neutral-500 mb-1 block">Title</label>
                          <input
                            value={lesson.title}
                            onChange={(e) => { const l = [...videoCourseForm.lessons]; l[i] = { ...l[i], title: e.target.value }; setVideoCourseForm({ ...videoCourseForm, lessons: l }) }}
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            placeholder="e.g., Introduction to Variables"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 mb-1 block">Duration (min)</label>
                          <input
                            type="number"
                            value={lesson.duration_minutes}
                            onChange={(e) => { const l = [...videoCourseForm.lessons]; l[i] = { ...l[i], duration_minutes: parseInt(e.target.value) || 0 }; setVideoCourseForm({ ...videoCourseForm, lessons: l }) }}
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            min="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-500 mb-1 block">YouTube URL</label>
                        <input
                          value={lesson.video_url}
                          onChange={(e) => updateLessonUrl(i, e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition">
                  Create Course
                </button>
                <button type="button" onClick={() => setShowCreateVideoCourse(false)} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default InstructorDashboard

