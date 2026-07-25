/**
 * Mobile Bottom Navigation
 *
 * A floating glass dock for mobile navigation (Learn / Projects / Community / Ranks).
 * Only visible below the `md` breakpoint.
 *
 * While mounted it adds `has-mobile-nav` to <body>, which applies the bottom
 * padding defined in index.css — so page content is never hidden behind the
 * dock and individual pages don't each have to remember to pad themselves.
 */

import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GraduationCap, FolderKanban, MessagesSquare, Medal } from 'lucide-react'

interface NavItem {
    to: string
    icon: React.ElementType
    label: string
}

const NAV_ITEMS: NavItem[] = [
    { to: '/learning', icon: GraduationCap, label: 'Learn' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/community', icon: MessagesSquare, label: 'Community' },
    { to: '/leaderboard', icon: Medal, label: 'Ranks' },
]

export default function MobileBottomNav() {
    const { pathname } = useLocation()

    // Reserve space at the bottom of the page for the dock.
    useEffect(() => {
        document.body.classList.add('has-mobile-nav')
        return () => document.body.classList.remove('has-mobile-nav')
    }, [])

    // Match the segment exactly (or a child route) so `/learning` doesn't
    // stay highlighted on `/learning-admin`.
    const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

    return (
        <nav
            aria-label="Primary"
            className="md:hidden fixed inset-x-0 bottom-0 z-[60] pointer-events-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="pointer-events-auto mx-3 mb-3 rounded-2xl border border-white/10 bg-neutral-900/90 backdrop-blur-xl shadow-2xl shadow-black/60">
                <ul className="grid grid-cols-4">
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                        const active = isActive(to)
                        return (
                            <li key={to}>
                                <Link
                                    to={to}
                                    aria-current={active ? 'page' : undefined}
                                    className="relative flex h-16 flex-col items-center justify-center gap-1 rounded-2xl transition-transform duration-150 active:scale-95"
                                >
                                    {/* Active marker */}
                                    <span
                                        className={`absolute top-0 h-0.5 w-8 rounded-full bg-purple-400 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    <span
                                        className={`grid h-9 w-9 place-items-center rounded-xl transition-colors duration-200 ${active ? 'bg-purple-500/15' : 'bg-transparent'}`}
                                    >
                                        <Icon
                                            size={20}
                                            strokeWidth={active ? 2.2 : 1.7}
                                            className={`transition-colors duration-200 ${active ? 'text-purple-300' : 'text-neutral-400'}`}
                                        />
                                    </span>
                                    <span
                                        className={`text-[10px] leading-none transition-colors duration-200 ${active ? 'font-semibold text-purple-300' : 'text-neutral-500'}`}
                                    >
                                        {label}
                                    </span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </nav>
    )
}
