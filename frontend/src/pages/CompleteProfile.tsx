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

const PROGRAMS = [
    { value: 'BSCS', label: 'BS Computer Science', icon: '💻', description: 'Focus on software development & algorithms' },
    { value: 'BSIT', label: 'BS Information Technology', icon: '🌐', description: 'Focus on IT infrastructure & systems' },
    { value: 'BSIS', label: 'BS Information Systems', icon: '📊', description: 'Focus on business systems & analytics' },
];

const YEAR_LEVELS = [
    { value: '1', label: '1st Year', icon: '🌱' },
    { value: '2', label: '2nd Year', icon: '🌿' },
    { value: '3', label: '3rd Year', icon: '🌳' },
    { value: '4', label: '4th Year', icon: '🎓' },
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
            window.location.href = '/dashboard';
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
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        {googleData.picture ? (
                            <img
                                src={googleData.picture}
                                alt="Profile"
                                className="w-20 h-20 rounded-full border-4 border-indigo-500"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl">
                                {googleData.first_name?.[0] || '👤'}
                            </div>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        Welcome, {googleData.first_name || 'there'}! 👋
                    </h2>
                    <p className="text-slate-400 mt-2">
                        Complete your profile to get started
                    </p>
                    <p className="text-indigo-400 text-sm mt-1">
                        {googleData.email}
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${s === step
                                    ? 'bg-indigo-600 text-white scale-110'
                                    : s < step
                                        ? 'bg-green-600 text-white'
                                        : 'bg-slate-700 text-slate-400'
                                    }`}
                            >
                                {s < step ? '✓' : s}
                            </div>
                            {s < 3 && (
                                <div className={`w-12 h-1 ${s < step ? 'bg-green-600' : 'bg-slate-700'}`} />
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
                            <h3 className="text-xl font-semibold text-white text-center mb-6">
                                Select Your Program
                            </h3>
                            <div className="space-y-3">
                                {PROGRAMS.map((program) => (
                                    <button
                                        key={program.value}
                                        onClick={() => setFormData(prev => ({ ...prev, program: program.value }))}
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${formData.program === program.value
                                            ? 'border-indigo-500 bg-indigo-500/20'
                                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-3xl">{program.icon}</span>
                                            <div>
                                                <div className="font-semibold text-white">{program.label}</div>
                                                <div className="text-sm text-slate-400">{program.description}</div>
                                            </div>
                                            {formData.program === program.value && (
                                                <span className="ml-auto text-indigo-400">✓</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
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
                            <h3 className="text-xl font-semibold text-white text-center mb-6">
                                Select Your Year Level
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {YEAR_LEVELS.map((year) => (
                                    <button
                                        key={year.value}
                                        onClick={() => setFormData(prev => ({ ...prev, year_level: year.value }))}
                                        className={`p-6 rounded-xl border-2 text-center transition-all ${formData.year_level === year.value
                                            ? 'border-indigo-500 bg-indigo-500/20'
                                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                                            }`}
                                    >
                                        <span className="text-4xl block mb-2">{year.icon}</span>
                                        <span className="font-semibold text-white">{year.label}</span>
                                    </button>
                                ))}
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
                            <h3 className="text-xl font-semibold text-white text-center mb-6">
                                Confirm Your Details
                            </h3>
                            <div className="space-y-4 mb-6">
                                <div className="bg-slate-800/50 rounded-xl p-4">
                                    <label className="text-sm text-slate-400 block mb-1">Email</label>
                                    <div className="text-white font-medium">{googleData.email}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4">
                                    <label className="text-sm text-slate-400 block mb-1">Name</label>
                                    <div className="text-white font-medium">
                                        {googleData.first_name} {googleData.last_name}
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4">
                                    <label className="text-sm text-slate-400 block mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                        className="w-full bg-transparent text-white font-medium outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 rounded-xl p-4">
                                        <label className="text-sm text-slate-400 block mb-1">Program</label>
                                        <div className="text-white font-medium">
                                            {PROGRAMS.find(p => p.value === formData.program)?.label}
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4">
                                        <label className="text-sm text-slate-400 block mb-1">Year Level</label>
                                        <div className="text-white font-medium">
                                            {YEAR_LEVELS.find(y => y.value === formData.year_level)?.label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex gap-4 mt-8">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition"
                        >
                            Back
                        </button>
                    )}
                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Creating Account...
                                </span>
                            ) : (
                                '🚀 Create Account'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
