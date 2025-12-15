import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, FileText, Save } from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import toast from 'react-hot-toast'

interface Slide {
  id: string
  title: string
  content: string
  order: number
}

interface SlideBasedModuleEditorProps {
  initialSlides?: Slide[]
  onSave: (slides: Slide[], fullContent: string) => void
  onCancel: () => void
}

export default function SlideBasedModuleEditor({
  initialSlides = [],
  onSave,
  onCancel
}: SlideBasedModuleEditorProps) {
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  const [slides, setSlides] = useState<Slide[]>(
    initialSlides.length > 0
      ? initialSlides
      : [{ id: generateId(), title: 'Slide 1', content: '', order: 0 }]
  )
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // Update slides when initialSlides prop changes (for edit mode)
  useEffect(() => {
    console.log('SlideBasedModuleEditor received initialSlides:', initialSlides?.length)
    if (initialSlides && initialSlides.length > 0) {
      console.log('Slides content preview:', initialSlides.map(s => ({
        id: s.id,
        title: s.title,
        contentPreview: s.content?.substring(0, 50)
      })))
      setSlides(initialSlides)
      setCurrentSlideIndex(0)
    }
  }, [JSON.stringify(initialSlides)])

  const currentSlide = slides[currentSlideIndex]

  // Debug: Log current slide info
  useEffect(() => {
    console.log('Current slide changed:', {
      index: currentSlideIndex,
      id: currentSlide?.id,
      title: currentSlide?.title,
      contentLength: currentSlide?.content?.length,
      contentPreview: currentSlide?.content?.substring(0, 100)
    })
  }, [currentSlideIndex, currentSlide])

  const addSlide = (e?: React.MouseEvent) => {
    console.log('addSlide called', e)
    if (e) {
      e.preventDefault()
      e.stopPropagation()
      console.log('Event prevented and stopped')
    }

    console.log('Creating new slide, current count:', slides.length)
    const newSlide: Slide = {
      id: generateId(),
      title: `Slide ${slides.length + 1}`,
      content: '',
      order: slides.length
    }
    setSlides([...slides, newSlide])
    setCurrentSlideIndex(slides.length)
    console.log('New slide added, total slides:', slides.length + 1)
    toast.success('New slide added')
  }

  const deleteSlide = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (slides.length === 1) {
      toast.error('Cannot delete the last slide')
      return
    }

    if (!confirm('Delete this slide?')) return

    const newSlides = slides.filter((_, i) => i !== currentSlideIndex)
    // Reorder
    newSlides.forEach((slide, index) => {
      slide.order = index
      slide.title = `Slide ${index + 1}`
    })

    setSlides(newSlides)
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
    toast.success('Slide deleted')
  }

  const updateSlideTitle = (title: string) => {
    const newSlides = [...slides]
    newSlides[currentSlideIndex] = { ...currentSlide, title }
    setSlides(newSlides)
  }

  const updateSlideContent = (content: string) => {
    console.log('Updating slide content:', currentSlideIndex, 'Length:', content.length)
    const newSlides = [...slides]
    newSlides[currentSlideIndex] = { ...currentSlide, content }
    setSlides(newSlides)
    console.log('Content updated for slide', currentSlideIndex)
  }

  const navigateSlide = (direction: 'prev' | 'next', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    console.log('Navigating', direction, 'from slide', currentSlideIndex)
    console.log('Current slide content length:', currentSlide.content.length)
    console.log('All slides:', slides.map(s => ({ title: s.title, contentLength: s.content.length })))

    if (direction === 'prev' && currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
      console.log('Moved to slide', currentSlideIndex - 1)
    } else if (direction === 'next' && currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
      console.log('Moved to slide', currentSlideIndex + 1)
    }
  }

  const jumpToSlide = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    console.log('Jumping to slide', index)
    console.log('Current slide', currentSlideIndex, 'content length:', currentSlide.content.length)
    setCurrentSlideIndex(index)
    console.log('Now on slide', index)
  }

  const handleSave = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Validate all slides have content
    const emptySlides = slides.filter(s => !s.content.trim())
    if (emptySlides.length > 0) {
      toast.error('Please add content to all slides')
      return
    }

    // Combine all slides into one content with HTML separators
    const fullContent = slides.map((slide, index) => `
      <div class="module-slide" data-slide="${index + 1}">
        <h2 class="slide-title">${slide.title}</h2>
        <div class="slide-content">
          ${slide.content}
        </div>
        ${index < slides.length - 1 ? '<hr class="slide-separator" />' : ''}
      </div>
    `).join('\n')

    onSave(slides, fullContent)
  }

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Module Editor</h2>
                  <p className="text-slate-400 text-sm hidden sm:block">Create engaging slides for your learning module</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Module
                </button>
              </div>
            </div>

            {/* Slide Navigation */}
            <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-2 sm:p-4 gap-2">
              <button
                type="button"
                onClick={(e) => navigateSlide('prev', e)}
                disabled={currentSlideIndex === 0}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide flex-1 mx-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={(e) => jumpToSlide(index, e)}
                    className={`px-4 py-2 rounded-lg transition ${index === currentSlideIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    console.log('Plus button clicked!')
                    e.preventDefault()
                    e.stopPropagation()
                    e.nativeEvent.stopImmediatePropagation()
                    addSlide(e)
                    return false
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    console.log('Mouse down on plus button')
                  }}
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                  title="Add Slide"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={(e) => navigateSlide('next', e)}
                disabled={currentSlideIndex === slides.length - 1}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Slide Editor */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <input
                type="text"
                value={currentSlide.title}
                onChange={(e) => updateSlideTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-none outline-none text-white placeholder-slate-500 flex-1"
                placeholder="Slide Title"
              />
              <button
                type="button"
                onClick={deleteSlide}
                className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
                title="Delete Slide"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <RichTextEditor
                key={currentSlide.id}
                value={currentSlide.content}
                onChange={updateSlideContent}
                placeholder="Start writing your slide content... Use the toolbar for formatting, bullet points, and checkboxes."
                height="400px"
              />
            </div>

            {/* Slide Counter */}
            <div className="flex items-center justify-between text-sm text-slate-400 mt-4">
              <span>
                Slide {currentSlideIndex + 1} of {slides.length}
              </span>
              <span>
                Total slides: {slides.length}
              </span>
            </div>
          </div>

          {/* Formatting Tips */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mt-4">
            <h3 className="text-white font-semibold mb-2">Formatting Tips:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-slate-400">
              <div>• <strong className="text-white">Bold</strong> text for emphasis</div>
              <div>• <em className="text-white">Italic</em> for definitions</div>
              <div>• Bullet points for lists</div>
              <div>• Checkboxes for tasks</div>
              <div>• Numbered lists for steps</div>
              <div>• Code blocks for syntax</div>
              <div>• Images for visuals</div>
              <div>• Links for resources</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
