import { useState, useEffect } from 'react'
import { Plus, GitBranch, Users, Calendar, ExternalLink, Search, Filter, Code2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import { projectsAPI } from '../services/api'
import toast from 'react-hot-toast'

interface Project {
  id: string
  name: string
  slug: string
  description: string
  project_type: string
  programming_language: string
  status: string
  visibility: string
  github_repo: string | null
  owner: any
  created_at: string
  members?: number
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLanguage, setFilterLanguage] = useState('all')
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    project_type: 'web_application',
    programming_language: 'javascript',
    visibility: 'public',
    github_repo: ''
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await projectsAPI.getProjects()
      setProjects(response.data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      // Use sample data if API fails
      setProjects([
        {
          id: '1',
          name: 'E-Commerce Platform',
          slug: 'e-commerce-platform',
          description: 'Full-stack e-commerce solution with React and Django',
          project_type: 'web_application',
          programming_language: 'javascript',
          status: 'in_progress',
          visibility: 'public',
          github_repo: 'https://github.com/user/ecommerce',
          owner: { username: 'john_doe' },
          created_at: new Date().toISOString(),
          members: 4
        },
        {
          id: '2',
          name: 'AI Study Assistant',
          slug: 'ai-study-assistant',
          description: 'Machine learning powered study helper for students',
          project_type: 'machine_learning',
          programming_language: 'python',
          status: 'planning',
          visibility: 'public',
          github_repo: null,
          owner: { username: 'jane_smith' },
          created_at: new Date().toISOString(),
          members: 2
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await projectsAPI.createProject(newProject)
      setProjects([response.data, ...projects])
      toast.success('Project created successfully!')
      setShowCreateModal(false)
      setNewProject({
        name: '',
        description: '',
        project_type: 'web_application',
        programming_language: 'javascript',
        visibility: 'public',
        github_repo: ''
      })
    } catch (error) {
      toast.error('Failed to create project')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-900/50 text-yellow-400'
      case 'in_progress': return 'bg-blue-900/50 text-blue-400'
      case 'review': return 'bg-purple-900/50 text-purple-400'
      case 'completed': return 'bg-green-900/50 text-green-400'
      default: return 'bg-gray-900/50 text-gray-400'
    }
  }

  const getLanguageIcon = (lang: string) => {
    const icons: { [key: string]: string } = {
      javascript: '🟨',
      typescript: '🔷',
      python: '🐍',
      java: '☕',
      csharp: '🟦',
      cpp: '⚙️',
      php: '🐘',
      ruby: '💎',
      go: '🐹',
      rust: '🦀'
    }
    return icons[lang] || '📄'
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLanguage = filterLanguage === 'all' || project.programming_language === filterLanguage
    return matchesSearch && matchesLanguage
  })

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
            <p className="text-slate-400">Collaborate on real-world projects with your peers</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            <Plus className="h-5 w-5" />
            Create Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Languages</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-800/50 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-slate-700 rounded mb-4"></div>
                <div className="h-20 bg-slate-700 rounded mb-4"></div>
                <div className="h-10 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:bg-slate-800 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                
                <p className="text-slate-400 text-sm mb-4">{project.description}</p>
                
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-lg">{getLanguageIcon(project.programming_language)}</span>
                    <span>{project.programming_language}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Users className="h-4 w-4" />
                    <span>{project.members || 1} members</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                  {project.github_repo && (
                    <a
                      href={project.github_repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                
                <button className="w-full mt-4 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors">
                  View Project
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  rows={3}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Type</label>
                  <select
                    value={newProject.project_type}
                    onChange={(e) => setNewProject({...newProject, project_type: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="web_application">Web App</option>
                    <option value="mobile_app">Mobile App</option>
                    <option value="desktop_app">Desktop App</option>
                    <option value="machine_learning">ML/AI</option>
                    <option value="game">Game</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Language</label>
                  <select
                    value={newProject.programming_language}
                    onChange={(e) => setNewProject({...newProject, programming_language: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
