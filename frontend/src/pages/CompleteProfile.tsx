/**
 * Complete Profile Page
 * For users who signed up with Google and need to fill in additional details
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const PROGRAMS = [
    { value: 'BSCS', label: 'BS Computer Science' },
    { value: 'BSIT', label: 'BS Information Technology' },
    { value: 'BSIS', label: 'BS Information Systems' },
];

const YEAR_LEVELS = [
    { value: '1', label: '1st Year' },
    { value: '2', label: '2nd Year' },
    { value: '3', label: '3rd Year' },
    { value: '4', label: '4th Year' },
];

export default function CompleteProfile() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setAuthData } = useAuth();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        username: '',
        program: '',
        year_level: '',
    });

    useEffect(() => {
        // Get Google user data from location state or localStorage
        const googleUser = location.state?.googleUser;
        const storedData = localStorage.getItem('google_signup_data');

        if (googleUser) {
            setFormData(prev => ({
                ...prev,
                first_name: googleUser.first_name || '',
                last_name: googleUser.last_name || '',
                username: googleUser.username || googleUser.email?.split('@')[0] || '',
            }));
        } else if (storedData) {
            const { user } = JSON.parse(storedData);
            setFormData(prev => ({
                ...prev,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                username: user.username || user.email?.split('@')[0] || '',
            }));
        } else {
            // No Google data, redirect to register
            navigate('/register');
        }
    }, [location.state, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get stored Google signup data
            const storedData = localStorage.getItem('google_signup_data');
            if (!storedData) {
                throw new Error('Session expired. Please sign up again.');
            }

            const { tokens } = JSON.parse(storedData);

            // Update user profile with the form data
            const response = await api.post('/auth/google/complete-profile/', {
                ...formData,
                access_token: tokens.access,
            });

            // Store tokens and user data
            localStorage.removeItem('google_signup_data');
            setAuthData(tokens.access, response.data.user);

            toast.success('Profile completed! Welcome to CCIS CodeHub!');
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Profile completion error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to complete profile';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 sm:p-8 w-full max-w-md">
                <div className="flex flex-col items-center justify-center mb-6">
                    <img src="/logo/ccis-logo.svg" alt="CCIS CodeHub" className="h-16 w-16 mb-3" />
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                        CCIS CodeHub
                    </span>
                </div>

                <h2 className="text-2xl font-bold text-center mb-2">Complete Your Profile</h2>
                <p className="text-slate-400 text-center mb-6">
                    Just a few more details to get you started
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Program</label>
                        <select
                            name="program"
                            value={formData.program}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                            required
                        >
                            <option value="">Select your program</option>
                            {PROGRAMS.map(prog => (
                                <option key={prog.value} value={prog.value}>{prog.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Year Level</label>
                        <select
                            name="year_level"
                            value={formData.year_level}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                            required
                        >
                            <option value="">Select your year</option>
                            {YEAR_LEVELS.map(year => (
                                <option key={year.value} value={year.value}>{year.label}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-lg font-semibold hover:from-indigo-700 hover:to-pink-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Completing...' : 'Complete Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
}
