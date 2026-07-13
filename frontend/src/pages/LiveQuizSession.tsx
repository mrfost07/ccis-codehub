import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Timer, CheckCircle, XCircle, AlertCircle, Play, Terminal,
    Loader2, Maximize, Camera, CameraOff, ShieldAlert, Lock, Clock,
    Send, Zap, Code, Eye
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
    enableAiProctor?: boolean;
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
// Proctor camera hook
// ─────────────────────────────────────────────────────────────────────────────

interface ProctorResult {
    label: string;
    confidence: number;
    is_violation: boolean;
    calibrating: boolean;
    violations: number;
    action: string;
}

function useProctoringCamera(
    enabled: boolean,
    participantId: string | undefined,
    joinCode: string | undefined,
    nickname: string | undefined,
    onViolation?: (result: ProctorResult) => void,
    onStatusUpdate?: (result: ProctorResult) => void,
) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const procWsRef = useRef<WebSocket | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [proctorLabel, setProctorLabel] = useState<string>('looking_center');
    const [wsConnected, setWsConnected] = useState(false);
    const [isCalibrating, setIsCalibrating] = useState(true);

    const onViolationRef = useRef(onViolation);
    const onStatusRef = useRef(onStatusUpdate);
    onViolationRef.current = onViolation;
    onStatusRef.current = onStatusUpdate;

    useEffect(() => {
        if (!enabled || !participantId) return;
        console.log('AI Proctor: hook starting (server-side camera mode)');

        let cancelled = false;

        const start = () => {
            // Connect proctor WebSocket
            const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
            const procWs = new WebSocket(`${wsBase}/proctor/${participantId}/`);
            procWsRef.current = procWs;

            procWs.onopen = () => {
                console.log('AI Proctor: WS connected, telling server to start camera');
                setWsConnected(true);
                setCameraActive(true);

                // Tell backend to open camera via OpenCV (no browser camera needed)
                procWs.send(JSON.stringify({
                    type: 'start_camera',
                    participant_id: participantId,
                    join_code: joinCode,
                    nickname,
                }));
            };

            procWs.onerror = (e) => {
                console.error('AI Proctor: WS error', e);
            };

            procWs.onclose = () => {
                console.log('AI Proctor: WS closed');
                setWsConnected(false);
                setCameraActive(false);
            };

            // Listen for detection results from backend (runs at ~30fps server-side)
            procWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'proctor_result') {
                        const result: ProctorResult = {
                            label: data.label || 'looking_center',
                            confidence: data.confidence || 0,
                            is_violation: data.is_violation || false,
                            calibrating: data.calibrating || false,
                            violations: data.violations || 0,
                            action: data.action || 'none',
                        };

                        setProctorLabel(result.label);
                        setIsCalibrating(result.calibrating);
                        onStatusRef.current?.(result);

                        if (result.is_violation && result.action === 'flag') {
                            onViolationRef.current?.(result);
                        }
                    }
                } catch (_) { /* ignore parse errors */ }
            };
        };

        start();

        return () => {
            cancelled = true;
            procWsRef.current?.close();
            setCameraActive(false);
            setWsConnected(false);
        };
    }, [enabled, participantId, joinCode, nickname]);

    return { videoRef, canvasRef, cameraActive, proctorLabel, wsConnected, isCalibrating };
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
    const [pauseReason, setPauseReason] = useState('');
    const [pauseSource, setPauseSource] = useState<'proctor' | 'fullscreen' | 'tab_switch' | 'server' | ''>('');
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

    // Always enforce fullscreen and pause on violations
    const fsAction = 'pause' as const;
    const atAction = 'pause' as const;
    const aiProctorEnabled = sessionState.enableAiProctor ?? false;
    const canShowResult = sessionState.showCorrectAnswers !== false;

    // ── AI Proctor onboarding ─────────────────────────────────────────────────
    const [proctorReady, setProctorReady] = useState(!aiProctorEnabled);
    const onboardingVideoRef = useRef<HTMLVideoElement>(null);
    const [onboardingCamActive, setOnboardingCamActive] = useState(false);
    const [onboardingCamError, setOnboardingCamError] = useState<string | null>(null);
    const onboardingStreamRef = useRef<MediaStream | null>(null);

    // Friendly warning messages for proctor labels
    const proctorWarnings: Record<string, string> = {
        'no_face': 'Please show your face to the camera',
        'looking_left': 'Please keep your eyes on the screen',
        'looking_right': 'Please keep your eyes on the screen',
        'looking_up': 'Please look at your screen',
        'looking_down': 'Please look at your screen',
        'phone_detected': 'Please put your phone away',
    };

    // ── AI Proctor camera ─────────────────────────────────────────────────────
    const { videoRef, canvasRef, cameraActive, proctorLabel, wsConnected: proctorWsConnected, isCalibrating } = useProctoringCamera(
        aiProctorEnabled && proctorReady,
        sessionState.participantId,
        joinCode,
        sessionState.nickname,
        // onViolation: AI flagged cheating → pause
        (result) => {
            const friendlyMsg = proctorWarnings[result.label] || 'Suspicious activity detected';
            setIsQuizPaused(true);
            setPauseReason(friendlyMsg);
            setPauseSource('proctor');
        },
    );

    // Auto-resume when AI proctor clears (only for proctor-triggered pauses)
    useEffect(() => {
        if (isQuizPaused && pauseSource === 'proctor' && proctorLabel === 'looking_center') {
            setIsQuizPaused(false);
            setPauseReason('');
            setPauseSource('');
        }
    }, [proctorLabel, isQuizPaused, pauseSource]);

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
                // Always pause on tab switch
                setIsQuizPaused(true);
                setPauseReason('You switched tabs or windows. Return to fullscreen to continue.');
                setPauseSource('tab_switch');
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
                break;
            }

            // ── Phase 2: Question shuffle on alt-tab (instructor's choice) ──
            case 'question_shuffle': {
                // Don't replace the current question if quiz is paused
                // (pause already blocks the student — no need to also shuffle)
                if (isQuizPaused) break;

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
                toast.success('Quiz resumed!');
                break;

            // ── Instructor session-wide pause/resume ─────────────────────
            case 'session_paused':
                setIsQuizPaused(true);
                setPauseReason(data.reason || 'Session paused by instructor.');
                break;

            case 'session_resumed':
                setIsQuizPaused(false);
                setPauseReason('');
                toast.success('Session resumed by instructor!');
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
                // Only do client-side scoring if student never submitted via WS
                if (!isAnswerSubmittedRef.current && answerResult === null) {
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
    // ── AI PROCTOR ONBOARDING ────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    if (!proctorReady && aiProctorEnabled) {
        const startOnboardingCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
                onboardingStreamRef.current = stream;
                if (onboardingVideoRef.current) {
                    onboardingVideoRef.current.srcObject = stream;
                    onboardingVideoRef.current.play();
                }
                setOnboardingCamActive(true);
                setOnboardingCamError(null);
            } catch (err) {
                setOnboardingCamError('Camera access denied. Please allow camera access and try again.');
                setOnboardingCamActive(false);
            }
        };

        if (!onboardingCamActive && !onboardingCamError) {
            startOnboardingCamera();
        }

        const handleProceedToQuiz = () => {
            onboardingStreamRef.current?.getTracks().forEach(t => t.stop());
            onboardingStreamRef.current = null;
            // Wait for OS to fully release camera hardware before backend opens it
            setTimeout(() => setProctorReady(true), 1500);
        };

        const handleSkipProctor = () => {
            onboardingStreamRef.current?.getTracks().forEach(t => t.stop());
            onboardingStreamRef.current = null;
            setTimeout(() => setProctorReady(true), 1500);
        };

        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pb-20">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950" />
                <div className="relative w-full max-w-lg">
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-8 h-8 text-purple-400" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Camera Setup</h1>
                            <p className="text-slate-400 text-sm">
                                This quiz requires AI proctoring. Please allow camera access to continue.
                            </p>
                        </div>

                        <div className="relative w-full aspect-video bg-slate-800 rounded-xl overflow-hidden mb-6 border border-slate-700">
                            <video
                                ref={onboardingVideoRef}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            {!onboardingCamActive && !onboardingCamError && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">Requesting camera access...</p>
                                    </div>
                                </div>
                            )}
                            {onboardingCamActive && (
                                <div className="absolute bottom-3 left-3 bg-green-600/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    Camera Active
                                </div>
                            )}
                        </div>

                        {onboardingCamError && (
                            <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 mb-4">
                                <p className="text-sm text-red-300">{onboardingCamError}</p>
                                <button
                                    onClick={() => { setOnboardingCamError(null); setOnboardingCamActive(false); }}
                                    className="text-sm text-red-400 hover:text-red-300 underline mt-2"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3">
                                {onboardingCamActive
                                    ? <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                                    : <div className="w-5 h-5 rounded-full border-2 border-slate-600 shrink-0" />
                                }
                                <span className={`text-sm ${onboardingCamActive ? 'text-green-300' : 'text-slate-400'}`}>
                                    Camera access granted
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0" />
                                <span className="text-sm text-slate-400">AI will monitor during quiz</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleProceedToQuiz}
                                disabled={!onboardingCamActive}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                I'm Ready — Start Quiz
                            </button>
                            {onboardingCamError && (
                                <button
                                    onClick={handleSkipProctor}
                                    className="w-full py-2.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl transition-all text-sm"
                                >
                                    Continue without camera
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // AI Proctor Connecting Screen
    // ─────────────────────────────────────────────────────────────────────────────

    if (proctorReady && aiProctorEnabled && (!proctorWsConnected || isCalibrating)) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pb-20">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950" />
                <div className="relative w-full max-w-md">
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
                        {!proctorWsConnected ? (
                            /* Connecting to server */
                            <>
                                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                </div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Setting Up Proctoring</h1>
                                <p className="text-slate-400 text-sm">Connecting to monitoring server...</p>
                            </>
                        ) : (
                            /* Calibrating — show "look at center" */
                            <>
                                <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-5 relative">
                                    <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" />
                                    <Eye className="w-10 h-10 text-blue-400" />
                                </div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">Look at the Center of Your Screen</h1>
                                <p className="text-slate-400 text-sm mb-6">
                                    Keep your eyes on the screen while we set up face tracking...
                                </p>
                                <div className="w-48 h-2 bg-slate-700 rounded-full mx-auto overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                                </div>
                                <p className="text-slate-500 text-xs mt-3">This only takes a few seconds</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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

                    {pauseSource === 'proctor' ? (
                        /* AI Proctor pause — auto-resumes, no button needed */
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-pulse flex items-center gap-2 text-blue-400 text-sm">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                                Monitoring... will auto-resume when you look at the screen
                            </div>
                        </div>
                    ) : (
                        /* Fullscreen/tab-switch pause — needs manual action */
                        <button
                            onClick={() => {
                                if (document.fullscreenElement) {
                                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                                        wsRef.current.send(JSON.stringify({
                                            type: 'resume_from_fullscreen',
                                            participant_id: sessionState.participantId,
                                        }));
                                    }
                                    setIsQuizPaused(false);
                                    setPauseReason('');
                                    setPauseSource('');
                                } else {
                                    enterFullscreen();
                                }
                            }}
                            className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition"
                        >
                            <Maximize className="w-5 h-5" />
                            {document.fullscreenElement ? 'Continue Quiz' : 'Re-enter Fullscreen to Continue'}
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
        const isCodingChallenge = sessionState.quizTitle?.toLowerCase().includes('challenge');
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500" />
                    <h2 className="text-2xl font-bold">
                        {isCodingChallenge ? 'Waiting for the challenge to begin...' : 'Waiting for next question...'}
                    </h2>
                    <p className="text-slate-400">
                        {isCodingChallenge ? 'The host will start the coding challenge shortly' : 'The host will send the first question shortly'}
                    </p>
                    {sessionState.quizTitle && (
                        <p className="text-slate-500 text-sm mt-4">{sessionState.quizTitle}</p>
                    )}
                    {!isFullscreen && (
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
                        {answerResult && canShowResult && (
                            <span className={`text-sm font-medium ${answerResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                                {answerResult === 'correct' ? `+${pointsEarned}` : 'Wrong'}
                            </span>
                        )}
                        {answerResult && !canShowResult && (
                            <span className="text-sm font-medium text-blue-400">Submitted</span>
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
                        <div className="lg:w-[42%] border-b lg:border-b-0 lg:border-r border-slate-800/50 overflow-y-auto flex flex-col">
                            {/* Left Pane Tabs */}
                            <div className="flex border-b border-slate-800/50 sticky top-0 bg-slate-950 z-10">
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
                                <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
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
                                            <div key={i} className="bg-slate-900/60 border border-slate-800/50 rounded-lg p-3">
                                                <div className="text-xs text-slate-500 mb-1">Example {i + 1}</div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Input</div>
                                                        <code className="text-xs text-green-400 font-mono">{tc.input || '(none)'}</code>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Output</div>
                                                        <code className="text-xs text-blue-400 font-mono">{tc.expected_output}</code>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Timer + Score */}
                                <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800/50">
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
                                    <div className="space-y-2 pt-2 border-t border-slate-800/50">
                                        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                            <Terminal className="w-4 h-4" />
                                            <span>Test Results</span>
                                            {codeExecResult && (
                                                <span className="ml-auto text-xs">
                                                    {codeExecResult.passed}/{codeExecResult.total} passed
                                                </span>
                                            )}
                                        </div>
                                        {isRunningCode && !codeExecResult && (
                                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Running test cases...
                                            </div>
                                        )}
                                        {codeExecResult?.results?.map((r: any, i: number) => (
                                            <div key={i} className={`p-3 rounded-lg border text-xs ${r.passed
                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                : 'bg-rose-500/5 border-rose-500/20'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {r.passed
                                                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                                        : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                                                    <span className="font-medium text-slate-300">
                                                        Test {i + 1}{r.is_hidden ? ' (hidden)' : ''}
                                                    </span>
                                                </div>
                                                {!r.passed && !r.is_hidden && r.stderr && (
                                                    <div className="text-rose-400 text-xs mt-1 font-mono">{r.stderr.slice(0, 200)}</div>
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
                            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 bg-slate-900/50">
                                <div className="flex items-center gap-2">
                                    <Code className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm text-slate-300 font-medium">
                                        {(gameState.currentQuestion.language || 'python').charAt(0).toUpperCase() + (gameState.currentQuestion.language || 'python').slice(1)}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={runCodeLocally}
                                        disabled={isAnswerSubmitted || isRunningCode}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600"
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
                            <div className="px-4 py-1.5 bg-slate-900/80 border-t border-slate-800/50 flex items-center gap-4 text-[10px] text-slate-600">
                                <span>{(gameState.currentQuestion.language || 'python')}</span>
                                <span>{codeAnswer.split('\n').length} lines</span>
                                <span>{codeAnswer.length} chars</span>
                                {codeExecResult && (
                                    <span className={codeExecResult.passed === codeExecResult.total ? 'text-emerald-500' : 'text-amber-500'}>
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
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(gameState.currentQuestion.text) }}
                        />
                        <div className={`mt-6 flex justify-center items-center gap-2 font-mono text-xl ${gameState.timeRemaining <= 5 ? 'text-red-400' :
                            gameState.timeRemaining <= 10 ? 'text-amber-400' : 'text-slate-400'
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

                                    let boxClass = 'bg-slate-800 border-slate-700 hover:bg-slate-700';
                                    if (isSelected && !showResult) boxClass = 'bg-purple-600 border-purple-500 text-white';
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

                        {/* True/False Buttons */}
                        {gameState.currentQuestion.questionType === 'true_false' && (
                            <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                                {['True', 'False'].map((val) => {
                                    const valLower = val.toLowerCase();
                                    const isSelected = selectedAnswer === valLower;
                                    const showResult = answerResult !== null && canShowResult;

                                    let boxClass = 'bg-slate-800 border-slate-700 hover:bg-slate-700';
                                    if (isSelected && !showResult) boxClass = 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500';
                                    if (isAnswerSubmitted && !isSelected && !showResult) boxClass = 'opacity-50 bg-slate-800 border-slate-700';
                                    if (showResult) {
                                        if (isSelected && answerResult === 'correct') boxClass = 'bg-green-600 border-green-500 ring-4 ring-green-900';
                                        if (isSelected && answerResult === 'incorrect') boxClass = 'bg-red-600 border-red-500 ring-4 ring-red-900';
                                        if (!isSelected) boxClass = 'opacity-40 bg-slate-800 border-slate-700';
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
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 resize-none"
                                />
                                {!isAnswerSubmitted && selectedAnswer && (
                                    <button
                                        onClick={() => submitAnswer(selectedAnswer)}
                                        className="mt-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all w-full"
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
                    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl shadow-emerald-500/10">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold text-emerald-400 mb-2">All Tests Passed!</h2>
                        <p className="text-slate-400 mb-4">Great job! You nailed this coding challenge.</p>
                        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
                                <div className="text-emerald-400 font-bold text-lg">+{pointsEarned}</div>
                                <div className="text-slate-500 text-xs">Points</div>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2">
                                <div className="text-blue-400 font-bold text-lg">Score: {gameState.score}</div>
                                <div className="text-slate-500 text-xs">Total</div>
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
                                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition border border-slate-700"
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
