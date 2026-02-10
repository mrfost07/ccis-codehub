import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  User, Mail, Lock, ChevronRight, ChevronLeft, Check,
  Sprout, Flower2, TreeDeciduous, GraduationCap,
  Code2, Server, LineChart, Loader2, Eye, EyeOff, ArrowLeft
} from 'lucide-react'
import CaptchaCheckbox from '../components/CaptchaCheckbox'

const PROGRAMS = [
  { value: 'BSCS', label: 'BS Computer Science', icon: Code2, description: 'Software Development & Algorithms' },
  { value: 'BSIT', label: 'BS Information Technology', icon: Server, description: 'IT Infrastructure & Systems' },
  { value: 'BSIS', label: 'BS Information Systems', icon: LineChart, description: 'Business Systems & Analytics' },
]

const YEAR_LEVELS = [
  { value: '1', label: '1st Year', icon: Sprout, color: 'from-emerald-500 to-green-600' },
  { value: '2', label: '2nd Year', icon: Flower2, color: 'from-blue-500 to-cyan-600' },
  { value: '3', label: '3rd Year', icon: TreeDeciduous, color: 'from-purple-500 to-indigo-600' },
  { value: '4', label: '4th Year', icon: GraduationCap, color: 'from-amber-500 to-orange-600' },
]

export default function Register() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    program: '',
    year_level: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState<number | null>(null)
  const navigate = useNavigate()
  const { setAuthData } = useAuth()

  const handleCaptchaVerified = (token: string, answer: number) => {
    setCaptchaToken(token)
    setCaptchaAnswer(answer)
  }

  const handleCaptchaExpired = () => {
    setCaptchaToken('')
    setCaptchaAnswer(null)
  }

  const validateStep = () => {
    if (step === 1) {
      if (!formData.first_name.trim()) {
        toast.error('Please enter your first name')
        return false
      }
      if (!formData.last_name.trim()) {
        toast.error('Please enter your last name')
        return false
      }
      if (!formData.username.trim()) {
        toast.error('Please choose a username')
        return false
      }
    } else if (step === 2) {
      if (!formData.email.trim()) {
        toast.error('Please enter your email')
        return false
      }
      if (!formData.email.endsWith('@ssct.edu.ph') && !formData.email.endsWith('@snsu.edu.ph')) {
        toast.error('Please use your institutional email (@ssct.edu.ph)')
        return false
      }
      if (!formData.program) {
        toast.error('Please select your program')
        return false
      }
      if (!formData.year_level) {
        toast.error('Please select your year level')
        return false
      }
    } else if (step === 3) {
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match')
        return false
      }
      if (!captchaToken || captchaAnswer === null) {
        toast.error('Please complete the CAPTCHA verification')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep()) return

    setLoading(true)
    try {
      const response = await authAPI.register({
        email: formData.email,
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        program: formData.program,
        year_level: formData.year_level,
        role: 'student',
        captcha_token: captchaToken,
        captcha_answer: captchaAnswer,
      })

      if (response.data.tokens) {
        setAuthData(response.data.tokens.access, response.data.user)
        setStep(4) // Success step
        setTimeout(() => {
          navigate('/learning')
        }, 2000)
      } else {
        toast.success('Registration successful! Please login.')
        navigate('/login')
      }
    } catch (error: any) {
      if (error.response?.data) {
        const errors = error.response.data
        if (errors.email) toast.error(`Email: ${errors.email[0]}`)
        else if (errors.username) toast.error(`Username: ${errors.username[0]}`)
        else if (errors.password) toast.error(`Password: ${errors.password[0]}`)
        else if (errors.error) toast.error(errors.error)
        else toast.error('Registration failed. Please try again.')
      } else {
        toast.error('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = () => {
    const clientId = '1018587300192-m0n93uesm6v33bahs57tatg52v3lurah.apps.googleusercontent.com'
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback')
    const scope = encodeURIComponent('openid email profile')
    const state = btoa(JSON.stringify({ mode: 'signup' }))
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Logo & Title */}
          <div className="text-center mb-5">
            <div className="flex justify-center mb-3">
              <img src="/logo/ccis-logo.png" alt="CCIS CodeHub" className="h-12 w-12 sm:h-14 sm:w-14" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {step === 4 ? 'Welcome to CCIS CodeHub!' : 'Create Account'}
            </h1>
          </div>

          {/* Progress Steps */}
          {step < 4 && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s === step
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-slate-900'
                      : s < step
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                      }`}
                  >
                    {s < step ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-8 sm:w-12 h-0.5 ${s < step ? 'bg-emerald-600' : 'bg-slate-700'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Name & Username */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 text-center mb-4">Let's start with your name</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    placeholder="johndoe"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Email, Program, Year */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Institutional Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    placeholder="you@ssct.edu.ph"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Program</label>
                <div className="space-y-2">
                  {PROGRAMS.map((program) => {
                    const Icon = program.icon
                    return (
                      <button
                        key={program.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, program: program.value })}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${formData.program === program.value
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30'
                          }`}
                      >
                        <div className={`p-2 rounded-lg ${formData.program === program.value ? 'bg-indigo-500/20' : 'bg-slate-700/50'}`}>
                          <Icon className={`w-4 h-4 ${formData.program === program.value ? 'text-indigo-400' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{program.label}</div>
                          <div className="text-xs text-slate-400 truncate">{program.description}</div>
                        </div>
                        {formData.program === program.value && (
                          <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Year Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {YEAR_LEVELS.map((year) => {
                    const Icon = year.icon
                    return (
                      <button
                        key={year.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, year_level: year.value })}
                        className={`p-3 rounded-xl border text-center transition-all ${formData.year_level === year.value
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30'
                          }`}
                      >
                        <div className={`mx-auto w-8 h-8 rounded-lg bg-gradient-to-br ${year.color} flex items-center justify-center mb-1`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-medium text-slate-300">{year.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 text-center mb-4">Secure your account</p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password match indicator */}
              {formData.confirmPassword && (
                <div className={`flex items-center gap-2 text-xs ${formData.password === formData.confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <Check className="w-3 h-3" />
                      Passwords match
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3">✕</span>
                      Passwords don't match
                    </>
                  )}
                </div>
              )}

              {/* CAPTCHA */}
              <CaptchaCheckbox
                onVerified={handleCaptchaVerified}
                onExpired={handleCaptchaExpired}
              />
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Account Created!</h2>
              <p className="text-sm text-slate-400 mb-4">Redirecting you to the learning platform...</p>
              <Loader2 className="w-5 h-5 mx-auto text-indigo-400 animate-spin" />
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-2.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !captchaToken}
                  className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Account
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Divider - Only on step 1 */}
          {step === 1 && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-slate-500 bg-slate-900/60">or continue with</span>
                </div>
              </div>

              {/* Google Button - Circle Icon */}
              <div className="flex justify-center">
                <button
                  onClick={handleGoogleSignup}
                  className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 ring-1 ring-gray-200"
                  title="Sign up with Google"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* Footer Links */}
          {step < 4 && (
            <div className="mt-5 text-center space-y-2">
              <p className="text-sm text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
              <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
