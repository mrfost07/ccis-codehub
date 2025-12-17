/**
 * Utility to get the correct media URL based on environment
 */

// Get the API base URL from environment or fallback
const getApiBaseUrl = (): string => {
    // Use VITE_API_URL if available, otherwise fallback
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // In production, use the current origin
    if (import.meta.env.PROD) {
        return window.location.origin;
    }
    // Development fallback
    return 'http://localhost:8000';
};

/**
 * Get the full URL for a media file (profile pictures, etc.)
 * Handles both absolute URLs and relative paths
 */
export const getMediaUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;

    // If already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        // Replace localhost/127.0.0.1 URLs with production URL in production
        if (import.meta.env.PROD) {
            if (path.includes('localhost:8000')) {
                return path.replace('http://localhost:8000', getApiBaseUrl());
            }
            if (path.includes('127.0.0.1:8000')) {
                return path.replace('http://127.0.0.1:8000', getApiBaseUrl());
            }
        }
        return path;
    }

    // Relative path - prepend the API base URL
    return `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
};

/**
 * Get profile picture URL - convenience wrapper
 */
export const getProfilePictureUrl = (profilePicture: string | null | undefined): string | null => {
    return getMediaUrl(profilePicture);
};

export default getMediaUrl;
