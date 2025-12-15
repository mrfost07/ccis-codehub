/**
 * OAuth Callback Page
 * Handles the redirect from Google OAuth
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setAuthData } = useAuth();
    const [status, setStatus] = useState<'processing' | 'error'>('processing');
    const [error, setError] = useState('');

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        const code = searchParams.get('code');
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

        try {
            // Exchange code for user info via backend
            const response = await api.post('/auth/google/callback/', {
                code,
                redirect_uri: `${window.location.origin}/auth/callback`,
            });

            const { user, tokens, needs_profile_completion } = response.data;

            if (needs_profile_completion) {
                // User signed up with Google but needs to complete profile
                localStorage.setItem('google_signup_data', JSON.stringify({ user, tokens }));
                navigate('/complete-profile', { state: { googleUser: user } });
            } else {
                // User exists and profile is complete - log them in
                setAuthData(tokens.access, user);
                toast.success(`Welcome back, ${user.first_name || user.username}!`);
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error('OAuth callback error:', err);
            setStatus('error');
            const errorMsg = err.response?.data?.error || err.message || 'Authentication failed';
            setError(errorMsg);
            toast.error(errorMsg);
        }
    };

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
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
                        >
                            Back to Login
                        </button>
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
