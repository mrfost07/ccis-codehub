/**
 * DashboardLayout - Reusable layout wrapper with collapsible sidenav
 * 
 * Features:
 * - Desktop: Fixed sidenav (240px) + content area
 * - Tablet: Collapsed icons only (64px)
 * - Mobile: Hidden by default, overlay on toggle
 * - Dark glass UI with purple accent color
 */

import { useState, useEffect, ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Menu, X, Home, ChevronLeft, ChevronRight, LogOut, User,
    Settings, Bell, ArrowLeft
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export interface SidenavItem {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: number
}

interface DashboardLayoutProps {
    children: ReactNode
    title: string
    subtitle?: string
    sidenavItems: SidenavItem[]
    activeItem: string
    onItemClick: (id: string) => void
    headerActions?: ReactNode
}

export default function DashboardLayout({
    children,
    title,
    subtitle,
    sidenavItems,
    activeItem,
    onItemClick,
    headerActions,
}: DashboardLayoutProps) {
    const [sidenavOpen, setSidenavOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    // Responsive: Collapse on tablet, hide on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setSidenavOpen(false)
            } else if (window.innerWidth < 1024) {
                setIsCollapsed(true)
            } else {
                setIsCollapsed(false)
            }
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleLogout = () => {
        logout()
        toast.success('Logged out successfully!')
        window.location.href = '/'
    }

    const handleItemClick = (id: string) => {
        onItemClick(id)
        // Close mobile sidenav after selection
        if (window.innerWidth < 768) {
            setSidenavOpen(false)
        }
    }

    const sidenavWidth = isCollapsed ? 'w-16' : 'w-60'

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Mobile Overlay */}
            {sidenavOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidenavOpen(false)}
                />
            )}

            {/* Sidenav */}
            <aside
                className={`
          fixed md:sticky top-0 left-0 h-screen z-50
          ${sidenavWidth}
          ${sidenavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          transition-all duration-300 ease-in-out
          bg-slate-900/95 backdrop-blur-xl
          border-r border-slate-700/50
          flex flex-col
        `}
            >
                {/* Logo & Collapse Toggle */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                    {!isCollapsed && (
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <img src="/logo/ccis-logo.png" alt="CCIS" className="h-8 w-8" />
                            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                                CodeHub
                            </span>
                        </Link>
                    )}
                    {isCollapsed && (
                        <Link to="/dashboard" className="mx-auto">
                            <img src="/logo/ccis-logo.png" alt="CCIS" className="h-8 w-8" />
                        </Link>
                    )}

                    {/* Collapse button (desktop only) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>

                    {/* Close button (mobile only) */}
                    <button
                        onClick={() => setSidenavOpen(false)}
                        className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                    {sidenavItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeItem === item.id

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item.id)}
                                className={`
                  w-full flex items-center gap-3
                  ${isCollapsed ? 'justify-center px-2' : 'px-3'}
                  py-2.5 rounded-xl
                  transition-all duration-200
                  ${isActive
                                        ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-white border border-purple-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                    }
                `}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-purple-400' : ''}`} />
                                {!isCollapsed && (
                                    <span className="text-sm font-medium truncate">{item.label}</span>
                                )}
                                {!isCollapsed && item.badge && item.badge > 0 && (
                                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full">
                                        {item.badge}
                                    </span>
                                )}
                                {isCollapsed && item.badge && item.badge > 0 && (
                                    <span className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full" />
                                )}
                            </button>
                        )
                    })}
                </nav>

                {/* Back to CodeHub */}
                <div className="p-3 border-t border-slate-700/50">
                    <button
                        onClick={() => navigate('/learning')}
                        className={`
              w-full flex items-center gap-3
              ${isCollapsed ? 'justify-center px-2' : 'px-3'}
              py-2.5 rounded-xl
              text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition
            `}
                        title={isCollapsed ? 'Back to CodeHub' : undefined}
                    >
                        <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">Back to CodeHub</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 flex flex-col">
                {/* Header Bar - Minimal */}
                <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
                    <div className="flex items-center justify-between h-14 px-4 md:px-6">
                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setSidenavOpen(true)}
                            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
                        >
                            <Menu size={24} />
                        </button>

                        {/* Title */}
                        <div className="flex-1 min-w-0 ml-3 md:ml-0">
                            <h1 className="text-lg md:text-xl font-bold text-white truncate">{title}</h1>
                            {subtitle && (
                                <p className="text-xs text-slate-400 truncate hidden sm:block">{subtitle}</p>
                            )}
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center gap-2">
                            {headerActions}

                            {/* Quick Links - Desktop Only */}
                            <div className="hidden lg:flex items-center gap-1 border-l border-slate-700/50 pl-3 ml-2">
                                <Link
                                    to="/learning"
                                    className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition"
                                >
                                    📚 Learning
                                </Link>
                                <Link
                                    to="/projects"
                                    className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition"
                                >
                                    💻 Projects
                                </Link>
                                <Link
                                    to="/community"
                                    className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition"
                                >
                                    👥 Community
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
