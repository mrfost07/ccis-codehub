import { useState } from 'react'
import { X, FileText, Upload, Loader2, Sparkles, FileUp } from 'lucide-react'
import SlideBasedModuleEditor from './SlideBasedModuleEditor'
import toast from 'react-hot-toast'
import api from '../services/api'

interface ModuleFormProps {
  careerPaths: any[]
  onClose: () => void
  onSuccess: () => void
  editingModule?: any
}

export default function ModuleFormWithEditor({
  careerPaths,
  onClose,
  onSuccess,
  editingModule
}: ModuleFormProps) {
  const [step, setStep] = useState<'basic' | 'content'>('basic')
  const [basicInfo, setBasicInfo] = useState({
    career_path: editingModule?.career_path || '',
    title: editingModule?.title || '',
    description: editingModule?.description || '',
    module_type: editingModule?.module_type || 'text',
    difficulty_level: editingModule?.difficulty_level || 'beginner',
    duration_minutes: editingModule?.duration_minutes || 30,
    points_reward: editingModule?.points_reward || 10,
    order: editingModule?.order || 0,
    is_locked: editingModule?.is_locked || false
  })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractedSlides, setExtractedSlides] = useState<Array<{ id: string, title: string, content: string, order: number }> | null>(null)

  // Extract content from PDF/DOCX file
  const extractContentFromFile = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    const fileExtension = file.name.toLowerCase().split('.').pop()
    if (!['pdf', 'docx', 'doc'].includes(fileExtension || '')) {
      toast.error('Please upload a PDF or Word document')
      return
    }

    setExtracting(true)
    const formData = new FormData()
    formData.append('pdf_file', file)
    formData.append('extraction_type', 'modules_only')

    try {
      const response = await api.post('/learning/pdf-extractor/extract/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.success && response.data.data.modules) {
        const modules = response.data.data.modules

        // Convert extracted modules to slides format
        const slides = modules.map((mod: any, index: number) => ({
          id: `slide-${Date.now()}-${index}`,
          title: mod.title || `Section ${index + 1}`,
          content: mod.content || `<p>${mod.description || ''}</p>`,
          order: index
        }))

        setExtractedSlides(slides)

        // Auto-fill basic info from first module if empty
        if (!basicInfo.title && modules[0]?.title) {
          setBasicInfo(prev => ({
            ...prev,
            title: modules[0].title.substring(0, 250), // Truncate to fit database
            description: modules[0].description || prev.description,
            duration_minutes: modules[0].duration_minutes || prev.duration_minutes
          }))
        }

        toast.success(`Extracted ${slides.length} sections from ${file.name}`)
      } else {
        toast.error(response.data.error || 'Extraction failed')
      }
    } catch (error: any) {
      console.error('Extraction error:', error)
      toast.error(error.response?.data?.error || 'Failed to extract content. Make sure the file contains readable text.')
    } finally {
      setExtracting(false)
    }
  }

  const handleBasicInfoSubmit = () => {
    // Validate basic info
    if (!basicInfo.career_path || !basicInfo.title || !basicInfo.description) {
      toast.error('Please fill in all required fields')
      return
    }

    // Move to content editor
    setStep('content')
  }

  const parseExistingContent = (): Array<{ id: string, title: string, content: string, order: number }> => {
    if (!editingModule?.content) return []

    const content = editingModule.content
    console.log('Parsing existing content, length:', content.length)
    console.log('Content preview:', content.substring(0, 300))

    // Check if this is slide-based content by looking for module-slide class
    if (content.includes('class="module-slide"') || content.includes("class='module-slide'")) {
      console.log('Detected slide-based format')

      // Split by the slide divs - each slide starts with <div class="module-slide"
      const slideParts = content.split(/<div[^>]*class=["']module-slide["'][^>]*>/i)
      console.log('Split into', slideParts.length, 'parts')

      // First part is usually empty or has content before first slide
      const slides: Array<{ id: string, title: string, content: string, order: number }> = []

      for (let i = 1; i < slideParts.length; i++) {
        let slideHtml = slideParts[i]

        // Remove trailing </div> that closes the module-slide div and any hr separators
        slideHtml = slideHtml.replace(/<hr[^>]*class=["']slide-separator["'][^>]*\/?>/gi, '')

        // Extract title from h2.slide-title
        const titleMatch = slideHtml.match(/<h2[^>]*class=["']slide-title["'][^>]*>([\s\S]*?)<\/h2>/i)
        const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `Slide ${i}`

        // Extract content from div.slide-content - handle nested divs properly
        const contentStartMatch = slideHtml.match(/<div[^>]*class=["']slide-content["'][^>]*>/i)
        let slideContent = ''

        if (contentStartMatch) {
          const startIdx = slideHtml.indexOf(contentStartMatch[0]) + contentStartMatch[0].length
          // Find the matching closing </div> by counting nested divs
          let depth = 1
          let endIdx = startIdx
          const remaining = slideHtml.substring(startIdx)

          for (let j = 0; j < remaining.length - 5; j++) {
            if (remaining.substring(j, j + 4).toLowerCase() === '<div') {
              depth++
            } else if (remaining.substring(j, j + 6).toLowerCase() === '</div>') {
              depth--
              if (depth === 0) {
                endIdx = startIdx + j
                break
              }
            }
          }

          slideContent = slideHtml.substring(startIdx, endIdx).trim()
        }

        console.log(`Slide ${i}: title="${title}", content length=${slideContent.length}`)

        if (slideContent || title !== `Slide ${i}`) {
          slides.push({
            id: `slide-${Date.now()}-${i - 1}`,
            title: title,
            content: slideContent,
            order: i - 1
          })
        }
      }

      if (slides.length > 0) {
        console.log('Parsed', slides.length, 'slides successfully')
        return slides
      }
    }

    // For all other content (uploaded files, plain HTML, etc.) - put everything in ONE slide
    console.log('Loading all content into single slide for editing')
    return [{
      id: `slide-${Date.now()}-0`,
      title: editingModule.title || basicInfo.title || 'Module Content',
      content: content,
      order: 0
    }]
  }

  const handleSaveModule = async (slides: any[], fullContent: string) => {
    try {
      setSaving(true)

      const formData = new FormData()
      formData.append('career_path', basicInfo.career_path)
      formData.append('title', basicInfo.title)
      formData.append('description', basicInfo.description)
      formData.append('module_type', basicInfo.module_type)
      formData.append('difficulty_level', basicInfo.difficulty_level)
      formData.append('content', fullContent)
      formData.append('duration_minutes', basicInfo.duration_minutes.toString())
      formData.append('points_reward', basicInfo.points_reward.toString())
      formData.append('order', basicInfo.order.toString())
      formData.append('is_locked', basicInfo.is_locked.toString())

      if (file) {
        formData.append('file', file)
      }

      if (editingModule) {
        // Update existing module
        await api.patch(`/learning/admin/modules/${editingModule.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toast.success('Module updated successfully')
      } else {
        // Create new module
        await api.post('/learning/admin/modules/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toast.success('Module created successfully')
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Failed to save module (Full Error):', error)
      if (error.response?.data) {
        console.error('Validation Data:', error.response.data)
        const validationErrors = error.response.data.validation_errors
        if (validationErrors) {
          console.error('Validation Errors:', validationErrors)
          const errorMsg = Object.entries(validationErrors)
            .map(([key, msgs]: [string, any]) => `${key}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ')
          toast.error(`Validation Failed: ${errorMsg}`)
          return
        }
      }
      toast.error(error.response?.data?.error || 'Failed to save module')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'content') {
    // Use extractedSlides if available, otherwise parse existing content for edit mode
    const slidesToUse = extractedSlides || (editingModule ? parseExistingContent() : undefined)
    console.log('Passing to SlideBasedModuleEditor:', {
      hasExtractedSlides: !!extractedSlides,
      hasEditingModule: !!editingModule,
      slidesCount: slidesToUse?.length,
      slides: slidesToUse
    })

    return (
      <SlideBasedModuleEditor
        initialSlides={slidesToUse}
        onSave={handleSaveModule}
        onCancel={() => {
          setStep('basic')
          setExtractedSlides(null) // Clear extracted slides when going back
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">
              {editingModule ? 'Edit Module' : 'Create New Module'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleBasicInfoSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Career Path *</label>
            <select
              value={basicInfo.career_path}
              onChange={(e) => setBasicInfo({ ...basicInfo, career_path: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              required
            >
              <option value="">Select a career path</option>
              {careerPaths.map((path: any) => (
                <option key={path.id} value={path.id}>{path.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Module Title *</label>
            <input
              type="text"
              value={basicInfo.title}
              onChange={(e) => setBasicInfo({ ...basicInfo, title: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g., Introduction to Python"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
            <textarea
              value={basicInfo.description}
              onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Brief description of the module..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Module Type</label>
              <select
                value={basicInfo.module_type}
                onChange={(e) => setBasicInfo({ ...basicInfo, module_type: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="text">Text</option>
                <option value="video">Video</option>
                <option value="interactive">Interactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
              <select
                value={basicInfo.difficulty_level}
                onChange={(e) => setBasicInfo({ ...basicInfo, difficulty_level: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Duration (min)</label>
              <input
                type="number"
                value={basicInfo.duration_minutes}
                onChange={(e) => setBasicInfo({ ...basicInfo, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Points</label>
              <input
                type="number"
                value={basicInfo.points_reward}
                onChange={(e) => setBasicInfo({ ...basicInfo, points_reward: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Order</label>
              <input
                type="number"
                value={basicInfo.order}
                onChange={(e) => setBasicInfo({ ...basicInfo, order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                Upload Document (PDF/DOCX) - Auto-fill Content
              </div>
            </label>
            <div className="flex gap-2">
              <input
                type="file"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null)
                  setExtractedSlides(null) // Clear previous extraction
                }}
                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
                accept=".pdf,.docx,.doc"
              />
              {file && (
                <button
                  type="button"
                  onClick={extractContentFromFile}
                  disabled={extracting}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 rounded-lg text-white font-medium transition flex items-center gap-2"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extract with AI
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Upload a PDF or Word document to automatically extract and fill content into the editor
            </p>
            {extractedSlides && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Sparkles className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">
                  ✓ Extracted {extractedSlides.length} section(s) - Click "Next" to edit content
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_locked"
              checked={basicInfo.is_locked}
              onChange={(e) => setBasicInfo({ ...basicInfo, is_locked: e.target.checked })}
              className="w-4 h-4 bg-slate-700 border-slate-600 rounded"
            />
            <label htmlFor="is_locked" className="text-sm text-slate-300">
              Lock this module (requires prerequisites)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition font-medium"
            >
              Next: Add Content →
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
