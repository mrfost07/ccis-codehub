import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Home, ArrowRight, Award, Clock } from 'lucide-react';
// import { Button } from '@/components/ui/button';

const QuizResults = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { score } = location.state || { score: 0 };

    const getEncouragement = (score: number) => {
        if (score >= 90) return { text: "Outstanding!", color: "text-yellow-400" };
        if (score >= 70) return { text: "Great Job!", color: "text-green-400" };
        if (score >= 50) return { text: "Good Effort!", color: "text-blue-400" };
        return { text: "Keep Practicing!", color: "text-slate-400" };
    };

    const { text, color } = getEncouragement(score);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />

            <div className="relative w-full max-w-lg text-center space-y-8">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl">
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full" />
                            <Trophy className={`w-24 h-24 ${color} drop-shadow-lg`} />
                        </div>
                    </div>

                    <h1 className="text-4xl font-bold text-white mb-2">{text}</h1>
                    <p className="text-slate-400 text-lg">You completed the session</p>

                    <div className="mt-8 py-8 border-t border-b border-slate-800 grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">{score}</div>
                            <div className="text-sm text-slate-500 uppercase tracking-widest mt-1">Total Score</div>
                        </div>
                        <div className="text-center border-l border-slate-800">
                            <div className="text-3xl font-bold text-white">{score > 0 ? '100%' : '0%'}</div>
                            <div className="text-sm text-slate-500 uppercase tracking-widest mt-1">Completion</div>
                        </div>
                    </div>

                    <div className="mt-8 space-y-3">
                        <button
                            onClick={() => navigate('/learning')}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 group"
                        >
                            <Home className="w-5 h-5" />
                            Back to Dashboard
                        </button>

                        <button
                            onClick={() => navigate('/leaderboard')}
                            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
                        >
                            <Award className="w-5 h-5 text-yellow-500" />
                            View Leaderboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizResults;
