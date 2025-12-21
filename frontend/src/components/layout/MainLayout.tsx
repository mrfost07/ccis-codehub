/**
 * Main Layout
 * 
 * Layout wrapper for authenticated pages that includes:
 * - Navbar (top, hidden on mobile)
 * - MobileBottomNav (bottom, mobile only)
 * - Content area with proper padding for both navs
 */

import Navbar from '../Navbar'
import MobileBottomNav from '../MobileBottomNav'
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

            {/* Main content - with padding for mobile bottom nav */}
            <main className="flex-1 pb-16 md:pb-0">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    )
}
