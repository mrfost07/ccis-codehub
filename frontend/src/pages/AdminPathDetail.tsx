import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Plus, GripVertical, Trash2, Eye } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../services/api'

interface Module {
  id: string
  title: string
  description: string
  module_type: string
  difficulty_level: string
  duration_minutes: number
  order: number
  is_locked: boolean
}

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
}

export default function AdminPathDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [path, setPath] = useState<Path | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchPathDetails()
  }, [id])

  const fetchPathDetails = async () => {
    try {
      const [pathRes, modulesRes] = await Promise.all([
        api.get(`/admin/paths/${id}/`),
        api.get(`/admin/paths/${id}/modules/`)
      ])
      setPath(pathRes.data)
      setModules(modulesRes.data)
    } catch (error) {
      console.error('Failed to fetch path details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newModules = [...modules]
    const draggedModule = newModules[draggedIndex]
    newModules.splice(draggedIndex, 1)
    newModules.splice(index, 0, draggedModule)

    setModules(newModules)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    const moduleIds = modules.map(m => m.id)
    try {
      await api.post(`/admin/paths/${id}/reorder_modules/`, {
        module_ids: moduleIds
      })
    } catch (error) {
      console.error('Failed to reorder modules:', error)
      fetchPathDetails() // Reload on error
    }
    setDraggedIndex(null)
  }

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return

    try {
      await api.delete(`/admin/modules/${moduleId}/`)
      setModules(modules.filter(m => m.id !== moduleId))
    } catch (error) {
      console.error('Failed to delete module:', error)
      alert('Failed to delete module')
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

  if (!path) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-xl text-slate-400">Path not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Back Button - Responsive */}
        <Link
          to="/admin/paths"
          className="inline-flex items-center gap-2 text-sm sm:text-base text-slate-400 hover:text-white mb-4 sm:mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Paths</span>
        </Link>

        {/* Path Header - Responsive */}
        <div className="bg-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8 mb-6 border border-slate-800">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">{path.name}</h1>
              <p className="text-sm sm:text-base text-slate-400 mb-4">{path.description}</p>
              
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 text-xs sm:text-sm bg-blue-600/20 text-blue-400 rounded-full">
                  {path.program}
                </span>
                <span className="px-3 py-1 text-xs sm:text-sm bg-purple-600/20 text-purple-400 rounded-full">
                  {path.difficulty_level}
                </span>
                <span className={`px-3 py-1 text-xs sm:text-sm rounded-full ${
                  path.is_active 
                    ? 'bg-green-600/20 text-green-400' 
                    : 'bg-gray-600/20 text-gray-400'
                }`}>
                  {path.is_active ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
              <Link
                to={`/admin/paths/${id}/edit`}
                className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-slate-800 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2"
              >
                <Edit size={18} />
                <span>Edit Path</span>
              </Link>
              <Link
                to={`/admin/paths/${id}/analytics`}
                className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-indigo-600 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <Eye size={18} />
                <span>Analytics</span>
              </Link>
            </div>
          </div>

          {/* Stats - Responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 pt-6 border-t border-slate-800">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">{modules.length}</p>
              <p className="text-xs sm:text-sm text-slate-400">Total Modules</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">{path.enrollments_count}</p>
              <p className="text-xs sm:text-sm text-slate-400">Enrollments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {modules.reduce((sum, m) => sum + m.duration_minutes, 0)}
              </p>
              <p className="text-xs sm:text-sm text-slate-400">Total Minutes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {modules.filter(m => !m.is_locked).length}
              </p>
              <p className="text-xs sm:text-sm text-slate-400">Available</p>
            </div>
          </div>
        </div>

        {/* Modules Section - Responsive */}
        <div className="bg-slate-900 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h2 className="text-xl sm:text-2xl font-bold">Modules</h2>
            <Link
              to={`/admin/modules/new?path=${id}`}
              className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus size={20} />
              <span>Add Module</span>
            </Link>
          </div>

          {modules.length === 0 ? (
            <div className="text-center py-12 sm:py-20">
              <p className="text-base sm:text-lg text-slate-400 mb-4">No modules yet</p>
              <Link
                to={`/admin/modules/new?path=${id}`}
                className="inline-block px-6 py-3 text-sm sm:text-base bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
              >
                Create First Module
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((module, index) => (
                <div
                  key={module.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className="bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-700 hover:border-slate-600 transition cursor-move"
                >
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="hidden sm:flex items-center text-slate-500 cursor-grab active:cursor-grabbing">
                      <GripVertical size={20} />
                    </div>

                    {/* Module Number */}
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
                      {index + 1}
                    </div>

                    {/* Module Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-1 truncate">
                        {module.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 mb-2 line-clamp-2">
                        {module.description}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
                          {module.module_type}
                        </span>
                        <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded">
                          {module.difficulty_level}
                        </span>
                        <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded">
                          {module.duration_minutes} min
                        </span>
                        {module.is_locked && (
                          <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded">
                            🔒 Locked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions - Responsive */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link
                        to={`/admin/modules/${module.id}`}
                        className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                        title="View/Edit"
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => handleDeleteModule(module.id)}
                        className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
