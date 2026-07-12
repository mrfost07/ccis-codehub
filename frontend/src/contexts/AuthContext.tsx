import { Capacitor } from '@capacitor/core'
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import api, { authAPI } from '../services/api'

interface User {
  id: string
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
  setAuthData: (token: string, user: User, refresh?: string) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Derived state for authentication status
  const isAuthenticated = Boolean(token && user)

  // Initialize auth state from sessionStorage. Single source of truth:
  // sessionStorage gives per-tab isolation AND survives reloads. A one-time
  // migration pulls any legacy localStorage session in, then clears it so we
  // never mix the two stores for the same token. (Req 19.)
  useEffect(() => {
    let storedToken = sessionStorage.getItem('token')
    let storedUser = sessionStorage.getItem('user')

    if (!storedToken && !storedUser) {
      const legacyToken = localStorage.getItem('token')
      const legacyUser = localStorage.getItem('user')
      const legacyRefresh = localStorage.getItem('refresh_token')
      if (legacyToken && legacyUser) {
        storedToken = legacyToken
        storedUser = legacyUser
        sessionStorage.setItem('token', legacyToken)
        sessionStorage.setItem('user', legacyUser)
        if (legacyRefresh) sessionStorage.setItem('refresh_token', legacyRefresh)
      }
      // Enforce single storage from here on.
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('refresh_token')
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

  const setAuthData = useCallback((newToken: string, newUser: User, refresh?: string) => {
    setToken(newToken)
    setUser(newUser)
    // Single storage — sessionStorage only (Req 19).
    sessionStorage.setItem('token', newToken)
    sessionStorage.setItem('user', JSON.stringify(newUser))
    if (refresh) sessionStorage.setItem('refresh_token', refresh)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    const tokens = response.data.tokens || {
      access: response.data.access,
      refresh: response.data.refresh,
    }
    setAuthData(tokens.access, response.data.user, tokens.refresh)
  }, [setAuthData])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)

    // Clear auth data (sessionStorage is the store; also clear any legacy
    // localStorage copies from before the single-storage migration).
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('refresh_token')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('userRole')

    // Clean up all app-related storage keys
    const keysToClean = ['communityChatActiveRoom', 'communityChatOpen', 'appSettings']
    keysToClean.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })

    // Remove AI mentor session keys (pattern: ai_mentor_session_id_*)
    const removeByPrefix = (storage: Storage, prefix: string) => {
      const keysToRemove: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && key.startsWith(prefix)) keysToRemove.push(key)
      }
      keysToRemove.forEach(key => storage.removeItem(key))
    }
    removeByPrefix(localStorage, 'ai_mentor_session_id_')
    removeByPrefix(sessionStorage, 'ai_mentor_session_id_')

    console.log('Auth state and app storage cleared')

    // Redirect to login on mobile
    if (Capacitor.isNativePlatform()) {
      window.location.href = '/login';
    } else {
      window.location.href = '/';
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (token) {
      try {
        const response = await api.get('/auth/profile/')
        const updatedUser = response.data
        setUser(updatedUser)
        sessionStorage.setItem('user', JSON.stringify(updatedUser))
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
