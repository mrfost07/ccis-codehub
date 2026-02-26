import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import FloatingAIMentor from './components/FloatingAIMentor'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import HomeEnhanced from './pages/HomeEnhanced'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboardNew'
import InstructorDashboard from './pages/InstructorDashboard'
import StudentDashboard from './pages/StudentDashboard'
import StudentLearningDashboard from './pages/StudentLearningDashboard'
import QuizTaking from './pages/QuizTaking'
import PathDetail from './pages/PathDetail'
import PathDetailEnhanced from './pages/PathDetailEnhanced'
import ModuleLearning from './pages/ModuleLearning'
import ModuleLearningEnhanced from './pages/ModuleLearningEnhanced'
import Certificates from './pages/Certificates'
import Leaderboard from './pages/Leaderboard'
import QuestionManagement from './pages/QuestionManagement'
import LearningEnhanced from './pages/LearningEnhanced'
import Learning from './pages/Learning'
import ProjectsEnhanced from './pages/ProjectsEnhanced'
import ProjectDetail from './pages/ProjectDetail'
import CommunityEnhanced from './pages/CommunityEnhanced'
import AIChatInterface from './pages/AIChatInterface'
// Use the enhanced Profile component
import ProfileEnhanced from './pages/ProfileEnhanced'
import UserProfileView from './pages/UserProfileView'
import AuthCallback from './pages/AuthCallback'
import CompleteProfile from './pages/CompleteProfile'
import JoinQuiz from './pages/JoinQuiz'
import QuizLobby from './pages/QuizLobby'
import LiveQuizSession from './pages/LiveQuizSession'
import SelfPacedQuizSession from './pages/SelfPacedQuizSession'
import QuizResults from './pages/QuizResults'
import QuizAnalytics from './pages/QuizAnalytics'
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-slate-950 text-white">
            <AppMobileHandler />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1e293b',
                  color: '#fff',
                  border: '1px solid #334155',
                },
              }}
            />
            <Routes>
              <Route path="/" element={<HomeEnhanced />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
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
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectsEnhanced />
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
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileEnhanced />
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
                    <LiveQuizSession />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/self-paced/:joinCode"
                element={
                  <ProtectedRoute>
                    <SelfPacedQuizSession />
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
            <FloatingAIMentor />
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
