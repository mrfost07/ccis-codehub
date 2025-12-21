/**
 * Custom React Query hooks for data caching across the application
 * 
 * Cache Duration Strategy:
 * - User data: 10 min (rarely changes)
 * - Dashboard stats: 5 min (moderate updates)
 * - Learning paths/modules: 10 min (admin-controlled)
 * - Community posts: 2 min (user-generated, dynamic)
 * - Real-time data (chat): NO CACHING
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

// ===========================================
// CACHE TIME CONSTANTS
// ===========================================

export const CACHE_TIMES = {
    // Long-lived data (10 minutes)
    USER_PROFILE: 10 * 60 * 1000,
    CAREER_PATHS: 10 * 60 * 1000,
    MODULES: 10 * 60 * 1000,

    // Moderate updates (5 minutes)
    DASHBOARD_STATS: 5 * 60 * 1000,
    QUIZZES: 5 * 60 * 1000,
    PROJECTS: 5 * 60 * 1000,

    // Dynamic content (2 minutes)
    COMMUNITY_POSTS: 2 * 60 * 1000,
    LEADERBOARD: 2 * 60 * 1000,

    // Time-sensitive (1 minute)
    NOTIFICATIONS: 1 * 60 * 1000,

    // Garbage collection (30 minutes default)
    GC_TIME: 30 * 60 * 1000,
}

// ===========================================
// QUERY KEYS - Centralized for consistency
// ===========================================

export const QUERY_KEYS = {
    // User
    currentUser: ['currentUser'],
    userProfile: (userId: string) => ['userProfile', userId],
    users: (filters?: any) => ['users', filters],
    followers: (userId: string) => ['followers', userId],
    following: (userId: string) => ['following', userId],

    // Dashboard
    publicStats: ['publicStats'],
    adminStats: ['adminStats'],
    instructorStats: ['instructorStats'],
    studentStats: ['studentStats'],

    // Learning
    careerPaths: (filters?: any) => ['careerPaths', filters],
    careerPath: (pathId: string) => ['careerPath', pathId],
    modules: (filters?: any) => ['modules', filters],
    module: (moduleId: string) => ['module', moduleId],
    quizzes: (filters?: any) => ['quizzes', filters],
    quiz: (quizId: string) => ['quiz', quizId],
    enrollments: ['enrollments'],
    progress: (pathId: string) => ['progress', pathId],

    // Community
    posts: (filters?: any) => ['posts', filters],
    post: (postId: string) => ['post', postId],
    comments: (postId: string) => ['comments', postId],

    // Projects
    projects: (filters?: any) => ['projects', filters],
    project: (projectId: string) => ['project', projectId],
    tasks: (projectId: string) => ['tasks', projectId],
    teams: ['teams'],

    // Leaderboard
    leaderboard: ['leaderboard'],

    // Achievements
    achievements: ['achievements'],
    certificates: ['certificates'],
}

// ===========================================
// USER HOOKS
// ===========================================

export function useCurrentUser() {
    return useQuery({
        queryKey: QUERY_KEYS.currentUser,
        queryFn: async () => {
            const response = await api.get('/auth/profile/')
            return response.data
        },
        staleTime: CACHE_TIMES.USER_PROFILE,
        gcTime: CACHE_TIMES.GC_TIME,
    })
}

export function useUserProfile(userId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.userProfile(userId),
        queryFn: async () => {
            const response = await api.get(`/auth/users/${userId}/`)
            return response.data
        },
        staleTime: CACHE_TIMES.USER_PROFILE,
        enabled: !!userId,
    })
}

export function useUsers(filters?: { role?: string; program?: string; search?: string }) {
    return useQuery({
        queryKey: QUERY_KEYS.users(filters),
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters?.role) params.append('role', filters.role)
            if (filters?.program) params.append('program', filters.program)
            if (filters?.search) params.append('search', filters.search)
            const response = await api.get(`/auth/admin/users/?${params}`)
            return response.data.results || response.data || []
        },
        staleTime: CACHE_TIMES.DASHBOARD_STATS,
    })
}

export function useFollowers(userId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.followers(userId),
        queryFn: async () => {
            const response = await api.get(`/auth/users/${userId}/followers/`)
            return response.data
        },
        staleTime: CACHE_TIMES.USER_PROFILE,
        enabled: !!userId,
    })
}

export function useFollowing(userId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.following(userId),
        queryFn: async () => {
            const response = await api.get(`/auth/users/${userId}/following/`)
            return response.data
        },
        staleTime: CACHE_TIMES.USER_PROFILE,
        enabled: !!userId,
    })
}

// ===========================================
// DASHBOARD HOOKS
// ===========================================

export function usePublicStats() {
    return useQuery({
        queryKey: QUERY_KEYS.publicStats,
        queryFn: async () => {
            const response = await api.get('/auth/public-stats/')
            return response.data
        },
        staleTime: CACHE_TIMES.DASHBOARD_STATS,
    })
}

export function useAdminStats() {
    return useQuery({
        queryKey: QUERY_KEYS.adminStats,
        queryFn: async () => {
            const response = await api.get('/auth/admin/dashboard/')
            return response.data
        },
        staleTime: CACHE_TIMES.DASHBOARD_STATS,
    })
}

export function useInstructorStats() {
    return useQuery({
        queryKey: QUERY_KEYS.instructorStats,
        queryFn: async () => {
            const response = await api.get('/learning/instructor/stats/')
            return response.data
        },
        staleTime: CACHE_TIMES.DASHBOARD_STATS,
    })
}

export function useStudentStats() {
    return useQuery({
        queryKey: QUERY_KEYS.studentStats,
        queryFn: async () => {
            const response = await api.get('/learning/student/dashboard/')
            return response.data
        },
        staleTime: CACHE_TIMES.DASHBOARD_STATS,
    })
}

// ===========================================
// LEARNING HOOKS
// ===========================================

export function useCareerPaths(filters?: { program?: string; difficulty?: string; search?: string }) {
    return useQuery({
        queryKey: QUERY_KEYS.careerPaths(filters),
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters?.program) params.append('program_type', filters.program)
            if (filters?.difficulty) params.append('difficulty_level', filters.difficulty)
            if (filters?.search) params.append('search', filters.search)

            // Try admin endpoint first, fall back to regular
            try {
                const response = await api.get(`/learning/admin/career-paths/?${params}`)
                return response.data.results || response.data || []
            } catch {
                const response = await api.get(`/learning/career-paths/?${params}`)
                return response.data.results || response.data || []
            }
        },
        staleTime: CACHE_TIMES.CAREER_PATHS,
    })
}

export function useCareerPath(pathId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.careerPath(pathId),
        queryFn: async () => {
            const response = await api.get(`/learning/career-paths/${pathId}/`)
            return response.data
        },
        staleTime: CACHE_TIMES.CAREER_PATHS,
        enabled: !!pathId,
    })
}

export function useModules(filters?: { pathId?: string; type?: string; difficulty?: string }) {
    return useQuery({
        queryKey: QUERY_KEYS.modules(filters),
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters?.pathId) params.append('career_path', filters.pathId)
            if (filters?.type) params.append('module_type', filters.type)
            if (filters?.difficulty) params.append('difficulty_level', filters.difficulty)

            try {
                const response = await api.get(`/learning/admin/modules/?${params}`)
                return response.data.results || response.data || []
            } catch {
                const response = await api.get(`/learning/modules/?${params}`)
                return response.data.results || response.data || []
            }
        },
        staleTime: CACHE_TIMES.MODULES,
    })
}

export function useModule(moduleId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.module(moduleId),
        queryFn: async () => {
            const response = await api.get(`/learning/modules/${moduleId}/`)
            return response.data
        },
        staleTime: CACHE_TIMES.MODULES,
        enabled: !!moduleId,
    })
}

export function useQuizzes(filters?: { moduleId?: string; pathId?: string }) {
    return useQuery({
        queryKey: QUERY_KEYS.quizzes(filters),
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters?.moduleId) params.append('learning_module', filters.moduleId)
            if (filters?.pathId) params.append('career_path', filters.pathId)
            const response = await api.get(`/learning/quizzes/?${params}`)
            return response.data.results || response.data || []
        },
        staleTime: CACHE_TIMES.QUIZZES,
    })
}

export function useEnrollments() {
    return useQuery({
        queryKey: QUERY_KEYS.enrollments,
        queryFn: async () => {
            const response = await api.get('/learning/enrollments/')
            return response.data.results || response.data || []
        },
        staleTime: CACHE_TIMES.DASHBOARD_STATS,
    })
}

// ===========================================
// COMMUNITY HOOKS
// ===========================================

export function usePosts(filters?: { page?: number; search?: string }) {
    return useQuery({
        queryKey: QUERY_KEYS.posts(filters),
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters?.page) params.append('page', filters.page.toString())
            if (filters?.search) params.append('search', filters.search)
            const response = await api.get(`/community/posts/?${params}`)
            return response.data
        },
        staleTime: CACHE_TIMES.COMMUNITY_POSTS,
    })
}

export function usePost(postId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.post(postId),
        queryFn: async () => {
            const response = await api.get(`/community/posts/${postId}/`)
            return response.data
        },
        staleTime: CACHE_TIMES.COMMUNITY_POSTS,
        enabled: !!postId,
    })
}

// ===========================================
// PROJECT HOOKS
// ===========================================

export function useProjects(filters?: { status?: string; search?: string }) {
    return useQuery({
        queryKey: QUERY_KEYS.projects(filters),
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters?.status) params.append('status', filters.status)
            if (filters?.search) params.append('search', filters.search)
            const response = await api.get(`/projects/projects/?${params}`)
            return response.data.results || response.data || []
        },
        staleTime: CACHE_TIMES.PROJECTS,
    })
}

export function useProject(projectId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.project(projectId),
        queryFn: async () => {
            const response = await api.get(`/projects/projects/${projectId}/`)
            return response.data
        },
        staleTime: CACHE_TIMES.PROJECTS,
        enabled: !!projectId,
    })
}

export function useTeams() {
    return useQuery({
        queryKey: QUERY_KEYS.teams,
        queryFn: async () => {
            const response = await api.get('/projects/teams/')
            return response.data.results || response.data || []
        },
        staleTime: CACHE_TIMES.PROJECTS,
    })
}

export function useAllTasks() {
    return useQuery({
        queryKey: ['allTasks'],
        queryFn: async () => {
            const response = await api.get('/projects/tasks/')
            return response.data.results || response.data || []
        },
        staleTime: CACHE_TIMES.PROJECTS,
    })
}

// ===========================================
// LEADERBOARD & ACHIEVEMENTS
// ===========================================

export function useLeaderboard() {
    return useQuery({
        queryKey: QUERY_KEYS.leaderboard,
        queryFn: async () => {
            const response = await api.get('/points/leaderboard/')
            return response.data
        },
        staleTime: CACHE_TIMES.LEADERBOARD,
    })
}

export function useAchievements() {
    return useQuery({
        queryKey: QUERY_KEYS.achievements,
        queryFn: async () => {
            const response = await api.get('/points/achievements/')
            return response.data
        },
        staleTime: CACHE_TIMES.DASHBOARD_STATS,
    })
}

export function useCertificates() {
    return useQuery({
        queryKey: QUERY_KEYS.certificates,
        queryFn: async () => {
            const response = await api.get('/learning/certificates/')
            return response.data.results || response.data || []
        },
        staleTime: CACHE_TIMES.USER_PROFILE,
    })
}

// ===========================================
// CACHE INVALIDATION HELPERS
// ===========================================

export function useInvalidateCache() {
    const queryClient = useQueryClient()

    return {
        // Invalidate specific query
        invalidate: (queryKey: unknown[]) => {
            queryClient.invalidateQueries({ queryKey })
        },

        // Invalidate all learning-related caches
        invalidateLearning: () => {
            queryClient.invalidateQueries({ queryKey: ['careerPaths'] })
            queryClient.invalidateQueries({ queryKey: ['modules'] })
            queryClient.invalidateQueries({ queryKey: ['quizzes'] })
            queryClient.invalidateQueries({ queryKey: ['enrollments'] })
        },

        // Invalidate all community-related caches
        invalidateCommunity: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] })
            queryClient.invalidateQueries({ queryKey: ['comments'] })
        },

        // Invalidate all project-related caches
        invalidateProjects: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['teams'] })
        },

        // Invalidate user-related caches
        invalidateUser: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] })
            queryClient.invalidateQueries({ queryKey: ['userProfile'] })
            queryClient.invalidateQueries({ queryKey: ['followers'] })
            queryClient.invalidateQueries({ queryKey: ['following'] })
        },

        // Invalidate dashboard stats
        invalidateStats: () => {
            queryClient.invalidateQueries({ queryKey: ['adminStats'] })
            queryClient.invalidateQueries({ queryKey: ['instructorStats'] })
            queryClient.invalidateQueries({ queryKey: ['studentStats'] })
        },

        // Force refetch everything
        invalidateAll: () => {
            queryClient.invalidateQueries()
        },
    }
}

// ===========================================
// PREFETCH HELPERS
// ===========================================

export function usePrefetch() {
    const queryClient = useQueryClient()

    return {
        // Prefetch career paths on hover/focus
        prefetchCareerPaths: () => {
            queryClient.prefetchQuery({
                queryKey: QUERY_KEYS.careerPaths(),
                queryFn: async () => {
                    const response = await api.get('/learning/career-paths/')
                    return response.data.results || response.data || []
                },
                staleTime: CACHE_TIMES.CAREER_PATHS,
            })
        },

        // Prefetch a specific path detail
        prefetchCareerPath: (pathId: string) => {
            queryClient.prefetchQuery({
                queryKey: QUERY_KEYS.careerPath(pathId),
                queryFn: async () => {
                    const response = await api.get(`/learning/career-paths/${pathId}/`)
                    return response.data
                },
                staleTime: CACHE_TIMES.CAREER_PATHS,
            })
        },
    }
}
