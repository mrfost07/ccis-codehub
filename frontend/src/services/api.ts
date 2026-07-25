import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and handle FormData
api.interceptors.request.use(
  (config) => {
    // Single storage: sessionStorage is the source of truth (see AuthContext).
    const token = sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // If sending FormData, let the browser set the Content-Type with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Single in-flight refresh shared by all requests that 401 at once.
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = sessionStorage.getItem('refresh_token')
  if (!refresh) return null
  try {
    // Bare axios call so this request doesn't re-enter the interceptor.
    const resp = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
    const newAccess = resp.data?.access
    if (newAccess) sessionStorage.setItem('token', newAccess)
    // Rotation (ROTATE_REFRESH_TOKENS) returns a fresh refresh token too.
    if (resp.data?.refresh) sessionStorage.setItem('refresh_token', resp.data.refresh)
    return newAccess || null
  } catch {
    return null
  }
}

function clearSessionAndRedirect() {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
  sessionStorage.removeItem('refresh_token')
  const path = window.location.pathname + window.location.search
  if (!path.includes('/login') && !path.includes('/register')) {
    // Preserve the originating location so the user returns after login. The
    // Login page reads ?returnUrl to redirect back. (Req 20.2)
    window.location.href = `/login?returnUrl=${encodeURIComponent(path)}`
  }
}

// Response interceptor: refresh-and-retry on 401; never log out on 403. (Req 20, 21)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original: any = error.config
    const status = error.response?.status

    // 403 is an authorization denial (e.g. a student probing an admin-only
    // endpoint), NOT an authentication failure — keep the session. (Req 21)
    if (status === 403) return Promise.reject(error)

    // 401 → try a single refresh, then retry the original request once. The
    // _retry guard prevents an infinite redirect/refresh loop. (Req 20.1, 20.3)
    if (status === 401 && original && !original._retry) {
      original._retry = true
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
      }
      const newAccess = await refreshPromise
      if (newAccess) {
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      }
      clearSessionAndRedirect()
    }

    return Promise.reject(error)
  }
)

// Create a separate API instance WITHOUT auth token for login/register
// This prevents sending stale tokens with auth requests
const noAuthApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Public API (no auth required)
export const publicAPI = {
  getStats: () => noAuthApi.get('/auth/public-stats/'),
}

// Auth API - uses noAuthApi to avoid sending stale tokens
export const authAPI = {
  getCaptchaChallenge: () =>
    noAuthApi.get('/auth/captcha/'),
  login: (email: string, password: string, captcha_token?: string, captcha_answer?: number | null) =>
    noAuthApi.post('/auth/login/', { email, password, captcha_token, captcha_answer }),
  register: (data: {
    email: string;
    username: string;
    password: string;
    confirm_password?: string;
    first_name?: string;
    last_name?: string;
    program?: string;
    year_level?: string;
    role?: string;
    captcha_token?: string;
    captcha_answer?: number | null;
  }) =>
    noAuthApi.post('/auth/register/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data: any) => api.put('/auth/profile/', data),
}

// Learning API
export const learningAPI = {
  getCareerPaths: () => api.get('/learning/career-paths/'),
  getCareerPath: (slug: string) => api.get(`/learning/career-paths/${slug}/`),
  getModules: (params?: any) => api.get('/learning/modules/', { params }),
  completeModule: (id: string) => api.post(`/learning/modules/${id}/complete/`),
  getProgress: () => api.get('/learning/progress/'),
  getCertificates: () => api.get('/learning/certificates/'),

  // Enrollment management
  getEnrollments: () => api.get('/learning/enrollments/'),
  createEnrollment: (careerPathId: string) =>
    api.post('/learning/enrollments/', { career_path: careerPathId, status: 'active' }),
  enrollInPath: (slug: string) =>
    api.post('/learning/enrollments/', { career_path: slug, status: 'active' }),
  getEnrollment: (id: string) => api.get(`/learning/enrollments/${id}/`),
  unenroll: (id: string) => api.post(`/learning/enrollments/${id}/unenroll/`),

  // Module progress
  getModuleProgress: () => api.get('/learning/module-progress/'),
  startModule: (id: string) => api.post(`/learning/module-progress/${id}/start/`),
  completeModuleProgress: (id: string) => api.post(`/learning/module-progress/${id}/complete/`),

  // PDF Content Extraction
  extractFromPDF: (formData: FormData) =>
    api.post('/learning/pdf-extractor/extract/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  createFromExtraction: (data: any) =>
    api.post('/learning/pdf-extractor/create_from_extraction/', data),
}

// Projects API
export const projectsAPI = {
  getProjects: () => api.get('/projects/projects/'),
  createProject: (data: any) => api.post('/projects/projects/', data),
  getProject: (slug: string) => api.get(`/projects/projects/${slug}/`),
  updateProject: (slug: string, data: any) => api.patch(`/projects/projects/${slug}/`, data),
  deleteProject: (slug: string) => api.delete(`/projects/projects/${slug}/`),
  syncGitHub: (slug: string) => api.post(`/projects/projects/${slug}/sync_github/`),

  // Tasks
  getTasks: (projectId?: string) => api.get('/projects/tasks/', { params: { project: projectId } }),
  getTask: (id: string) => api.get(`/projects/tasks/${id}/`),
  createTask: (data: any) => api.post('/projects/tasks/', data),
  updateTask: (id: string, data: any) => api.patch(`/projects/tasks/${id}/`, data),
  deleteTask: (id: string) => api.delete(`/projects/tasks/${id}/`),

  // Task Comments
  getTaskComments: (taskId: string) => api.get('/projects/task-comments/', { params: { task: taskId } }),
  createTaskComment: (data: any) => api.post('/projects/task-comments/', data),
  deleteTaskComment: (id: string) => api.delete(`/projects/task-comments/${id}/`),

  // Team Invitations
  getMyInvitations: () => api.get('/projects/invitations/my_invitations/'),
  getSentInvitations: () => api.get('/projects/invitations/sent/'),
  sendInvitation: (data: { project: string | number; invitee: string | number; role: string; message?: string }) =>
    api.post('/projects/invitations/', data),
  acceptInvitation: (id: string) => api.post(`/projects/invitations/${id}/accept/`),
  declineInvitation: (id: string) => api.post(`/projects/invitations/${id}/decline/`),

  // Branches
  getBranches: (projectId: string) => api.get('/projects/branches/', { params: { project: projectId } }),
  createBranch: (data: { project: string | number; name: string; description?: string }) =>
    api.post('/projects/branches/', data),
  deleteBranch: (id: string) => api.delete(`/projects/branches/${id}/`),

  // Commits
  getCommits: (projectId?: string, branchId?: string) =>
    api.get('/projects/commits/', { params: { project: projectId, branch: branchId } }),
  createCommit: (data: any) => api.post('/projects/commits/', data),

  // Pull Requests
  getPullRequests: (projectId?: string, status?: string) =>
    api.get('/projects/pull-requests/', { params: { project: projectId, status } }),
  getPullRequest: (id: string) => api.get(`/projects/pull-requests/${id}/`),
  createPullRequest: (data: { project: string | number; title: string; description?: string; source_branch: string | number; target_branch: string | number }) =>
    api.post('/projects/pull-requests/', data),
  mergePullRequest: (id: string) => api.post(`/projects/pull-requests/${id}/merge/`),
  closePullRequest: (id: string) => api.post(`/projects/pull-requests/${id}/close/`),
  addReviewer: (id: string, reviewerId: string) => api.post(`/projects/pull-requests/${id}/add_reviewer/`, { reviewer_id: reviewerId }),

  // PR Comments
  getPRComments: (prId: string) => api.get('/projects/pr-comments/', { params: { pull_request: prId } }),
  createPRComment: (data: { pull_request: string | number; content: string }) =>
    api.post('/projects/pr-comments/', data),

  // Files
  getProjectFiles: (projectId: string) => api.get('/projects/files/', { params: { project: projectId } }),
  uploadFile: (data: FormData) => api.post('/projects/files/', data),
  deleteFile: (id: string) => api.delete(`/projects/files/${id}/`),

  // Featured projects (public, with contributor avatars)
  getFeatured: () => api.get('/projects/projects/featured/'),
}

// Teams API - Team-first project management
export const teamsAPI = {
  // Teams
  getTeams: () => api.get('/projects/teams/'),
  getTeam: (slug: string) => api.get(`/projects/teams/${slug}/`),
  createTeam: (data: { name: string; description?: string }) => api.post('/projects/teams/', data),
  updateTeam: (slug: string, data: any) => api.patch(`/projects/teams/${slug}/`, data),
  deleteTeam: (slug: string) => api.delete(`/projects/teams/${slug}/`),

  // Team Members
  inviteMember: (slug: string, data: { user_id: string; role?: string; message?: string }) =>
    api.post(`/projects/teams/${slug}/invite_member/`, data),
  getMembers: (slug: string) => api.get(`/projects/teams/${slug}/members/`),
  getTeamProjects: (slug: string) => api.get(`/projects/teams/${slug}/projects/`),

  // Team Memberships (invitations)
  getMyTeamInvitations: () => api.get('/projects/team-memberships/my_invitations/'),
  acceptTeamInvitation: (id: string) => api.post(`/projects/team-memberships/${id}/accept/`),
  declineTeamInvitation: (id: string) => api.post(`/projects/team-memberships/${id}/decline/`),
}

// Project Notifications API
export const projectNotificationsAPI = {
  getNotifications: () => api.get('/projects/notifications/'),
  getUnread: () => api.get('/projects/notifications/unread/'),
  getUnreadCount: () => api.get('/projects/notifications/unread_count/'),
  markRead: (id: string) => api.post(`/projects/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/projects/notifications/mark_all_read/'),
}

// Community API
export const communityAPI = {
  getPosts: (params?: any) => api.get('/community/posts/', { params }),
  getFeed: () => api.get('/community/posts/feed/'), // Smart feed: following + org posts
  createPost: (data: any) => api.post('/community/posts/', data),
  updatePost: (id: string, data: any) => api.patch(`/community/posts/${id}/`, data),
  deletePost: (id: string) => api.delete(`/community/posts/${id}/`),
  likePost: (id: string) => api.post(`/community/posts/${id}/like/`),
  getComments: (postId: string) => api.get('/community/comments/', { params: { post: postId } }),
  createComment: (data: any) => api.post('/community/comments/', data),
  updateComment: (id: string, content: string) => api.patch(`/community/comments/${id}/`, { content }),
  deleteComment: (id: string) => api.delete(`/community/comments/${id}/`),
  likeComment: (id: string) => api.post(`/community/comments/${id}/like/`),
  getNotifications: () => api.get('/community/notifications/'),
  markNotificationRead: (id: string) => api.post(`/community/notifications/${id}/mark_read/`),
  // Follow API
  followUser: (userId: string) => api.post('/community/follows/follow/', { user_id: userId }),
  unfollowUser: (userId: string) => api.post('/community/follows/unfollow/', { user_id: userId }),
  getFollowers: () => api.get('/community/follows/followers/'),
  getFollowing: () => api.get('/community/follows/following/'),
  getPendingRequests: () => api.get('/community/follows/pending_requests/'),
  getSentRequests: () => api.get('/community/follows/sent_requests/'),
  acceptFollowRequest: (requestId: string) => api.post('/community/follows/accept_request/', { request_id: requestId }),
  rejectFollowRequest: (requestId: string) => api.post('/community/follows/reject_request/', { request_id: requestId }),
  checkFollowing: (userId: string) => api.get(`/community/follows/check/${userId}/`),
  getUserFollowers: (userId: string) => api.get(`/community/follows/user/${userId}/followers/`),
  getUserFollowing: (userId: string) => api.get(`/community/follows/user/${userId}/following/`),
  getSuggestedUsers: () => api.get('/community/follows/suggested_users/'),
  // User profile
  getPublicUserProfile: (userId: string) => api.get(`/auth/user/${userId}/`),
  searchCoders: (query: string) => api.get('/auth/users/search/', { params: { q: query } }),
  // Chat API
  getChatRooms: () => api.get('/community/chat/rooms/'),
  getChatMessages: (roomId: string) => api.get(`/community/chat/rooms/${roomId}/messages/`),
  sendChatMessage: (data: any) => api.post('/community/chat/messages/', data),
  reactToMessage: (messageId: string, reaction: string) => api.post(`/community/chat/messages/${messageId}/react/`, { reaction }),
  bumpMessage: (messageId: string) => api.post(`/community/chat/messages/${messageId}/bump/`),
  deleteMessageForMe: (messageId: string) => api.post(`/community/chat/messages/${messageId}/delete_for_me/`),
  deleteMessageForEveryone: (messageId: string) => api.post(`/community/chat/messages/${messageId}/delete_for_everyone/`),
  getNickname: () => api.get('/community/chat/nicknames/my_nickname/'),
  setNickname: (nickname: string) => api.post('/community/chat/nicknames/my_nickname/', { nickname }),
  // Organization API
  getOrganizations: (params?: any) => api.get('/community/organizations/', { params }),
  getOrganization: (slug: string) => api.get(`/community/organizations/${slug}/`),
  createOrganization: (data: FormData) => api.post('/community/organizations/', data),
  updateOrganization: (slug: string, data: FormData) => api.patch(`/community/organizations/${slug}/`, data),
  joinOrganization: (slug: string) => api.post(`/community/organizations/${slug}/join/`),
  leaveOrganization: (slug: string) => api.post(`/community/organizations/${slug}/leave/`),
  inviteToOrganization: (slug: string, userId: string, message?: string) => api.post(`/community/organizations/${slug}/invite/`, { user_id: userId, message }),
  acceptOrgInvitation: (slug: string) => api.post(`/community/organizations/${slug}/accept_invitation/`),
  declineOrgInvitation: (slug: string) => api.post(`/community/organizations/${slug}/decline_invitation/`),
  approveMember: (slug: string, userId: string) => api.post(`/community/organizations/${slug}/approve_member/`, { user_id: userId }),
  rejectMember: (slug: string, userId: string) => api.post(`/community/organizations/${slug}/reject_member/`, { user_id: userId }),
  setMemberRole: (slug: string, userId: string, role: string) => api.post(`/community/organizations/${slug}/set_role/`, { user_id: userId, role }),
  getOrgMembers: (slug: string, status?: string) => api.get(`/community/organizations/${slug}/members/`, { params: { status } }),
  getOrgPendingRequests: (slug: string) => api.get(`/community/organizations/${slug}/pending_requests/`),
  getMyOrgInvitations: () => api.get('/community/organizations/my_invitations/'),
  getOrgFeed: (orgId: string) => api.get('/community/posts/organization_feed/', { params: { org_id: orgId } }),
}

// AI Mentor API
export const aiAPI = {
  getSessions: () => api.get('/ai/sessions/'),
  getSession: (id: string) => api.get(`/ai/sessions/${id}/`),
  createSession: (data: any) => api.post('/ai/sessions/', data),
  sendMessage: (sessionId: string, message: string, options?: { execute_action?: boolean, current_page?: string }) =>
    api.post(`/ai/sessions/${sessionId}/send_message/`, {
      message,
      execute_action: options?.execute_action || false,
      current_page: options?.current_page || null
    }),
  deleteSession: (id: string) => api.delete(`/ai/sessions/${id}/`),
  updateSession: (id: string, data: { title?: string }) => api.patch(`/ai/sessions/${id}/`, data),
  analyzeCode: (data: any) => api.post('/ai/code-analysis/', data),
  getRecommendations: () => api.get('/ai/recommendations/'),

  // Voice chat — COMING SOON. The backend returns 503 + {coming_soon: true}
  // until ENABLE_VOICE_FEATURES and a TTS key are set, so check status first.
  getVoiceStatus: () => api.get('/ai/voice/status/'),
  voiceChat: (data: { transcript: string, session_id: string, current_page?: string }) =>
    api.post('/ai/voice/', data),
  // Standalone TTS
  textToSpeech: (text: string) =>
    api.post('/ai/tts/', { text }),

  // ── User AI settings (bring-your-own API key) ──────────────────────────
  // GET returns `keys: { <provider>: { configured, preview } }` — never the
  // raw key. POST a provider's key field to save it, or '' to clear it.
  // `selected_model_id` is stored as the profile's preferred AI model.
  getAISettings: () => api.get('/ai/settings/'),
  saveAISettings: (data: Record<string, any>) => api.post('/ai/settings/', data),
}

// Jobs API — Phase 6
export const jobsAPI = {
  getJobs: (params?: { q?: string; type?: string; location?: string; page?: number; page_size?: number }) =>
    api.get('/learning/jobs/', { params }),
  getJob: (id: string) => api.get(`/learning/jobs/${id}/`),
  saveJob: (id: string) => api.post(`/learning/jobs/${id}/save/`),
  unsaveJob: (id: string) => api.post(`/learning/jobs/${id}/unsave/`),
  getSavedJobs: () => api.get('/learning/jobs/saved/'),
  syncJobs: () => api.post('/learning/jobs/sync/'),
}

export default api
