import { Navigate } from 'react-router-dom'
import { ReactNode, useEffect, useState } from 'react'
import api from '../services/api'

interface AdminRouteProps {
  children: ReactNode
  allowInstructor?: boolean
}

export default function AdminRoute({ children, allowInstructor = false }: AdminRouteProps) {
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (token) {
      checkRole()
    } else {
      setLoading(false)
    }
  }, [token])

  const checkRole = async () => {
    try {
      const response = await api.get('/auth/profile/')
      const role = response.data.role
      setUserRole(role)

      // Admin always has access
      // Instructor has access if allowInstructor is true
      const canAccess = role === 'admin' || (allowInstructor && role === 'instructor')
      setHasAccess(canAccess)
    } catch (error) {
      console.error('Failed to check role:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Verifying access...</div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!hasAccess) {
    // Redirect instructor to instructor dashboard, others to main dashboard
    const redirectPath = userRole === 'instructor' ? '/instructor' : '/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}

