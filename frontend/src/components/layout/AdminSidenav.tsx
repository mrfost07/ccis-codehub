/**
 * AdminSidenav - Standalone sidenav component for Admin Dashboard
 * 
 * This component provides a collapsible sidenav with dark glass UI styling.
 * It works alongside the existing AdminDashboard tabs without modifying
 * the complex internal structure.
 */

import { useState, useEffect, ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    LayoutDashboard, Users, BookOpen, Briefcase, FileText,
    BarChart3, Settings, Shield, ChevronLeft, ChevronRight,
    Menu, X, LogOut, User, ArrowLeft
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export interface AdminSidenavItem {
    id: string
    label: string
    icon: React.ElementType
}

interface AdminSidenavProps {
    activeTab: string
    onTabChange: (tabId: string) => void
    children: ReactNode
}

const sidenavItems: AdminSidenavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'learning', label: 'Learning Admin', icon: BookOpen },
    { id: 'projects', label: 'Project Admin', icon: Briefcase },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'content', label: 'Content Moderation', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: Settings }
]

export default function AdminSidenav({ activeTab, onTabChange, children }: AdminSidenavProps) {
    const [sidenavOpen, setSidenavOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    // Responsive behavior
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidenavOpen(false)
            }
            if (window.innerWidth < 1280 && window.innerWidth >= 1024) {
                setIsCollapsed(true)
            } else if (window.innerWidth >= 1280) {
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
        onTabChange(id)
        if (window.innerWidth < 1024) {
            setSidenavOpen(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Mobile Overlay */}
            {sidenavOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidenavOpen(false)}
                />
            )}

            {/* Sidenav */}
            <aside
                className={`
          fixed lg:sticky top-0 left-0 h-screen z-50
          ${isCollapsed ? 'w-16' : 'w-60'}
          ${sidenavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-all duration-300 ease-in-out
          bg-slate-900/95 backdrop-blur-xl
          border-r border-slate-700/50
          flex flex-col
        `}
            >
                {/* Logo & Toggle */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                    {!isCollapsed ? (
                        <div className="flex items-center gap-3">
                            <img src="/logo/ccis-logo.png" alt="CCIS" className="h-9 w-9" />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent leading-tight">
                                    CCIS CodeHub
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                    Admin
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto">
                            <img src="/logo/ccis-logo.png" alt="CCIS" className="h-8 w-8" />
                        </div>
                    )}

                    {/* Desktop collapse button */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>

                    {/* Mobile close button */}
                    <button
                        onClick={() => setSidenavOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                    {sidenavItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.id

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
                            </button>
                        )
                    })}
                </nav>

                {/* Quick Links */}
                <div className="px-2 py-3 border-t border-slate-700/50">
                    <Link
                        to="/learning"
                        className={`
              w-full flex items-center gap-3
              ${isCollapsed ? 'justify-center px-2' : 'px-3'}
              py-2.5 rounded-xl
              text-slate-400 hover:text-white hover:bg-slate-800/50 transition
            `}
                        title={isCollapsed ? 'Back to CodeHub' : undefined}
                    >
                        <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm">Back to CodeHub</span>}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 flex flex-col">
                {/* Top Header */}
                <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
                    <div className="flex items-center justify-between h-14 px-4 md:px-6">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setSidenavOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
                        >
                            <Menu size={24} />
                        </button>

                        <div className="flex-1 min-w-0 ml-3 lg:ml-0">
                            <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-purple-400 hidden sm:block" />
                                Admin Dashboard
                            </h1>
                        </div>

                        {/* Quick links */}
                        <div className="hidden md:flex items-center gap-2 border-l border-slate-700/50 pl-3 ml-2">
                            <Link to="/learning" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition">
                                📚 Learning
                            </Link>
                            <Link to="/projects" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition">
                                💻 Projects
                            </Link>
                            <Link to="/community" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition">
                                👥 Community
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 md:p-6 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
