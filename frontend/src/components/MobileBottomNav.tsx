/**
 * Mobile Bottom Navigation
 * 
 * A clean bottom tab bar for mobile navigation with subtle highlight on active tab
 * Only visible on mobile/tablet screens
 */

import { Link, useLocation } from 'react-router-dom'
import { GraduationCap, FolderKanban, MessagesSquare, Medal } from 'lucide-react'

interface NavItem {
    to: string
    icon: React.ElementType
    label: string
}

export default function MobileBottomNav() {
    const location = useLocation()

    const navItems: NavItem[] = [
        { to: '/learning', icon: GraduationCap, label: 'Learn' },
        { to: '/projects', icon: FolderKanban, label: 'Projects' },
        { to: '/community', icon: MessagesSquare, label: 'Community' },
        { to: '/leaderboard', icon: Medal, label: 'Ranks' },
    ]

    const isActive = (path: string) => {
        return location.pathname.startsWith(path)
    }

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-slate-900 border-t border-slate-800"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex items-center justify-around h-14 px-1">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.to)

                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`
                                relative flex flex-col items-center justify-center
                                flex-1 h-full py-1.5 mx-1 rounded-lg
                                transition-all duration-200 ease-out
                                ${active
                                    ? 'text-white bg-purple-600/20'
                                    : 'text-slate-500 active:bg-slate-800/50'
                                }
                            `}
                        >
                            <Icon
                                size={20}
                                className={`
                                    transition-all duration-200
                                    ${active ? 'stroke-[2]' : 'stroke-[1.5]'}
                                `}
                            />

                            <span className={`
                                text-[10px] font-medium mt-0.5
                                transition-opacity duration-200
                                ${active ? 'opacity-100' : 'opacity-60'}
                            `}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
