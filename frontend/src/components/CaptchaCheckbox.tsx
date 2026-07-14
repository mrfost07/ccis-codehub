import { useState, useCallback, useEffect } from 'react'
import { Shield, ShieldCheck, Loader2, RefreshCw } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

interface CaptchaCheckboxProps {
    onVerified: (token: string, answer: number) => void
    onExpired?: () => void
    resetKey?: number   // increment to force-reset the widget
}

export default function CaptchaCheckbox({ onVerified, onExpired, resetKey = 0 }: CaptchaCheckboxProps) {
    const [state, setState] = useState<'idle' | 'loading' | 'challenge' | 'verified' | 'error'>('idle')
    const [question, setQuestion] = useState('')
    const [token, setToken] = useState('')
    const [answer, setAnswer] = useState('')
    const [error, setError] = useState('')
    const [expiresAt, setExpiresAt] = useState(0)

    // Reset when parent increments resetKey (e.g. after failed login)
    useEffect(() => {
        if (resetKey > 0) {
            setState('idle')
            setAnswer('')
            setQuestion('')
            setToken('')
            setError('')
        }
    }, [resetKey])

    // Auto-expire timer
    useEffect(() => {
        if (state === 'verified' && expiresAt > 0) {
            const now = Math.floor(Date.now() / 1000)
            const remaining = (expiresAt - now) * 1000

            if (remaining <= 0) {
                handleExpired()
                return
            }

            const timer = setTimeout(() => {
                handleExpired()
            }, remaining)

            return () => clearTimeout(timer)
        }
    }, [state, expiresAt])

    const handleExpired = useCallback(() => {
        setState('idle')
        setAnswer('')
        setQuestion('')
        setToken('')
        setError('')
        onExpired?.()
    }, [onExpired])

    const fetchChallenge = async () => {
        setState('loading')
        setError('')
        try {
            const res = await fetch(`${API_BASE_URL}/auth/captcha/`)
            if (!res.ok) throw new Error('Failed to fetch challenge')
            const data = await res.json()
            setQuestion(data.question)
            setToken(data.token)
            setExpiresAt(data.expires_at)
            setState('challenge')
            // Focus the answer input after a short delay
            setTimeout(() => {
                document.getElementById('captcha-answer-input')?.focus()
            }, 100)
        } catch {
            setError('Failed to load CAPTCHA. Please try again.')
            setState('error')
        }
    }

    const handleCheckboxClick = () => {
        if (state === 'idle' || state === 'error') {
            fetchChallenge()
        }
    }

    const handleSubmitAnswer = () => {
        const numAnswer = parseInt(answer, 10)
        if (isNaN(numAnswer)) {
            setError('Please enter a number')
            return
        }
        if (!answer.trim()) {
            setError('Please enter your answer')
            return
        }
        // Move to verified state and let backend confirm
        // Parent will call resetKey if login fails (wrong answer)
        setState('verified')
        setError('')
        onVerified(token, numAnswer)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmitAnswer()
        }
    }

    return (
        <div className="captcha-container">
            {/* Main checkbox row */}
            <div
                onClick={state === 'idle' || state === 'error' ? handleCheckboxClick : undefined}
                className={`
          flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
          ${state === 'idle' ? 'border-neutral-600/50 bg-neutral-800/30 cursor-pointer hover:border-neutral-500 hover:bg-neutral-800/50' : ''}
          ${state === 'loading' ? 'border-neutral-600/50 bg-neutral-800/30' : ''}
          ${state === 'challenge' ? 'border-purple-500/50 bg-purple-500/5' : ''}
          ${state === 'verified' ? 'border-green-500/50 bg-green-500/5' : ''}
          ${state === 'error' ? 'border-red-500/50 bg-red-500/5 cursor-pointer' : ''}
        `}
            >
                {/* Checkbox visual */}
                <div className={`
          w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
          ${state === 'idle' ? 'border-neutral-500' : ''}
          ${state === 'loading' ? 'border-neutral-500' : ''}
          ${state === 'challenge' ? 'border-purple-500' : ''}
          ${state === 'verified' ? 'border-green-500 bg-green-500' : ''}
          ${state === 'error' ? 'border-red-500' : ''}
        `}>
                    {state === 'loading' && (
                        <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
                    )}
                    {state === 'verified' && (
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                    {state === 'idle' && (
                        <span className="text-sm text-neutral-300">I'm not a robot</span>
                    )}
                    {state === 'loading' && (
                        <span className="text-sm text-neutral-400">Loading challenge...</span>
                    )}
                    {state === 'challenge' && (
                        <span className="text-sm text-purple-300">Solve to verify</span>
                    )}
                    {state === 'verified' && (
                        <span className="text-sm text-green-400 font-medium">Verified</span>
                    )}
                    {state === 'error' && (
                        <span className="text-sm text-red-400">{error || 'Click to retry'}</span>
                    )}
                </div>

                {/* Brand */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <Shield className={`w-4 h-4 ${state === 'verified' ? 'text-green-500' : 'text-neutral-500'}`} />
                    <span className="text-[10px] text-neutral-500 font-medium">CodeHub</span>
                </div>
            </div>

            {/* Challenge popup */}
            {state === 'challenge' && (
                <div className="mt-2 p-3 rounded-xl border border-purple-500/30 bg-neutral-800/80 backdrop-blur-sm animate-in slide-in-from-top-2">
                    <p className="text-sm text-neutral-200 mb-2 font-medium">{question}</p>
                    <div className="flex gap-2">
                        <input
                            id="captcha-answer-input"
                            type="number"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 px-3 py-2 text-sm bg-neutral-900/60 border border-neutral-600/50 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="Your answer"
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            onClick={handleSubmitAnswer}
                            className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                        >
                            Verify
                        </button>
                    </div>
                    {error && (
                        <p className="text-xs text-red-400 mt-1.5">{error}</p>
                    )}
                    <button
                        type="button"
                        onClick={fetchChallenge}
                        className="flex items-center gap-1 mt-2 text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        New question
                    </button>
                </div>
            )}
        </div>
    )
}
