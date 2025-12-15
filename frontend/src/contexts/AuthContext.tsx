import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import api, { authAPI } from '../services/api'

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  program?: string
  year_level?: string
  profile_picture?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setAuthData: (token: string, user: User) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Derived state for authentication status
  const isAuthenticated = Boolean(token && user)

  // Initialize auth state from sessionStorage (per-tab storage to isolate users)
  useEffect(() => {
    // Try sessionStorage first (per-tab), then fall back to localStorage for existing sessions
    let storedToken = sessionStorage.getItem('token')
    let storedUser = sessionStorage.getItem('user')

    // If not in sessionStorage, check localStorage (for backward compatibility)
    if (!storedToken && !storedUser) {
      storedToken = localStorage.getItem('token')
      storedUser = localStorage.getItem('user')

      // Migrate to sessionStorage if found in localStorage
      if (storedToken && storedUser) {
        sessionStorage.setItem('token', storedToken)
        sessionStorage.setItem('user', storedUser)
      }
    }

    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const setAuthData = useCallback((newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    // Store in sessionStorage (per-tab) for user isolation
    sessionStorage.setItem('token', newToken)
    sessionStorage.setItem('user', JSON.stringify(newUser))
    // Also update localStorage for persistence across page refreshes
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    const { access, user: userData } = response.data.tokens ?
      { access: response.data.tokens.access, user: response.data.user } :
      { access: response.data.access, user: response.data.user }

    setAuthData(access, userData)
  }, [setAuthData])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    // Clear both sessionStorage (per-tab) and localStorage
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    // Force a small delay to ensure state updates before navigation
    console.log('Auth state cleared')
  }, [])

  const refreshUser = useCallback(async () => {
    if (token) {
      try {
        const response = await api.get('/auth/profile/')
        const updatedUser = response.data
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
      } catch (error) {
        console.error('Failed to refresh user:', error)
      }
    }
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, logout, setAuthData, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
