import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Clock, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Define message types
interface WebSocketMessage {
    type: string;
    message?: string;
    sender?: string;
    data?: any;
}

const QuizLobby = () => {
    const { joinCode } = useParams<{ joinCode: string }>();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState<string[]>([]);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [hostName, setHostName] = useState<string>('Instructor');
    const [quizTitle, setQuizTitle] = useState<string>('Live Quiz Session');

    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!joinCode) return;

        // Connect to WebSocket using environment variable
        // VITE_WS_URL from .env already includes /ws, e.g., ws://localhost:8000/ws
        const baseWsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const wsUrl = `${baseWsUrl}/quiz/${joinCode}/`;

        console.log('Connecting to WebSocket:', wsUrl);

        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
            console.log('Connected to Quiz WebSocket');
            setStatus('connected');
            // Send join message
            socket.send(JSON.stringify({
                type: 'join',
                message: 'Student joined lobby'
            }));
        };

        socket.onmessage = (event) => {
            try {
                const data: WebSocketMessage = JSON.parse(event.data);
                console.log('Received message:', data);

                if (data.type === 'quiz_started') {
                    toast.success('Quiz starting!');
                    navigate(`/quiz/live/${joinCode}`);
                } else if (data.type === 'participant_update') {
                    // Handle participant list updates if broadcasted
                    if (data.data?.participants) {
                        setParticipants(data.data.participants);
                    }
                }
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            setStatus('error');
        };

        socket.onclose = () => {
            console.log('WebSocket disconnected');
            if (status !== 'error') {
                setStatus('connecting'); // Try to reconnect behavior could be added here
            }
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [joinCode, navigate]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />

            <div className="relative w-full max-w-lg text-center">
                {/* Connection Status Indicator */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8 ${status === 'connected' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' :
                        status === 'error' ? 'bg-red-500' :
                            'bg-yellow-500 animate-pulse'
                        }`} />
                    {status === 'connected' ? 'Connected to Session' :
                        status === 'error' ? 'Connection Error' :
                            'Connecting...'}
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{quizTitle}</h1>
                    <p className="text-slate-400 text-lg mb-8">Hosted by <span className="text-white font-medium">{hostName}</span></p>

                    <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center relative">
                            <div className="absolute inset-0 rounded-full border-4 border-slate-700/50 border-t-blue-500 animate-spin" />
                            <Clock className="w-10 h-10 text-blue-400" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-white">Waiting for host to start...</h2>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                Sit tight! The quiz will begin automatically once everyone has joined.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-800/50">
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                            <Users className="w-5 h-5" />
                            <span>You and {Math.max(0, participants.length - 1)} others joined</span>
                        </div>

                        {participants.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                {participants.slice(0, 5).map((p, i) => (
                                    <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">{p}</span>
                                ))}
                                {participants.length > 5 && (
                                    <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">+{participants.length - 5} more</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    <p className="text-slate-600 text-sm">Session Code: <span className="font-mono text-slate-500">{joinCode?.toUpperCase()}</span></p>
                </div>
            </div>
        </div>
    );
};

export default QuizLobby;
