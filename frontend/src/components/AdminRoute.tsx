import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface AdminRouteProps {
  children: ReactNode
  allowInstructor?: boolean
}

/**
 * Route guard for admin (and optionally instructor) areas.
 *
 * Reads the role from the shared AuthContext rather than re-fetching the
 * profile on every mount, so there is no async work to leak after unmount and
 * no redundant network call. AuthContext is the single storage source of truth
 * (sessionStorage). (Remediation Req 22.)
 */
export default function AdminRoute({ children, allowInstructor = false }: AdminRouteProps) {
  const { user, token, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Verifying access...</div>
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  const role = user.role
  const canAccess = role === 'admin' || (allowInstructor && role === 'instructor')
  if (!canAccess) {
    // Send instructors to their dashboard, everyone else to the main dashboard.
    const redirectPath = role === 'instructor' ? '/instructor' : '/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}
