import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, BarChart, Search, Filter } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../services/api'

interface Path {
  id: string
  name: string
  slug: string
  description: string
  program: string
  difficulty_level: string
  is_active: boolean
  modules_count: number
  enrollments_count: number
  created_at: string
}

export default function AdminPathManagement() {
  const [paths, setPaths] = useState<Path[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchPaths()
  }, [programFilter, difficultyFilter])

  const fetchPaths = async () => {
    try {
      const params = new URLSearchParams()
      if (programFilter) params.append('program', programFilter)
      if (difficultyFilter) params.append('difficulty', difficultyFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await api.get(`/admin/paths/?${params}`)
      setPaths(response.data)
    } catch (error) {
      console.error('Failed to fetch paths:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchPaths()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this path?')) return

    try {
      await api.delete(`/admin/paths/${id}/`)
      setPaths(paths.filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete path:', error)
      alert('Failed to delete path')
    }
  }

  const togglePublish = async (path: Path) => {
    try {
      await api.post(`/admin/paths/${path.id}/publish/`, {
        is_active: !path.is_active
      })
      setPaths(paths.map(p => 
        p.id === path.id ? { ...p, is_active: !p.is_active } : p
      ))
    } catch (error) {
      console.error('Failed to toggle publish:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin text-4xl sm:text-6xl">⏳</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Career Paths</h1>
            <p className="text-sm sm:text-base text-slate-400">Manage learning paths and modules</p>
          </div>
          <Link
            to="/admin/paths/new"
            className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Plus size={20} />
            <span>Create Path</span>
          </Link>
        </div>

        {/* Search and Filters - Responsive */}
        <div className="bg-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 border border-slate-800">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search paths..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 sm:py-3 text-sm sm:text-base bg-slate-800 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2"
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>
            <button
              onClick={handleSearch}
              className="px-4 py-2 sm:py-3 text-sm sm:text-base bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              Search
            </button>
          </div>

          {/* Filter Options - Collapsible on Mobile */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 pt-4 border-t border-slate-800">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Program</label>
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Programs</option>
                  <option value="BSIT">BS Information Technology</option>
                  <option value="BSCS">BS Computer Science</option>
                  <option value="BSIS">BS Information Systems</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Difficulty</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setProgramFilter('')
                    setDifficultyFilter('')
                    setSearchTerm('')
                  }}
                  className="w-full px-4 py-2 text-sm sm:text-base bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Paths Grid - Responsive */}
        {paths.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <p className="text-lg sm:text-xl text-slate-400">No paths found</p>
            <Link
              to="/admin/paths/new"
              className="inline-block mt-4 px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              Create Your First Path
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {paths.map((path) => (
              <PathCard
                key={path.id}
                path={path}
                onDelete={handleDelete}
                onTogglePublish={togglePublish}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PathCard({ path, onDelete, onTogglePublish }: any) {
  return (
    <div className="bg-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-800 hover:border-slate-700 transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-1 truncate">
            {path.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full">
              {path.program}
            </span>
            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full">
              {path.difficulty_level}
            </span>
            <span className={`px-2 py-1 rounded-full ${
              path.is_active 
                ? 'bg-green-600/20 text-green-400' 
                : 'bg-gray-600/20 text-gray-400'
            }`}>
              {path.is_active ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm sm:text-base text-slate-400 mb-4 line-clamp-2">
        {path.description}
      </p>

      {/* Stats - Responsive */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 pb-4 border-b border-slate-800">
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-bold text-white">{path.modules_count}</p>
          <p className="text-xs sm:text-sm text-slate-400">Modules</p>
        </div>
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-bold text-white">{path.enrollments_count}</p>
          <p className="text-xs sm:text-sm text-slate-400">Enrollments</p>
        </div>
      </div>

      {/* Actions - Responsive */}
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/admin/paths/${path.id}`}
          className="flex-1 min-w-[120px] px-3 py-2 text-sm sm:text-base bg-slate-800 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2"
        >
          <Eye size={16} />
          <span className="hidden sm:inline">View</span>
        </Link>
        <Link
          to={`/admin/paths/${path.id}/edit`}
          className="flex-1 min-w-[120px] px-3 py-2 text-sm sm:text-base bg-slate-800 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2"
        >
          <Edit size={16} />
          <span className="hidden sm:inline">Edit</span>
        </Link>
        <Link
          to={`/admin/paths/${path.id}/analytics`}
          className="flex-1 min-w-[120px] px-3 py-2 text-sm sm:text-base bg-slate-800 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2"
        >
          <BarChart size={16} />
          <span className="hidden sm:inline">Analytics</span>
        </Link>
        <button
          onClick={() => onTogglePublish(path)}
          className="flex-1 min-w-[120px] px-3 py-2 text-sm sm:text-base bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
        >
          {path.is_active ? 'Unpublish' : 'Publish'}
        </button>
        <button
          onClick={() => onDelete(path.id)}
          className="px-3 py-2 text-sm sm:text-base bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition flex items-center gap-2"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
