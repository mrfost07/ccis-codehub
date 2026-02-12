import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Users, Target, Clock, Trophy, BarChart3,
    CheckCircle, XCircle, AlertTriangle, Loader2, TrendingUp,
    TrendingDown, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import liveQuizService from '../services/liveQuizService';

interface QuestionAnalytics {
    question_id: string;
    order: number;
    question_text: string;
    question_type: string;
    correct_answer: string;
    points: number;
    total_responses: number;
    correct_count: number;
    correct_rate: number;
    average_response_time: number;
    answer_distribution: Record<string, number>;
}

interface LeaderboardEntry {
    rank: number;
    participant_id: string;
    nickname: string;
    student_name: string;
    student_email: string | null;
    total_score: number;
    total_correct: number;
    total_attempted: number;
    accuracy: number;
    average_response_time: number;
    violations: number;
    is_flagged: boolean;
    joined_at: string | null;
    completed_at: string | null;
}

interface AnalyticsData {
    quiz: {
        id: string;
        title: string;
        join_code: string;
        is_open: boolean;
        status_text: string;
        total_questions: number;
    };
    stats: {
        total_participants: number;
        average_score: number;
        average_accuracy: number;
        completion_rate: number;
        hardest_question: string | null;
        easiest_question: string | null;
    };
    leaderboard: LeaderboardEntry[];
    question_analytics: QuestionAnalytics[];
}

const QuizAnalytics = () => {
    const { quizId } = useParams<{ quizId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'questions'>('overview');
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

    useEffect(() => {
        if (!quizId) return;
        const fetchData = async () => {
            try {
                const result = await liveQuizService.getFinalOverview(quizId);
                setData(result);
            } catch (error: any) {
                toast.error('Failed to load analytics');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [quizId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
                <h2 className="text-xl font-bold">No analytics available</h2>
                <p className="text-slate-400 mt-2">This quiz hasn't been taken yet.</p>
                <button onClick={() => navigate(-1)} className="mt-6 px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 transition">
                    Go Back
                </button>
            </div>
        );
    }

    const { quiz, stats, leaderboard, question_analytics } = data;

    const getCorrectRateColor = (rate: number) => {
        if (rate >= 75) return 'text-green-400';
        if (rate >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    const getCorrectRateBg = (rate: number) => {
        if (rate >= 75) return 'bg-green-500';
        if (rate >= 50) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-800 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
                                <span className="font-mono">{quiz.join_code}</span>
                                <span>•</span>
                                <span className={quiz.is_open ? 'text-green-400' : 'text-slate-500'}>{quiz.status_text}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-medium text-slate-300">Analytics</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Participants" value={stats.total_participants} />
                    <StatCard icon={<Trophy className="w-5 h-5 text-yellow-400" />} label="Avg Score" value={stats.average_score} />
                    <StatCard icon={<Target className="w-5 h-5 text-green-400" />} label="Avg Accuracy" value={`${stats.average_accuracy}%`} />
                    <StatCard icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} label="Completion" value={`${stats.completion_rate}%`} />
                </div>

                {/* Hardest/Easiest */}
                {(stats.hardest_question || stats.easiest_question) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {stats.hardest_question && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                                <TrendingDown className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-red-400 font-medium uppercase tracking-wider">Hardest Question</p>
                                    <p className="text-sm text-slate-300 mt-1">{stats.hardest_question}</p>
                                </div>
                            </div>
                        )}
                        {stats.easiest_question && (
                            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                                <TrendingUp className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-green-400 font-medium uppercase tracking-wider">Easiest Question</p>
                                    <p className="text-sm text-slate-300 mt-1">{stats.easiest_question}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-900 p-1 rounded-xl mb-6 w-fit">
                    {(['overview', 'leaderboard', 'questions'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            {tab === 'overview' ? 'Overview' : tab === 'leaderboard' ? 'Leaderboard' : 'Questions'}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Question Performance Overview</h3>
                        {question_analytics.map(q => (
                            <div key={q.question_id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-slate-400">Q{q.order}</span>
                                    <span className={`text-sm font-bold ${getCorrectRateColor(q.correct_rate)}`}>
                                        {q.correct_rate}% correct
                                    </span>
                                </div>
                                <p className="text-white text-sm mb-3">{q.question_text}</p>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${getCorrectRateBg(q.correct_rate)}`}
                                        style={{ width: `${q.correct_rate}%` }}
                                    />
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                    <span>{q.correct_count}/{q.total_responses} correct</span>
                                    <span>•</span>
                                    <span>Avg {q.average_response_time}s</span>
                                    <span>•</span>
                                    <span>{q.points} pts</span>
                                </div>
                            </div>
                        ))}
                        {question_analytics.length === 0 && (
                            <p className="text-slate-500 text-center py-8">No question data available yet.</p>
                        )}
                    </div>
                )}

                {activeTab === 'leaderboard' && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800 text-left">
                                        <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">Student</th>
                                        <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Score</th>
                                        <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Accuracy</th>
                                        <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Avg Time</th>
                                        <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Violations</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((entry) => (
                                        <tr key={entry.participant_id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition ${entry.is_flagged ? 'bg-red-500/5' : ''}`}>
                                            <td className="px-4 py-3">
                                                {entry.rank <= 3 ? (
                                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        entry.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                                                            'bg-amber-700/20 text-amber-500'
                                                        }`}>
                                                        {entry.rank}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-sm pl-2">{entry.rank}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-white text-sm font-medium">{entry.student_name}</div>
                                                <div className="text-slate-500 text-xs">{entry.nickname}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-white font-bold">{entry.total_score}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-sm font-medium ${getCorrectRateColor(entry.accuracy)}`}>
                                                    {entry.accuracy}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-400 text-sm">{entry.average_response_time}s</td>
                                            <td className="px-4 py-3 text-right">
                                                {entry.violations > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        {entry.violations}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 text-sm">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {leaderboard.length === 0 && (
                            <p className="text-slate-500 text-center py-8">No participants yet.</p>
                        )}
                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="space-y-3">
                        {question_analytics.map(q => (
                            <div key={q.question_id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedQuestion(expandedQuestion === q.question_id ? null : q.question_id)}
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${getCorrectRateColor(q.correct_rate)} ${q.correct_rate >= 75 ? 'bg-green-500/10' :
                                            q.correct_rate >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10'
                                            }`}>
                                            Q{q.order}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white text-sm">{q.question_text}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {q.question_type.replace('_', ' ')} • {q.points} pts • {q.total_responses} responses
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-bold ${getCorrectRateColor(q.correct_rate)}`}>
                                            {q.correct_rate}%
                                        </span>
                                        {expandedQuestion === q.question_id ? (
                                            <ChevronUp className="w-4 h-4 text-slate-500" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                        )}
                                    </div>
                                </button>

                                {expandedQuestion === q.question_id && (
                                    <div className="px-5 pb-4 pt-2 border-t border-slate-800 space-y-4">
                                        {/* Stats Row */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-white">{q.correct_count}</div>
                                                <div className="text-xs text-slate-500">Correct</div>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-white">{q.total_responses - q.correct_count}</div>
                                                <div className="text-xs text-slate-500">Incorrect</div>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-white">{q.average_response_time}s</div>
                                                <div className="text-xs text-slate-500">Avg Time</div>
                                            </div>
                                        </div>

                                        {/* Answer */}
                                        <div className="text-sm">
                                            <span className="text-slate-500">Correct Answer: </span>
                                            <span className="text-green-400 font-medium">{q.correct_answer}</span>
                                        </div>

                                        {/* Answer Distribution */}
                                        {Object.keys(q.answer_distribution).length > 0 && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Answer Distribution</p>
                                                <div className="space-y-2">
                                                    {Object.entries(q.answer_distribution)
                                                        .sort(([, a], [, b]) => b - a)
                                                        .map(([key, count]) => {
                                                            const pct = Math.round((count / Math.max(q.total_responses, 1)) * 100);
                                                            const isCorrect = key.toUpperCase() === q.correct_answer.toUpperCase();
                                                            return (
                                                                <div key={key} className="flex items-center gap-3">
                                                                    <span className={`w-7 text-xs font-bold ${isCorrect ? 'text-green-400' : 'text-slate-400'}`}>
                                                                        {key}
                                                                    </span>
                                                                    <div className="flex-1 bg-slate-800 h-5 rounded overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded ${isCorrect ? 'bg-green-600/60' : 'bg-slate-600/60'} transition-all`}
                                                                            style={{ width: `${pct}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs text-slate-400 w-16 text-right">
                                                                        {count} ({pct}%)
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {question_analytics.length === 0 && (
                            <p className="text-slate-500 text-center py-8">No question data available yet.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Reusable stat card
const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
    </div>
);

export default QuizAnalytics;
