/**
 * Frontend error reporting.
 *
 * Inert unless VITE_SENTRY_DSN is set, so local development and any build
 * without the variable behave exactly as before.
 *
 * This is the half of monitoring that server-side tooling cannot see at all.
 * When a render throws, the server returns 200 for every asset and logs
 * nothing — the user just gets a blank page. That has already happened here
 * once (a bundle-ordering bug), and the only reason it was found was someone
 * reporting it. ErrorBoundary now keeps the app alive; this makes sure we
 * hear about it too.
 */
import * as Sentry from '@sentry/react'

export function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN
    if (!dsn) return

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_SENTRY_RELEASE || undefined,

        // Sample rather than capture everything — the free tier is 5k events a
        // month and this app polls chat every 3 seconds per open tab.
        tracesSampleRate: 0.05,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,

        // Student code, chat messages and auth payloads pass through this app.
        // None of it belongs in a third-party error tracker.
        sendDefaultPii: false,

        ignoreErrors: [
            // Benign, and noisy enough to exhaust the quota on their own.
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
            'Non-Error promise rejection captured',
            /^Network ?Error$/i,
            /Failed to fetch/i,
            /Load failed/i,
        ],

        beforeSend(event) {
            // Extensions inject scripts that throw in the user's page; those
            // are not our bugs and would drown out the real ones.
            const file = event.exception?.values?.[0]?.stacktrace?.frames?.slice(-1)[0]?.filename
            if (file && /^(chrome|moz|safari)-extension:\/\//.test(file)) return null
            return event
        },
    })
}

/** Report an error caught by a boundary, with the component stack attached. */
export function reportBoundaryError(error: Error, componentStack?: string | null) {
    if (!import.meta.env.VITE_SENTRY_DSN) return
    Sentry.withScope(scope => {
        scope.setTag('source', 'react-error-boundary')
        if (componentStack) scope.setContext('react', { componentStack })
        Sentry.captureException(error)
    })
}
