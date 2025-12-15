/**
 * Neon Auth Google OAuth Service
 * Handles Google sign-in flow with Neon Auth
 */

// Neon Auth configuration
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL ||
    'https://ep-green-mountain-ah59xuac.neonauth.c-3.us-east-1.aws.neon.tech/neondb/auth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '1018587300192-m0n93uesm6v33bahs57tatg52v3lurah.apps.googleusercontent.com';

// Get the current origin for redirect
const getRedirectUri = () => {
    return `${window.location.origin}/auth/callback`;
};

/**
 * Initiates Google OAuth flow via Neon Auth
 * @param mode - 'login' or 'register'
 */
export const initiateGoogleAuth = (mode: 'login' | 'register' = 'login') => {
    // Store the mode for callback handling
    localStorage.setItem('oauth_mode', mode);

    // Construct the Google OAuth URL through Neon Auth
    const authUrl = new URL(`${NEON_AUTH_URL}/authorize`);
    authUrl.searchParams.set('provider', 'google');
    authUrl.searchParams.set('redirect_uri', getRedirectUri());
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', generateState());

    // Redirect to Google OAuth
    window.location.href = authUrl.toString();
};

/**
 * Generate a random state for CSRF protection
 */
const generateState = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('oauth_state', state);
    return state;
};

/**
 * Handle the OAuth callback
 * @param code - Authorization code from OAuth provider
 * @param state - State parameter for CSRF validation
 */
export const handleOAuthCallback = async (code: string, state: string) => {
    // Validate state
    const savedState = localStorage.getItem('oauth_state');
    if (state !== savedState) {
        throw new Error('Invalid OAuth state - possible CSRF attack');
    }

    // Clear stored state
    localStorage.removeItem('oauth_state');

    // Exchange code for tokens with backend
    const response = await fetch('/api/auth/google/callback/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            code,
            redirect_uri: getRedirectUri(),
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'OAuth authentication failed');
    }

    return response.json();
};

/**
 * Check if user needs to complete profile after Google signup
 */
export const needsProfileCompletion = (userData: any) => {
    // User needs to complete profile if missing required fields
    return !userData.first_name || !userData.last_name || !userData.program;
};

export default {
    initiateGoogleAuth,
    handleOAuthCallback,
    needsProfileCompletion,
    NEON_AUTH_URL,
    GOOGLE_CLIENT_ID,
};
