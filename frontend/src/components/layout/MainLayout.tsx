/**
 * Main Layout
 * 
 * Layout wrapper for authenticated pages that includes:
 * - Navbar (which itself renders the mobile bottom dock)
 * - Content area
 */

import Navbar from '../Navbar'
import { useAuth } from '../../contexts/AuthContext'

interface MainLayoutProps {
    children: React.ReactNode
    hideNav?: boolean
}

export default function MainLayout({ children, hideNav = false }: MainLayoutProps) {
    const { user } = useAuth()

    // Don't show navbars if not logged in or if explicitly hidden
    if (!user || hideNav) {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Top Navbar - always visible */}
            <Navbar />

            {/* Main content — bottom spacing for the mobile dock comes from the
                `has-mobile-nav` body class that MobileBottomNav sets. */}
            <main className="flex-1">
                {children}
            </main>
        </div>
    )
}
