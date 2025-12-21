/**
 * Admin Dashboard (New Version with Sidenav)
 * 
 * This is the new admin dashboard that uses the AdminSidenav layout
 * and imports extracted tab/modal components.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

// Layout
import { AdminSidenav } from '../components/layout'

// Existing full components
import ModuleFormWithEditor from '../components/ModuleFormWithEditor'
import QuizEditor from '../components/QuizEditor'
import AdminAnalytics from '../components/AdminAnalytics'
import LearningAnalytics from '../components/LearningAnalytics'
import ProjectAdmin from '../components/ProjectAdmin'
import ContentModeration from '../components/ContentModeration'

// Extracted admin components
import {
    AdminOverviewTab,
    AdminUsersTab,
    AdminSettingsTab,
    DeleteUserModal,
    CreatePathModal,
    EditPathModal,
    type DashboardStats,
    type PathForm,
    type QuizForm,
    type DeleteModalState,
    type CareerPath,
    defaultPathForm,
    defaultQuizForm
} from './admin'

// API
import api from '../services/api'

export default function AdminDashboard() {
    const navigate = useNavigate()

    // Core state
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

    // Data arrays
    const [users, setUsers] = useState<any[]>([])
    const [paths, setPaths] = useState<any[]>([])
    const [modules, setModules] = useState<any[]>([])
    const [quizzes, setQuizzes] = useState<any[]>([])

    // User management state
    const [filteredUsers, setFilteredUsers] = useState<any[]>([])
    const [userSearchTerm, setUserSearchTerm] = useState('')
    const [userRoleFilter, setUserRoleFilter] = useState('')
    const [userProgramFilter, setUserProgramFilter] = useState('')
    const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
        isOpen: false,
        userId: '',
        username: ''
    })
    const [isDeleting, setIsDeleting] = useState(false)

    // Learning admin state
    const [learningView, setLearningView] = useState('overview')
    const [showCreatePath, setShowCreatePath] = useState(false)
    const [showCreateModule, setShowCreateModule] = useState(false)
    const [showCreateQuiz, setShowCreateQuiz] = useState(false)
    const [showEditPath, setShowEditPath] = useState(false)
    const [showEditModule, setShowEditModule] = useState(false)
    const [showEditQuiz, setShowEditQuiz] = useState(false)
    const [editingPath, setEditingPath] = useState<CareerPath | null>(null)
    const [editingModule, setEditingModule] = useState<any>(null)
    const [editingQuiz, setEditingQuiz] = useState<any>(null)
    const [pathForm, setPathForm] = useState<PathForm>(defaultPathForm)
    const [quizForm, setQuizForm] = useState<QuizForm>(defaultQuizForm)
    const [certificateFile, setCertificateFile] = useState<File | null>(null)
    const [selectedPathId, setSelectedPathId] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [quizQuestions, setQuizQuestions] = useState<any[]>([])
    const [showQuizEditor, setShowQuizEditor] = useState(false)
    const [creatingQuiz, setCreatingQuiz] = useState(false)
    const [updatingQuiz, setUpdatingQuiz] = useState(false)

    // Feature flag
    const isUserDeleteEnabled = import.meta.env.VITE_ENABLE_USER_DELETE === 'true'

    // Initial data fetch
    useEffect(() => {
        fetchDashboardStats()
        checkAdminAccess()
    }, [])

    // Tab-based data fetch
    useEffect(() => {
        if (activeTab === 'users') fetchUsers()
        else if (activeTab === 'learning') fetchLearningData()
    }, [activeTab])

    // Learning view data fetch
    useEffect(() => {
        if (activeTab === 'learning') {
            if (learningView === 'modules') fetchModules()
            else if (learningView === 'quizzes') fetchQuizzes()
        }
    }, [learningView, activeTab])

    // ==================== FETCH FUNCTIONS ====================
    const checkAdminAccess = async () => {
        try {
            const response = await api.get('/auth/profile/')
            if (response.data.role !== 'admin') navigate('/dashboard')
        } catch (error: any) {
            if (error.response?.status === 401) navigate('/login')
            else navigate('/login')
        }
    }

    const fetchDashboardStats = async () => {
        try {
            setLoading(true)
            const [dashboardRes, pathsRes, modulesRes, postsRes] = await Promise.all([
                api.get('/auth/admin/dashboard/').catch(() => ({ data: {} })),
                api.get('/learning/career-paths/').catch(() => ({ data: [] })),
                api.get('/learning/modules/').catch(() => ({ data: [] })),
                api.get('/community/posts/').catch(() => ({ data: [] }))
            ])

            const pathsData = pathsRes.data.results || pathsRes.data || []
            const postsData = postsRes.data.results || postsRes.data || []

            setStats({
                totalUsers: dashboardRes.data.totalUsers || 0,
                totalStudents: dashboardRes.data.totalStudents || 0,
                totalInstructors: dashboardRes.data.totalInstructors || 0,
                totalCourses: pathsData.length || 0,
                totalProjects: dashboardRes.data.totalProjects || 0,
                activeCompetitions: dashboardRes.data.activeCompetitions || 0,
                communityPosts: postsData.length || 0,
                aiInteractions: dashboardRes.data.aiInteractions || 0,
                recentActivities: dashboardRes.data.recentActivities || []
            })
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

    const fetchLearningData = async () => {
        try {
            let pathsRes, modulesRes
            try {
                pathsRes = await api.get('/learning/admin/career-paths/')
            } catch {
                pathsRes = await api.get('/learning/career-paths/')
            }
            try {
                modulesRes = await api.get('/learning/admin/modules/')
            } catch {
                modulesRes = await api.get('/learning/modules/')
            }

            setPaths(pathsRes.data.results || pathsRes.data || [])
            setModules(modulesRes.data.results || modulesRes.data || [])
        } catch (error) {
            console.error('Failed to fetch learning data:', error)
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

    // ==================== USER MANAGEMENT ====================
    const filterUsers = (search: string, role: string, program: string) => {
        let filtered = users
        if (search) {
            filtered = filtered.filter(u =>
                u.username.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase())
            )
        }
        if (role) filtered = filtered.filter(u => u.role === role)
        if (program) filtered = filtered.filter(u => u.program === program)
        setFilteredUsers(filtered)
    }

    const handleUserSearchChange = (term: string) => {
        setUserSearchTerm(term)
        filterUsers(term, userRoleFilter, userProgramFilter)
    }

    const handleUserRoleFilterChange = (role: string) => {
        setUserRoleFilter(role)
        filterUsers(userSearchTerm, role, userProgramFilter)
    }

    const handleUserProgramFilterChange = (program: string) => {
        setUserProgramFilter(program)
        filterUsers(userSearchTerm, userRoleFilter, program)
    }

    const handleToggleUserStatus = async (userId: string) => {
        try {
            const response = await api.post(`/auth/users/${userId}/toggle_status/`)
            const updatedUser = response.data.user
            setUsers(users.map(u => u.id === userId ? updatedUser : u))
            setFilteredUsers(filteredUsers.map(u => u.id === userId ? updatedUser : u))
            toast.success(response.data.message)
            fetchDashboardStats()
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to toggle user status')
        }
    }

    const handleChangeUserRole = async (userId: string, newRole: string) => {
        try {
            const response = await api.post(`/auth/users/${userId}/change_role/`, { role: newRole })
            setUsers(users.map(u => u.id === userId ? response.data.user : u))
            setFilteredUsers(filteredUsers.map(u => u.id === userId ? response.data.user : u))
            toast.success(`User role changed to ${newRole}`)
            fetchDashboardStats()
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to change user role')
        }
    }

    const handleDeleteUser = async () => {
        if (!isUserDeleteEnabled || !deleteModal.userId) return
        setIsDeleting(true)
        try {
            await api.delete(`/auth/users/${deleteModal.userId}/`)
            setUsers(users.filter(u => u.id !== deleteModal.userId))
            setFilteredUsers(filteredUsers.filter(u => u.id !== deleteModal.userId))
            toast.success(`User "${deleteModal.username}" has been deleted`)
            fetchDashboardStats()
            setDeleteModal({ isOpen: false, userId: '', username: '' })
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete user')
        } finally {
            setIsDeleting(false)
        }
    }

    // ==================== PATH MANAGEMENT ====================
    const handlePathFormChange = (updates: Partial<PathForm>) => {
        setPathForm(prev => ({ ...prev, ...updates }))
    }

    const resetPathForm = () => setPathForm(defaultPathForm)

    const createCareerPath = async () => {
        try {
            let response
            if (certificateFile) {
                const formData = new FormData()
                Object.entries(pathForm).forEach(([key, value]) => formData.append(key, String(value)))
                formData.append('certificate_template', certificateFile)
                response = await api.post('/learning/admin/career-paths/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
            } else {
                response = await api.post('/learning/admin/career-paths/', pathForm)
            }

            await fetchLearningData()
            setShowCreatePath(false)
            resetPathForm()
            setCertificateFile(null)
            toast.success('Career path created successfully')
        } catch (error: any) {
            if (error.response?.status === 400 && error.response?.data?.slug) {
                toast.error(`Path name conflict: A career path with this name already exists.`)
            } else {
                toast.error(error.response?.data?.detail || 'Failed to create career path')
            }
        }
    }

    const handleEditPath = (path: any) => {
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
        if (!editingPath) return
        try {
            let response
            if (certificateFile) {
                const formData = new FormData()
                Object.entries(pathForm).forEach(([key, value]) => formData.append(key, String(value)))
                formData.append('certificate_template', certificateFile)
                response = await api.patch(`/learning/admin/career-paths/${editingPath.id}/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
            } else {
                response = await api.patch(`/learning/admin/career-paths/${editingPath.id}/`, pathForm)
            }

            setPaths(paths.map(p => p.id === editingPath.id ? response.data : p))
            setShowEditPath(false)
            setEditingPath(null)
            resetPathForm()
            setCertificateFile(null)
            toast.success('Career path updated successfully')
            await fetchLearningData()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to update path')
        }
    }

    const handleDeletePath = async (pathId: string) => {
        if (!confirm('Are you sure you want to delete this path?')) return
        try {
            await api.delete(`/learning/admin/career-paths/${pathId}/`)
            await fetchLearningData()
            toast.success('Path deleted successfully')
        } catch {
            try {
                await api.delete(`/learning/career-paths/${pathId}/`)
                await fetchLearningData()
                toast.success('Path deleted successfully')
            } catch {
                toast.error('Failed to delete path')
            }
        }
    }

    const togglePathStatus = async (id: string) => {
        if (!id) return toast.error('Invalid path ID')
        try {
            const response = await api.post(`/learning/admin/career-paths/${id}/publish/`)
            await fetchLearningData()
            toast.success(response.data.message || 'Path status updated')
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to toggle status')
        }
    }

    // ==================== MODULE MANAGEMENT ====================
    const handleEditModule = async (module: any) => {
        try {
            const response = await api.get(`/learning/admin/modules/${module.id}/`)
            setEditingModule(response.data)
            setShowEditModule(true)
        } catch (error: any) {
            toast.error('Failed to load module for editing')
        }
    }

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm('Delete this module?')) return
        try {
            await api.delete(`/learning/admin/modules/${moduleId}/`)
            await fetchModules()
            toast.success('Module deleted')
        } catch {
            try {
                await api.delete(`/learning/modules/${moduleId}/`)
                await fetchModules()
                toast.success('Module deleted')
            } catch {
                toast.error('Failed to delete module')
            }
        }
    }

    // ==================== QUIZ MANAGEMENT ====================
    const handleEditQuiz = (quiz: any) => {
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
        setQuizQuestions([])
        setShowQuizEditor(true)
        setShowEditQuiz(true)
    }

    const handleDeleteQuiz = async (quizId: string) => {
        if (!confirm('Delete this quiz?')) return
        try {
            await api.delete(`/learning/quizzes/${quizId}/`)
            await fetchQuizzes()
            toast.success('Quiz deleted')
        } catch {
            toast.error('Failed to delete quiz')
        }
    }

    // Filter modules by path
    const filteredModules = selectedPathId
        ? modules.filter((m: any) => m.career_path === selectedPathId)
        : modules

    return (
        <AdminSidenav activeTab={activeTab} onTabChange={setActiveTab}>
            <div className="space-y-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <AdminOverviewTab stats={stats} loading={loading} />
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <AdminUsersTab
                        users={users}
                        filteredUsers={filteredUsers}
                        userSearchTerm={userSearchTerm}
                        userRoleFilter={userRoleFilter}
                        userProgramFilter={userProgramFilter}
                        isUserDeleteEnabled={isUserDeleteEnabled}
                        onSearchChange={handleUserSearchChange}
                        onRoleFilterChange={handleUserRoleFilterChange}
                        onProgramFilterChange={handleUserProgramFilterChange}
                        onToggleUserStatus={handleToggleUserStatus}
                        onChangeUserRole={handleChangeUserRole}
                        onOpenDeleteModal={(id, name) => setDeleteModal({ isOpen: true, userId: id, username: name })}
                    />
                )}

                {/* Learning Tab - Analytics Only (Full admin in InstructorDashboard) */}
                {activeTab === 'learning' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Learning Analytics</h2>
                            <p className="text-sm text-slate-400">Manage learning content in Instructor Dashboard</p>
                        </div>
                        <LearningAnalytics />
                    </div>
                )}

                {/* Projects Tab */}
                {activeTab === 'projects' && (
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg">
                        <h2 className="text-2xl font-bold text-white mb-6">Project Admin</h2>
                        <ProjectAdmin />
                    </div>
                )}

                {/* Content Tab */}
                {activeTab === 'content' && <ContentModeration />}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && <AdminAnalytics />}

                {/* Settings Tab */}
                {activeTab === 'settings' && <AdminSettingsTab />}
            </div>

            {/* Modals */}
            <DeleteUserModal
                deleteModal={deleteModal}
                isDeleting={isDeleting}
                onClose={() => !isDeleting && setDeleteModal({ isOpen: false, userId: '', username: '' })}
                onConfirm={handleDeleteUser}
            />

            <CreatePathModal
                isOpen={showCreatePath}
                pathForm={pathForm}
                certificateFile={certificateFile}
                onFormChange={handlePathFormChange}
                onCertificateChange={setCertificateFile}
                onSubmit={createCareerPath}
                onClose={() => setShowCreatePath(false)}
            />

            <EditPathModal
                isOpen={showEditPath}
                editingPath={editingPath}
                pathForm={pathForm}
                certificateFile={certificateFile}
                onFormChange={handlePathFormChange}
                onCertificateChange={setCertificateFile}
                onSubmit={updateCareerPath}
                onClose={() => setShowEditPath(false)}
            />

            {/* Module Modal */}
            {showCreateModule && (
                <ModuleFormWithEditor
                    careerPaths={paths}
                    onClose={() => setShowCreateModule(false)}
                    onSuccess={() => { fetchModules(); setShowCreateModule(false) }}
                />
            )}

            {showEditModule && editingModule && (
                <ModuleFormWithEditor
                    careerPaths={paths}
                    editingModule={editingModule}
                    onClose={() => { setShowEditModule(false); setEditingModule(null) }}
                    onSuccess={() => { fetchModules(); setShowEditModule(false); setEditingModule(null) }}
                />
            )}
        </AdminSidenav>
    )
}
