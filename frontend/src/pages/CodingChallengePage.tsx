import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Play, Send, CheckCircle, XCircle, Clock, Code, Zap,
    Loader2, AlertCircle, Trophy, History, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Editor, { type OnMount } from '@monaco-editor/react'
import '../lib/monacoSetup'   // bundle Monaco locally; see the module for why
import Navbar from '../components/Navbar'
import BadgeUnlockToast from '../components/BadgeUnlockToast'
import codingService, { CodingChallenge, CodingSubmissionResult, SubmissionHistory } from '../services/codingService'
import useExamLockdown from '../hooks/useExamLockdown'

const LANGUAGE_LABELS: Record<string, string> = {
    python: 'Python',
    javascript: 'JavaScript',
    java: 'Java',
    cpp: 'C++',
}

// Our language keys -> Monaco's language ids.
const MONACO_LANG: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    java: 'java',
    cpp: 'cpp',
}

export default function CodingChallengePage() {
    const { slug } = useParams<{ slug: string }>()
    const navigate = useNavigate()

    const [challenge, setChallenge] = useState<CodingChallenge | null>(null)
    const [loading, setLoading] = useState(true)
    const [language, setLanguage] = useState('python')

    // Per-language code drafts — switching language doesn't wipe student work
    const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({})

    const [running, setRunning] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [runningCustom, setRunningCustom] = useState(false)
    const [result, setResult] = useState<CodingSubmissionResult | null>(null)
    const [runResult, setRunResult] = useState<{ passed: number; total: number; results: any[] } | null>(null)
    const [customResult, setCustomResult] = useState<{ stdout: string; stderr: string; error: string | null; timed_out: boolean } | null>(null)
    const [customInput, setCustomInput] = useState('')
    const [submissions, setSubmissions] = useState<SubmissionHistory[]>([])
    const [showHints, setShowHints] = useState(false)
    const [activeTab, setActiveTab] = useState<'description' | 'results' | 'history' | 'custom'>('description')
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [earnedBadges, setEarnedBadges] = useState<string[]>([])

    const startTime = useRef(Date.now())

    // Anti-cheat: block copy/paste (capture pasting external solutions), disable
    // devtools shortcuts, and record tab-switching while a challenge is open.
    // Fullscreen is intentionally not forced here (it belongs to the timed quiz
    // flow, which has a start gate); this is best-effort in-browser lockdown.
    const { violations } = useExamLockdown({
        active: !!challenge && !loading,
        enforceFullscreen: false,
        blockClipboard: true,
        maxViolations: Number.MAX_SAFE_INTEGER, // no auto-close on a practice page
        onViolation: ({ type }) => {
            if (type === 'copy' || type === 'cut' || type === 'paste') {
                toast.error('Copy/paste is disabled during coding challenges.', { duration: 2000 })
            } else if (type === 'tab_switch' || type === 'blur') {
                toast('Leaving the challenge window is recorded.', { icon: '⚠️', duration: 2000 })
            } else if (type === 'devtools') {
                toast.error('Developer tools are disabled during the challenge.', { duration: 2000 })
            }
        },
    })

    // Derived current code from per-language drafts
    const currentCode = codeDrafts[language] || ''

    useEffect(() => {
        if (slug) loadChallenge(slug)
    }, [slug])

    const loadChallenge = async (s: string) => {
        try {
            setLoading(true)
            const data = await codingService.getChallenge(s)
            setChallenge(data)
            const firstLang = data.supported_languages[0] || 'python'
            setLanguage(firstLang)
            // Seed drafts with starter code for all languages
            const drafts: Record<string, string> = {}
            for (const lang of data.supported_languages) {
                drafts[lang] = data.starter_code[lang] || ''
            }
            setCodeDrafts(drafts)
            startTime.current = Date.now()
        } catch (error) {
            toast.error('Challenge not found')
            navigate('/learning')
        } finally {
            setLoading(false)
        }
    }

    const handleLanguageChange = (lang: string) => {
        // Save current draft before switching
        setLanguage(lang)
        // If this language has no draft yet, seed from starter code
        if (!codeDrafts[lang] && challenge?.starter_code[lang]) {
            setCodeDrafts(prev => ({ ...prev, [lang]: challenge.starter_code[lang] || '' }))
        }
    }

    const handleCodeChange = (code: string) => {
        setCodeDrafts(prev => ({ ...prev, [language]: code }))
    }

    /**
     * Monaco handles Ctrl+V internally, so the document-level clipboard block in
     * useExamLockdown is not enough on its own — the editor would swallow the
     * keystroke before the document listener could cancel it. Bind the paste
     * commands to a no-op and report the attempt, so pasting an external
     * solution is blocked and recorded the same way it is elsewhere.
     */
    const handleEditorMount: OnMount = (editor, monaco) => {
        const blockPaste = () => {
            toast.error('Copy/paste is disabled during coding challenges.', { duration: 2000 })
        }
        const K = monaco.KeyMod, C = monaco.KeyCode
        editor.addCommand(K.CtrlCmd | C.KeyV, blockPaste)
        editor.addCommand(K.CtrlCmd | K.Shift | C.KeyV, blockPaste)

        // Any paste path the keybindings miss (middle-click on Linux, IME,
        // browser menu) fires this AFTER the text has landed — so undo it
        // rather than just warning about it.
        editor.onDidPaste(() => {
            editor.trigger('lockdown', 'undo', null)
            blockPaste()
        })

        editor.focus()
    }

    const handleRun = async () => {
        if (!slug || !currentCode.trim() || running) return
        setRunning(true)
        setRunResult(null)
        setActiveTab('results')
        try {
            const res = await codingService.runCode(slug, currentCode, language)
            setRunResult(res)
            toast.success(`${res.passed}/${res.total} public tests passed`)
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Run failed')
        } finally {
            setRunning(false)
        }
    }

    const handleSubmit = async () => {
        if (!slug || !currentCode.trim() || submitting) return
        setSubmitting(true)
        setRunResult(null)
        setCustomResult(null)
        setActiveTab('results')
        try {
            const res = await codingService.submitCode(slug, currentCode, language)
            setResult(res)
            if (res.status === 'accepted') {
                setShowSuccessModal(true)
                // Show badge unlock animation if badges earned
                if (res.badges_earned && res.badges_earned.length > 0) {
                    setEarnedBadges(res.badges_earned)
                }
            } else {
                toast.error(`${res.passed_tests}/${res.total_tests} tests passed`)
            }
            const subs = await codingService.getSubmissions(slug)
            setSubmissions(subs)
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Submission failed')
        } finally {
            setSubmitting(false)
        }
    }

    const handleRunCustom = async () => {
        if (!slug || !currentCode.trim() || runningCustom) return
        setRunningCustom(true)
        setActiveTab('custom')
        try {
            const res = await codingService.runCustom(slug, currentCode, language, customInput)
            setCustomResult(res)
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Custom run failed')
        } finally {
            setRunningCustom(false)
        }
    }

    const loadHistory = async () => {
        if (!slug) return
        try {
            const subs = await codingService.getSubmissions(slug)
            setSubmissions(subs)
            setActiveTab('history')
        } catch { /* ignore */ }
    }

    const getDifficultyStyle = (d: string) => {
        if (d === 'easy') return 'text-green-400 bg-green-500/15 border-green-500/30'
        if (d === 'medium') return 'text-amber-400 bg-amber-500/15 border-amber-500/30'
        return 'text-red-400 bg-red-500/15 border-red-500/30'
    }

    const getStatusStyle = (s: string) => {
        if (s === 'accepted') return 'text-green-400'
        if (s === 'partial') return 'text-amber-400'
        return 'text-red-400'
    }

    const getStatusIcon = (s: string) => {
        if (s === 'accepted') return <CheckCircle className="w-4 h-4 text-green-400" />
        if (s === 'partial') return <AlertCircle className="w-4 h-4 text-amber-400" />
        return <XCircle className="w-4 h-4 text-red-400" />
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
        )
    }

    if (!challenge) return null

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col pb-24 sm:pb-0">
            <Navbar />

            {/* Badge Unlock Celebration */}
            {earnedBadges.length > 0 && (
                <BadgeUnlockToast
                    badgeNames={earnedBadges}
                    onComplete={() => setEarnedBadges([])}
                />
            )}

            {/* Top Bar */}
            <div className="bg-neutral-900/80 border-b border-neutral-800/50 px-4 py-2 flex items-center gap-3">
                <button
                    onClick={() => navigate('/learning')}
                    className="text-neutral-400 hover:text-white transition p-1"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-white font-semibold text-sm sm:text-base truncate flex-1">
                    {challenge.title}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getDifficultyStyle(challenge.difficulty)}`}>
                    {challenge.difficulty}
                </span>
                <span className="text-xs text-neutral-500 hidden sm:inline">
                    {challenge.acceptance_rate}% acceptance
                </span>
                {violations > 0 && (
                    <span
                        className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-amber-500/40 bg-amber-500/10 text-amber-400"
                        title="Anti-cheat events recorded (copy/paste, tab switch, or devtools)"
                    >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {violations} flagged
                    </span>
                )}
            </div>

            {/* Split Pane */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Pane — Problem Description */}
                <div className="lg:w-[45%] border-b lg:border-b-0 lg:border-r border-neutral-800/50 overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex border-b border-neutral-800/50 sticky top-0 bg-neutral-950 z-10">
                        {[
                            { id: 'description' as const, label: 'Description' },
                            { id: 'results' as const, label: 'Results' },
                            { id: 'custom' as const, label: 'Custom Input' },
                            { id: 'history' as const, label: 'History' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id)
                                    if (tab.id === 'history') loadHistory()
                                }}
                                className={`px-4 py-2.5 text-sm font-medium transition ${activeTab === tab.id
                                    ? 'text-white border-b-2 border-purple-500'
                                    : 'text-neutral-500 hover:text-neutral-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Description Tab */}
                    {activeTab === 'description' && (
                        <div className="p-4 sm:p-6 space-y-4">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                                <span className="text-xs px-2 py-0.5 bg-neutral-800/50 text-neutral-400 rounded-full">
                                    {challenge.category}
                                </span>
                                {challenge.tags.map(tag => (
                                    <span key={tag} className="text-xs px-2 py-0.5 bg-neutral-800/50 text-neutral-400 rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Problem Description */}
                            <div className="prose prose-invert prose-sm max-w-none text-neutral-300 leading-relaxed whitespace-pre-wrap">
                                {challenge.description}
                            </div>

                            {/* Examples (from public test cases) */}
                            {challenge.test_cases.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-white">Examples</h3>
                                    {challenge.test_cases.slice(0, 3).map((tc, i) => (
                                        <div key={i} className="bg-neutral-900/60 border border-neutral-800/50 rounded-lg p-3">
                                            <div className="text-xs text-neutral-500 mb-1">Example {i + 1}</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-0.5">Input</div>
                                                    <code className="text-xs text-green-400 font-mono">{tc.input || '(none)'}</code>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-0.5">Output</div>
                                                    <code className="text-xs text-purple-400 font-mono">{tc.expected_output}</code>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Constraints */}
                            {challenge.constraints && (
                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-2">Constraints</h3>
                                    <p className="text-xs text-neutral-400 whitespace-pre-wrap">{challenge.constraints}</p>
                                </div>
                            )}

                            {/* Hints */}
                            {challenge.hints.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setShowHints(!showHints)}
                                        className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition"
                                    >
                                        {showHints ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        {showHints ? 'Hide Hints' : `Show Hints (${challenge.hints.length})`}
                                    </button>
                                    {showHints && (
                                        <div className="mt-2 space-y-1">
                                            {challenge.hints.map((hint, i) => (
                                                <p key={i} className="text-xs text-amber-300/70 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                                                    💡 {hint}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-xs text-neutral-500 pt-2 border-t border-neutral-800/50">
                                <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {challenge.points} pts</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(challenge.time_limit_seconds / 60)} min</span>
                                <span>{challenge.total_solved} solved</span>
                            </div>
                        </div>
                    )}

                    {/* Results Tab — Run OR Submit results */}
                    {activeTab === 'results' && (
                        <div className="p-4 sm:p-6">
                            {(running || submitting) ? (
                                <div className="flex flex-col items-center py-12 gap-3">
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                    <p className="text-sm text-neutral-400">
                                        {running ? 'Running against public tests...' : 'Running against all test cases...'}
                                    </p>
                                </div>
                            ) : runResult ? (
                                // Run result (public tests only)
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${runResult.passed === runResult.total
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-amber-500/10 border-amber-500/30'}`}>
                                        {runResult.passed === runResult.total
                                            ? <CheckCircle className="w-5 h-5 text-green-400" />
                                            : <AlertCircle className="w-5 h-5 text-amber-400" />}
                                        <div>
                                            <div className="text-sm font-semibold text-white">
                                                Run Complete — {runResult.passed}/{runResult.total} public tests passed
                                            </div>
                                            <div className="text-xs text-neutral-500">This did not count as a submission</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {runResult.results.map((r, i) => (
                                            <div key={i} className={`p-3 rounded-lg border text-xs ${r.passed
                                                ? 'bg-green-500/5 border-green-500/20'
                                                : 'bg-red-500/5 border-red-500/20'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {r.passed ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                                    <span className="font-medium text-neutral-300">Test Case {r.test_case_index + 1}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div>
                                                        <div className="text-[10px] text-neutral-600 uppercase">Your Output</div>
                                                        <code className="text-green-400 font-mono">{r.stdout?.trim() || '(empty)'}</code>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-neutral-600 uppercase">Expected</div>
                                                        <code className="text-purple-400 font-mono">{r.expected}</code>
                                                    </div>
                                                    {r.stderr && (
                                                        <div className="col-span-2">
                                                            <div className="text-[10px] text-neutral-600 uppercase">Error</div>
                                                            <code className="text-red-400 font-mono whitespace-pre-wrap">{r.stderr}</code>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : result ? (
                                // Submit result (all tests)
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${result.status === 'accepted'
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : result.status === 'partial'
                                            ? 'bg-amber-500/10 border-amber-500/30'
                                            : 'bg-red-500/10 border-red-500/30'}`}>
                                        {getStatusIcon(result.status)}
                                        <div>
                                            <div className={`font-semibold text-sm ${getStatusStyle(result.status)}`}>
                                                {result.status === 'accepted' ? 'Accepted ✓' : result.status === 'partial' ? 'Partial Solution' : result.status.replace('_', ' ').toUpperCase()}
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                {result.passed_tests}/{result.total_tests} tests passed • {result.execution_time_ms}ms • +{result.points_earned} pts
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {result.results.map((r, i) => (
                                            <div key={i} className={`p-3 rounded-lg border text-xs ${r.passed
                                                ? 'bg-green-500/5 border-green-500/20'
                                                : 'bg-red-500/5 border-red-500/20'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {r.passed ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                                    <span className="font-medium text-neutral-300">
                                                        Test Case {r.test_case_index + 1}
                                                    </span>
                                                    {r.is_hidden && <span className="text-neutral-600">(hidden)</span>}
                                                </div>
                                                {!r.is_hidden && (
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        {r.stdout !== undefined && (
                                                            <div>
                                                                <div className="text-[10px] text-neutral-600 uppercase">Your Output</div>
                                                                <code className="text-green-400 font-mono">{r.stdout || '(empty)'}</code>
                                                            </div>
                                                        )}
                                                        {r.expected !== undefined && (
                                                            <div>
                                                                <div className="text-[10px] text-neutral-600 uppercase">Expected</div>
                                                                <code className="text-purple-400 font-mono">{r.expected}</code>
                                                            </div>
                                                        )}
                                                        {r.stderr && (
                                                            <div className="col-span-2">
                                                                <div className="text-[10px] text-neutral-600 uppercase">Error</div>
                                                                <code className="text-red-400 font-mono whitespace-pre-wrap">{r.stderr}</code>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-neutral-500 text-sm">
                                    <Code className="w-10 h-10 mx-auto mb-3 text-neutral-700" />
                                    Click Run to test against public examples, or Submit to test against all test cases
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Input Tab */}
                    {activeTab === 'custom' && (
                        <div className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                                    Custom stdin
                                </label>
                                <textarea
                                    value={customInput}
                                    onChange={e => setCustomInput(e.target.value)}
                                    placeholder={`Enter your input here...\nEach line = one input value`}
                                    className="w-full h-28 bg-neutral-900/80 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm font-mono text-green-400 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                                />
                            </div>
                            <button
                                onClick={handleRunCustom}
                                disabled={runningCustom || !currentCode.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-600"
                            >
                                {runningCustom
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Play className="w-4 h-4 text-green-400" />}
                                Run with Custom Input
                            </button>

                            {runningCustom && (
                                <div className="flex flex-col items-center py-8 gap-3">
                                    <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
                                    <p className="text-sm text-neutral-400">Running...</p>
                                </div>
                            )}

                            {!runningCustom && customResult && (
                                <div className="space-y-3">
                                    {customResult.timed_out && (
                                        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                            <Clock className="w-4 h-4" /> Execution timed out
                                        </div>
                                    )}
                                    {customResult.stdout && (
                                        <div>
                                            <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Output</div>
                                            <pre className="bg-neutral-900/80 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">{customResult.stdout}</pre>
                                        </div>
                                    )}
                                    {customResult.stderr && (
                                        <div>
                                            <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Error / stderr</div>
                                            <pre className="bg-neutral-900/80 border border-red-800/30 rounded-lg px-3 py-2 text-xs text-red-400 font-mono whitespace-pre-wrap overflow-x-auto">{customResult.stderr}</pre>
                                        </div>
                                    )}
                                    {!customResult.stdout && !customResult.stderr && (
                                        <p className="text-neutral-500 text-sm text-center py-4">No output produced.</p>
                                    )}
                                </div>
                            )}

                            {!runningCustom && !customResult && (
                                <div className="text-center py-8 text-neutral-600 text-sm">
                                    Enter your input above and click Run to see the raw output.
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="p-4 sm:p-6">
                            {submissions.length === 0 ? (
                                <div className="text-center py-12 text-neutral-500 text-sm">
                                    <History className="w-10 h-10 mx-auto mb-3 text-neutral-700" />
                                    No submissions yet
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {submissions.map(sub => (
                                        <div key={sub.id} className="flex items-center gap-3 p-3 bg-neutral-900/60 border border-neutral-800/50 rounded-lg">
                                            {getStatusIcon(sub.status)}
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-medium ${getStatusStyle(sub.status)}`}>
                                                    {sub.status.replace('_', ' ')}
                                                </div>
                                                <div className="text-[10px] text-neutral-500">
                                                    {sub.language} • {sub.passed_tests}/{sub.total_tests} passed • {sub.execution_time_ms}ms
                                                </div>
                                            </div>
                                            <div className="text-right text-[10px] text-neutral-600">
                                                {new Date(sub.submitted_at).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Pane — Code Editor */}
                <div className="lg:w-[55%] flex flex-col">
                    {/* Language Selector + Buttons */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/50 bg-neutral-900/50">
                        <div className="flex items-center gap-2">
                            <Code className="w-4 h-4 text-purple-400" />
                            <select
                                value={language}
                                onChange={(e) => handleLanguageChange(e.target.value)}
                                className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                                {challenge.supported_languages.map(lang => (
                                    <option key={lang} value={lang}>{LANGUAGE_LABELS[lang] || lang}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            {/* Run Button — public tests only */}
                            <button
                                onClick={handleRun}
                                disabled={running || submitting || runningCustom || !currentCode.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-600"
                            >
                                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-green-400" />}
                                Run
                            </button>
                            {/* Submit Button — all tests, creates submission */}
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || running || runningCustom || !currentCode.trim()}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Submit
                            </button>
                        </div>
                    </div>

                    {/* Code editor — Monaco, same engine as the quiz sessions. */}
                    <div className="flex-1 overflow-hidden bg-neutral-950">
                        <Editor
                            height="100%"
                            language={MONACO_LANG[language] || 'plaintext'}
                            theme="vs-dark"
                            value={currentCode}
                            onChange={(value) => handleCodeChange(value ?? '')}
                            onMount={handleEditorMount}
                            loading={
                                <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading editor…
                                </div>
                            }
                            options={{
                                fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
                                fontSize: 13,
                                lineHeight: 21,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                lineNumbers: 'on',
                                renderLineHighlight: 'line',
                                tabSize: 4,
                                insertSpaces: true,
                                wordWrap: 'on',
                                padding: { top: 12, bottom: 12 },
                                // The IDE behaviours this page was missing entirely:
                                autoIndent: 'full',             // indent after `:` / `{`
                                autoClosingBrackets: 'always',
                                autoClosingQuotes: 'always',
                                autoSurround: 'languageDefined',
                                matchBrackets: 'always',
                                suggestOnTriggerCharacters: true,
                                quickSuggestions: { other: true, comments: false, strings: false },
                                wordBasedSuggestions: true,   // boolean in monaco 0.44
                                acceptSuggestionOnEnter: 'off',  // Enter = newline, Tab accepts
                                tabCompletion: 'on',
                                snippetSuggestions: 'inline',
                                formatOnType: true,
                                bracketPairColorization: { enabled: true },
                                guides: { indentation: true, bracketPairs: true },
                                stickyScroll: { enabled: false },
                                contextmenu: false,              // lockdown blocks it anyway
                                smoothScrolling: true,
                                cursorBlinking: 'smooth',
                            }}
                        />
                    </div>

                    {/* Status Bar */}
                    <div className="px-4 py-1.5 bg-neutral-900/80 border-t border-neutral-800/50 flex items-center gap-4 text-[10px] text-neutral-600">
                        <span>{LANGUAGE_LABELS[language] || language}</span>
                        <span>{currentCode.split('\n').length} lines</span>
                        <span>{currentCode.length} chars</span>
                        {(result || runResult) && (
                            <span className={result?.status === 'accepted' ? 'text-green-500' : 'text-amber-500'}>
                                {result ? `Last: ${result.passed_tests}/${result.total_tests} passed` : `Run: ${runResult?.passed}/${runResult?.total}`}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Success Modal Overlay ── */}
            {showSuccessModal && result && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-neutral-900 border border-green-500/30 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold text-green-400 mb-2">All Tests Passed!</h2>
                        <p className="text-neutral-400 mb-4">Congratulations! You solved <span className="text-white font-semibold">{challenge?.title}</span></p>
                        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">
                                <div className="text-green-400 font-bold text-lg">+{result.points_earned}</div>
                                <div className="text-neutral-500 text-xs">Points</div>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2">
                                <div className="text-purple-400 font-bold text-lg">{result.passed_tests}/{result.total_tests}</div>
                                <div className="text-neutral-500 text-xs">Tests</div>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2">
                                <div className="text-purple-400 font-bold text-lg">{result.execution_time_ms}ms</div>
                                <div className="text-neutral-500 text-xs">Runtime</div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/learning')}
                                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition"
                            >
                                ← Back to Learning
                            </button>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl transition border border-neutral-700"
                            >
                                Keep Practicing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
