/**
 * OAuth Callback Page
 * Handles the redirect from Google OAuth with mode support
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAuthData } = useAuth();
    const [status, setStatus] = useState<'processing' | 'error' | 'existing_user'>('processing');
    const [error, setError] = useState('');
    const [existingEmail, setExistingEmail] = useState('');

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // Contains mode (login/signup)
        const errorParam = searchParams.get('error');

        if (errorParam) {
            setStatus('error');
            setError(errorParam);
            toast.error(`Authentication failed: ${errorParam}`);
            return;
        }

        if (!code) {
            setStatus('error');
            setError('No authorization code received');
            toast.error('Authentication failed: No code received');
            return;
        }

        // Parse mode from state parameter (default to 'login')
        let mode = 'login';
        try {
            if (state) {
                const stateData = JSON.parse(atob(state));
                mode = stateData.mode || 'login';
            }
        } catch {
            // If state parsing fails, default to login
        }

        try {
            // Exchange code for user info via backend with mode
            const response = await api.post('/auth/google/callback/', {
                code,
                redirect_uri: `${window.location.origin}/auth/callback`,
                mode,
            });

            const data = response.data;

            // ========== SIGNUP MODE RESPONSES ==========
            if (mode === 'signup') {
                if (data.is_existing_user) {
                    // User already exists - show warning
                    setStatus('existing_user');
                    setExistingEmail(data.email);
                    toast.error('Account already exists');
                    return;
                }

                if (data.is_new_user && data.google_data) {
                    // New user - redirect to profile completion wizard
                    localStorage.setItem('google_signup_data', JSON.stringify(data.google_data));
                    toast.success('Google connected! Complete your profile to continue.');
                    navigate('/complete-profile', {
                        state: { googleData: data.google_data },
                        replace: true
                    });
                    return;
                }
            }

            // ========== LOGIN MODE RESPONSES ==========
            if (data.is_existing_user && data.tokens) {
                // Existing user logging in - use full page redirect to ensure storage is synced
                setAuthData(data.tokens.access, data.user);
                toast.success(`Welcome back, ${data.user.first_name || data.user.username}!`);
                // Use window.location for OAuth to ensure fresh page load with auth tokens
                window.location.href = '/dashboard';
                return;
            }

            if (data.is_new_user) {
                // New user trying to login - redirect to signup
                setStatus('error');
                setError('No account found. Please sign up first.');
                return;
            }

            // Fallback for legacy responses
            if (data.tokens && data.user) {
                setAuthData(data.tokens.access, data.user);
                toast.success(`Welcome, ${data.user.first_name || data.user.username}!`);
                // Use window.location for OAuth to ensure fresh page load with auth tokens
                window.location.href = '/dashboard';
            }

        } catch (err: any) {
            console.error('OAuth callback error:', err);
            setStatus('error');
            const errorMsg = err.response?.data?.error || err.message || 'Authentication failed';
            setError(errorMsg);
            toast.error(errorMsg);
        }
    };

    // Processing state
    if (status === 'processing') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-white mb-2">Signing you in...</h2>
                    <p className="text-slate-400">Please wait while we complete authentication</p>
                </div>
            </div>
        );
    }

    // Existing user warning (during signup attempt)
    if (status === 'existing_user') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900/50 backdrop-blur-sm border border-yellow-500/50 rounded-xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Account Already Exists</h2>
                    <p className="text-slate-400 mb-2">An account with this email already exists:</p>
                    <p className="text-indigo-400 font-medium mb-6">{existingEmail}</p>
                    <p className="text-slate-400 mb-6">Please login instead to access your account.</p>
                    <div className="space-y-3">
                        <Link
                            to="/login"
                            className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition text-center"
                        >
                            Go to Login
                        </Link>
                        <Link
                            to="/"
                            className="block w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition text-center"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900/50 backdrop-blur-sm border border-red-500/50 rounded-xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Authentication Failed</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <div className="space-y-3">
                        <Link
                            to="/login"
                            className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition text-center"
                        >
                            Back to Login
                        </Link>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
