/**
 * Email confirmation landing page.
 *
 * Users arrive here from the link in their signup email:
 *   /verify-email/:uid/:token
 *
 * Confirms the address, then sends them to login so they can sign in and
 * finish onboarding. An expired/used link offers a resend instead of a
 * dead end.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, MailWarning, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

type State = 'verifying' | 'success' | 'already' | 'expired' | 'invalid'

export default function VerifyEmail() {
  const { uid, token } = useParams<{ uid: string; token: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<State>('verifying')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  // React 18 StrictMode mounts effects twice in dev — without this guard the
  // token would be spent by the first call and the second would report failure.
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    if (!uid || !token) {
      setState('invalid')
      return
    }

    authAPI.verifyEmail(uid, token)
      .then(res => {
        setState(res.data?.already_verified ? 'already' : 'success')
      })
      .catch(err => {
        const data = err?.response?.data
        if (data?.email) setEmail(data.email)
        setState(data?.code === 'invalid_token' ? 'expired' : 'invalid')
      })
  }, [uid, token])

  // Send verified users onward automatically.
  useEffect(() => {
    if (state !== 'success' && state !== 'already') return
    const t = setTimeout(() => navigate('/login', { replace: true }), 2500)
    return () => clearTimeout(t)
  }, [state, navigate])

  const handleResend = async () => {
    if (!email) {
      navigate('/login')
      return
    }
    setResending(true)
    try {
      await authAPI.resendVerification(email)
      toast.success('If that account still needs confirming, a new link is on its way.')
    } catch {
      toast.error('Could not send a new link. Please try again shortly.')
    } finally {
      setResending(false)
    }
  }

  const view = {
    verifying: {
      icon: <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />,
      ring: 'border-purple-500/30 bg-purple-500/10',
      title: 'Confirming your email…',
      body: 'This only takes a moment.',
    },
    success: {
      icon: <CheckCircle2 className="w-7 h-7 text-green-400" />,
      ring: 'border-green-500/30 bg-green-500/10',
      title: 'Email confirmed',
      body: 'Your account is active. Taking you to sign in so you can set up your profile…',
    },
    already: {
      icon: <CheckCircle2 className="w-7 h-7 text-green-400" />,
      ring: 'border-green-500/30 bg-green-500/10',
      title: 'Already confirmed',
      body: 'This email was confirmed earlier. Taking you to sign in…',
    },
    expired: {
      icon: <MailWarning className="w-7 h-7 text-amber-400" />,
      ring: 'border-amber-500/30 bg-amber-500/10',
      title: 'This link has expired',
      body: 'Confirmation links are valid for a limited time. Request a fresh one below.',
    },
    invalid: {
      icon: <XCircle className="w-7 h-7 text-red-400" />,
      ring: 'border-red-500/30 bg-red-500/10',
      title: "This link isn't valid",
      body: 'Double-check you opened the most recent email, or request a new link.',
    },
  }[state]

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.14), transparent 70%)' }} />

      <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border ${view.ring}`}>
          {view.icon}
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white">{view.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">{view.body}</p>

        {(state === 'expired' || state === 'invalid') && (
          <div className="mt-6 space-y-2">
            {/* Only offer a resend when we know which account to resend to;
                otherwise a single "sign in" action is the whole story. */}
            {email ? (
              <>
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Send me a new link'}
                </button>
                <Link
                  to="/login"
                  className="block w-full rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
                >
                  Back to sign in
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="block w-full rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
              >
                Go to sign in
              </Link>
            )}
          </div>
        )}

        {(state === 'success' || state === 'already') && (
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
          >
            Continue to sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  )
}
