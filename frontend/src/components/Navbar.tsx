import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Home, BookOpen, Briefcase, Users, User, LogOut, Award, Trophy } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully!')
    // Use window.location for a clean page load with fresh React state
    window.location.href = '/'
  }

  const navLinks = [
    { to: '/learning', icon: BookOpen, label: 'Learning', emoji: '📚' },
    { to: '/projects', icon: Briefcase, label: 'Projects', emoji: '💻' },
    { to: '/community', icon: Users, label: 'Community', emoji: '👥' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard', emoji: '🏆' },
  ]

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2 flex-shrink-0">
            <img src="/logo/ccis-logo.png" alt="CCIS" className="h-8 w-8" />
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent hidden sm:inline">
              CCIS CodeHub
            </span>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent sm:hidden">
              CodeHub
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-slate-300 hover:text-white transition flex items-center space-x-1"
              >
                <span>{link.emoji}</span>
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            ))}

            <div className="border-l border-slate-700 pl-6 flex items-center space-x-4">
              <Link to="/profile" className="text-sm text-slate-400 hover:text-white flex items-center space-x-1">
                <User size={16} />
                <span className="hidden lg:inline">{user?.username || 'User'}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-red-400 hover:text-red-300 flex items-center space-x-1"
              >
                <LogOut size={16} />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700">
          <div className="px-4 py-3 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 text-slate-300 hover:text-white transition py-2"
              >
                <span className="text-xl">{link.emoji}</span>
                <span>{link.label}</span>
              </Link>
            ))}

            <div className="border-t border-slate-700 pt-3 space-y-3">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 text-slate-300 hover:text-white transition py-2"
              >
                <User size={20} />
                <span>{user?.username || 'User'}</span>
              </Link>
              <button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className="flex items-center space-x-3 text-red-400 hover:text-red-300 transition py-2 w-full"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
