import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Briefcase, Users, User, LogOut, Trophy, ChevronDown, LayoutDashboard, GraduationCap, FolderKanban, MessagesSquare, Medal } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMediaUrl } from '../utils/mediaUrl'
import MobileBottomNav from './MobileBottomNav'
import toast from 'react-hot-toast'

export default function Navbar() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileDropdownRef = useRef<HTMLDivElement>(null)

  // Handle scroll to show/hide header on mobile
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Only apply hide/show on mobile
      if (window.innerWidth >= 768) {
        setHeaderVisible(true)
        return
      }

      // Show header when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
        setHeaderVisible(true)
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setHeaderVisible(false)
        setUserDropdownOpen(false) // Close dropdown when hiding
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isOutsideDesktop = dropdownRef.current && !dropdownRef.current.contains(target)
      const isOutsideMobile = mobileDropdownRef.current && !mobileDropdownRef.current.contains(target)

      // Only close if clicked outside both dropdowns
      if (isOutsideDesktop && isOutsideMobile) {
        setUserDropdownOpen(false)
      }
    }
    // Use 'click' instead of 'mousedown' so button clicks complete before closing
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully!')
    window.location.href = '/'
  }

  // Get profile picture URL using the media URL utility for cloud deployment
  const profilePicture = getMediaUrl(user?.profile_picture)

  // Navigation links with Lucide icons
  const navLinks = [
    { to: '/learning', icon: GraduationCap, label: 'Learn' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/community', icon: MessagesSquare, label: 'Community' },
    { to: '/leaderboard', icon: Medal, label: 'Ranks' },
  ]

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <>
      {/* Top Header - Hides on scroll down, shows on scroll up (mobile only) */}
      <nav className={`
        bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50
        transition-transform duration-300 ease-out
        ${headerVisible ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <Link to="/learning" className="flex items-center space-x-2 flex-shrink-0">
              <img src="/logo/ccis-logo.png" alt="CCIS" className="h-7 w-7 md:h-8 md:w-8" />
              <span className="text-base md:text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                CodeHub
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${isActive(link.to)
                      ? 'text-white bg-purple-600/20 border border-purple-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                      }`}
                  >
                    <Icon size={18} />
                    <span className="hidden lg:inline text-sm font-medium">{link.label}</span>
                  </Link>
                )
              })}

              {/* User Dropdown - Desktop */}
              <div className="relative border-l border-slate-700 pl-3 ml-2" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition px-2 py-1.5 rounded-lg hover:bg-slate-800/50"
                >
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt={user?.username || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover border-2 border-purple-500/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-sm hidden lg:inline">{user?.username || 'User'}</span>
                  <ChevronDown size={14} className={`transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Desktop Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        {profilePicture ? (
                          <img src={profilePicture} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{user?.username}</p>
                          <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="py-2">
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700/50 transition"
                      >
                        <User size={16} />
                        <span>Profile</span>
                      </Link>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false)
                          navigate('/dashboard')
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700/50 transition w-full"
                      >
                        <LayoutDashboard size={16} />
                        <span>Dashboard</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-700 py-2">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false)
                          handleLogout()
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition w-full"
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile User Button */}
            <div className="md:hidden flex items-center gap-2" ref={mobileDropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-1 text-slate-300 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800/50"
              >
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border-2 border-purple-500/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </button>

              {/* Mobile Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-4 top-14 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-3 py-2.5 bg-slate-700/50 border-b border-slate-700">
                    <p className="text-white text-sm font-medium truncate">{user?.username}</p>
                    <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                  </div>

                  <div className="py-1.5">
                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 transition text-sm"
                    >
                      <User size={16} />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false)
                        navigate('/dashboard')
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 transition text-sm w-full"
                    >
                      <LayoutDashboard size={16} />
                      <span>Dashboard</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-700 py-1.5">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false)
                        handleLogout()
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition w-full text-sm"
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Navigation */}
      <MobileBottomNav />
    </>
  )
}
