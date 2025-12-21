/**
 * Admin Dashboard Shared Types
 * 
 * Centralized type definitions for all admin dashboard components
 */

// Dashboard Statistics
export interface DashboardStats {
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

// Career Path Form
export interface PathForm {
    name: string
    description: string
    program_type: string
    difficulty_level: string
    estimated_duration: number
    max_modules: number
    points_reward: number
    is_active: boolean
    is_featured: boolean
}

// Module Form
export interface ModuleForm {
    career_path: string
    title: string
    description: string
    module_type: string
    difficulty_level: string
    content: string
    duration_minutes: number
    points_reward: number
    order: number
    is_locked: boolean
}

// Quiz Form
export interface QuizForm {
    learning_module: string
    title: string
    description: string
    content: string
    time_limit_minutes: number
    passing_score: number
    max_attempts: number
    randomize_questions: boolean
}

// Delete Modal State
export interface DeleteModalState {
    isOpen: boolean
    userId: string
    username: string
}

// Stat Card for Overview
export interface StatCard {
    icon: React.ElementType
    label: string
    value: number
    color: string
}

// Management Section (Tab definition)
export interface ManagementSection {
    id: string
    label: string
    icon: React.ElementType
}

// User Data (simplified)
export interface AdminUser {
    id: string
    username: string
    email: string
    role: string
    program?: string
    is_active: boolean
}

// Career Path
export interface CareerPath {
    id: string
    name: string
    description: string
    program_type: string
    difficulty_level: string
    estimated_duration: number
    max_modules: number
    points_reward: number
    is_active: boolean
    is_featured: boolean
    certificate_template?: string
}

// Learning Module
export interface LearningModule {
    id: string
    career_path: string
    career_path_name?: string
    title: string
    description: string
    module_type: string
    difficulty_level: string
    content: string
    duration_minutes: number
    points_reward: number
    order: number
    is_locked: boolean
}

// Quiz
export interface Quiz {
    id: string
    learning_module: string
    title: string
    description: string
    content: string
    time_limit_minutes: number
    passing_score: number
    max_attempts: number
    randomize_questions: boolean
}

// Quiz Question
export interface QuizQuestion {
    id: string
    title: string
    content: string
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'enumeration'
    choices?: QuizChoice[]
    points: number
}

export interface QuizChoice {
    id: string
    text: string
    isCorrect: boolean
}

// Learning Stats
export interface LearningStats {
    totalPaths: number
    activePaths: number
    totalModules: number
    totalEnrollments: number
}

// Default form values
export const defaultPathForm: PathForm = {
    name: '',
    description: '',
    program_type: 'bsit',
    difficulty_level: 'beginner',
    estimated_duration: 4,
    max_modules: 0,
    points_reward: 100,
    is_active: true,
    is_featured: false
}

export const defaultModuleForm: ModuleForm = {
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
}

export const defaultQuizForm: QuizForm = {
    learning_module: '',
    title: '',
    description: '',
    content: '',
    time_limit_minutes: 30,
    passing_score: 70,
    max_attempts: 3,
    randomize_questions: true
}
