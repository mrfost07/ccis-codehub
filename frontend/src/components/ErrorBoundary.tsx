/**
 * ErrorBoundary
 *
 * React unmounts the whole tree when a render throws, so without a boundary a
 * single bad component renders a blank white page for the entire platform —
 * exactly what a bundle-ordering bug produced in production once already.
 *
 * This catches the error, keeps the app shell alive, and gives the user a way
 * out instead of a dead screen.
 */
import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
    children: ReactNode
    /** Shown instead of the default panel, if supplied. */
    fallback?: ReactNode
    /** Remounts the boundary when this value changes (e.g. the route path). */
    resetKey?: string
}

interface State {
    error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null }

    static getDerivedStateFromError(error: Error): State {
        return { error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Keep this in the console — the server never sees client render errors,
        // so this is the only record of what actually broke.
        console.error('[ErrorBoundary]', error, info.componentStack)
    }

    componentDidUpdate(prev: Props) {
        // Navigating away should clear a previous page's error, otherwise the
        // user stays stuck on the fallback for the rest of the session.
        if (this.state.error && prev.resetKey !== this.props.resetKey) {
            this.setState({ error: null })
        }
    }

    render() {
        const { error } = this.state
        if (!error) return this.props.children
        if (this.props.fallback) return this.props.fallback

        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
                <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                        <AlertTriangle className="h-7 w-7 text-amber-400" />
                    </div>

                    <h1 className="text-xl font-bold tracking-tight text-white">Something went wrong</h1>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                        This page hit an unexpected error. The rest of the app is still fine —
                        try reloading, or head back to your dashboard.
                    </p>

                    {import.meta.env.DEV && (
                        <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-neutral-950 p-3 text-left text-[11px] text-red-300">
                            {error.message}
                        </pre>
                    )}

                    <div className="mt-6 space-y-2">
                        <button
                            onClick={() => window.location.reload()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Reload page
                        </button>
                        <a
                            href="/"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
                        >
                            <Home className="h-4 w-4" />
                            Go home
                        </a>
                    </div>
                </div>
            </div>
        )
    }
}
