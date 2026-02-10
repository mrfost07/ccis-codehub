import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timer, CheckCircle, XCircle, AlertCircle, Play, Terminal } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Editor from '@monaco-editor/react';

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
    timeRemaining: number;
    score: number;
}

const LiveQuizSession = () => {
    const { joinCode } = useParams<{ joinCode: string }>();
    const navigate = useNavigate();
    const wsRef = useRef<WebSocket | null>(null);

    const [gameState, setGameState] = useState<QuizState>({
        status: 'in_progress',
        timeRemaining: 30, // Default
        score: 0
    });

    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [codeAnswer, setCodeAnswer] = useState<string>('');
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

    // Mock initial question for UI dev (updated to show variety possible)
    useEffect(() => {
        // In real implementation, this comes from WS
        // Example Code Question Mock:
        /*
        setGameState(prev => ({
          ...prev,
          currentQuestion: {
            id: '2',
            type: 'code',
            text: 'Write a function that returns "Hello World"',
            timeLimit: 60,
            language: 'javascript',
            codeTemplate: 'function sayHello() {\n  // Your code here\n}'
          }
        }));
        */
        // Keep MCQ for now as default
        setGameState(prev => ({
            ...prev,
            currentQuestion: {
                id: '1',
                type: 'mcq',
                text: 'Which of the following is NOT a primitive data type in JavaScript?',
                timeLimit: 30,
                choices: [
                    { id: 'a', text: 'String' },
                    { id: 'b', text: 'Boolean' },
                    { id: 'c', text: 'Object' },
                    { id: 'd', text: 'Undefined' }
                ]
            }
        }));
    }, []);

    useEffect(() => {
        if (!joinCode) return;

        // Connect to WebSocket using environment variable
        const baseWsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const wsUrl = `${baseWsUrl}/quiz/${joinCode}/`;

        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWsMessage(data);
            } catch (e) {
                console.error('Error parsing WS message', e);
            }
        };

        return () => {
            socket.close();
        };
    }, [joinCode]);

    const handleWsMessage = (data: any) => {
        switch (data.type) {
            case 'question_start':
                setGameState(prev => ({
                    ...prev,
                    currentQuestion: data.question,
                    timeRemaining: data.timeLimit || 30,
                    status: 'in_progress'
                }));
                setSelectedAnswer(null);
                setCodeAnswer(data.question.codeTemplate || '');
                setIsAnswerSubmitted(false);
                setAnswerResult(null);
                setConsoleOutput([]);
                break;

            case 'time_tick':
                setGameState(prev => ({
                    ...prev,
                    timeRemaining: data.seconds
                }));
                break;

            case 'question_end':
                const isCorrect = data.correctAnswer === (gameState.currentQuestion?.type === 'code' ? 'pass' : selectedAnswer); // simplified check
                setAnswerResult(isCorrect ? 'correct' : 'incorrect');
                if (isCorrect) {
                    setGameState(prev => ({ ...prev, score: prev.score + (data.points || 100) }));
                }
                break;

            case 'quiz_end':
                navigate('/quiz/results', { state: { score: gameState.score } });
                break;
        }
    };

    const submitAnswer = (answer: string) => {
        if (isAnswerSubmitted) return;

        // For MCQ
        if (gameState.currentQuestion?.type === 'mcq') {
            setSelectedAnswer(answer);
        }
        // For Code (handled via separate run button usually, but here we submit)
        else {
            setCodeAnswer(answer); // ensure state is up to date
        }

        setIsAnswerSubmitted(true);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'submit_answer',
                questionId: gameState.currentQuestion?.id,
                answer: answer
            }));
        }
    };

    const runCode = () => {
        // Simulate code execution
        setConsoleOutput(['Running tests...', '> Test 1: Passed', '> Test 2: Passed', 'Result: Success!']);
        // In real app, send code to execution service
    };

    if (!gameState.currentQuestion) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading question...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 text-white">
                        <span className="bg-blue-600 px-2 py-1 rounded text-xs font-bold">LIVE</span>
                        <span className="font-mono text-slate-400">{joinCode}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-white font-bold">Score: {gameState.score}</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 md:p-8">

                {/* Timer Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${(gameState.timeRemaining / (gameState.currentQuestion.timeLimit || 30)) * 100}%` }}
                    />
                </div>

                {/* Question Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 mb-8 text-center shadow-xl">
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                        {gameState.currentQuestion.text}
                    </h2>
                    <div className="mt-6 flex justify-center items-center gap-2 text-slate-400 font-mono text-xl">
                        <Timer className="w-6 h-6 text-blue-400" />
                        <span>{gameState.timeRemaining}s</span>
                    </div>
                </div>

                {/* Answer Grid */}
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
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
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

                            // Determine styling based on state
                            let boxClass = "bg-slate-800 border-slate-700 hover:bg-slate-700"; // Default
                            if (isSelected) boxClass = "bg-blue-600 border-blue-500 text-white";
                            if (isAnswerSubmitted && !isSelected) boxClass = "opacity-50 bg-slate-800 border-slate-700";

                            // Result reveal
                            if (showResult) {
                                if (isSelected && answerResult === 'correct') boxClass = "bg-green-600 border-green-500 ring-4 ring-green-900";
                                if (isSelected && answerResult === 'incorrect') boxClass = "bg-red-600 border-red-500 ring-4 ring-red-900";
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
                                    <span className={`text-lg font-medium ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                                        {choice.text}
                                    </span>

                                    {isSelected && answerResult === 'correct' && <CheckCircle className="text-white w-6 h-6" />}
                                    {isSelected && answerResult === 'incorrect' && <XCircle className="text-white w-6 h-6" />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveQuizSession;
