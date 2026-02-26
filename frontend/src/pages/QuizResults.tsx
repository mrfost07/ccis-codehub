import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Home, Award, Target, CheckCircle, XCircle, Clock, Star, ThumbsUp, TrendingUp } from 'lucide-react';

interface ResultsState {
    score: number;
    totalCorrect: number;
    totalAttempted: number;
    totalQuestions: number;
    quizTitle?: string;
}

const QuizResults = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = (location.state as ResultsState) || {};

    const score = state.score || 0;
    const totalCorrect = state.totalCorrect || 0;
    const totalAttempted = state.totalAttempted || 0;
    const totalQuestions = state.totalQuestions || totalAttempted || 1;
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    const quizTitle = state.quizTitle || 'Quiz';

    const getEncouragement = (acc: number) => {
        if (acc >= 90) return { text: "Outstanding!", color: "text-yellow-400", Icon: Trophy };
        if (acc >= 70) return { text: "Great Job!", color: "text-green-400", Icon: Star };
        if (acc >= 50) return { text: "Good Effort!", color: "text-indigo-400", Icon: ThumbsUp };
        return { text: "Keep Practicing!", color: "text-slate-400", Icon: TrendingUp };
    };

    const { text, color, Icon } = getEncouragement(accuracy);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 pb-20 sm:pb-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950" />

            <div className="relative w-full max-w-lg text-center space-y-6">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
                    {/* Trophy Icon */}
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 rounded-full" />
                            <Icon className={`w-20 h-20 sm:w-24 sm:h-24 ${color} drop-shadow-lg`} />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">{text}</h1>
                    <p className="text-slate-400 text-base sm:text-lg mb-2">{quizTitle}</p>
                    <p className="text-slate-500 text-sm">You completed the session</p>

                    {/* Stats Grid */}
                    <div className="mt-8 py-6 border-t border-b border-slate-800 grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl sm:text-3xl font-bold text-white">{score}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Score</div>
                        </div>
                        <div className="text-center border-x border-slate-800">
                            <div className="text-2xl sm:text-3xl font-bold text-white">{accuracy}%</div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Accuracy</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl sm:text-3xl font-bold text-white">
                                {totalCorrect}/{totalQuestions}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Correct</div>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">Correct</span>
                            </div>
                            <span className="text-green-400 font-bold">{totalCorrect}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <div className="flex items-center gap-2 text-red-400">
                                <XCircle className="w-5 h-5" />
                                <span className="font-medium">Incorrect</span>
                            </div>
                            <span className="text-red-400 font-bold">{totalAttempted - totalCorrect}</span>
                        </div>
                        {totalQuestions > totalAttempted && (
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-500/10 border border-slate-500/20 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-medium">Unanswered</span>
                                </div>
                                <span className="text-slate-400 font-bold">{totalQuestions - totalAttempted}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mt-8 space-y-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 group"
                        >
                            <Home className="w-5 h-5" />
                            Back to Dashboard
                        </button>

                        <button
                            onClick={() => navigate('/join-quiz')}
                            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
                        >
                            <Target className="w-5 h-5 text-purple-400" />
                            Join Another Quiz
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizResults;
