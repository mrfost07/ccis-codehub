import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Timer, CheckCircle, XCircle, AlertCircle, Play, Terminal,
    Loader2, Maximize, ShieldAlert, Lock, Clock,
    Send, Zap, Code
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import DOMPurify from 'dompurify';
import Editor from '@monaco-editor/react';
import ViolationWarningModal from '../components/ViolationWarningModal';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Question {
    id: string;
    type: 'mcq' | 'code';
    questionType: string;
    text: string;
    choices?: Array<{ id: string; text: string }>;
    timeLimit: number;
    codeTemplate?: string;
    language?: string;
    points?: number;
    testCases?: Array<{ input: string; expected_output: string; is_hidden?: boolean }>;
}

interface QuizState {
    status: 'waiting' | 'in_progress' | 'results';
    currentQuestion?: Question;
    questionNumber: number;
    totalQuestions: number;
    timeRemaining: number;
    score: number;
    totalCorrect: number;
    totalAttempted: number;
}

interface SessionState {
    participantId?: string;
    sessionId?: string;
    quizId?: string;
    quizTitle?: string;
    timeLimitMinutes?: number;
    nickname?: string;
    requireFullscreen?: boolean;
    maxViolations?: number;
    violationPenaltyPoints?: number;
    // Phase 2: action configuration
    fullscreenExitAction?: 'warn' | 'pause' | 'close';
    altTabAction?: 'warn' | 'shuffle' | 'close';
    enableCodeExecution?: boolean;
    showCorrectAnswers?: boolean;
    showLeaderboard?: boolean;
}

interface TestCaseResult {
    test_case_index: number;
    passed: boolean;
    stdout: string;
    stderr: string;
    expected: string;
    error: string | null;
    is_hidden?: boolean;
}

interface CodeExecutionResult {
    passed: number;
    total: number;
    all_passed: boolean;
    status: string;
    results: TestCaseResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const LiveQuizSession = () => {
    const { joinCode } = useParams<{ joinCode: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const sessionState = (location.state as SessionState) || {};
    const wsRef = useRef<WebSocket | null>(null);
    const answerStartTime = useRef<number>(Date.now());

    // ── Core quiz state ───────────────────────────────────────────────────────
    const [gameState, setGameState] = useState<QuizState>({
        status: 'waiting',
        timeRemaining: 30,
        questionNumber: 0,
        totalQuestions: 0,
        score: 0,
        totalCorrect: 0,
        totalAttempted: 0,
    });

    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [codeAnswer, setCodeAnswer] = useState<string>('');
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [codeExecResult, setCodeExecResult] = useState<CodeExecutionResult | null>(null);
    const [isRunningCode, setIsRunningCode] = useState(false);
    const [showCodeSuccessModal, setShowCodeSuccessModal] = useState(false);

    // Ref to track submission state for WS handler (avoids stale closure reads)
    const isAnswerSubmittedRef = useRef(false);

    // ── Anti-cheat state ──────────────────────────────────────────────────────
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isQuizPaused, setIsQuizPaused] = useState(false);

    // Mirror answer + pause state into refs so the (stable) WebSocket message
    // handler reads the CURRENT values, not the ones captured when it was
    // created — otherwise question-end scoring and paused-shuffle guards use
    // stale state. (Remediation Req 23.)
    const selectedAnswerRef = useRef(selectedAnswer);
    selectedAnswerRef.current = selectedAnswer;
    const isQuizPausedRef = useRef(isQuizPaused);
    isQuizPausedRef.current = isQuizPaused;
    const [pauseReason, setPauseReason] = useState('');
    const [pauseSource, setPauseSource] = useState<'fullscreen' | 'tab_switch' | 'server' | ''>('');
    const [isQuizClosed, setIsQuizClosed] = useState(false);
    const [closeReason, setCloseReason] = useState('');
    // Brief "resuming…" loading shown when returning from a pause before the quiz reveals
    const [resuming, setResuming] = useState(false);

    const [violationModal, setViolationModal] = useState({
        isOpen: false,
        violationType: 'tab_switch' as 'fullscreen_exit' | 'tab_switch' | 'copy_paste',
        totalViolations: 0,
        maxViolations: sessionState.maxViolations || 0,
        penaltyPoints: sessionState.violationPenaltyPoints || 0,
        isFlagged: false,
    });

    // Always enforce fullscreen and pause on violations
    const fsAction = 'pause' as const;
    const atAction = 'pause' as const;
    const canShowResult = sessionState.showCorrectAnswers !== false;

    // ─────────────────────────────────────────────────────────────────────────
    // Violation reporting
    // ─────────────────────────────────────────────────────────────────────────

    const reportViolation = useCallback(
        (type: 'fullscreen_exit' | 'tab_switch' | 'copy_paste') => {
            if (!sessionState.participantId) return;
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'report_violation',
                    participant_id: sessionState.participantId,
                    violation_type: type,
                }));
            }
        },
        [sessionState.participantId]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Fullscreen management
    // ─────────────────────────────────────────────────────────────────────────

    const enterFullscreen = useCallback(() => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => { });
        } else if ((elem as any).webkitRequestFullscreen) {
            (elem as any).webkitRequestFullscreen();
        }
    }, []);

    // Fullscreen change detection
    useEffect(() => {
        // Fullscreen is always enforced

        const handleFsChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);

            if (!isFull && gameState.status === 'in_progress') {
                reportViolation('fullscreen_exit');
                // Local enforcement (action confirmed/overridden by server response)
                if (fsAction === 'pause') {
                    setIsQuizPaused(true);
                    setPauseReason('You exited fullscreen. Re-enter fullscreen to continue.');
                    setPauseSource('fullscreen');
                } else if (fsAction === 'close') {
                    setIsQuizClosed(true);
                    setCloseReason('Quiz closed: fullscreen exit is not permitted.');
                }
                // 'warn' → ViolationWarningModal shown on server response
            }

            // Auto-resume if back in fullscreen and paused by a violation —
            // routed through the brief "Resuming…" loading beat for consistency.
            // Instructor pauses ('server') only end when the instructor resumes.
            if (isFull && isQuizPaused && pauseSource !== 'server' && !resuming) {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'resume_from_fullscreen',
                        participant_id: sessionState.participantId,
                    }));
                }
                setResuming(true);
                window.setTimeout(() => {
                    setIsQuizPaused(false);
                    setPauseReason('');
                    setPauseSource('');
                    setResuming(false);
                }, 1200);
            }
        };

        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('webkitfullscreenchange', handleFsChange);
        };
    }, [
        sessionState.requireFullscreen, sessionState.participantId,
        gameState.status, fsAction, isQuizPaused, pauseSource, reportViolation, resuming
    ]);

    // Tab / window visibility detection. The `blur` listener is the closest a
    // browser gets to detecting a switch to another application/process: it
    // fires when focus moves to another window even if this tab stays visible.
    useEffect(() => {
        const flagTabSwitch = () => {
            if (isQuizPausedRef.current) return; // already paused — don't double-report
            reportViolation('tab_switch');
            // Always pause on tab switch
            setIsQuizPaused(true);
            setPauseReason('You switched tabs or windows. Return to fullscreen to continue.');
            setPauseSource('tab_switch');
        };

        const handleVisChange = () => {
            if (document.hidden && gameState.status === 'in_progress') flagTabSwitch();
        };

        const handleBlur = () => {
            // Give visibilitychange a beat to handle the hidden-tab case first,
            // then flag only if focus genuinely moved to another app/window.
            window.setTimeout(() => {
                if (gameState.status === 'in_progress' && !document.hasFocus() && !document.hidden) {
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
    }, [gameState.status, atAction, reportViolation]);

    // Copy-paste prevention
    useEffect(() => {
        if (gameState.status !== 'in_progress') return;

        const block = (e: ClipboardEvent) => {
            e.preventDefault();
            reportViolation('copy_paste');
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
    }, [gameState.status, reportViolation]);

    // ─────────────────────────────────────────────────────────────────────────
    // Timer countdown (stops when paused or closed)
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (gameState.status !== 'in_progress' || !gameState.currentQuestion) return;
        if (isQuizClosed) return;

        // Wall-clock corrected countdown: decrement by the REAL seconds elapsed
        // since the last tick, not a fixed 1. Background tabs throttle setInterval,
        // so when the student returns from an Alt-Tab the pending tick deducts the
        // full time they were away — leaving the window can never buy time.
        let lastTick = Date.now();
        const timer = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.max(1, Math.round((now - lastTick) / 1000));
            lastTick = now;

            // Only a legitimate instructor pause ('server') freezes the clock.
            // Violation pauses (tab-switch / fullscreen exit) keep it running —
            // that's the whole point of the pause overlay.
            if (isQuizPausedRef.current && pauseSource === 'server') return;

            setGameState(prev => {
                const next = prev.timeRemaining - elapsed;
                if (next <= 0) {
                    // Ref guard: the state flag can lag a tick behind, which
                    // would fire duplicate empty submissions at 0 seconds.
                    if (!isAnswerSubmittedRef.current) submitAnswer('');
                    return { ...prev, timeRemaining: 0 };
                }
                return { ...prev, timeRemaining: next };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState.status, gameState.currentQuestion?.id, isAnswerSubmitted, isQuizClosed, pauseSource]);

    // ─────────────────────────────────────────────────────────────────────────
    // WebSocket connection
    // ─────────────────────────────────────────────────────────────────────────

    // Keep a ref so WS message handler always reads current gameState
    const gameStateRef = useRef(gameState);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    useEffect(() => {
        if (!joinCode) return;

        const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const socket = new WebSocket(`${wsBase}/quiz/${joinCode}/`);
        wsRef.current = socket;

        socket.onopen = () => {
            console.log('Quiz WS connected');
            // Pull current state from backend on connect
            socket.send(JSON.stringify({
                type: 'request_state',
                participant_id: sessionState.participantId,
            }));
        };

        socket.onmessage = (event) => {
            try {
                handleWsMessage(JSON.parse(event.data));
            } catch (e) {
                console.error('WS parse error', e);
            }
        };

        socket.onerror = () => toast.error('Connection error. Please try rejoining.');
        socket.onclose = () => console.log('WS disconnected');

        return () => socket.close();
    }, [joinCode]);

    // ─────────────────────────────────────────────────────────────────────────
    // WebSocket message handler
    // ─────────────────────────────────────────────────────────────────────────

    const applyQuestion = (q: any): Question => ({
        id: q.id,
        type: q.question_type === 'coding' || q.type === 'code' ? 'code' : 'mcq',
        questionType: q.question_type || 'multiple_choice',
        text: q.question_text || q.text,
        timeLimit: q.time_limit || q.timeLimit || 30,
        choices: (q.question_type === 'multiple_choice')
            ? [
                q.option_a && { id: 'A', text: q.option_a },
                q.option_b && { id: 'B', text: q.option_b },
                q.option_c && { id: 'C', text: q.option_c },
                q.option_d && { id: 'D', text: q.option_d },
            ].filter(Boolean) as Array<{ id: string; text: string }>
            : q.choices,
        codeTemplate: q.starter_code || q.codeTemplate || '',
        language: q.programming_language || q.language || 'python',
        points: q.points || 100,
        testCases: q.test_cases || q.testCases || [],
    });

    const handleWsMessage = (data: any) => {
        console.log('[LiveQuiz WS]', data.type, data);
        switch (data.type) {

            case 'quiz_started':
                console.log('Quiz started by instructor');
                break;

            case 'question_start': {
                const question = applyQuestion(data.question);
                setGameState(prev => ({
                    ...prev,
                    currentQuestion: question,
                    timeRemaining: question.timeLimit,
                    status: 'in_progress',
                    questionNumber: prev.questionNumber + 1,
                    totalQuestions: data.totalQuestions || prev.totalQuestions,
                }));
                setSelectedAnswer(null);
                setCodeAnswer(question.codeTemplate || '');
                setIsAnswerSubmitted(false);
                isAnswerSubmittedRef.current = false;
                setAnswerResult(null);
                setPointsEarned(0);
                setCodeExecResult(null);
                answerStartTime.current = Date.now();
                // Unpause if paused (new question = fresh start)
                setIsQuizPaused(false);
                setPauseReason('');
                setPauseSource('');
                // Fullscreen is mandatory once the quiz is running — if the
                // student never entered it, hold them at the pause overlay
                // (its button provides the user gesture the browser requires).
                if (!document.fullscreenElement) {
                    setIsQuizPaused(true);
                    setPauseReason('Fullscreen is required for this quiz. Enter fullscreen to continue.');
                    setPauseSource('fullscreen');
                }
                break;
            }

            // ── Phase 2: Question shuffle on alt-tab (instructor's choice) ──
            case 'question_shuffle': {
                // Don't replace the current question if quiz is paused
                // (pause already blocks the student — no need to also shuffle).
                // Read the ref so a pause that happened after this handler was
                // created is respected. (Req 23.2.)
                if (isQuizPausedRef.current) break;

                const question = applyQuestion(data.question);
                toast('Question changed — focus was detected elsewhere.', { duration: 3000 });
                setGameState(prev => ({
                    ...prev,
                    currentQuestion: question,
                    timeRemaining: question.timeLimit,
                    status: 'in_progress',
                }));
                setSelectedAnswer(null);
                setCodeAnswer(question.codeTemplate || '');
                setIsAnswerSubmitted(false);
                setAnswerResult(null);
                setCodeExecResult(null);
                answerStartTime.current = Date.now();
                break;
            }

            // ── Phase 2: Quiz paused (individual — violation-based) ────────
            case 'quiz_paused':
                setIsQuizPaused(true);
                setPauseReason(data.reason || 'Quiz paused.');
                break;

            case 'quiz_resumed':
                setIsQuizPaused(false);
                setPauseReason('');
                setPauseSource('');
                toast.success('Quiz resumed!');
                break;

            // ── Instructor session-wide pause/resume ─────────────────────
            case 'session_paused':
                setIsQuizPaused(true);
                setPauseReason(data.reason || 'Session paused by instructor.');
                setPauseSource('server'); // instructor pause freezes the clock
                break;

            case 'session_resumed':
                setIsQuizPaused(false);
                setPauseReason('');
                setPauseSource('');
                toast.success('Session resumed by instructor!');
                break;

            // ── Instructor pause/resume targeted at one participant ──────
            case 'participant_pause_state':
                if (data.participant_id !== String(sessionState.participantId)) break;
                if (data.paused) {
                    setIsQuizPaused(true);
                    setPauseReason(data.reason || 'Paused by your instructor.');
                    setPauseSource('server'); // instructor pause freezes the clock
                } else {
                    setIsQuizPaused(false);
                    setPauseReason('');
                    setPauseSource('');
                    toast.success('Resumed by your instructor!');
                }
                break;

            // ── Phase 2: Quiz closed by server ───────────────────────────
            case 'quiz_closed':
                setIsQuizClosed(true);
                setCloseReason(data.reason || 'Your session was closed.');
                if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
                break;

            case 'time_tick':
                setGameState(prev => ({ ...prev, timeRemaining: data.seconds }));
                break;

            case 'answer_submitted':
                if (data.data?.success) {
                    const pts = data.data.points_earned || 0;
                    setAnswerResult(data.data.is_correct ? 'correct' : 'incorrect');
                    setPointsEarned(pts);
                    if (data.data.is_correct) {
                        setGameState(prev => ({
                            ...prev,
                            score: prev.score + pts,
                            totalCorrect: prev.totalCorrect + 1,
                        }));
                    }
                    setGameState(prev => ({ ...prev, totalAttempted: prev.totalAttempted + 1 }));
                }
                break;

            // ── Phase 2: Code submission result with per-test details ────
            case 'code_submitted':
                if (data.data?.success) {
                    setCodeExecResult(data.data.test_results);
                    setIsRunningCode(false);

                    // run_only = just testing, don't update scores or mark submitted
                    if (data.data.run_only) {
                        break;
                    }

                    const pts = data.data.points_earned || 0;
                    setAnswerResult(data.data.is_correct ? 'correct' : 'incorrect');
                    setPointsEarned(pts);
                    setGameState(prev => ({
                        ...prev,
                        score: prev.score + pts,
                        totalCorrect: data.data.is_correct ? prev.totalCorrect + 1 : prev.totalCorrect,
                        totalAttempted: prev.totalAttempted + 1,
                    }));
                    // Show success modal when all tests pass
                    if (data.data.is_correct) {
                        setShowCodeSuccessModal(true);
                    }
                }
                break;

            case 'violation_recorded':
                if (data.data?.success) {
                    setViolationModal({
                        isOpen: true,
                        violationType: data.violation_type || 'tab_switch',
                        totalViolations: data.data.total_violations || 0,
                        maxViolations: data.data.max_violations || 0,
                        penaltyPoints: data.data.penalty_applied || 0,
                        isFlagged: data.data.is_flagged || false,
                    });
                    if ((data.data.penalty_applied || 0) > 0) {
                        setGameState(prev => ({
                            ...prev,
                            score: Math.max(0, prev.score - (data.data.penalty_applied || 0)),
                        }));
                    }
                }
                break;

            case 'question_end': {
                // Only do client-side scoring if student never submitted via WS.
                // Read selectedAnswerRef so fallback scoring uses the answer the
                // student actually has selected now, not a stale capture. (Req 23.1.)
                if (!isAnswerSubmittedRef.current && answerResult === null) {
                    const isCorrect = data.correctAnswer?.toUpperCase() === selectedAnswerRef.current?.toUpperCase();
                    setAnswerResult(isCorrect ? 'correct' : 'incorrect');
                    if (isCorrect) {
                        const pts = data.points || 100;
                        setPointsEarned(pts);
                        setGameState(prev => ({
                            ...prev,
                            score: prev.score + pts,
                            totalCorrect: prev.totalCorrect + 1,
                        }));
                    }
                }
                break;
            }

            case 'quiz_end':
                setGameState(prev => ({ ...prev, status: 'results' }));
                if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
                // Use ref to avoid stale closure — gameState captured at WS setup would have score=0
                navigate('/quiz/results', {
                    state: {
                        score: gameStateRef.current.score,
                        totalCorrect: gameStateRef.current.totalCorrect,
                        totalAttempted: gameStateRef.current.totalAttempted,
                        totalQuestions: gameStateRef.current.totalQuestions || gameStateRef.current.questionNumber,
                        quizTitle: sessionState.quizTitle,
                    },
                });
                break;

            default:
                console.log('[LiveQuiz WS] Unhandled message type:', data.type, data);
                break;
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Answer submission
    // ─────────────────────────────────────────────────────────────────────────

    const submitAnswer = (answer: string) => {
        if (isAnswerSubmitted && answer !== '') return;
        if (isQuizPaused || isQuizClosed) return;

        const responseTimeSecs = (Date.now() - answerStartTime.current) / 1000;

        if (gameState.currentQuestion?.type === 'mcq') setSelectedAnswer(answer);
        else setCodeAnswer(answer);

        setIsAnswerSubmitted(true);
        isAnswerSubmittedRef.current = true;

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'submit_answer',
                participant_id: sessionState.participantId,
                question_id: gameState.currentQuestion?.id,
                answer,
                response_time: Math.round(responseTimeSecs),
            }));
        }
    };

    const submitCode = () => {
        if (isAnswerSubmitted || isQuizPaused || isQuizClosed) return;
        const responseTimeSecs = (Date.now() - answerStartTime.current) / 1000;
        setIsAnswerSubmitted(true);
        isAnswerSubmittedRef.current = true;
        setIsRunningCode(true);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'submit_code',
                participant_id: sessionState.participantId,
                question_id: gameState.currentQuestion?.id,
                code: codeAnswer,
                language: gameState.currentQuestion?.language || 'python',
                response_time: Math.round(responseTimeSecs),
            }));
        }
    };

    const runCodeLocally = () => {
        if (isRunningCode || isQuizPaused || isQuizClosed) return;
        setIsRunningCode(true);
        setCodeExecResult(null);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'submit_code',
                participant_id: sessionState.participantId,
                question_id: gameState.currentQuestion?.id,
                code: codeAnswer,
                language: gameState.currentQuestion?.language || 'python',
                response_time: 0,
                run_only: true,
            }));
            // Result arrives via 'code_submitted' WS message
        } else {
            toast.error('Not connected — cannot run code.');
            setIsRunningCode(false);
        }
    };


    // ─────────────────────────────────────────────────────────────────────────
    // ── QUIZ CLOSED STATE ────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    if (isQuizClosed) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-6">
                <div className="bg-neutral-900 border border-red-800/50 rounded-2xl p-10 text-center max-w-md shadow-2xl">
                    <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-400 mb-3">Session Closed</h2>
                    <p className="text-neutral-400 mb-8">{closeReason}</p>
                    <button
                        onClick={() => navigate('/quiz/join')}
                        className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition"
                    >
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── QUIZ PAUSED STATE ────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    if (isQuizPaused || resuming) {
        // A violation pause (tab-switch / fullscreen exit) keeps the clock
        // running; a legitimate instructor pause freezes it.
        const clockRunning = !resuming && pauseSource !== 'server';
        const t = Math.max(0, gameState.timeRemaining);
        const mmss = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

        const doResume = () => {
            if (!document.fullscreenElement) { enterFullscreen(); return; }
            setResuming(true);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'resume_from_fullscreen',
                    participant_id: sessionState.participantId,
                }));
            }
            // Brief loading beat, then reveal the (still-running) quiz.
            window.setTimeout(() => {
                setIsQuizPaused(false);
                setPauseReason('');
                setPauseSource('');
                setResuming(false);
            }, 1200);
        };

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/95 backdrop-blur-md text-white p-6">
                {resuming ? (
                    /* Resuming loading state */
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-purple-400" />
                        <p className="text-lg font-semibold text-white">Resuming…</p>
                        <p className="text-sm text-neutral-500 mt-1">Bringing you back to the quiz</p>
                    </div>
                ) : (
                    <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center shadow-xl shadow-black/40">
                        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Lock className="w-8 h-8 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-white mb-2">Quiz Paused</h2>
                        <p className="text-sm text-neutral-400 mb-6">{pauseReason}</p>

                        {clockRunning && (
                            /* The deterrent: their time is visibly draining while away */
                            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">
                                    The clock is still running
                                </p>
                                <p className="text-3xl font-bold text-white tabular-nums">{mmss}</p>
                                <p className="text-xs text-neutral-500 mt-1">Time left on this question keeps counting down</p>
                            </div>
                        )}

                        {pauseSource === 'server' ? (
                            /* Instructor-initiated pause — waits for the instructor to resume */
                            <div className="flex items-center justify-center gap-2 text-neutral-400 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Paused by your instructor — please wait
                            </div>
                        ) : (
                            <button
                                onClick={doResume}
                                className="flex items-center gap-2 mx-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors"
                            >
                                <Maximize className="w-5 h-5" />
                                {document.fullscreenElement ? 'Resume Quiz' : 'Re-enter Fullscreen to Continue'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── WAITING STATE ────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    if (gameState.status === 'waiting' && !gameState.currentQuestion) {
        const isCodingChallenge = sessionState.quizTitle?.toLowerCase().includes('challenge');
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500" />
                    <h2 className="text-2xl font-bold">
                        {isCodingChallenge ? 'Waiting for the challenge to begin...' : 'Waiting for next question...'}
                    </h2>
                    <p className="text-neutral-400">
                        {isCodingChallenge ? 'The host will start the coding challenge shortly' : 'The host will send the first question shortly'}
                    </p>
                    {sessionState.quizTitle && (
                        <p className="text-neutral-500 text-sm mt-4">{sessionState.quizTitle}</p>
                    )}
                    {!isFullscreen && (
                        <button
                            onClick={enterFullscreen}
                            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition flex items-center gap-2 mx-auto"
                        >
                            <Maximize className="w-4 h-4" />
                            Enter Fullscreen
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!gameState.currentQuestion) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mr-3" />
                Loading question...
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── MAIN QUIZ UI ─────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col pb-16 sm:pb-0">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="bg-neutral-900 border-b border-neutral-800 px-3 sm:px-4 py-2 sm:py-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="bg-gradient-to-r from-purple-600 to-purple-600 px-2 py-1 rounded text-xs font-bold text-white">
                            LIVE
                        </span>
                        <span className="font-mono text-neutral-400 text-sm">{joinCode}</span>
                        {gameState.questionNumber > 0 && (
                            <span className="text-neutral-500 text-sm">
                                Q{gameState.questionNumber}
                                {gameState.totalQuestions > 0 && `/${gameState.totalQuestions}`}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        {answerResult && canShowResult && (
                            <span className={`text-sm font-medium ${answerResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                                {answerResult === 'correct' ? `+${pointsEarned}` : 'Wrong'}
                            </span>
                        )}
                        {answerResult && !canShowResult && (
                            <span className="text-sm font-medium text-purple-400">Submitted</span>
                        )}
                        <div className="text-white font-bold">Score: {gameState.score}</div>
                    </div>
                </div>
            </div>


            {/* ── Coding Challenge: Split-Pane IDE Layout ──────────────── */}
            {gameState.currentQuestion.type === 'code' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Split Pane */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                        {/* Left Pane — Problem Description + Results */}
                        <div className="lg:w-[42%] border-b lg:border-b-0 lg:border-r border-neutral-800/50 overflow-y-auto flex flex-col">
                            {/* Left Pane Tabs */}
                            <div className="flex border-b border-neutral-800/50 sticky top-0 bg-neutral-950 z-10">
                                <button
                                    className="px-4 py-2.5 text-sm font-medium text-white border-b-2 border-purple-500"
                                >
                                    Description
                                </button>
                                {(codeExecResult || isRunningCode) && (
                                    <button
                                        className="px-4 py-2.5 text-sm font-medium text-purple-400 border-b-2 border-purple-500/50"
                                    >
                                        Results
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
                                {/* Problem Text */}
                                <div className="prose prose-invert prose-sm max-w-none text-neutral-300 leading-relaxed whitespace-pre-wrap">
                                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(gameState.currentQuestion.text) }} />
                                </div>

                                {/* Test Cases / Examples */}
                                {gameState.currentQuestion.testCases && gameState.currentQuestion.testCases.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-white">Examples</h3>
                                        {gameState.currentQuestion.testCases
                                            .filter((tc: any) => !tc.is_hidden)
                                            .slice(0, 3)
                                            .map((tc: any, i: number) => (
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

                                {/* Timer + Score */}
                                <div className="flex items-center gap-4 text-xs text-neutral-500 pt-2 border-t border-neutral-800/50">
                                    <span className="flex items-center gap-1">
                                        <Timer className={`w-3 h-3 ${gameState.timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-purple-400'}`} />
                                        <span className={gameState.timeRemaining <= 10 ? 'text-red-400 font-bold' : ''}>
                                            {gameState.timeRemaining}s
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> {gameState.currentQuestion.points || 100} pts
                                    </span>
                                    <span>Score: {gameState.score}</span>
                                </div>

                                {/* Test Results (shown after Run/Submit) */}
                                {(codeExecResult || isRunningCode) && (
                                    <div className="space-y-2 pt-2 border-t border-neutral-800/50">
                                        <div className="flex items-center gap-2 text-neutral-400 text-sm font-medium">
                                            <Terminal className="w-4 h-4" />
                                            <span>Test Results</span>
                                            {codeExecResult && (
                                                <span className="ml-auto text-xs">
                                                    {codeExecResult.passed}/{codeExecResult.total} passed
                                                </span>
                                            )}
                                        </div>
                                        {isRunningCode && !codeExecResult && (
                                            <div className="flex items-center gap-2 text-neutral-400 text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Running test cases...
                                            </div>
                                        )}
                                        {codeExecResult?.results?.map((r: any, i: number) => (
                                            <div key={i} className={`p-3 rounded-lg border text-xs ${r.passed
                                                ? 'bg-green-500/5 border-green-500/20'
                                                : 'bg-red-500/5 border-red-500/20'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {r.passed
                                                        ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                                        : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                                    <span className="font-medium text-neutral-300">
                                                        Test {i + 1}{r.is_hidden ? ' (hidden)' : ''}
                                                    </span>
                                                </div>
                                                {!r.passed && !r.is_hidden && r.stderr && (
                                                    <div className="text-red-400 text-xs mt-1 font-mono">{r.stderr.slice(0, 200)}</div>
                                                )}
                                                {!r.passed && r.error === 'timeout' && (
                                                    <div className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> Timed out
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Pane — Code Editor */}
                        <div className="lg:w-[58%] flex flex-col">
                            {/* Language Selector + Action Buttons */}
                            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/50 bg-neutral-900/50">
                                <div className="flex items-center gap-2">
                                    <Code className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm text-neutral-300 font-medium">
                                        {(gameState.currentQuestion.language || 'python').charAt(0).toUpperCase() + (gameState.currentQuestion.language || 'python').slice(1)}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={runCodeLocally}
                                        disabled={isAnswerSubmitted || isRunningCode}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-600"
                                    >
                                        {isRunningCode
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <Play className="w-4 h-4 text-green-400" />}
                                        Run
                                    </button>
                                    <button
                                        onClick={submitCode}
                                        disabled={isAnswerSubmitted}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isAnswerSubmitted
                                            ? <><CheckCircle className="w-4 h-4" /> Submitted</>
                                            : <><Send className="w-4 h-4" /> Submit</>}
                                    </button>
                                </div>
                            </div>

                            {/* Monaco Editor */}
                            <div className="flex-1 overflow-hidden" style={{ minHeight: '400px' }}>
                                <Editor
                                    height="100%"
                                    defaultLanguage="python"
                                    language={gameState.currentQuestion.language || 'python'}
                                    theme="vs-dark"
                                    value={codeAnswer}
                                    onChange={(value) => setCodeAnswer(value || '')}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        readOnly: isAnswerSubmitted,
                                        lineNumbers: 'on',
                                        renderLineHighlight: 'line',
                                        tabSize: 4,
                                        wordWrap: 'on',
                                        padding: { top: 12 },
                                    }}
                                />
                            </div>

                            {/* Status Bar */}
                            <div className="px-4 py-1.5 bg-neutral-900/80 border-t border-neutral-800/50 flex items-center gap-4 text-[10px] text-neutral-600">
                                <span>{(gameState.currentQuestion.language || 'python')}</span>
                                <span>{codeAnswer.split('\n').length} lines</span>
                                <span>{codeAnswer.length} chars</span>
                                {codeExecResult && (
                                    <span className={codeExecResult.passed === codeExecResult.total ? 'text-green-500' : 'text-amber-500'}>
                                        {codeExecResult.passed}/{codeExecResult.total} tests passed
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ── MCQ / Standard Question Layout ─────────────────────── */
                <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-8">

                    {/* Timer Bar */}
                    <div className="w-full bg-neutral-800 h-2 rounded-full mb-8 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-linear ${gameState.timeRemaining <= 5 ? 'bg-red-500' :
                                gameState.timeRemaining <= 10 ? 'bg-amber-500' : 'bg-purple-500'
                                }`}
                            style={{
                                width: `${(gameState.timeRemaining / (gameState.currentQuestion.timeLimit || 30)) * 100}%`,
                            }}
                        />
                    </div>

                    {/* Question Card */}
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8 text-center shadow-xl">
                        <h2
                            className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight [&_p]:m-0"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(gameState.currentQuestion.text) }}
                        />
                        <div className={`mt-6 flex justify-center items-center gap-2 font-mono text-xl ${gameState.timeRemaining <= 5 ? 'text-red-400' :
                            gameState.timeRemaining <= 10 ? 'text-amber-400' : 'text-neutral-400'
                            }`}>
                            <Timer className={`w-6 h-6 ${gameState.timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-purple-400'}`} />
                            <span>{gameState.timeRemaining}s</span>
                        </div>
                    </div>

                    {/* ── Answer Area ─────────────────────────────────────── */}
                    <div className="flex-1 content-start">
                        {/* MCQ Grid */}
                        {gameState.currentQuestion.questionType === 'multiple_choice' && gameState.currentQuestion.choices && gameState.currentQuestion.choices.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {gameState.currentQuestion.choices.map((choice) => {
                                    const isSelected = selectedAnswer === choice.id;
                                    const showResult = answerResult !== null && canShowResult;

                                    let boxClass = 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700';
                                    if (isSelected && !showResult) boxClass = 'bg-purple-600 border-purple-500 text-white';
                                    if (isAnswerSubmitted && !isSelected && !showResult) boxClass = 'opacity-50 bg-neutral-800 border-neutral-700';

                                    if (showResult) {
                                        if (isSelected && answerResult === 'correct') boxClass = 'bg-green-600 border-green-500 ring-4 ring-green-900';
                                        if (isSelected && answerResult === 'incorrect') boxClass = 'bg-red-600 border-red-500 ring-4 ring-red-900';
                                        if (!isSelected) boxClass = 'opacity-40 bg-neutral-800 border-neutral-700';
                                    }

                                    return (
                                        <button
                                            key={choice.id}
                                            onClick={() => submitAnswer(choice.id)}
                                            disabled={isAnswerSubmitted}
                                            className={`p-4 sm:p-6 rounded-xl border-2 text-left transition-all transform active:scale-[0.98] flex items-center justify-between group ${boxClass}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-neutral-700 text-neutral-400'}`}>
                                                    {choice.id}
                                                </span>
                                                <span className={`text-base sm:text-lg font-medium ${isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'}`}>
                                                    {choice.text}
                                                </span>
                                            </div>
                                            {isSelected && answerResult === 'correct' && <CheckCircle className="text-white w-6 h-6" />}
                                            {isSelected && answerResult === 'incorrect' && <XCircle className="text-white w-6 h-6" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* True/False Buttons */}
                        {gameState.currentQuestion.questionType === 'true_false' && (
                            <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                                {['True', 'False'].map((val) => {
                                    const valLower = val.toLowerCase();
                                    const isSelected = selectedAnswer === valLower;
                                    const showResult = answerResult !== null && canShowResult;

                                    let boxClass = 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700';
                                    if (isSelected && !showResult) boxClass = 'bg-gradient-to-r from-purple-600 to-purple-600 border-purple-500';
                                    if (isAnswerSubmitted && !isSelected && !showResult) boxClass = 'opacity-50 bg-neutral-800 border-neutral-700';
                                    if (showResult) {
                                        if (isSelected && answerResult === 'correct') boxClass = 'bg-green-600 border-green-500 ring-4 ring-green-900';
                                        if (isSelected && answerResult === 'incorrect') boxClass = 'bg-red-600 border-red-500 ring-4 ring-red-900';
                                        if (!isSelected) boxClass = 'opacity-40 bg-neutral-800 border-neutral-700';
                                    }

                                    return (
                                        <button
                                            key={val}
                                            onClick={() => submitAnswer(valLower)}
                                            disabled={isAnswerSubmitted}
                                            className={`p-6 rounded-xl border-2 text-center transition-all transform active:scale-[0.98] ${boxClass}`}
                                        >
                                            <span className="text-xl font-bold text-white">{val}</span>
                                            {isSelected && answerResult === 'correct' && <CheckCircle className="text-white w-6 h-6 mx-auto mt-2" />}
                                            {isSelected && answerResult === 'incorrect' && <XCircle className="text-white w-6 h-6 mx-auto mt-2" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Text-based answer (short_answer, enumeration, essay) */}
                        {['short_answer', 'enumeration', 'essay'].includes(gameState.currentQuestion.questionType) && (
                            <div className="max-w-2xl mx-auto">
                                <textarea
                                    value={selectedAnswer || ''}
                                    onChange={(e) => !isAnswerSubmitted && setSelectedAnswer(e.target.value)}
                                    disabled={isAnswerSubmitted}
                                    placeholder={
                                        gameState.currentQuestion.questionType === 'enumeration'
                                            ? 'Enter items separated by commas...'
                                            : gameState.currentQuestion.questionType === 'essay'
                                                ? 'Write your answer here...'
                                                : 'Type your answer...'
                                    }
                                    rows={gameState.currentQuestion.questionType === 'essay' ? 6 : 3}
                                    className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-white text-base placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 resize-none"
                                />
                                {!isAnswerSubmitted && selectedAnswer && (
                                    <button
                                        onClick={() => submitAnswer(selectedAnswer)}
                                        className="mt-3 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all w-full"
                                    >
                                        Submit Answer
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Violation Warning Modal */}
            <ViolationWarningModal
                isOpen={violationModal.isOpen}
                onClose={() => {
                    setViolationModal(prev => ({ ...prev, isOpen: false }));
                    enterFullscreen();
                }}
                violationType={violationModal.violationType}
                totalViolations={violationModal.totalViolations}
                maxViolations={violationModal.maxViolations}
                penaltyPoints={violationModal.penaltyPoints}
                isFlagged={violationModal.isFlagged}
            />

            {/* ── Code Success Modal Overlay ── */}
            {showCodeSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="bg-neutral-900 border border-green-500/30 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold text-green-400 mb-2">All Tests Passed!</h2>
                        <p className="text-neutral-400 mb-4">Great job! You nailed this coding challenge.</p>
                        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">
                                <div className="text-green-400 font-bold text-lg">+{pointsEarned}</div>
                                <div className="text-neutral-500 text-xs">Points</div>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2">
                                <div className="text-purple-400 font-bold text-lg">Score: {gameState.score}</div>
                                <div className="text-neutral-500 text-xs">Total</div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                                    navigate('/');
                                }}
                                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition"
                            >
                                ← Leave Session
                            </button>
                            <button
                                onClick={() => setShowCodeSuccessModal(false)}
                                className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl transition border border-neutral-700"
                            >
                                Stay Here
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveQuizSession;
