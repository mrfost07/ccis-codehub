import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import AdminDashboard from './pages/AdminDashboard'
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-slate-950 text-white">
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <FloatingAIMentor />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
