import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Timer, CheckCircle, XCircle, AlertCircle, ChevronRight,
    Trophy, Clock, Expand, Eye, Shield, BookOpen, Camera, Loader2, X as XIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
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
    enableAiProctor?: boolean;
    enableCodeExecution?: boolean;
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
// Proctor camera hook (same as LiveQuizSession)
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

                const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
                const procWs = new WebSocket(`${wsBase}/proctor/${participantId}/`);
                procWsRef.current = procWs;

                frameInterval = setInterval(() => {
                    const canvas = canvasRef.current;
                    const video = videoRef.current;
                    if (!canvas || !video || procWs.readyState !== WebSocket.OPEN) return;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    ctx.drawImage(video, 0, 0, 320, 240);
                    const frame = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

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
    const [isQuizClosed, setIsQuizClosed] = useState(false);
    const [closeReason, setCloseReason] = useState('');
    const [violations, setViolations] = useState(0);
    const [showViolationPanel, setShowViolationPanel] = useState(false);
    const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── AI Proctor onboarding ─────────────────────────────────────────────────
    const [proctorReady, setProctorReady] = useState(!sessionState.enableAiProctor);
    const onboardingVideoRef = useRef<HTMLVideoElement>(null);
    const [onboardingCamActive, setOnboardingCamActive] = useState(false);
    const [onboardingCamError, setOnboardingCamError] = useState<string | null>(null);
    const onboardingStreamRef = useRef<MediaStream | null>(null);

    const fsAction = sessionState.fullscreenExitAction || 'warn';
    const atAction = sessionState.altTabAction || 'warn';
    const maxViolations = sessionState.maxViolations || 3;

    // ── Quiz status ───────────────────────────────────────────────────────────
    const quizActive = !isFinished && !isQuizClosed && questions.length > 0 && proctorReady;
    const currentQuestion = questions[currentIndex];

    // ── AI Proctor (optional) ─────────────────────────────────────────────────
    const { videoRef: proctorVideoRef, canvasRef: proctorCanvasRef, cameraActive } =
        useProctoringCamera(
            !!sessionState.enableAiProctor && proctorReady, // Only enable if proctorReady
            sessionState.participantId,
            joinCode,
            sessionState.nickname
        );

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
        if (sessionState.requireFullscreen && proctorReady) { // Only enter fullscreen if proctor is ready
            enterFullscreen();
        }
    }, [proctorReady]); // Depend on proctorReady

    // ─────────────────────────────────────────────────────────────────────────
    // Fullscreen change detection
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!sessionState.requireFullscreen || !proctorReady) return; // Only if proctor is ready

        const handleFsChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);

            if (!isFull && quizActive) {
                setViolations(v => {
                    const newCount = v + 1;
                    if (newCount >= maxViolations) {
                        setIsQuizClosed(true);
                        setCloseReason(`Quiz closed: maximum violations (${maxViolations}) reached.`);
                    }
                    return newCount;
                });

                if (fsAction === 'pause') {
                    setIsQuizPaused(true);
                    setPauseReason('You exited fullscreen. Re-enter fullscreen to continue.');
                } else if (fsAction === 'close') {
                    setIsQuizClosed(true);
                    setCloseReason('Quiz closed: fullscreen exit is not permitted.');
                } else {
                    setShowViolationPanel(true);
                }
            }

            if (isFull && isQuizPaused && pauseReason.includes('fullscreen')) {
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
    }, [sessionState.requireFullscreen, quizActive, fsAction, isQuizPaused, pauseReason, maxViolations, proctorReady]); // Depend on proctorReady

    // ─────────────────────────────────────────────────────────────────────────
    // Tab switch detection (MANDATORY)
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!proctorReady) return; // Only if proctor is ready
        const handleVisChange = () => {
            if (document.hidden && quizActive) {
                setViolations(v => {
                    const newCount = v + 1;
                    if (newCount >= maxViolations) {
                        setIsQuizClosed(true);
                        setCloseReason(`Quiz closed: maximum violations (${maxViolations}) reached.`);
                    }
                    return newCount;
                });

                if (atAction === 'close') {
                    setIsQuizClosed(true);
                    setCloseReason('Quiz closed: switching tabs is not permitted.');
                } else {
                    setShowViolationPanel(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisChange);
        return () => document.removeEventListener('visibilitychange', handleVisChange);
    }, [quizActive, atAction, maxViolations, proctorReady]); // Depend on proctorReady

    // ─────────────────────────────────────────────────────────────────────────
    // Copy-paste prevention (MANDATORY)
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!quizActive || !proctorReady) return; // Only if proctor is ready

        const block = (e: ClipboardEvent) => {
            e.preventDefault();
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
    }, [quizActive, proctorReady]); // Depend on proctorReady

    // ─────────────────────────────────────────────────────────────────────────
    // Per-question timer
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (currentQuestion) {
            setTimeRemaining(currentQuestion.time_limit || 30);
            answerStartTime.current = Date.now();
            setSelectedAnswer(null);
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
        if (!quizActive || isQuizPaused || !currentQuestion || isAnswerSubmitted) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Auto-submit with no answer when time runs out
                    if (!isAnswerSubmitted) {
                        handleSubmitAnswer('');
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentIndex, quizActive, isQuizPaused, isAnswerSubmitted]);

    // ─────────────────────────────────────────────────────────────────────────
    // Total quiz timer
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (totalTimeRemaining === null || !quizActive || isQuizPaused) return;

        const timer = setInterval(() => {
            setTotalTimeRemaining(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    clearInterval(timer);
                    handleFinishQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [totalTimeRemaining, quizActive, isQuizPaused]);

    // ─────────────────────────────────────────────────────────────────────────
    // Submit answer via REST
    // ─────────────────────────────────────────────────────────────────────────

    const handleSubmitAnswer = async (answer: string) => {
        if (isSubmitting || isAnswerSubmitted || !currentQuestion || !sessionState.participantId) return;
        setIsSubmitting(true);

        const responseTime = (Date.now() - answerStartTime.current) / 1000;

        try {
            const result = await liveQuizService.submitResponse({
                participant_id: sessionState.participantId,
                question_id: currentQuestion.id,
                answer_text: answer || selectedAnswer || '',
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
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 pb-20">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">No Questions Found</h2>
                    <p className="text-slate-400 mb-6">This quiz has no questions yet.</p>
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
    // AI Proctor Onboarding Screen
    // ─────────────────────────────────────────────────────────────────────────────

    if (!proctorReady && sessionState.enableAiProctor) {
        // Start onboarding camera
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
            // Stop onboarding stream (will be restarted by proctor hook)
            onboardingStreamRef.current?.getTracks().forEach(t => t.stop());
            onboardingStreamRef.current = null;
            setProctorReady(true);
        };

        const handleSkipProctor = () => {
            onboardingStreamRef.current?.getTracks().forEach(t => t.stop());
            onboardingStreamRef.current = null;
            setProctorReady(true);
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

                        {/* Camera preview */}
                        <div className="relative w-full aspect-video bg-slate-800 rounded-xl overflow-hidden mb-6 border border-slate-700">
                            <video
                                ref={onboardingVideoRef}
                                className="w-full h-full object-cover mirror"
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

                        {/* Error state */}
                        {onboardingCamError && (
                            <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 mb-4">
                                <p className="text-sm text-red-300">{onboardingCamError}</p>
                                <button
                                    onClick={() => {
                                        setOnboardingCamError(null);
                                        setOnboardingCamActive(false);
                                    }}
                                    className="text-sm text-red-400 hover:text-red-300 underline mt-2"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {/* Checklist */}
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
                                <Shield className="w-5 h-5 text-purple-400 shrink-0" />
                                <span className="text-sm text-slate-400">Fullscreen will be enforced</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Eye className="w-5 h-5 text-purple-400 shrink-0" />
                                <span className="text-sm text-slate-400">AI will monitor during quiz</span>
                            </div>
                        </div>

                        {/* Actions */}
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

    // ─────────────────────────────────────────────────────────────────────────
    // Quiz Closed overlay
    // ─────────────────────────────────────────────────────────────────────────

    if (isQuizClosed) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pb-20">
                <div className="bg-red-950/50 border border-red-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
                    <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Quiz Closed</h2>
                    <p className="text-red-300 mb-6">{closeReason}</p>
                    <p className="text-slate-400 text-sm mb-6">
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

    if (isQuizPaused) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pb-20">
                <div className="bg-yellow-950/50 border border-yellow-800 rounded-2xl p-5 sm:p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
                    <h2 className="text-2xl font-bold text-white mb-2">Quiz Paused</h2>
                    <p className="text-yellow-300 mb-6">{pauseReason}</p>
                    <button
                        onClick={enterFullscreen}
                        className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl transition-colors flex items-center gap-2 mx-auto"
                    >
                        <Expand className="w-5 h-5" />
                        Re-enter Fullscreen
                    </button>
                </div>
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
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pb-20">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950" />
                <div className="relative w-full max-w-2xl">
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-8 shadow-2xl">
                        <div className="text-center mb-6 sm:mb-8">
                            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400 mx-auto mb-3 sm:mb-4" />
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Quiz Complete!</h1>
                            <p className="text-slate-400 text-sm sm:text-base">{results.quiz_title || sessionState.quizTitle}</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-purple-400">{results.total_score}</div>
                                <div className="text-sm text-slate-400">Score</div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-green-400">{results.total_correct}/{results.total_questions}</div>
                                <div className="text-sm text-slate-400">Correct</div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-blue-400">{accuracy}%</div>
                                <div className="text-sm text-slate-400">Accuracy</div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-orange-400">
                                    {results.average_response_time ? `${results.average_response_time}s` : '-'}
                                </div>
                                <div className="text-sm text-slate-400">Avg Time</div>
                            </div>
                        </div>

                        {results.rank && (
                            <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/30 rounded-xl p-4 text-center mb-8">
                                <span className="text-slate-400">Your Rank: </span>
                                <span className="text-2xl font-bold text-purple-300">#{results.rank}</span>
                                <span className="text-slate-400"> of {results.total_participants}</span>
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
                                                <p className="text-sm text-slate-300 truncate">
                                                    Q{idx + 1}: {qr.question_text}
                                                </p>
                                                {!qr.is_correct && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Your answer: {qr.answer_given}
                                                    </p>
                                                )}
                                                {qr.explanation && (
                                                    <p className="text-xs text-slate-500 mt-1 italic">{qr.explanation}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {qr.is_correct
                                                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                                                    : <XCircle className="w-5 h-5 text-red-400" />
                                                }
                                                <span className="text-sm font-medium text-slate-300">
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
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all"
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
        { key: 'B', text: currentQuestion?.option_b, color: 'from-blue-600 to-blue-700' },
        { key: 'C', text: currentQuestion?.option_c, color: 'from-yellow-600 to-yellow-700' },
        { key: 'D', text: currentQuestion?.option_d, color: 'from-green-600 to-green-700' },
    ].filter(o => o.text);

    const getOptionStyle = (key: string) => {
        if (!isAnswerSubmitted) {
            return selectedAnswer === key
                ? 'ring-2 ring-purple-400 bg-purple-900/30 border-purple-500'
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-500';
        }
        // After submission: only highlight the selected answer as correct/incorrect
        if (selectedAnswer === key) {
            return answerResult?.is_correct
                ? 'bg-green-900/40 border-green-500 ring-2 ring-green-400'
                : 'bg-red-900/40 border-red-500 ring-2 ring-red-400';
        }
        return 'bg-slate-800/30 border-slate-700 opacity-50';
    };

    const progressPercent = ((currentIndex) / questions.length) * 100;
    const timePercent = currentQuestion ? (timeRemaining / (currentQuestion.time_limit || 30)) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col pb-16 sm:pb-0">
            {/* Header bar */}
            <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-3 sm:px-4 py-2 sm:py-3">
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
                        <div className="text-sm text-slate-300">
                            <span className="text-purple-400 font-bold">{score}</span> pts
                        </div>

                        {/* Total timer */}
                        {totalTimeRemaining !== null && (
                            <div className={`text-sm font-mono flex items-center gap-1 ${totalTimeRemaining < 60 ? 'text-red-400' : 'text-slate-300'
                                }`}>
                                <Clock className="w-4 h-4" />
                                {formatTime(totalTimeRemaining)}
                            </div>
                        )}

                        {/* Camera indicator */}
                        {cameraActive && (
                            <div className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                Proctored
                            </div>
                        )}

                        {/* Progress */}
                        <div className="text-sm text-slate-400">
                            {currentIndex + 1}/{questions.length}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="max-w-4xl mx-auto mt-2">
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
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
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-purple-400 font-medium">
                                Question {currentIndex + 1} of {questions.length}
                            </span>
                            <span className="text-sm text-slate-400">
                                {currentQuestion?.points || 0} points
                            </span>
                        </div>

                        <h2
                            className="text-base sm:text-xl text-white font-semibold mb-4 sm:mb-6 leading-relaxed [&_p]:m-0"
                            dangerouslySetInnerHTML={{ __html: currentQuestion?.question_text || '' }}
                        />

                        {currentQuestion?.image_url && (
                            <img
                                src={currentQuestion.image_url}
                                alt="Question"
                                className="max-w-full max-h-64 object-contain rounded-lg mb-6 mx-auto"
                            />
                        )}

                        {/* MCQ Options */}
                        {currentQuestion?.question_type !== 'coding' && (
                            <div className="grid gap-3">
                                {options.map((opt) => (
                                    <button
                                        key={opt.key}
                                        onClick={() => !isAnswerSubmitted && setSelectedAnswer(opt.key)}
                                        disabled={isAnswerSubmitted}
                                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${getOptionStyle(opt.key)}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 bg-gradient-to-br ${opt.color} text-white`}>
                                                {opt.key}
                                            </span>
                                            <span className="text-white text-sm">{opt.text}</span>
                                            {isAnswerSubmitted && selectedAnswer === opt.key && (
                                                answerResult?.is_correct
                                                    ? <CheckCircle className="w-5 h-5 text-green-400 ml-auto shrink-0" />
                                                    : <XCircle className="w-5 h-5 text-red-400 ml-auto shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Answer feedback */}
                        {isAnswerSubmitted && answerResult && (
                            <div className={`mt-4 p-4 rounded-xl border ${answerResult.is_correct
                                ? 'bg-green-950/30 border-green-800/40'
                                : 'bg-red-950/30 border-red-800/40'
                                }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {answerResult.is_correct
                                        ? <CheckCircle className="w-5 h-5 text-green-400" />
                                        : <XCircle className="w-5 h-5 text-red-400" />
                                    }
                                    <span className={`font-semibold ${answerResult.is_correct ? 'text-green-300' : 'text-red-300'}`}>
                                        {answerResult.is_correct ? 'Correct!' : 'Incorrect'}
                                    </span>
                                    <span className="text-sm text-slate-400 ml-auto">
                                        +{answerResult.points_earned} pts
                                    </span>
                                </div>

                                {answerResult.explanation && (
                                    <p className="text-sm text-slate-400 mt-2">{answerResult.explanation}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end">
                        {!isAnswerSubmitted ? (
                            <button
                                onClick={() => handleSubmitAnswer(selectedAnswer || '')}
                                disabled={!selectedAnswer || isSubmitting}
                                className="px-5 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
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
                                className="px-5 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center gap-2 text-sm sm:text-base"
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

            {/* Hidden proctor video/canvas elements */}
            <video ref={proctorVideoRef} style={{ display: 'none' }} muted playsInline />
            <canvas ref={proctorCanvasRef} width={320} height={240} style={{ display: 'none' }} />

            {/* ── Violation Sidebar Overlay ── */}
            {showViolationPanel && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />

                    {/* Right sidebar panel */}
                    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl animate-slideIn">
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
                                <AlertCircle className="w-8 h-8 text-amber-400" />
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">Violation Detected</h2>
                            <p className="text-slate-400 mb-6">Take a breath. Your timer is still running.</p>

                            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-8 w-full max-w-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400">Violations</span>
                                    <span className="text-lg font-bold text-amber-400">
                                        {violations} {maxViolations > 0 ? `/ ${maxViolations}` : ''}
                                    </span>
                                </div>
                                {maxViolations > 0 && (
                                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
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

                            <ul className="text-sm text-slate-500 space-y-1 mb-8">
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
                                className="w-full max-w-xs px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
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
