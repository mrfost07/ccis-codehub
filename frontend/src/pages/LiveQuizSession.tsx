import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Timer, CheckCircle, XCircle, AlertCircle, Play, Terminal,
    Loader2, Maximize, Camera, CameraOff, ShieldAlert, Lock, Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import ViolationWarningModal from '../components/ViolationWarningModal';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Question {
    id: string;
    type: 'mcq' | 'code';
    text: string;
    choices?: Array<{ id: string; text: string }>;
    timeLimit: number;
    codeTemplate?: string;
    language?: string;
    points?: number;
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
    enableAiProctor?: boolean;
    enableCodeExecution?: boolean;
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
// Proctor camera hook
// ─────────────────────────────────────────────────────────────────────────────

function useProctoringCamera(
    enabled: boolean,
    participantId: string | undefined,
    joinCode: string | undefined,
    nickname: string | undefined
) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const procWsRef = useRef<WebSocket | null>(null);
    const [cameraActive, setCameraActive] = useState(false);

    useEffect(() => {
        if (!enabled || !participantId) return;

        let stream: MediaStream | null = null;
        let frameInterval: ReturnType<typeof setInterval>;

        const start = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setCameraActive(true);

                // Connect proctor WebSocket
                const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
                const procWs = new WebSocket(`${wsBase}/proctor/${participantId}/`);
                procWsRef.current = procWs;

                // Capture frame every 2 seconds and send to proctor
                frameInterval = setInterval(() => {
                    const canvas = canvasRef.current;
                    const video = videoRef.current;
                    if (!canvas || !video || procWs.readyState !== WebSocket.OPEN) return;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    ctx.drawImage(video, 0, 0, 320, 240);
                    const frame = canvas.toDataURL('image/jpeg', 0.5).split(',')[1]; // base64

                    procWs.send(JSON.stringify({
                        type: 'frame',
                        frame,
                        participant_id: participantId,
                        join_code: joinCode,
                        nickname,
                    }));
                }, 2000);
            } catch (_) {
                console.warn('AI Proctor: camera access denied or unavailable');
                setCameraActive(false);
            }
        };

        start();

        return () => {
            clearInterval(frameInterval);
            stream?.getTracks().forEach(t => t.stop());
            procWsRef.current?.close();
            setCameraActive(false);
        };
    }, [enabled, participantId, joinCode, nickname]);

    return { videoRef, canvasRef, cameraActive };
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

    // ── Anti-cheat state ──────────────────────────────────────────────────────
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isQuizPaused, setIsQuizPaused] = useState(false);
    const [pauseReason, setPauseReason] = useState('');
    const [isQuizClosed, setIsQuizClosed] = useState(false);
    const [closeReason, setCloseReason] = useState('');

    const [violationModal, setViolationModal] = useState({
        isOpen: false,
        violationType: 'tab_switch' as 'fullscreen_exit' | 'tab_switch' | 'copy_paste',
        totalViolations: 0,
        maxViolations: sessionState.maxViolations || 0,
        penaltyPoints: sessionState.violationPenaltyPoints || 0,
        isFlagged: false,
    });

    // Resolved action config (from session state, set during JoinQuiz)
    const fsAction = sessionState.fullscreenExitAction || 'warn';
    const atAction = sessionState.altTabAction || 'warn';
    const aiProctorEnabled = sessionState.enableAiProctor ?? false;

    // ── AI Proctor camera ─────────────────────────────────────────────────────
    const { videoRef, canvasRef, cameraActive } = useProctoringCamera(
        aiProctorEnabled,
        sessionState.participantId,
        joinCode,
        sessionState.nickname,
    );

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
        if (!sessionState.requireFullscreen) return;

        const handleFsChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);

            if (!isFull && gameState.status === 'in_progress') {
                reportViolation('fullscreen_exit');
                // Local enforcement (action confirmed/overridden by server response)
                if (fsAction === 'pause') {
                    setIsQuizPaused(true);
                    setPauseReason('You exited fullscreen. Re-enter fullscreen to continue.');
                } else if (fsAction === 'close') {
                    setIsQuizClosed(true);
                    setCloseReason('Quiz closed: fullscreen exit is not permitted.');
                }
                // 'warn' → ViolationWarningModal shown on server response
            }

            // Auto-resume if back in fullscreen and paused due to fullscreen exit
            if (isFull && isQuizPaused && pauseReason.includes('fullscreen')) {
                // Notify server of resume
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'resume_from_fullscreen',
                        participant_id: sessionState.participantId,
                    }));
                }
                setIsQuizPaused(false);
                setPauseReason('');
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
        gameState.status, fsAction, isQuizPaused, pauseReason, reportViolation
    ]);

    // Tab / window visibility detection
    useEffect(() => {
        const handleVisChange = () => {
            if (document.hidden && gameState.status === 'in_progress') {
                reportViolation('tab_switch');
                if (atAction === 'close') {
                    setIsQuizClosed(true);
                    setCloseReason('Quiz closed: switching tabs or windows is not permitted.');
                }
                // 'shuffle' → handled by server's question_shuffle WS message
                // 'warn'    → handled by violation_recorded WS message
            }
        };

        document.addEventListener('visibilitychange', handleVisChange);
        return () => document.removeEventListener('visibilitychange', handleVisChange);
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
        if (isQuizPaused || isQuizClosed) return;

        const timer = setInterval(() => {
            setGameState(prev => {
                if (prev.timeRemaining <= 0) {
                    clearInterval(timer);
                    if (!isAnswerSubmitted) submitAnswer('');
                    return prev;
                }
                return { ...prev, timeRemaining: prev.timeRemaining - 1 };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState.status, gameState.currentQuestion?.id, isAnswerSubmitted, isQuizPaused, isQuizClosed]);

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
            // Do NOT send 'join' here — student is already registered via REST in JoinQuiz.
            // Sending 'join' again creates a duplicate participant in the consumer.
            console.log('Quiz WS connected');
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
        text: q.question_text || q.text,
        timeLimit: q.time_limit || q.timeLimit || 30,
        choices: (q.question_type === 'multiple_choice' || q.question_type === 'true_false')
            ? [
                q.option_a && { id: 'A', text: q.option_a },
                q.option_b && { id: 'B', text: q.option_b },
                q.option_c && { id: 'C', text: q.option_c },
                q.option_d && { id: 'D', text: q.option_d },
            ].filter(Boolean) as Array<{ id: string; text: string }>
            : q.choices,
        codeTemplate: q.starter_code || q.codeTemplate || '',
        language: q.programming_language || q.language || 'javascript',
        points: q.points || 100,
    });

    const handleWsMessage = (data: any) => {
        switch (data.type) {

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
                setAnswerResult(null);
                setPointsEarned(0);
                setCodeExecResult(null);
                answerStartTime.current = Date.now();
                // Unpause if paused (new question = fresh start)
                setIsQuizPaused(false);
                setPauseReason('');
                break;
            }

            // ── Phase 2: Question shuffle on alt-tab (instructor's choice) ──
            case 'question_shuffle': {
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

            // ── Phase 2: Quiz paused ──────────────────────────────────────
            case 'quiz_paused':
                setIsQuizPaused(true);
                setPauseReason(data.reason || 'Quiz paused.');
                break;

            case 'quiz_resumed':
                setIsQuizPaused(false);
                setPauseReason('');
                toast.success('Quiz resumed!');
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
                    const pts = data.data.points_earned || 0;
                    setAnswerResult(data.data.is_correct ? 'correct' : 'incorrect');
                    setPointsEarned(pts);
                    setCodeExecResult(data.data.test_results);
                    setIsRunningCode(false);
                    if (pts > 0) {
                        setGameState(prev => ({
                            ...prev,
                            score: prev.score + pts,
                            totalCorrect: data.data.is_correct ? prev.totalCorrect + 1 : prev.totalCorrect,
                            totalAttempted: prev.totalAttempted + 1,
                        }));
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
                if (answerResult === null) {
                    const isCorrect = data.correctAnswer?.toUpperCase() === selectedAnswer?.toUpperCase();
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
        // Quick run without submitting — show placeholder until execution result arrives
        setIsRunningCode(true);
        setCodeExecResult(null);
        toast('Running code...', { duration: 1500 });
        // In practice, wire to a /run endpoint or share the submit_code flow
        setTimeout(() => setIsRunningCode(false), 3000);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ── QUIZ CLOSED STATE ────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    if (isQuizClosed) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
                <div className="bg-slate-900 border border-red-800/50 rounded-2xl p-10 text-center max-w-md shadow-2xl">
                    <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-400 mb-3">Session Closed</h2>
                    <p className="text-slate-400 mb-8">{closeReason}</p>
                    <button
                        onClick={() => navigate('/quiz/join')}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition"
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

    if (isQuizPaused) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
                {/* Blurred quiz background overlay */}
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />
                <div className="relative z-10 bg-slate-900 border border-amber-600/50 rounded-2xl p-10 text-center max-w-md shadow-2xl">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Lock className="w-10 h-10 text-amber-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-amber-400 mb-3">Quiz Paused</h2>
                    <p className="text-slate-400 mb-8">{pauseReason}</p>
                    {sessionState.requireFullscreen && (
                        <button
                            onClick={() => {
                                enterFullscreen();
                                // Server will send quiz_resumed; but optimistically clear pause on fs change event
                            }}
                            className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition"
                        >
                            <Maximize className="w-5 h-5" />
                            Re-enter Fullscreen to Continue
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── WAITING STATE ────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    if (gameState.status === 'waiting' && !gameState.currentQuestion) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500" />
                    <h2 className="text-2xl font-bold">Waiting for next question...</h2>
                    <p className="text-slate-400">The host will send the first question shortly</p>
                    {sessionState.quizTitle && (
                        <p className="text-slate-500 text-sm mt-4">{sessionState.quizTitle}</p>
                    )}
                    {sessionState.requireFullscreen && !isFullscreen && (
                        <button
                            onClick={enterFullscreen}
                            className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg text-sm font-medium transition flex items-center gap-2 mx-auto"
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
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mr-3" />
                Loading question...
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── MAIN QUIZ UI ─────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col pb-16 sm:pb-0">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 sm:py-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 px-2 py-1 rounded text-xs font-bold text-white">
                            LIVE
                        </span>
                        <span className="font-mono text-slate-400 text-sm">{joinCode}</span>
                        {gameState.questionNumber > 0 && (
                            <span className="text-slate-500 text-sm">
                                Q{gameState.questionNumber}
                                {gameState.totalQuestions > 0 && `/${gameState.totalQuestions}`}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* AI Proctor status */}
                        {aiProctorEnabled && (
                            <div className="flex items-center gap-1.5">
                                {cameraActive
                                    ? <Camera className="w-4 h-4 text-green-400" />
                                    : <CameraOff className="w-4 h-4 text-red-400" />
                                }
                                <span className="text-xs text-slate-400">
                                    {cameraActive ? 'Proctored' : 'Cam off'}
                                </span>
                            </div>
                        )}
                        {answerResult && (
                            <span className={`text-sm font-medium ${answerResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                                {answerResult === 'correct' ? `+${pointsEarned}` : 'Wrong'}
                            </span>
                        )}
                        <div className="text-white font-bold">Score: {gameState.score}</div>
                    </div>
                </div>
            </div>

            {/* Hidden video + canvas for proctor frames */}
            {aiProctorEnabled && (
                <>
                    <video ref={videoRef} className="hidden" muted playsInline />
                    <canvas ref={canvasRef} width={320} height={240} className="hidden" />
                </>
            )}

            {/* ── Main Content ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-8">

                {/* Timer Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full mb-8 overflow-hidden">
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
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8 text-center shadow-xl">
                    <h2
                        className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight [&_p]:m-0"
                        dangerouslySetInnerHTML={{ __html: gameState.currentQuestion.text }}
                    />
                    <div className={`mt-6 flex justify-center items-center gap-2 font-mono text-xl ${gameState.timeRemaining <= 5 ? 'text-red-400' :
                        gameState.timeRemaining <= 10 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                        <Timer className={`w-6 h-6 ${gameState.timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-purple-400'}`} />
                        <span>{gameState.timeRemaining}s</span>
                    </div>
                </div>

                {/* ── Coding Question ───────────────────────────────────── */}
                {gameState.currentQuestion.type === 'code' ? (
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="flex-1 min-h-[400px] border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                            <Editor
                                height="100%"
                                defaultLanguage="javascript"
                                language={gameState.currentQuestion.language || 'javascript'}
                                theme="vs-dark"
                                value={codeAnswer}
                                onChange={(value) => setCodeAnswer(value || '')}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 16,
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    readOnly: isAnswerSubmitted,
                                }}
                            />
                        </div>

                        {/* ── Per-test-case results (Phase 2) ── */}
                        {(codeExecResult || isRunningCode) && (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-sm max-h-56 overflow-y-auto">
                                <div className="flex items-center gap-2 text-slate-400 mb-3 border-b border-slate-800 pb-2">
                                    <Terminal className="w-4 h-4" />
                                    <span>Test Results</span>
                                    {codeExecResult && (
                                        <span className="ml-auto text-xs">
                                            {codeExecResult.passed}/{codeExecResult.total} passed
                                        </span>
                                    )}
                                </div>
                                {isRunningCode && !codeExecResult && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Running test cases...
                                    </div>
                                )}
                                {codeExecResult?.results?.map((r, i) => (
                                    <div key={i} className={`flex items-start gap-2 py-1 ${r.is_hidden ? 'opacity-60' : ''}`}>
                                        {r.passed
                                            ? <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                            : <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                        }
                                        <div>
                                            <span className={r.passed ? 'text-green-400' : 'text-red-400'}>
                                                Test {i + 1}{r.is_hidden ? ' (hidden)' : ''}:
                                                {r.passed ? ' Passed' : ` Failed`}
                                            </span>
                                            {!r.passed && !r.is_hidden && r.error !== 'timeout' && r.stderr && (
                                                <div className="text-slate-500 text-xs mt-0.5">{r.stderr.slice(0, 120)}</div>
                                            )}
                                            {!r.passed && r.error === 'timeout' && (
                                                <div className="text-amber-400 text-xs mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Timed out</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={runCodeLocally}
                                disabled={isAnswerSubmitted || isRunningCode}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 font-medium transition"
                            >
                                {isRunningCode
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Play className="w-4 h-4" />
                                }
                                Run Code
                            </button>
                            <button
                                onClick={submitCode}
                                disabled={isAnswerSubmitted}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {isAnswerSubmitted
                                    ? <><CheckCircle className="w-4 h-4" /> Submitted</>
                                    : 'Submit Solution'
                                }
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── MCQ Grid ─────────────────────────────────────────── */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start">
                        {gameState.currentQuestion.choices?.map((choice) => {
                            const isSelected = selectedAnswer === choice.id;
                            const showResult = answerResult !== null;

                            let boxClass = 'bg-slate-800 border-slate-700 hover:bg-slate-700';
                            if (isSelected && !showResult) boxClass = 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white';
                            if (isAnswerSubmitted && !isSelected && !showResult) boxClass = 'opacity-50 bg-slate-800 border-slate-700';

                            if (showResult) {
                                if (isSelected && answerResult === 'correct') boxClass = 'bg-green-600 border-green-500 ring-4 ring-green-900';
                                if (isSelected && answerResult === 'incorrect') boxClass = 'bg-red-600 border-red-500 ring-4 ring-red-900';
                                if (!isSelected) boxClass = 'opacity-40 bg-slate-800 border-slate-700';
                            }

                            return (
                                <button
                                    key={choice.id}
                                    onClick={() => submitAnswer(choice.id)}
                                    disabled={isAnswerSubmitted}
                                    className={`p-4 sm:p-6 rounded-xl border-2 text-left transition-all transform active:scale-[0.98] flex items-center justify-between group ${boxClass}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            {choice.id}
                                        </span>
                                        <span className={`text-base sm:text-lg font-medium ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
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
            </div>

            {/* Violation Warning Modal */}
            <ViolationWarningModal
                isOpen={violationModal.isOpen}
                onClose={() => {
                    setViolationModal(prev => ({ ...prev, isOpen: false }));
                    if (sessionState.requireFullscreen && fsAction === 'warn') {
                        enterFullscreen();
                    }
                }}
                violationType={violationModal.violationType}
                totalViolations={violationModal.totalViolations}
                maxViolations={violationModal.maxViolations}
                penaltyPoints={violationModal.penaltyPoints}
                isFlagged={violationModal.isFlagged}
            />
        </div>
    );
};

export default LiveQuizSession;
