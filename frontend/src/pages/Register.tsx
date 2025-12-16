import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirmPassword: '',
    program: 'BSIT',
    year_level: '1',
    role: 'student'
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuthData } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      // Include all required fields for backend
      const response = await authAPI.register({
        email: formData.email,
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        program: formData.program,
        year_level: formData.year_level,
        role: formData.role
      })

      // Optionally auto-login after registration
      if (response.data.tokens) {
        setAuthData(response.data.tokens.access, response.data.user)
        toast.success('Registration successful!')
        navigate('/dashboard')
      } else {
        toast.success('Registration successful! Please login.')
        navigate('/login')
      }
    } catch (error: any) {
      // Handle validation errors from backend
      if (error.response?.data) {
        const errors = error.response.data
        // Check for specific field errors
        if (errors.email) {
          toast.error(`Email: ${errors.email[0]}`)
        } else if (errors.username) {
          toast.error(`Username: ${errors.username[0]}`)
        } else if (errors.password) {
          toast.error(`Password: ${errors.password[0]}`)
        } else if (errors.confirm_password) {
          toast.error(`Confirm Password: ${errors.confirm_password[0]}`)
        } else if (errors.detail) {
          toast.error(errors.detail)
        } else if (errors.error) {
          toast.error(errors.error)
        } else {
          toast.error('Registration failed. Please check your information.')
        }
      } else {
        toast.error('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-6 sm:mb-8">
          <img src="/logo/ccis-logo.png" alt="CCIS CodeHub" className="h-16 w-16 sm:h-20 sm:w-20 mb-3 sm:mb-4" />
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
            CCIS CodeHub
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">Create Account</h2>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:border-indigo-500 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:border-indigo-500 focus:outline-none transition"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Program</label>
              <select
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                required
              >
                <option value="BSIT">BSIT</option>
                <option value="BSCS">BSCS</option>
                <option value="BSIS">BSIS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Year Level</label>
              <select
                value={formData.year_level}
                onChange={(e) => setFormData({ ...formData, year_level: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                required
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:border-indigo-500 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:border-indigo-500 focus:outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-indigo-600 to-pink-600 rounded-lg font-semibold hover:from-indigo-700 hover:to-pink-700 transition disabled:opacity-50 active:scale-95"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-slate-900/50 text-slate-400">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button - Icon only */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              const clientId = '1018587300192-m0n93uesm6v33bahs57tatg52v3lurah.apps.googleusercontent.com';
              const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
              const scope = encodeURIComponent('openid email profile');
              const state = btoa(JSON.stringify({ mode: 'signup' }));
              const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
              window.location.href = authUrl;
            }}
            className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 hover:scale-105 active:scale-95"
            title="Sign up with Google"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </button>
        </div>

        <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign In
          </Link>
        </p>

        <div className="mt-3 sm:mt-4">
          <Link to="/" className="block text-center text-xs sm:text-sm text-slate-400 hover:text-white transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
