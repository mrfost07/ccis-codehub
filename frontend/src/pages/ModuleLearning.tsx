import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { 
  ArrowLeft, ArrowRight, CheckCircle, Clock, Award, 
  FileText, Download, Play, Pause, BookOpen, Target 
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

interface ModuleData {
  id: string
  title: string
  description: string
  content: string
  module_type: string
  duration_minutes: number
  points_reward: number
  order: number
  file_url?: string
  file_name?: string
  career_path: {
    id: string
    name: string
  }
  is_completed: boolean
  next_module?: {
    id: string
    title: string
  }
  previous_module?: {
    id: string
    title: string
  }
}

export default function ModuleLearning() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const [module, setModule] = useState<ModuleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [readingTime, setReadingTime] = useState(0)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    fetchModule()
  }, [moduleId])

  useEffect(() => {
    // Track reading time
    const interval = setInterval(() => {
      setReadingTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const fetchModule = async () => {
    try {
      const response = await api.get(`/learning/modules/${moduleId}/`)
      const moduleData = response.data
      console.log('Module data received:', moduleData)
      
      // If no content but has file, provide default content based on file type
      if (!moduleData.content && moduleData.file) {
        if (moduleData.file_name?.toLowerCase().endsWith('.pdf')) {
          moduleData.content = `# ${moduleData.title}\n\nThis module contains a PDF document: **${moduleData.file_name}**\n\nPlease review the PDF document below or download it for detailed study. The PDF contains the main learning content for this module.\n\n## Learning Objectives\n- Review the content in the uploaded PDF\n- Take notes on key concepts\n- Complete the module when you've finished studying\n\n*Scroll down to view the PDF or use the download button to save it locally.*`
        } else if (moduleData.file_name?.toLowerCase().endsWith('.docx') || moduleData.file_name?.toLowerCase().endsWith('.doc')) {
          moduleData.content = `# ${moduleData.title}\n\nThis module contains a Word document: **${moduleData.file_name}**\n\nPlease download and review the Word document for the complete learning material with proper formatting.\n\n## Learning Objectives\n- Download and open the Word document\n- Study the content thoroughly\n- Take notes on important concepts\n- Complete the module when finished\n\n*Use the download button below to access the full document.*`
        } else {
          moduleData.content = `# ${moduleData.title}\n\nThis module contains learning material in the file: **${moduleData.file_name}**\n\nPlease review the uploaded file for the learning content.\n\n## Instructions\n- Download or view the file below\n- Study the material thoroughly\n- Take notes as needed\n- Mark as complete when finished\n\n*The file content is available in the sections below.*`
        }
      }
      
      setModule(moduleData)
      
      // Mark as started (optional - don't fail if endpoint doesn't exist)
      try {
        await api.post(`/learning/modules/${moduleId}/start/`)
      } catch (startError) {
        console.log('Module start endpoint not available, continuing anyway')
      }
    } catch (error) {
      console.error('Failed to fetch module:', error)
      toast.error('Failed to load module')
    } finally {
      setLoading(false)
    }
  }

  const markAsCompleted = async () => {
    try {
      setCompleting(true)
      const response = await api.post(`/learning/modules/${moduleId}/complete/`, {
        time_spent_seconds: readingTime
      })
      
      setModule(prev => prev ? { ...prev, is_completed: true } : null)
      toast.success(`Module completed! You earned ${module?.points_reward} points!`)
      
      // Show completion options with proper navigation
      setTimeout(() => {
        if (module?.next_module) {
          const shouldContinue = confirm('Great job! Ready for the next module?')
          if (shouldContinue) {
            navigate(`/learning/modules/${module.next_module.id}`)
          } else {
            // Go back to path overview
            navigate(`/learning/paths/${module?.career_path?.id || ''}`)
          }
        } else {
          toast.success('Congratulations! You\'ve completed this learning path!')
          // Auto-navigate back to path overview after 3 seconds
          setTimeout(() => {
            if (module?.career_path?.id) {
              navigate(`/learning/paths/${module.career_path.id}`)
            }
          }, 3000)
        }
      }, 1500)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mark as completed')
    } finally {
      setCompleting(false)
    }
  }

  const downloadFile = async () => {
    if (!module?.file_url) return
    
    try {
      const response = await api.get(module.file_url, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = module.file_name || 'module-resource'
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading module...</div>
        </div>
      </div>
    )
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Module Not Found</h1>
            <button
              onClick={() => navigate('/learning')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Back to Learning
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-blue-800 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(`/learning/paths/${module.career_path.id}`)}
              className="flex items-center gap-2 text-purple-200 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {module.career_path.name}
            </button>
            
            <div className="flex items-center gap-4 text-purple-200 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Reading: {formatTime(readingTime)}
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                Expected: {module.duration_minutes} min
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{module.title}</h1>
          <p className="text-purple-100 text-lg mb-6">{module.description}</p>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-purple-200">
              <BookOpen className="w-4 h-4" />
              <span className="capitalize">{module.module_type}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-purple-200">
              <Award className="w-4 h-4" />
              <span>{module.points_reward} points</span>
            </div>
            {module.is_completed && (
              <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full text-green-300">
                <CheckCircle className="w-4 h-4" />
                <span>Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* File Download Section */}
        {module.file_url && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Module Resources
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 font-medium">{module.file_name || 'Learning Resource'}</p>
                <p className="text-slate-400 text-sm">Additional materials for this module</p>
              </div>
              <button
                onClick={downloadFile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        )}

        {/* Learning Content */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 mb-8">
          {module.content && (
            <div className="prose prose-lg prose-invert max-w-none mb-6">
              <ReactMarkdown>{module.content}</ReactMarkdown>
            </div>
          )}
          
          {/* File Content Display */}
          {module.file_url && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Learning Material</h3>
              
              {/* PDF Viewer */}
              {module.file_name?.toLowerCase().endsWith('.pdf') && (
                <div className="border border-slate-600 rounded-lg overflow-hidden">
                  <iframe
                    src={module.file_url}
                    className="w-full h-96 bg-white"
                    title="PDF Learning Material"
                  />
                  <div className="p-4 bg-slate-700/50 text-center">
                    <p className="text-slate-300 text-sm">
                      If the PDF doesn't display properly, 
                      <button 
                        onClick={downloadFile}
                        className="text-blue-400 hover:text-blue-300 ml-1 underline"
                      >
                        download it here
                      </button>
                    </p>
                  </div>
                </div>
              )}
              
              {/* Document Content Preview */}
              {(module.file_name?.toLowerCase().endsWith('.docx') || 
                module.file_name?.toLowerCase().endsWith('.doc')) && (
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <h4 className="text-lg font-semibold text-white">Document Content</h4>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 mb-4">
                    <p className="text-slate-300 text-sm">
                      This is a Word document. Download it to view the complete content with formatting.
                    </p>
                    {module.content && (
                      <div className="mt-4 p-4 bg-slate-800/50 rounded">
                        <p className="text-slate-400 text-sm mb-2">Preview:</p>
                        <div className="text-slate-200 text-sm">
                          {module.content.substring(0, 500)}
                          {module.content.length > 500 && '...'}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={downloadFile}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Document
                  </button>
                </div>
              )}
              
              {/* Markdown File */}
              {module.file_name?.toLowerCase().endsWith('.md') && (
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-green-400" />
                    <h4 className="text-lg font-semibold text-white">Markdown Content</h4>
                  </div>
                  {/* Would need to fetch and parse markdown content */}
                  <div className="prose prose-invert max-w-none">
                    {module.content ? (
                      <ReactMarkdown>{module.content}</ReactMarkdown>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-400 mb-4">Markdown file available for download</p>
                        <button
                          onClick={downloadFile}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          Download Markdown File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Text Files */}
              {module.file_name?.toLowerCase().endsWith('.txt') && (
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-yellow-400" />
                    <h4 className="text-lg font-semibold text-white">Text Content</h4>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 font-mono text-sm text-slate-200">
                    {module.content || 'Text file content will be displayed here.'}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Interactive Elements */}
          <div className="mt-6 p-4 bg-slate-700/20 rounded-lg border border-slate-600">
            <h4 className="text-lg font-semibold text-white mb-3">📝 Study Notes</h4>
            <textarea
              placeholder="Take your notes while studying this module..."
              className="w-full h-32 p-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            ></textarea>
            <div className="mt-2 text-right">
              <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm">
                Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* Navigation and Completion */}
        <div className="flex items-center justify-between">
          <div>
            {module.previous_module && (
              <button
                onClick={() => navigate(`/learning/modules/${module.previous_module!.id}`)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous: {module.previous_module.title}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {!module.is_completed && (
              <button
                onClick={markAsCompleted}
                disabled={completing}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2 font-semibold"
              >
                <CheckCircle className="w-5 h-5" />
                {completing ? 'Completing...' : 'Mark as Complete'}
              </button>
            )}
            
            {module.next_module && (
              <button
                onClick={() => navigate(`/learning/modules/${module.next_module!.id}`)}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Next: {module.next_module.title}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Learning Path Progress */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(`/learning/paths/${module.career_path.id}`)}
            className="text-purple-400 hover:text-purple-300 transition"
          >
            ← Return to Learning Path Overview
          </button>
        </div>
      </div>

      {/* Completion Celebration - Removed broken popup */}
      {completing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Completing Module! 🎉</h2>
            <p className="text-green-100">Processing your completion...</p>
          </div>
        </div>
      )}
    </div>
  )
}