import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Timer, CheckCircle, XCircle, AlertCircle, ChevronRight,
    Trophy, Clock, Expand, Shield, BookOpen, Loader2, X as XIcon, Maximize, Code
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import DOMPurify from 'dompurify';
import Editor from '@monaco-editor/react';
import liveQuizService from '../services/liveQuizService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Question {
    id: string;
    order: number;
    question_text: string;
    question_type: string;
    image_url?: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    points: number;
    time_limit: number;
    time_bonus_enabled: boolean;
    programming_language?: string;
    starter_code?: string;
    test_cases?: any[];
}

interface SessionState {
    participantId?: string;
    sessionId?: string;
    quizId?: string;
    quizTitle?: string;
    hostName?: string;
    timeLimitMinutes?: number;
    nickname?: string;
    requireFullscreen?: boolean;
    maxViolations?: number;
    violationPenaltyPoints?: number;
    fullscreenExitAction?: 'warn' | 'pause' | 'close';
    altTabAction?: 'warn' | 'shuffle' | 'close';
    enableCodeExecution?: boolean;
    showCorrectAnswers?: boolean;
    showLeaderboard?: boolean;
    questions?: Question[];
    deadline?: string | null;
    attemptsMessage?: string;
}

interface AnswerResult {
    is_correct: boolean;
    points_earned: number;
    correct_answer: string | null;
    explanation: string;
    participant_score: number;
    participant_correct: number;
    participant_attempted: number;
}


// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const SelfPacedQuizSession = () => {
    const { joinCode } = useParams<{ joinCode: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const sessionState = (location.state as SessionState) || {};

    // ── Questions & Progress ──────────────────────────────────────────────────
    const questions = sessionState.questions || [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [totalAttempted, setTotalAttempted] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [results, setResults] = useState<any>(null);

    // ── Current question state ────────────────────────────────────────────────
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [codeSubmission, setCodeSubmission] = useState<string>('');
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const answerStartTime = useRef<number>(Date.now());

    // ── Timer for whole quiz ──────────────────────────────────────────────────
    const [totalTimeRemaining, setTotalTimeRemaining] = useState<number | null>(
        sessionState.timeLimitMinutes ? sessionState.timeLimitMinutes * 60 : null
    );

    // ── Anti-cheat state ──────────────────────────────────────────────────────
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isQuizPaused, setIsQuizPaused] = useState(false);
    const [pauseReason, setPauseReason] = useState('');
    const [pauseSource, setPauseSource] = useState<'fullscreen' | 'tab_switch' | ''>('');
    const [isQuizClosed, setIsQuizClosed] = useState(false);
    const [closeReason, setCloseReason] = useState('');
    const [violations, setViolations] = useState(0);
    const [showViolationPanel, setShowViolationPanel] = useState(false);
    const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Brief "Resuming…" loading beat when returning from a pause
    const [resuming, setResuming] = useState(false);

    const [fullscreenReady, setFullscreenReady] = useState(false); // Set once the user enters fullscreen

    // Ref mirror so event handlers read the current pause state, not a stale capture
    const isQuizPausedRef = useRef(isQuizPaused);
    isQuizPausedRef.current = isQuizPaused;

    // Always enforce fullscreen and pause on violations
    const fsAction = 'pause' as const;
    const atAction = 'pause' as const;
    const maxViolations = sessionState.maxViolations || 3;
    const canShowResult = sessionState.showCorrectAnswers !== false;

    // ── Quiz status ───────────────────────────────────────────────────────────
    const quizActive = !isFinished && !isQuizClosed && questions.length > 0 && fullscreenReady;
    const currentQuestion = questions[currentIndex];

    // ─────────────────────────────────────────────────────────────────────────
    // Auto-enter fullscreen on mount
    // ─────────────────────────────────────────────────────────────────────────

    const enterFullscreen = useCallback(() => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => { });
        } else if ((elem as any).webkitRequestFullscreen) {
            (elem as any).webkitRequestFullscreen();
        }
    }, []);

    useEffect(() => {
        if (fullscreenReady) {
            enterFullscreen();
        }
    }, [fullscreenReady, enterFullscreen]);

    // ─────────────────────────────────────────────────────────────────────────
    // Violation-reporting socket
    //
    // Self-paced students answer over REST, but violations must still reach
    // the backend so counts/penalties are recorded and the instructor's live
    // monitor shows them. Reuses the same quiz WebSocket as live mode.
    // ─────────────────────────────────────────────────────────────────────────

    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!joinCode || !fullscreenReady || !sessionState.participantId) return;

        const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const socket = new WebSocket(`${wsBase}/quiz/${joinCode}/`);
        wsRef.current = socket;

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // The server can close the session when the violation limit is
                // exceeded — respect it even though pausing is handled locally.
                if (data.type === 'quiz_closed') {
                    setIsQuizClosed(true);
                    setCloseReason(data.reason || 'Your session was closed.');
                    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
                }
            } catch { /* ignore malformed frames */ }
        };

        return () => {
            wsRef.current = null;
            socket.close();
        };
    }, [joinCode, fullscreenReady, sessionState.participantId]);

    const reportViolation = useCallback(
        (type: 'fullscreen_exit' | 'tab_switch' | 'copy_paste') => {
            if (wsRef.current?.readyState === WebSocket.OPEN && sessionState.participantId) {
                wsRef.current.send(JSON.stringify({
                    type: 'report_violation',
                    participant_id: sessionState.participantId,
                    violation_type: type,
                }));
            }
        },
        [sessionState.participantId]
    );

    // Resume with a brief loading beat; also clears the server-side pause flag
    // so the instructor monitor stops showing this student as paused.
    const resumeWithBeat = useCallback(() => {
        setResuming(true);
        if (wsRef.current?.readyState === WebSocket.OPEN && sessionState.participantId) {
            wsRef.current.send(JSON.stringify({
                type: 'resume_from_fullscreen',
                participant_id: sessionState.participantId,
            }));
        }
        window.setTimeout(() => {
            setIsQuizPaused(false);
            setPauseReason('');
            setPauseSource('');
            setResuming(false);
        }, 1200);
    }, [sessionState.participantId]);

    // ─────────────────────────────────────────────────────────────────────────
    // Fullscreen change detection
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const handleFsChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);

            if (!isFull && quizActive) {
                reportViolation('fullscreen_exit');
                setViolations(v => {
                    const newCount = v + 1;
                    if (newCount >= maxViolations) {
                        setIsQuizClosed(true);
                        setCloseReason(`Quiz closed: maximum violations (${maxViolations}) reached.`);
                    }
                    return newCount;
                });

                // Always pause on fullscreen exit
                if (fsAction === 'pause') {
                    setIsQuizPaused(true);
                    setPauseReason('You exited fullscreen. Re-enter fullscreen to continue.');
                    setPauseSource('fullscreen');
                }
            }

            // Back in fullscreen while paused — resume via the loading beat
            if (isFull && isQuizPaused && !resuming) {
                resumeWithBeat();
            }
        };

        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('webkitfullscreenchange', handleFsChange);
        };
    }, [sessionState.requireFullscreen, quizActive, fsAction, isQuizPaused, resuming, resumeWithBeat, reportViolation, maxViolations]);

    // ─────────────────────────────────────────────────────────────────────────
    // Tab switch detection (MANDATORY). The `blur` listener also catches
    // switching to another application while this tab stays visible — the
    // closest a browser gets to detecting other processes.
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const flagTabSwitch = () => {
            if (isQuizPausedRef.current) return; // already paused — don't stack violations
            reportViolation('tab_switch');
            setViolations(v => {
                const newCount = v + 1;
                if (newCount >= maxViolations) {
                    setIsQuizClosed(true);
                    setCloseReason(`Quiz closed: maximum violations (${maxViolations}) reached.`);
                }
                return newCount;
            });

            // Always pause on tab switch
            setIsQuizPaused(true);
            setPauseReason('You switched tabs or windows. Return to fullscreen to continue.');
            setPauseSource('tab_switch');
        };

        const handleVisChange = () => {
            if (document.hidden && quizActive) flagTabSwitch();
        };

        const handleBlur = () => {
            // Let visibilitychange handle the hidden-tab case first, then flag
            // only if focus genuinely moved to another app/window.
            window.setTimeout(() => {
                if (quizActive && !document.hasFocus() && !document.hidden) {
                    flagTabSwitch();
                }
            }, 150);
        };

        document.addEventListener('visibilitychange', handleVisChange);
        window.addEventListener('blur', handleBlur);
        return () => {
            document.removeEventListener('visibilitychange', handleVisChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [quizActive, atAction, maxViolations, reportViolation]);

    // ─────────────────────────────────────────────────────────────────────────
    // Copy-paste prevention (MANDATORY)
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!quizActive) return;

        const block = (e: ClipboardEvent) => {
            e.preventDefault();
            reportViolation('copy_paste');
            setViolations(v => v + 1);
            toast.error('Copy/paste is not allowed during the quiz.', { duration: 2000 });
        };

        document.addEventListener('copy', block);
        document.addEventListener('paste', block);
        document.addEventListener('cut', block);
        return () => {
            document.removeEventListener('copy', block);
            document.removeEventListener('paste', block);
            document.removeEventListener('cut', block);
        };
    }, [quizActive, reportViolation]);

    // ─────────────────────────────────────────────────────────────────────────
    // Per-question timer
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (currentQuestion) {
            setTimeRemaining(currentQuestion.time_limit || 30);
            answerStartTime.current = Date.now();
            setSelectedAnswer(null);
            setCodeSubmission(currentQuestion.starter_code || '');
            setIsAnswerSubmitted(false);
            setAnswerResult(null);
            // Clear any pending auto-advance from previous question
            if (autoAdvanceRef.current) {
                clearTimeout(autoAdvanceRef.current);
                autoAdvanceRef.current = null;
            }
        }
    }, [currentIndex]);

    // Cleanup auto-advance timer on unmount
    useEffect(() => {
        return () => {
            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        };
    }, []);

    useEffect(() => {
        // NOTE: violation pauses do NOT stop this timer — the pause overlay
        // blocks answering while the clock keeps draining, same as live mode.
        // Wall-clock corrected so throttled background tabs can't buy time.
        if (!quizActive || !currentQuestion || isAnswerSubmitted) return;

        let lastTick = Date.now();
        const timer = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.max(1, Math.round((now - lastTick) / 1000));
            lastTick = now;

            setTimeRemaining(prev => {
                if (prev <= elapsed) {
                    clearInterval(timer);
                    // Auto-submit with no answer when time runs out
                    if (!isAnswerSubmitted) {
                        handleSubmitAnswer('');
                    }
                    return 0;
                }
                return prev - elapsed;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentIndex, quizActive, isAnswerSubmitted]);

    // ─────────────────────────────────────────────────────────────────────────
    // Total quiz timer (also keeps running through violation pauses)
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (totalTimeRemaining === null || !quizActive) return;

        let lastTick = Date.now();
        const timer = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.max(1, Math.round((now - lastTick) / 1000));
            lastTick = now;

            setTotalTimeRemaining(prev => {
                if (prev === null) return null;
                if (prev <= elapsed) {
                    clearInterval(timer);
                    handleFinishQuiz();
                    return 0;
                }
                return prev - elapsed;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [totalTimeRemaining === null, quizActive]);

    // ─────────────────────────────────────────────────────────────────────────
    // Submit answer via REST
    // ─────────────────────────────────────────────────────────────────────────

    const handleSubmitAnswer = async (answer: string) => {
        if (isSubmitting || isAnswerSubmitted || !currentQuestion || !sessionState.participantId) return;
        setIsSubmitting(true);

        const responseTime = (Date.now() - answerStartTime.current) / 1000;

        try {
            const isCoding = currentQuestion.question_type === 'coding';
            const result = await liveQuizService.submitResponse({
                participant_id: sessionState.participantId,
                question_id: currentQuestion.id,
                answer_text: isCoding ? '' : (answer || selectedAnswer || ''),
                ...(isCoding ? { code_submission: codeSubmission } : {}),
                response_time_seconds: responseTime,
            });

            setIsAnswerSubmitted(true);
            setAnswerResult(result);
            setScore(result.participant_score);
            setTotalCorrect(result.participant_correct);
            setTotalAttempted(result.participant_attempted);

            // Auto-advance to next question after 2 seconds
            autoAdvanceRef.current = setTimeout(() => {
                handleNextQuestion();
            }, 2000);
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Failed to submit answer';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Next question / Finish
    // ─────────────────────────────────────────────────────────────────────────

    const handleNextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleFinishQuiz();
        }
    };

    const handleFinishQuiz = async () => {
        if (!sessionState.participantId) return;
        setIsFinished(true);

        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }

        try {
            const finalResults = await liveQuizService.completeSelfPaced(sessionState.participantId);
            setResults(finalResults);
        } catch (error) {
            // Still show local results if API fails
            setResults({
                quiz_title: sessionState.quizTitle || 'Quiz',
                total_score: score,
                total_correct: totalCorrect,
                total_attempted: totalAttempted,
                total_questions: questions.length,
                accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100 * 10) / 10 : 0,
            });
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Format time
    // ─────────────────────────────────────────────────────────────────────────

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // No questions fallback
    // ─────────────────────────────────────────────────────────────────────────

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4 pb-20">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">No Questions Found</h2>
                    <p className="text-neutral-400 mb-6">This quiz has no questions yet.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Fullscreen Start Screen (requires user gesture for browser API)
    // ─────────────────────────────────────────────────────────────────────────────

    if (!fullscreenReady) {
        const handleEnterFullscreen = async () => {
            try {
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen();
                } else if ((elem as any).webkitRequestFullscreen) {
                    (elem as any).webkitRequestFullscreen();
                }
            } catch { /* ignore */ }
            setFullscreenReady(true);
        };

        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-neutral-950 to-neutral-950" />
                <div className="relative w-full max-w-md">
                    <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Maximize className="w-8 h-8 text-purple-400" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Fullscreen Required</h1>
                        <p className="text-neutral-400 text-sm mb-6">
                            This quiz must be taken in fullscreen mode to prevent distractions and ensure fair assessment.
                        </p>
                        <button
                            onClick={handleEnterFullscreen}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Maximize className="w-5 h-5" />
                            Start in Fullscreen
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Quiz Closed overlay
    // ─────────────────────────────────────────────────────────────────────────

    if (isQuizClosed) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 pb-20">
                <div className="bg-red-950/50 border border-red-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
                    <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Quiz Closed</h2>
                    <p className="text-red-300 mb-6">{closeReason}</p>
                    <p className="text-neutral-400 text-sm mb-6">
                        Violations: {violations} / {maxViolations}
                    </p>
                    <button
                        onClick={() => {
                            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
                            navigate('/dashboard');
                        }}
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Paused overlay
    // ─────────────────────────────────────────────────────────────────────────

    if (isQuizPaused || resuming) {
        const t = Math.max(0, timeRemaining);
        const mmss = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 pb-20">
                {resuming ? (
                    /* Resuming loading state */
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-purple-400" />
                        <p className="text-lg font-semibold text-white">Resuming…</p>
                        <p className="text-sm text-neutral-500 mt-1">Bringing you back to the quiz</p>
                    </div>
                ) : (
                    <div className="bg-amber-950/50 border border-amber-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
                        <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400 mx-auto mb-4 animate-pulse" />
                        <h2 className="text-2xl font-bold text-white mb-2">Quiz Paused</h2>
                        <p className="text-amber-300 mb-6">{pauseReason}</p>

                        {/* The deterrent: their time is visibly draining while away */}
                        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">
                                The clock is still running
                            </p>
                            <p className="text-3xl font-bold text-white tabular-nums">{mmss}</p>
                            <p className="text-xs text-neutral-500 mt-1">Time left on this question keeps counting down</p>
                        </div>

                        {document.fullscreenElement ? (
                            <button
                                onClick={resumeWithBeat}
                                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors flex items-center gap-2 mx-auto"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Continue Quiz
                            </button>
                        ) : (
                            <button
                                onClick={enterFullscreen}
                                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-colors flex items-center gap-2 mx-auto"
                            >
                                <Expand className="w-5 h-5" />
                                Re-enter Fullscreen
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Results view
    // ─────────────────────────────────────────────────────────────────────────

    if (isFinished && results) {
        const accuracy = results.accuracy ?? (results.total_attempted > 0
            ? Math.round((results.total_correct / results.total_attempted) * 100 * 10) / 10 : 0);

        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 pb-20">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-neutral-950 to-neutral-950" />
                <div className="relative w-full max-w-2xl">
                    <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 sm:p-8 shadow-2xl">
                        <div className="text-center mb-6 sm:mb-8">
                            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400 mx-auto mb-3 sm:mb-4" />
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Quiz Complete!</h1>
                            <p className="text-neutral-400 text-sm sm:text-base">{results.quiz_title || sessionState.quizTitle}</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <div className="bg-neutral-800/50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-purple-400">{results.total_score}</div>
                                <div className="text-sm text-neutral-400">Score</div>
                            </div>
                            <div className="bg-neutral-800/50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-green-400">{results.total_correct}/{results.total_questions}</div>
                                <div className="text-sm text-neutral-400">Correct</div>
                            </div>
                            <div className="bg-neutral-800/50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-purple-400">{accuracy}%</div>
                                <div className="text-sm text-neutral-400">Accuracy</div>
                            </div>
                            <div className="bg-neutral-800/50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-amber-400">
                                    {results.average_response_time ? `${results.average_response_time}s` : '-'}
                                </div>
                                <div className="text-sm text-neutral-400">Avg Time</div>
                            </div>
                        </div>

                        {results.rank && (
                            <div className="bg-gradient-to-r from-purple-900/30 to-purple-900/30 border border-purple-700/30 rounded-xl p-4 text-center mb-8">
                                <span className="text-neutral-400">Your Rank: </span>
                                <span className="text-2xl font-bold text-purple-300">#{results.rank}</span>
                                <span className="text-neutral-400"> of {results.total_participants}</span>
                            </div>
                        )}

                        {/* Per-question breakdown */}
                        {results.question_results && results.question_results.length > 0 && (
                            <div className="space-y-3 mb-8">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" /> Question Breakdown
                                </h3>
                                {results.question_results.map((qr: any, idx: number) => (
                                    <div key={idx} className={`p-4 rounded-xl border ${qr.is_correct
                                        ? 'bg-green-950/20 border-green-800/30'
                                        : 'bg-red-950/20 border-red-800/30'
                                        }`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-neutral-300 truncate">
                                                    Q{idx + 1}: {qr.question_text}
                                                </p>
                                                {!qr.is_correct && (
                                                    <p className="text-xs text-neutral-500 mt-1">
                                                        Your answer: {qr.answer_given}
                                                    </p>
                                                )}
                                                {qr.explanation && (
                                                    <p className="text-xs text-neutral-500 mt-1 italic">{qr.explanation}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {qr.is_correct
                                                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                                                    : <XCircle className="w-5 h-5 text-red-400" />
                                                }
                                                <span className="text-sm font-medium text-neutral-300">
                                                    {qr.points_earned}/{qr.points_possible}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Active quiz view
    // ─────────────────────────────────────────────────────────────────────────

    const options = [
        { key: 'A', text: currentQuestion?.option_a, color: 'from-red-600 to-red-700' },
        { key: 'B', text: currentQuestion?.option_b, color: 'from-purple-600 to-purple-700' },
        { key: 'C', text: currentQuestion?.option_c, color: 'from-amber-600 to-amber-700' },
        { key: 'D', text: currentQuestion?.option_d, color: 'from-green-600 to-green-700' },
    ].filter(o => o.text);

    const getOptionStyle = (key: string) => {
        if (!isAnswerSubmitted) {
            return selectedAnswer === key
                ? 'ring-2 ring-purple-400 bg-purple-900/30 border-purple-500'
                : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-500';
        }
        // After submission: just dim non-selected, keep selected highlighted
        if (selectedAnswer === key) {
            return 'ring-2 ring-purple-400 bg-purple-900/30 border-purple-500';
        }
        return 'bg-neutral-800/30 border-neutral-700 opacity-50';
    };

    const progressPercent = ((currentIndex) / questions.length) * 100;
    const timePercent = currentQuestion ? (timeRemaining / (currentQuestion.time_limit || 30)) * 100 : 0;

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col pb-16 sm:pb-0">
            {/* Header bar */}
            <div className="bg-neutral-900/80 backdrop-blur border-b border-neutral-800 px-3 sm:px-4 py-2 sm:py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <h1 className="text-white font-semibold text-sm sm:text-lg truncate max-w-[120px] sm:max-w-[200px]">
                            {sessionState.quizTitle || 'Quiz'}
                        </h1>
                        <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded-full">
                            Self-Paced
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Violations badge */}
                        {violations > 0 && (
                            <div className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded-full flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                {violations}/{maxViolations}
                            </div>
                        )}

                        {/* Score */}
                        <div className="text-sm text-neutral-300">
                            <span className="text-purple-400 font-bold">{score}</span> pts
                        </div>

                        {/* Total timer */}
                        {totalTimeRemaining !== null && (
                            <div className={`text-sm font-mono flex items-center gap-1 ${totalTimeRemaining < 60 ? 'text-red-400' : 'text-neutral-300'
                                }`}>
                                <Clock className="w-4 h-4" />
                                {formatTime(totalTimeRemaining)}
                            </div>
                        )}

                        {/* Progress */}
                        <div className="text-sm text-neutral-400">
                            {currentIndex + 1}/{questions.length}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="max-w-4xl mx-auto mt-2">
                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-4">
                <div className="w-full max-w-3xl">
                    {/* Timer ring */}
                    <div className="flex justify-center mb-4 sm:mb-6">
                        <div className="relative w-14 h-14 sm:w-20 sm:h-20">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
                                <circle
                                    cx="50" cy="50" r="42" fill="none"
                                    stroke={timeRemaining <= 5 ? '#ef4444' : timeRemaining <= 10 ? '#f59e0b' : '#a855f7'}
                                    strokeWidth="8" strokeLinecap="round"
                                    strokeDasharray={`${timePercent * 2.64} 264`}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-lg sm:text-xl font-bold ${timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-white'
                                    }`}>
                                    {timeRemaining}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Question card */}
                    <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-purple-400 font-medium">
                                Question {currentIndex + 1} of {questions.length}
                            </span>
                            <span className="text-sm text-neutral-400">
                                {currentQuestion?.points || 0} points
                            </span>
                        </div>

                        <h2
                            className="text-base sm:text-xl text-white font-semibold mb-4 sm:mb-6 leading-relaxed [&_p]:m-0"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentQuestion?.question_text || '') }}
                        />

                        {currentQuestion?.image_url && (
                            <img
                                src={currentQuestion.image_url}
                                alt="Question"
                                className="max-w-full max-h-64 object-contain rounded-lg mb-6 mx-auto"
                            />
                        )}

                        {/* MCQ Options */}
                        {currentQuestion?.question_type === 'multiple_choice' && options.length > 0 && (
                            <div className="grid gap-3">
                                {options.map((opt) => (
                                    <button
                                        key={opt.key}
                                        onClick={() => !isAnswerSubmitted && setSelectedAnswer(opt.key)}
                                        disabled={isAnswerSubmitted}
                                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${getOptionStyle(opt.key)}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 border transition-colors ${selectedAnswer === opt.key ? 'bg-purple-600 border-purple-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}>
                                                {opt.key}
                                            </span>
                                            <span className="text-white text-sm">{opt.text}</span>
                                            {isAnswerSubmitted && selectedAnswer === opt.key && canShowResult && (
                                                answerResult?.is_correct
                                                    ? <CheckCircle className="w-5 h-5 text-green-400 ml-auto shrink-0" />
                                                    : <XCircle className="w-5 h-5 text-red-400 ml-auto shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* True/False Options */}
                        {currentQuestion?.question_type === 'true_false' && (
                            <div className="grid grid-cols-2 gap-3">
                                {['True', 'False'].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => !isAnswerSubmitted && setSelectedAnswer(val.toLowerCase())}
                                        disabled={isAnswerSubmitted}
                                        className={`w-full text-center p-4 rounded-xl border transition-all duration-200 ${!isAnswerSubmitted
                                            ? selectedAnswer === val.toLowerCase()
                                                ? 'ring-2 ring-purple-400 bg-purple-900/30 border-purple-500'
                                                : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-500'
                                            : selectedAnswer === val.toLowerCase()
                                                ? canShowResult
                                                    ? answerResult?.is_correct
                                                        ? 'bg-green-900/40 border-green-500 ring-2 ring-green-400'
                                                        : 'bg-red-900/40 border-red-500 ring-2 ring-red-400'
                                                    : 'ring-2 ring-purple-400 bg-purple-900/30 border-purple-500'
                                                : 'bg-neutral-800/30 border-neutral-700 opacity-50'
                                            }`}
                                    >
                                        <span className="text-white font-semibold text-sm">{val}</span>
                                        {isAnswerSubmitted && selectedAnswer === val.toLowerCase() && canShowResult && (
                                            <span className="ml-2 inline-block">
                                                {answerResult?.is_correct
                                                    ? <CheckCircle className="w-5 h-5 text-green-400 inline" />
                                                    : <XCircle className="w-5 h-5 text-red-400 inline" />
                                                }
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Text-based answer (short_answer, enumeration, essay) */}
                        {['short_answer', 'enumeration', 'essay'].includes(currentQuestion?.question_type || '') && (
                            <div>
                                <textarea
                                    value={selectedAnswer || ''}
                                    onChange={(e) => !isAnswerSubmitted && setSelectedAnswer(e.target.value)}
                                    disabled={isAnswerSubmitted}
                                    placeholder={
                                        currentQuestion?.question_type === 'enumeration'
                                            ? 'Enter items separated by commas...'
                                            : currentQuestion?.question_type === 'essay'
                                                ? 'Write your answer here...'
                                                : 'Type your answer...'
                                    }
                                    rows={currentQuestion?.question_type === 'essay' ? 6 : 3}
                                    className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 resize-none"
                                />
                            </div>
                        )}

                        {/* Coding Question — Monaco Editor */}
                        {currentQuestion?.question_type === 'coding' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Code className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">
                                        {currentQuestion.programming_language || 'Python'}
                                    </span>
                                </div>
                                <div className="rounded-xl overflow-hidden border border-neutral-700" style={{ minHeight: '300px' }}>
                                    <Editor
                                        height="300px"
                                        defaultLanguage="python"
                                        language={currentQuestion.programming_language || 'python'}
                                        theme="vs-dark"
                                        value={codeSubmission}
                                        onChange={(value) => !isAnswerSubmitted && setCodeSubmission(value || '')}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            readOnly: isAnswerSubmitted,
                                            lineNumbers: 'on',
                                            renderLineHighlight: 'line',
                                            padding: { top: 12, bottom: 12 },
                                            wordWrap: 'on',
                                        }}
                                    />
                                </div>
                                <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Your code will be tested against {currentQuestion.test_cases?.length || 0} test case(s)
                                </p>
                            </div>
                        )}

                        {/* Submitted indicator (no answer reveal) */}
                        {isAnswerSubmitted && answerResult && (
                            <div className="mt-4 p-3 rounded-xl border bg-neutral-800/40 border-neutral-700 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-purple-400" />
                                <span className="text-sm text-neutral-300 font-medium">Answer submitted</span>
                                {canShowResult && (
                                    <span className="text-sm text-neutral-500 ml-auto">+{answerResult.points_earned} pts</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end">
                        {!isAnswerSubmitted ? (
                            <button
                                onClick={() => {
                                    if (currentQuestion?.question_type === 'coding') {
                                        handleSubmitAnswer('');
                                    } else {
                                        handleSubmitAnswer(selectedAnswer || '');
                                    }
                                }}
                                disabled={(
                                    currentQuestion?.question_type === 'coding'
                                        ? !codeSubmission.trim()
                                        : !selectedAnswer
                                ) || isSubmitting}
                                className="px-5 sm:px-8 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <CheckCircle className="w-5 h-5" />
                                )}
                                Submit Answer
                            </button>
                        ) : (
                            <button
                                onClick={handleNextQuestion}
                                className="px-5 sm:px-8 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all flex items-center gap-2 text-sm sm:text-base"
                            >
                                {currentIndex < questions.length - 1 ? (
                                    <>Next Question <ChevronRight className="w-5 h-5" /></>
                                ) : (
                                    <>Finish Quiz <Trophy className="w-5 h-5" /></>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>


            {/* ── Violation Sidebar Overlay ── */}
            {showViolationPanel && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />

                    {/* Right sidebar panel */}
                    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-neutral-900 border-l border-neutral-700 z-50 flex flex-col shadow-2xl animate-slideIn">
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
                                <AlertCircle className="w-8 h-8 text-amber-400" />
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">Violation Detected</h2>
                            <p className="text-neutral-400 mb-6">Take a breath. Your timer is still running.</p>

                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-8 w-full max-w-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-neutral-400">Violations</span>
                                    <span className="text-lg font-bold text-amber-400">
                                        {violations} {maxViolations > 0 ? `/ ${maxViolations}` : ''}
                                    </span>
                                </div>
                                {maxViolations > 0 && (
                                    <div className="w-full h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all"
                                            style={{ width: `${Math.min((violations / maxViolations) * 100, 100)}%` }}
                                        />
                                    </div>
                                )}
                                {maxViolations > 0 && violations >= maxViolations - 1 && (
                                    <p className="text-xs text-red-400 mt-2">
                                        One more violation will close the quiz.
                                    </p>
                                )}
                            </div>

                            <ul className="text-sm text-neutral-500 space-y-1 mb-8">
                                <li>Stay in fullscreen mode</li>
                                <li>Do not switch tabs or windows</li>
                                <li>Focus on your quiz</li>
                            </ul>

                            <button
                                onClick={() => {
                                    setShowViolationPanel(false);
                                    if (sessionState.requireFullscreen) {
                                        enterFullscreen();
                                    }
                                }}
                                className="w-full max-w-xs px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Expand className="w-5 h-5" />
                                Resume Quiz
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes slideIn {
                            from { transform: translateX(100%); }
                            to { transform: translateX(0); }
                        }
                        .animate-slideIn {
                            animation: slideIn 0.3s ease-out;
                        }
                    `}</style>
                </>
            )}
        </div>
    );
};

export default SelfPacedQuizSession;
