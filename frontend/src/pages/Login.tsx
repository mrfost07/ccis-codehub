import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, ArrowLeft } from 'lucide-react'
import CaptchaCheckbox from '../components/CaptchaCheckbox'
import { Button, Input } from '../components/ui'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState<number | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuthData } = useAuth()

  const handleCaptchaVerified = (token: string, answer: number) => {
    setCaptchaToken(token)
    setCaptchaAnswer(answer)
  }

  const handleCaptchaExpired = () => {
    setCaptchaToken('')
    setCaptchaAnswer(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!captchaToken || captchaAnswer === null) {
      toast.error('Please complete the CAPTCHA verification')
      return
    }

    setLoading(true)

    try {
      const response = await authAPI.login(email, password, captchaToken, captchaAnswer)
      const tokens = response.data.tokens || {
        access: response.data.access,
        refresh: response.data.refresh,
      }
      setAuthData(tokens.access, response.data.user, tokens.refresh)
      toast.success('Welcome back!')
      // Redirect to return URL — check query param first, then sessionStorage backup
      const returnUrl = searchParams.get('returnUrl') || sessionStorage.getItem('loginReturnUrl')
      sessionStorage.removeItem('loginReturnUrl') // Clean up
      window.location.href = returnUrl || '/learning'
    } catch (error: any) {
      console.error('Login error:', error.response?.data)
      // Reset CAPTCHA on failure so user can re-verify
      handleCaptchaExpired()
      setCaptchaResetKey(k => k + 1)
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else if (error.response?.data?.detail) {
        toast.error(error.response.data.detail)
      } else {
        toast.error('Invalid credentials. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const clientId = '1018587300192-m0n93uesm6v33bahs57tatg52v3lurah.apps.googleusercontent.com'
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`)
    const scope = encodeURIComponent('openid email profile')
    const returnUrl = searchParams.get('returnUrl') || '/learning'
    const state = btoa(JSON.stringify({ mode: 'login', returnUrl }))
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`

    if (Capacitor.isNativePlatform()) {
      // Open in Chrome Custom Tab — the callback URL will trigger the intent filter
      // which routes back to the app via the deep link
      await Browser.open({ url: authUrl })
    } else {
      window.location.href = authUrl
    }
  }


  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      {/* Single restrained purple glow — no multi-blob slop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-purple-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 backdrop-blur-sm p-6 sm:p-8 shadow-card">
          {/* Logo & Title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img src="/logo/ccis-logo.png" alt="CCIS CodeHub" className="h-14 w-14 sm:h-16 sm:w-16" />
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-neutral-400 text-sm mt-1">Sign in to continue learning</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              placeholder="your.email@ssct.edu.ph"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              placeholder="••••••••"
              required
            />

            <CaptchaCheckbox
              onVerified={handleCaptchaVerified}
              onExpired={handleCaptchaExpired}
              resetKey={captchaResetKey}
            />

            <Button type="submit" fullWidth size="lg" loading={loading} disabled={loading || !captchaToken}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-neutral-500 bg-neutral-900">or continue with</span>
            </div>
          </div>

          {/* Google Button - Circle Icon */}
          <div className="flex justify-center">
            <button
              onClick={handleGoogleLogin}
              className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 ring-1 ring-gray-200"
              title="Continue with Google"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </button>
          </div>

          {/* Footer Links */}
          <div className="mt-5 text-center space-y-2">
            <p className="text-sm text-neutral-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                Sign up
              </Link>
            </p>
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
