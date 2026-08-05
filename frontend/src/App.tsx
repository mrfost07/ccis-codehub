import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { LoadingState } from './components/ui'
import FloatingAIMentor from './components/FloatingAIMentor'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import HomeEnhanced from './pages/HomeEnhanced'
import Login from './pages/Login'
import Register from './pages/Register'
// Lazy-load heavy pages so Prism.js + Monaco editor only download when needed.
// The live/self-paced sessions embed the Monaco editor for coding questions, so
// keeping them lazy keeps Monaco out of the initial bundle.
const CodingChallengePage = lazy(() => import('./pages/CodingChallengePage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const StudentLearningDashboard = lazy(() => import('./pages/StudentLearningDashboard'))
const QuizTaking = lazy(() => import('./pages/QuizTaking'))
const PathDetailEnhanced = lazy(() => import('./pages/PathDetailEnhanced'))
const ModuleLearningEnhanced = lazy(() => import('./pages/ModuleLearningEnhanced'))
const LearningEnhanced = lazy(() => import('./pages/LearningEnhanced'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const JoinQuiz = lazy(() => import('./pages/JoinQuiz'))
const QuizLobby = lazy(() => import('./pages/QuizLobby'))
const QuizResults = lazy(() => import('./pages/QuizResults'))
const VideoCoursePage = lazy(() => import('./pages/VideoCoursePage'))
const LiveQuizSession = lazy(() => import('./pages/LiveQuizSession'))
const SelfPacedQuizSession = lazy(() => import('./pages/SelfPacedQuizSession'))
// Secondary / role-specific pages — kept out of the initial student bundle.
// The admin/instructor dashboards and community moderation pull in recharts.
const AdminDashboard = lazy(() => import('./pages/AdminDashboardNew'))
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'))
const Certificates = lazy(() => import('./pages/Certificates'))
// Lazy: the career map is a browse screen most sessions never open, and it
// should not sit in the main bundle.
const CareerMap = lazy(() => import('./pages/CareerMap'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const QuestionManagement = lazy(() => import('./pages/QuestionManagement'))
const ProjectsEnhanced = lazy(() => import('./pages/ProjectsEnhanced'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const CommunityEnhanced = lazy(() => import('./pages/CommunityEnhanced'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ProfileEnhanced = lazy(() => import('./pages/ProfileEnhanced'))
const UserProfileView = lazy(() => import('./pages/UserProfileView'))
const QuizAnalytics = lazy(() => import('./pages/QuizAnalytics'))
const ResumePage = lazy(() => import('./pages/ResumePage'))
const FeaturedProjects = lazy(() => import('./pages/FeaturedProjects'))
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,        // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000,          // 30 minutes - garbage collection
      refetchOnMount: false,            // Don't refetch if data exists and fresh
      refetchOnReconnect: false,
    },
  },
})

/**
 * Hide the AI Mentor on anything being graded.
 *
 * '/challenges/' never matched: coding challenges are at
 * /learning/challenges/:slug, so startsWith('/challenges/') was false and an AI
 * assistant sat on top of a page that blocks the clipboard and counts
 * tab-switches. /quiz/:quizId was not listed at all.
 *
 * Prefixes are broad on purpose — '/quiz/' covers every quiz route, so renaming
 * or adding one cannot silently re-expose the mentor mid-exam.
 */
function ConditionalAIMentor() {
  const { pathname } = useLocation()
  const hideOnRoutes = ['/quiz/', '/learning/challenges/']
  const shouldHide = hideOnRoutes.some(r => pathname.startsWith(r))
  if (shouldHide) return null
  return <FloatingAIMentor />
}

/** Error boundary that clears itself when the user navigates elsewhere. */
function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-slate-950 text-white">
            <AppMobileHandler />
            {/* Toast theme per DESIGN_SYSTEM.md §10 — neutral surface, icon color is the only status signal */}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#18181b',
                  color: '#fafafa',
                  border: '1px solid rgba(63,63,70,0.6)',
                  borderRadius: '0.875rem',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.4)',
                  padding: '12px 16px',
                  fontSize: '14px',
                  maxWidth: 'min(92vw, 380px)',
                },
                success: { iconTheme: { primary: '#34d399', secondary: '#18181b' } },
                error: { iconTheme: { primary: '#f87171', secondary: '#18181b' } },
              }}
            />
            <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><LoadingState /></div>}>
            <RoutedErrorBoundary>
            <Routes>
              <Route path="/" element={<HomeEnhanced />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/learning-admin"
                element={
                  <AdminRoute allowInstructor={true}>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/instructor"
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <InstructorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learning"
                element={
                  <ProtectedRoute>
                    <LearningEnhanced />
                  </ProtectedRoute>
                }
              />
              {/* Its own route rather than a modal: linkable, shareable, and the
                  back button works. */}
              <Route
                path="/learning/careers"
                element={
                  <ProtectedRoute>
                    <CareerMap />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-learning"
                element={
                  <ProtectedRoute>
                    <StudentLearningDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/:quizId"
                element={
                  <ProtectedRoute>
                    <QuizTaking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/:quizId/questions"
                element={
                  <ProtectedRoute>
                    <QuestionManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learning/paths/:pathId"
                element={
                  <ProtectedRoute>
                    <PathDetailEnhanced />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learning/modules/:moduleId"
                element={
                  <ProtectedRoute>
                    <ModuleLearningEnhanced />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learning/challenges/:slug"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><LoadingState /></div>}>
                      <CodingChallengePage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learning/videos/:slug"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><LoadingState /></div>}>
                      <VideoCoursePage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectsEnhanced />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/explore"
                element={
                  <ProtectedRoute>
                    <FeaturedProjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:slug"
                element={
                  <ProtectedRoute>
                    <ProjectDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/community"
                element={
                  <ProtectedRoute>
                    <CommunityEnhanced />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileEnhanced />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/resume"
                element={
                  <ProtectedRoute>
                    <ResumePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/user/:userId"
                element={
                  <ProtectedRoute>
                    <UserProfileView />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/certificates"
                element={
                  <ProtectedRoute>
                    <Certificates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join"
                element={
                  <ProtectedRoute>
                    <JoinQuiz />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join-quiz/:code"
                element={
                  <ProtectedRoute>
                    <JoinQuiz />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/lobby/:joinCode"
                element={
                  <ProtectedRoute>
                    <QuizLobby />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/live/:joinCode"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><LoadingState /></div>}>
                      <LiveQuizSession />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/self-paced/:joinCode"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><LoadingState /></div>}>
                      <SelfPacedQuizSession />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/results"
                element={
                  <ProtectedRoute>
                    <QuizResults />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/analytics/:quizId"
                element={
                  <ProtectedRoute>
                    <QuizAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </RoutedErrorBoundary>
            </Suspense>
            <ConditionalAIMentor />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function AppMobileHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    // Handle Deep Links (for browser-based OAuth success)
    CapApp.addListener('appUrlOpen', (data: { url: string }) => {
      const slug = data.url.split('.space').pop()
      if (slug) {
        navigate(slug)
      }
    })

    // Handle Mobile-Only Landing Page: Redirect home (/) to /login
    if (Capacitor.isNativePlatform() && window.location.pathname === '/') {
      navigate('/login', { replace: true })
    }

    return () => {
      CapApp.removeAllListeners()
    }
  }, [navigate])

  return null
}

export default App
