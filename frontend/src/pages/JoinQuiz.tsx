import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Hash, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import liveQuizService from '../services/liveQuizService';
import { useAuth } from '../contexts/AuthContext';

const JoinQuiz = () => {
    const { code } = useParams<{ code?: string }>();
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Auto-fill code from URL parameter if present
    useEffect(() => {
        if (code) {
            setJoinCode(code.toUpperCase());
        }
    }, [code]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;

        setIsJoining(true);
        try {
            // Use actual username from auth context
            const nickname = user?.username || user?.first_name || 'Student';

            const result = await liveQuizService.joinByCode(
                joinCode.toUpperCase(),
                nickname
            );

            toast.success(`Joined "${result.quiz_info?.title || 'Quiz'}" successfully!`);

            // Navigate to lobby with join response data
            navigate(`/quiz/lobby/${joinCode.toUpperCase()}`, {
                state: {
                    participantId: result.participant_id,
                    sessionId: result.session_id,
                    quizId: result.quiz_id,
                    quizTitle: result.quiz_info?.title || 'Live Quiz',
                    hostName: result.quiz_info?.instructor_name || 'Instructor',
                    timeLimitMinutes: result.time_limit_minutes,
                    attemptsMessage: result.attempts_message,
                    nickname
                }
            });
        } catch (error: any) {
            const message = error.response?.data?.error || 'Invalid join code. Please try again.';
            toast.error(message);
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />

            <div className="relative w-full max-w-md">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-white mb-2">Join Quiz</h1>
                    <p className="text-slate-400">Enter the code provided by your instructor</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-blue-900/10">
                    <form onSubmit={handleJoin} className="space-y-6">
                        <div>
                            <label htmlFor="join-code" className="sr-only">Join Code</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Hash className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    id="join-code"
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    className="block w-full pl-11 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-center text-2xl font-mono tracking-widest uppercase"
                                    placeholder="CODE"
                                    maxLength={8}
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!joinCode.trim() || isJoining}
                            className="w-full flex items-center justify-center py-4 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-900/20"
                        >
                            {isJoining ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    Joining...
                                </>
                            ) : (
                                <>
                                    Enter Session
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinQuiz;
