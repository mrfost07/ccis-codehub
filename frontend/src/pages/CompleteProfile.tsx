/**
 * Complete Profile Page - Magic Wizard Flow
 * For new users who signed up with Google to fill in program & year level
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check, Code2, Server, LineChart,
    Sprout, Flower2, TreeDeciduous, GraduationCap,
    Loader2, ChevronRight, ChevronLeft
} from 'lucide-react';

const PROGRAMS = [
    { value: 'BSCS', label: 'BS Computer Science', icon: Code2, description: 'Software Development & Algorithms' },
    { value: 'BSIT', label: 'BS Information Technology', icon: Server, description: 'IT Infrastructure & Systems' },
    { value: 'BSIS', label: 'BS Information Systems', icon: LineChart, description: 'Business Systems & Analytics' },
];

const YEAR_LEVELS = [
    { value: '1', label: '1st Year', icon: Sprout, color: 'from-emerald-500 to-green-600' },
    { value: '2', label: '2nd Year', icon: Flower2, color: 'from-blue-500 to-cyan-600' },
    { value: '3', label: '3rd Year', icon: TreeDeciduous, color: 'from-purple-500 to-indigo-600' },
    { value: '4', label: '4th Year', icon: GraduationCap, color: 'from-amber-500 to-orange-600' },
];

export default function CompleteProfile() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setAuthData } = useAuth();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [googleData, setGoogleData] = useState<any>(null);
    const [formData, setFormData] = useState({
        program: '',
        year_level: '',
        username: '',
    });

    useEffect(() => {
        // Get Google data from location state or localStorage
        const stateData = location.state?.googleData;
        const storedData = localStorage.getItem('google_signup_data');

        if (stateData) {
            setGoogleData(stateData);
            setFormData(prev => ({
                ...prev,
                username: stateData.email?.split('@')[0] || '',
            }));
        } else if (storedData) {
            const parsed = JSON.parse(storedData);
            setGoogleData(parsed);
            setFormData(prev => ({
                ...prev,
                username: parsed.email?.split('@')[0] || '',
            }));
        } else {
            // No Google data, redirect to register
            navigate('/register');
        }
    }, [location.state, navigate]);

    const handleNext = () => {
        if (step === 1 && !formData.program) {
            toast.error('Please select your program');
            return;
        }
        if (step === 2 && !formData.year_level) {
            toast.error('Please select your year level');
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => {
        setStep(step - 1);
    };

    const handleSubmit = async () => {
        if (!formData.program || !formData.year_level) {
            toast.error('Please complete all fields');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/google/create-account/', {
                google_data: googleData,
                profile_data: formData,
            });

            // Store tokens and user data
            localStorage.removeItem('google_signup_data');
            setAuthData(response.data.tokens.access, response.data.user);

            toast.success('🎉 Account created! Welcome to CCIS CodeHub!');
            // Use window.location for fresh page load with auth tokens
            window.location.href = '/learning';
        } catch (err: any) {
            console.error('Account creation error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to create account';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!googleData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-3">
                            {googleData.picture ? (
                                <img
                                    src={googleData.picture}
                                    alt="Profile"
                                    className="w-16 h-16 rounded-full border-2 border-indigo-500 shadow-lg shadow-indigo-500/25"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/25">
                                    {googleData.first_name?.[0] || '?'}
                                </div>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-white">
                            Welcome, {googleData.first_name || 'there'}! 👋
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Complete your profile to get started</p>
                        <p className="text-indigo-400 text-xs mt-1">{googleData.email}</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s === step
                                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-slate-900'
                                            : s < step
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-700 text-slate-400'
                                        }`}
                                >
                                    {s < step ? <Check className="w-4 h-4" /> : s}
                                </div>
                                {s < 3 && (
                                    <div className={`w-8 sm:w-12 h-0.5 ${s < step ? 'bg-emerald-600' : 'bg-slate-700'}`} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Step Content */}
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h3 className="text-sm font-medium text-slate-300 text-center mb-4">
                                    Select Your Program
                                </h3>
                                <div className="space-y-2">
                                    {PROGRAMS.map((program) => {
                                        const Icon = program.icon;
                                        return (
                                            <button
                                                key={program.value}
                                                onClick={() => setFormData(prev => ({ ...prev, program: program.value }))}
                                                className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${formData.program === program.value
                                                        ? 'border-indigo-500 bg-indigo-500/10'
                                                        : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${formData.program === program.value ? 'bg-indigo-500/20' : 'bg-slate-700/50'}`}>
                                                    <Icon className={`w-4 h-4 ${formData.program === program.value ? 'text-indigo-400' : 'text-slate-400'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-white">{program.label}</div>
                                                    <div className="text-xs text-slate-400 truncate">{program.description}</div>
                                                </div>
                                                {formData.program === program.value && (
                                                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h3 className="text-sm font-medium text-slate-300 text-center mb-4">
                                    Select Your Year Level
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {YEAR_LEVELS.map((year) => {
                                        const Icon = year.icon;
                                        return (
                                            <button
                                                key={year.value}
                                                onClick={() => setFormData(prev => ({ ...prev, year_level: year.value }))}
                                                className={`p-4 rounded-xl border text-center transition-all ${formData.year_level === year.value
                                                        ? 'border-indigo-500 bg-indigo-500/10'
                                                        : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30'
                                                    }`}
                                            >
                                                <div className={`mx-auto w-10 h-10 rounded-xl bg-gradient-to-br ${year.color} flex items-center justify-center mb-2 shadow-lg`}>
                                                    <Icon className="w-5 h-5 text-white" />
                                                </div>
                                                <span className="text-sm font-medium text-white">{year.label}</span>
                                                {formData.year_level === year.value && (
                                                    <Check className="w-4 h-4 text-indigo-400 mx-auto mt-1" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h3 className="text-sm font-medium text-slate-300 text-center mb-4">
                                    Confirm Your Details
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                                        <label className="text-xs text-slate-400 block mb-0.5">Email</label>
                                        <div className="text-sm text-white font-medium">{googleData.email}</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                                        <label className="text-xs text-slate-400 block mb-0.5">Name</label>
                                        <div className="text-sm text-white font-medium">
                                            {googleData.first_name} {googleData.last_name}
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                                        <label className="text-xs text-slate-400 block mb-0.5">Username</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                            className="w-full bg-transparent text-sm text-white font-medium outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                                            <label className="text-xs text-slate-400 block mb-0.5">Program</label>
                                            <div className="text-sm text-white font-medium">
                                                {PROGRAMS.find(p => p.value === formData.program)?.value}
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                                            <label className="text-xs text-slate-400 block mb-0.5">Year Level</label>
                                            <div className="text-sm text-white font-medium">
                                                {YEAR_LEVELS.find(y => y.value === formData.year_level)?.label}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 mt-6">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="flex-1 py-2.5 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                            >
                                Continue
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Create Account
                                        <Check className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
