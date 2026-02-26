import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'admin' | 'instructor' | 'student'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!token || !user) {
    // Preserve the current URL so login can redirect back
    const returnUrl = encodeURIComponent(location.pathname + location.search + location.hash)
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    // Admin can access all routes
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

