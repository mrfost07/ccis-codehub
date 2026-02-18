import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Timer, CheckCircle, XCircle, AlertCircle, Play, Terminal, Loader2, Maximize } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import ViolationWarningModal from '../components/ViolationWarningModal';

interface Question {
    id: string;
    type: 'mcq' | 'code';
    text: string;
    choices?: Array<{ id: string; text: string }>;
    timeLimit: number;
    // Code specific
    codeTemplate?: string;
    language?: string;
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
}

const LiveQuizSession = () => {
    const { joinCode } = useParams<{ joinCode: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const sessionState = (location.state as SessionState) || {};
    const wsRef = useRef<WebSocket | null>(null);
    const answerStartTime = useRef<number>(Date.now());

    const [gameState, setGameState] = useState<QuizState>({
        status: 'waiting',
        timeRemaining: 30,
        questionNumber: 0,
        totalQuestions: 0,
        score: 0,
        totalCorrect: 0,
        totalAttempted: 0
    });

    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [codeAnswer, setCodeAnswer] = useState<string>('');
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

    // Anti-cheating state
    const [violationModal, setViolationModal] = useState<{
        isOpen: boolean;
        violationType: 'fullscreen_exit' | 'tab_switch' | 'copy_paste';
        totalViolations: number;
        maxViolations: number;
        penaltyPoints: number;
        isFlagged: boolean;
    }>({
        isOpen: false,
        violationType: 'tab_switch',
        totalViolations: 0,
        maxViolations: sessionState.maxViolations || 0,
        penaltyPoints: sessionState.violationPenaltyPoints || 0,
        isFlagged: false
    });
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Report violation to backend
    const reportViolation = useCallback((type: 'fullscreen_exit' | 'tab_switch' | 'copy_paste') => {
        if (!sessionState.participantId) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'report_violation',
                participant_id: sessionState.participantId,
                violation_type: type
            }));
        }
    }, [sessionState.participantId]);

    // Fullscreen management
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

        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull && gameState.status === 'in_progress') {
                reportViolation('fullscreen_exit');
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, [sessionState.requireFullscreen, gameState.status, reportViolation]);

    // Tab visibility detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && gameState.status === 'in_progress') {
                reportViolation('tab_switch');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [gameState.status, reportViolation]);

    // Copy-paste prevention
    useEffect(() => {
        if (gameState.status !== 'in_progress') return;

        const handleCopyPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            reportViolation('copy_paste');
        };

        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);

        return () => {
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
            document.removeEventListener('cut', handleCopyPaste);
        };
    }, [gameState.status, reportViolation]);

    // Timer countdown
    useEffect(() => {
        if (gameState.status !== 'in_progress' || !gameState.currentQuestion) return;

        const timer = setInterval(() => {
            setGameState(prev => {
                if (prev.timeRemaining <= 0) {
                    clearInterval(timer);
                    // Auto-submit if time runs out
                    if (!isAnswerSubmitted) {
                        submitAnswer('');
                    }
                    return prev;
                }
                return { ...prev, timeRemaining: prev.timeRemaining - 1 };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState.status, gameState.currentQuestion?.id, isAnswerSubmitted]);

    // WebSocket connection
    useEffect(() => {
        if (!joinCode) return;

        const baseWsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const wsUrl = `${baseWsUrl}/quiz/${joinCode}/`;

        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
            console.log('LiveQuizSession: Connected to WebSocket');
            // Send join message
            socket.send(JSON.stringify({
                type: 'join',
                nickname: sessionState.nickname || 'Student'
            }));
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWsMessage(data);
            } catch (e) {
                console.error('Error parsing WS message', e);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            toast.error('Connection error. Please try rejoining.');
        };

        socket.onclose = () => {
            console.log('WebSocket disconnected');
        };

        return () => {
            socket.close();
        };
    }, [joinCode]);

    const handleWsMessage = (data: any) => {
        switch (data.type) {
            case 'question_start': {
                const q = data.question;
                // Map backend question data to frontend format
                const question: Question = {
                    id: q.id,
                    type: q.question_type === 'coding' ? 'code' : 'mcq',
                    text: q.question_text || q.text,
                    timeLimit: q.time_limit || data.timeLimit || 30,
                    choices: q.question_type === 'multiple_choice' || q.question_type === 'true_false'
                        ? [
                            q.option_a && { id: 'A', text: q.option_a },
                            q.option_b && { id: 'B', text: q.option_b },
                            q.option_c && { id: 'C', text: q.option_c },
                            q.option_d && { id: 'D', text: q.option_d },
                        ].filter(Boolean) as Array<{ id: string; text: string }>
                        : q.choices,
                    codeTemplate: q.starter_code || q.codeTemplate || '',
                    language: q.programming_language || q.language || 'javascript'
                };

                setGameState(prev => ({
                    ...prev,
                    currentQuestion: question,
                    timeRemaining: question.timeLimit,
                    status: 'in_progress',
                    questionNumber: prev.questionNumber + 1,
                    totalQuestions: data.totalQuestions || prev.totalQuestions
                }));
                setSelectedAnswer(null);
                setCodeAnswer(question.codeTemplate || '');
                setIsAnswerSubmitted(false);
                setAnswerResult(null);
                setPointsEarned(0);
                setConsoleOutput([]);
                answerStartTime.current = Date.now();
                break;
            }

            case 'time_tick':
                setGameState(prev => ({
                    ...prev,
                    timeRemaining: data.seconds
                }));
                break;

            case 'answer_submitted':
                // Response from server after submitting answer
                if (data.data?.success) {
                    const pts = data.data.points_earned || 0;
                    setAnswerResult(data.data.is_correct ? 'correct' : 'incorrect');
                    setPointsEarned(pts);
                    if (data.data.is_correct) {
                        setGameState(prev => ({
                            ...prev,
                            score: prev.score + pts,
                            totalCorrect: prev.totalCorrect + 1
                        }));
                    }
                    setGameState(prev => ({
                        ...prev,
                        totalAttempted: prev.totalAttempted + 1
                    }));
                }
                break;

            case 'violation_recorded':
                // Response from server after reporting a violation
                if (data.data?.success) {
                    setViolationModal({
                        isOpen: true,
                        violationType: data.violation_type || 'tab_switch',
                        totalViolations: data.data.total_violations || 0,
                        maxViolations: data.data.max_violations || 0,
                        penaltyPoints: data.data.penalty_applied || 0,
                        isFlagged: data.data.is_flagged || false
                    });
                    // Update score if penalty was applied
                    if (data.data.penalty_applied > 0) {
                        setGameState(prev => ({
                            ...prev,
                            score: Math.max(0, prev.score - data.data.penalty_applied)
                        }));
                    }
                }
                break;

            case 'question_end': {
                // If we haven't gotten answer_submitted result, check locally
                if (answerResult === null) {
                    const isCorrect = data.correctAnswer?.toUpperCase() === selectedAnswer?.toUpperCase();
                    setAnswerResult(isCorrect ? 'correct' : 'incorrect');
                    if (isCorrect) {
                        const pts = data.points || 100;
                        setPointsEarned(pts);
                        setGameState(prev => ({
                            ...prev,
                            score: prev.score + pts,
                            totalCorrect: prev.totalCorrect + 1
                        }));
                    }
                }
                break;
            }

            case 'quiz_end':
                setGameState(prev => ({ ...prev, status: 'results' }));
                // Exit fullscreen before navigating
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => { });
                }
                // Navigate to results with full data
                navigate('/quiz/results', {
                    state: {
                        score: gameState.score,
                        totalCorrect: gameState.totalCorrect,
                        totalAttempted: gameState.totalAttempted,
                        totalQuestions: gameState.totalQuestions || gameState.questionNumber,
                        quizTitle: sessionState.quizTitle
                    }
                });
                break;
        }
    };

    const submitAnswer = (answer: string) => {
        if (isAnswerSubmitted && answer !== '') return;

        const responseTimeSecs = (Date.now() - answerStartTime.current) / 1000;

        if (gameState.currentQuestion?.type === 'mcq') {
            setSelectedAnswer(answer);
        } else {
            setCodeAnswer(answer);
        }

        setIsAnswerSubmitted(true);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'submit_answer',
                participant_id: sessionState.participantId,
                question_id: gameState.currentQuestion?.id,
                answer: answer,
                response_time: Math.round(responseTimeSecs)
            }));
        }
    };

    const runCode = () => {
        setConsoleOutput(['Running tests...', '> Test 1: Passed', '> Test 2: Passed', 'Result: Success!']);
    };

    // Waiting state
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

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 px-2 py-1 rounded text-xs font-bold text-white">LIVE</span>
                        <span className="font-mono text-slate-400 text-sm">{joinCode}</span>
                        {gameState.questionNumber > 0 && (
                            <span className="text-slate-500 text-sm">
                                Q{gameState.questionNumber}{gameState.totalQuestions > 0 && `/${gameState.totalQuestions}`}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {answerResult && (
                            <span className={`text-sm font-medium ${answerResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                                {answerResult === 'correct' ? `+${pointsEarned}` : 'Wrong'}
                            </span>
                        )}
                        <div className="text-white font-bold">Score: {gameState.score}</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-8">

                {/* Timer Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full mb-8 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-linear ${gameState.timeRemaining <= 5 ? 'bg-red-500' :
                            gameState.timeRemaining <= 10 ? 'bg-amber-500' : 'bg-purple-500'
                            }`}
                        style={{ width: `${(gameState.timeRemaining / (gameState.currentQuestion.timeLimit || 30)) * 100}%` }}
                    />
                </div>

                {/* Question Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 mb-8 text-center shadow-xl">
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                        {gameState.currentQuestion.text}
                    </h2>
                    <div className={`mt-6 flex justify-center items-center gap-2 font-mono text-xl ${gameState.timeRemaining <= 5 ? 'text-red-400' :
                        gameState.timeRemaining <= 10 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                        <Timer className={`w-6 h-6 ${gameState.timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-purple-400'}`} />
                        <span>{gameState.timeRemaining}s</span>
                    </div>
                </div>

                {/* Question Content based on Type */}
                {gameState.currentQuestion?.type === 'code' ? (
                    /* CODE EDITOR UI */
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

                        {/* Console Output */}
                        {consoleOutput.length > 0 && (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-sm max-h-40 overflow-y-auto">
                                <div className="flex items-center gap-2 text-slate-400 mb-2 border-b border-slate-800 pb-2">
                                    <Terminal className="w-4 h-4" />
                                    <span>Console Output</span>
                                </div>
                                {consoleOutput.map((line, i) => (
                                    <div key={i} className={line.includes('Success') ? 'text-green-400' : 'text-slate-300'}>
                                        {line}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={runCode}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 font-medium transition"
                            >
                                <Play className="w-4 h-4" />
                                Run Code
                            </button>
                            <button
                                onClick={() => submitAnswer(codeAnswer)}
                                disabled={isAnswerSubmitted}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {isAnswerSubmitted ? 'Submitted' : 'Submit Solution'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* MCQ GRID UI */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start">
                        {gameState.currentQuestion?.choices?.map((choice) => {
                            const isSelected = selectedAnswer === choice.id;
                            const showResult = answerResult !== null;

                            let boxClass = "bg-slate-800 border-slate-700 hover:bg-slate-700";
                            if (isSelected && !showResult) boxClass = "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white";
                            if (isAnswerSubmitted && !isSelected && !showResult) boxClass = "opacity-50 bg-slate-800 border-slate-700";

                            if (showResult) {
                                if (isSelected && answerResult === 'correct') boxClass = "bg-green-600 border-green-500 ring-4 ring-green-900";
                                if (isSelected && answerResult === 'incorrect') boxClass = "bg-red-600 border-red-500 ring-4 ring-red-900";
                                if (!isSelected) boxClass = "opacity-40 bg-slate-800 border-slate-700";
                            }

                            return (
                                <button
                                    key={choice.id}
                                    onClick={() => submitAnswer(choice.id)}
                                    disabled={isAnswerSubmitted}
                                    className={`
                                        p-6 rounded-xl border-2 text-left transition-all transform active:scale-[0.98]
                                        flex items-center justify-between group
                                        ${boxClass}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
                                            }`}>
                                            {choice.id}
                                        </span>
                                        <span className={`text-lg font-medium ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
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
                    // Re-enter fullscreen if required
                    if (sessionState.requireFullscreen) {
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
