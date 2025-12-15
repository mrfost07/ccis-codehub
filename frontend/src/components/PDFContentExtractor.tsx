import { useState, useRef } from 'react'
import {
  Upload, FileText, Loader2, CheckCircle, AlertCircle,
  BookOpen, ClipboardList, Edit, Save, X, ChevronDown, ChevronUp,
  Sparkles, Wand2, ArrowLeft, ArrowRight, Check
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import SlideBasedModuleEditor from './SlideBasedModuleEditor'
import QuizEditor from './QuizEditor'

interface ExtractedPath {
  name: string
  description: string
  program_type: string
  difficulty_level: string
  estimated_duration: number
  required_skills: string[]
}

interface ExtractedModule {
  title: string
  description: string
  content: string
  module_type: string
  difficulty_level: string
  duration_minutes: number
  order: number
}

interface ExtractedQuestion {
  question_text: string
  question_type: string
  choices: string[]
  correct_answer: string
  explanation: string
  points: number
}

interface ExtractedQuiz {
  module_index: number
  title: string
  description: string
  questions: ExtractedQuestion[]
}

interface ExtractedContent {
  path: ExtractedPath
  modules: ExtractedModule[]
  quizzes: ExtractedQuiz[]
}

interface Props {
  onContentCreated?: (data: any) => void
  onClose?: () => void
}

type WizardStep = 'input' | 'path' | 'modules' | 'quizzes' | 'complete'

export default function PDFContentExtractor({ onContentCreated, onClose }: Props) {
  // Wizard step state
  const [currentStep, setCurrentStep] = useState<WizardStep>('input')

  // Input mode: 'pdf' for file upload, 'prompt' for AI generation
  const [inputMode, setInputMode] = useState<'pdf' | 'prompt'>('pdf')

  // PDF mode state
  const [file, setFile] = useState<File | null>(null)

  // Prompt mode state
  const [promptText, setPromptText] = useState('')
  const [moduleCount, setModuleCount] = useState(5)
  const [includeQuizzes, setIncludeQuizzes] = useState(true)

  // Shared state
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null)
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0)
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [savedPathId, setSavedPathId] = useState<string | null>(null)
  const [savedModuleIds, setSavedModuleIds] = useState<string[]>([])
  const [savedModulesSet, setSavedModulesSet] = useState<Set<number>>(new Set()) // Track which module indexes are saved
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Split content into slides by H2 sections
  const splitContentIntoSlides = (content: string, moduleTitle: string) => {
    if (!content) return [{ id: 'slide-1', title: moduleTitle, content: '', order: 1 }]

    // Split by H2 headers
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi
    const sections: { title: string; content: string }[] = []
    let lastIndex = 0
    let match
    let introContent = ''

    // Get content before first H2 (intro)
    const firstH2Match = content.match(h2Regex)
    if (firstH2Match) {
      const firstH2Index = content.indexOf(firstH2Match[0])
      if (firstH2Index > 0) {
        introContent = content.substring(0, firstH2Index).trim()
      }
    }

    // Reset regex
    h2Regex.lastIndex = 0

    // Find all H2 sections
    const matches: { title: string; startIndex: number }[] = []
    while ((match = h2Regex.exec(content)) !== null) {
      matches.push({
        title: match[1].replace(/<[^>]*>/g, '').trim(), // Strip inner HTML
        startIndex: match.index
      })
    }

    // Extract content between H2s
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].startIndex
      const end = i < matches.length - 1 ? matches[i + 1].startIndex : content.length
      sections.push({
        title: matches[i].title,
        content: content.substring(start, end).trim()
      })
    }

    // If no H2s found or content is small, use single slide
    if (sections.length === 0) {
      return [{ id: 'slide-1', title: moduleTitle, content: content, order: 1 }]
    }

    // Create slides
    const slides = sections.map((section, idx) => ({
      id: `slide-${idx + 1}`,
      title: section.title || `Section ${idx + 1}`,
      content: section.content,
      order: idx + 1
    }))

    // Add intro as first slide if exists
    if (introContent && introContent.length > 50) {
      slides.unshift({
        id: 'slide-0',
        title: 'Introduction',
        content: introContent,
        order: 0
      })
      // Re-order
      slides.forEach((s, i) => { s.order = i + 1; s.id = `slide-${i + 1}` })
    }

    return slides
  }

  // Convert AI question format to QuizEditor format
  const convertToQuizEditorFormat = (quiz: ExtractedQuiz) => {
    return quiz.questions.map((q, idx) => ({
      id: `q-${idx}`,
      title: q.question_text,
      content: '',
      type: 'multiple_choice' as const,
      choices: q.choices.map((c, cIdx) => ({
        id: `c-${idx}-${cIdx}`,
        text: c,
        isCorrect: c === q.correct_answer || String(cIdx) === String(q.correct_answer)
      })),
      points: q.points || 10
    }))
  }

  // Get wizard steps based on content
  const getSteps = () => {
    const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
      { key: 'input', label: 'Generate', icon: <Sparkles className="w-4 h-4" /> },
      { key: 'path', label: 'Path', icon: <BookOpen className="w-4 h-4" /> },
      { key: 'modules', label: 'Modules', icon: <FileText className="w-4 h-4" /> },
    ]
    if (includeQuizzes && extractedContent?.quizzes && extractedContent.quizzes.length > 0) {
      steps.push({ key: 'quizzes', label: 'Quizzes', icon: <ClipboardList className="w-4 h-4" /> })
    }
    steps.push({ key: 'complete', label: 'Complete', icon: <Check className="w-4 h-4" /> })
    return steps
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Please select a PDF file')
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleExtract = async () => {
    if (!file) {
      toast.error('Please select a PDF file first')
      return
    }

    setExtracting(true)
    const formData = new FormData()
    formData.append('pdf_file', file)
    formData.append('extraction_type', 'full')

    try {
      const response = await api.post('/learning/pdf-extractor/extract/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.success) {
        setExtractedContent(response.data.data)
        setCurrentStep('path')
        toast.success('Content extracted successfully!')
      } else {
        toast.error(response.data.error || 'Extraction failed')
      }
    } catch (error: any) {
      console.error('Extraction error:', error)
      toast.error(error.response?.data?.error || 'Failed to extract content from PDF')
    } finally {
      setExtracting(false)
    }
  }

  const handleGenerateFromPrompt = async () => {
    if (!promptText.trim()) {
      toast.error('Please enter a description for the course you want to create')
      return
    }

    setExtracting(true)
    try {
      const response = await api.post('/learning/pdf-extractor/generate_from_prompt/', {
        prompt: promptText,
        module_count: moduleCount,
        include_quizzes: includeQuizzes
      })

      if (response.data.success) {
        setExtractedContent(response.data.data)
        setCurrentStep('path')
        toast.success('Content generated successfully!')
      } else {
        toast.error(response.data.error || 'Generation failed')
      }
    } catch (error: any) {
      console.error('Generation error:', error)
      toast.error(error.response?.data?.error || 'Failed to generate content')
    } finally {
      setExtracting(false)
    }
  }

  const updatePath = (field: keyof ExtractedPath, value: any) => {
    if (!extractedContent) return
    setExtractedContent({
      ...extractedContent,
      path: { ...extractedContent.path, [field]: value }
    })
  }

  const updateModule = (index: number, field: keyof ExtractedModule, value: any) => {
    if (!extractedContent) return
    const newModules = [...extractedContent.modules]
    newModules[index] = { ...newModules[index], [field]: value }
    setExtractedContent({ ...extractedContent, modules: newModules })
  }

  // Generate a valid slug (max 50 chars)
  const generateSlug = (name: string) => {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
      .substring(0, 47)               // Max 47 chars to leave room for suffix
    const suffix = Math.random().toString(36).substring(2, 5) // 3 char suffix
    return `${baseSlug}-${suffix}`.substring(0, 50)
  }

  // Save career path and get ID
  const saveCareerPath = async () => {
    console.log('saveCareerPath: extractedContent =', extractedContent)
    if (!extractedContent) {
      console.log('saveCareerPath: extractedContent is null, returning null')
      return null
    }

    console.log('saveCareerPath: setting saving to true')
    setSaving(true)
    try {
      const pathPayload = {
        name: extractedContent.path.name,
        slug: generateSlug(extractedContent.path.name),
        description: extractedContent.path.description,
        program_type: extractedContent.path.program_type,
        difficulty_level: extractedContent.path.difficulty_level,
        estimated_duration: extractedContent.path.estimated_duration,
        required_skills: extractedContent.path.required_skills || [],
        is_active: true
      }

      console.log('saveCareerPath: sending payload', pathPayload)
      const response = await api.post('/learning/admin/career-paths/', pathPayload)
      console.log('saveCareerPath: full response =', response.data)

      // Handle different response structures
      // Some APIs return {id, ...} directly, others return {message, data: {id, ...}}
      const pathId = response.data.id || response.data.data?.id
      console.log('saveCareerPath: extracted pathId =', pathId)

      if (!pathId) {
        console.error('saveCareerPath: Could not extract pathId from response')
        toast.error('Career path created but ID not returned')
        return null
      }

      setSavedPathId(pathId)
      return pathId
    } catch (error: any) {
      console.error('Save path error:', error)
      console.log('saveCareerPath: error response data =', error.response?.data)
      const errorMsg = error.response?.data?.slug?.[0] ||
        error.response?.data?.name?.[0] ||
        'Failed to save career path'
      toast.error(errorMsg)
      return null
    } finally {
      setSaving(false)
    }
  }

  // Save current module
  const saveCurrentModule = async (slides: any[], fullContent: string) => {
    if (!extractedContent || !savedPathId) {
      console.error('saveCurrentModule: Missing extractedContent or savedPathId')
      return null
    }

    if (saving) {
      console.log('saveCurrentModule: Already saving, skipping...')
      return null
    }

    const moduleData = extractedContent.modules[currentModuleIndex]
    console.log('saveCurrentModule: Saving module', currentModuleIndex, moduleData.title)

    setSaving(true)
    try {
      const modulePayload = {
        career_path: savedPathId,
        title: moduleData.title,
        description: moduleData.description,
        content: fullContent || moduleData.content,
        module_type: moduleData.module_type || 'text',
        difficulty_level: moduleData.difficulty_level,
        duration_minutes: moduleData.duration_minutes,
        order: currentModuleIndex,  // Use actual index for order
        is_locked: false,
        points_reward: 10
      }

      console.log('saveCurrentModule: Sending payload')
      const response = await api.post('/learning/admin/modules/', modulePayload)
      console.log('saveCurrentModule: Full Response =', JSON.stringify(response.data, null, 2))

      // Handle different response structures - check all possible paths
      const moduleId = response.data.id ||
        response.data.data?.id ||
        response.data.module?.id ||
        (typeof response.data === 'object' && Object.keys(response.data).length > 0 && response.data[Object.keys(response.data).find(k => k !== 'message') || '']?.id)
      console.log('saveCurrentModule: Extracted moduleId =', moduleId)

      if (!moduleId) {
        console.error('saveCurrentModule: Could not extract moduleId from response')
        toast.error('Module created but ID not returned')
        return null
      }

      const newModuleIds = [...savedModuleIds, moduleId]
      setSavedModuleIds(newModuleIds)
      return moduleId
    } catch (error: any) {
      console.error('Save module error:', error)
      toast.error('Failed to save module')
      return null
    } finally {
      setSaving(false)
    }
  }

  // Save quiz
  const saveCurrentQuiz = async (questions: any[]) => {
    if (!extractedContent || !savedPathId) {
      console.error('saveCurrentQuiz: Missing extractedContent or savedPathId')
      return null
    }

    if (saving) {
      console.log('saveCurrentQuiz: Already saving, skipping...')
      return null
    }

    const quizData = extractedContent.quizzes[currentQuizIndex]
    const moduleId = savedModuleIds[quizData.module_index]
    console.log('saveCurrentQuiz: Quiz', currentQuizIndex, 'for moduleIndex', quizData.module_index, 'moduleId', moduleId)

    if (!moduleId) {
      toast.error('Module not found for this quiz')
      return null
    }

    setSaving(true)
    try {
      // Create quiz first
      const quizPayload = {
        learning_module: moduleId,  // Backend uses learning_module, not module
        title: quizData.title,
        description: quizData.description || 'Quiz for module',
        time_limit_minutes: 30,  // Backend uses time_limit_minutes, not time_limit
        passing_score: 70,
        max_attempts: 3,
        randomize_questions: true
      }

      console.log('saveCurrentQuiz: Sending quiz payload', quizPayload)
      const quizResponse = await api.post('/learning/quizzes/', quizPayload)
      console.log('saveCurrentQuiz: Quiz Response =', quizResponse.data)

      const quizId = quizResponse.data.id || quizResponse.data.data?.id

      if (quizId && questions && questions.length > 0) {
        // Create questions for the quiz
        for (const [idx, q] of questions.entries()) {
          const questionPayload = {
            quiz: quizId,
            question_text: q.title || q.question_text || 'Question',
            question_type: q.type || 'multiple_choice',
            points: q.points || 10,
            order: idx + 1,
            correct_answer: q.choices?.find((c: any) => c.isCorrect)?.text || ''
          }

          try {
            await api.post('/learning/questions/', questionPayload)
          } catch (qErr) {
            console.warn('Failed to create question:', qErr)
          }
        }
      }

      // Return the quiz ID
      console.log('saveCurrentQuiz: Final quizId =', quizId)
      return quizId
    } catch (error: any) {
      console.error('Save quiz error:', error)
      toast.error('Failed to save quiz')
      return null
    } finally {
      setSaving(false)
    }
  }

  // Handle module save and navigation
  const handleModuleSave = async (slides: any[], fullContent: string) => {
    // Prevent duplicate saves
    if (savedModulesSet.has(currentModuleIndex)) {
      console.log('handleModuleSave: Module', currentModuleIndex, 'already saved, moving to next')
      // Just move to next
      if (currentModuleIndex < (extractedContent?.modules.length || 0) - 1) {
        setCurrentModuleIndex(prev => prev + 1)
      } else {
        if (includeQuizzes && extractedContent?.quizzes && extractedContent.quizzes.length > 0) {
          setCurrentStep('quizzes')
          setCurrentQuizIndex(0)
        } else {
          setCurrentStep('complete')
        }
      }
      return
    }

    const moduleId = await saveCurrentModule(slides, fullContent)
    if (moduleId) {
      // Mark this module as saved
      setSavedModulesSet(prev => new Set([...prev, currentModuleIndex]))
      toast.success(`Module ${currentModuleIndex + 1} saved!`)

      if (currentModuleIndex < (extractedContent?.modules.length || 0) - 1) {
        // More modules to go
        setCurrentModuleIndex(prev => prev + 1)
      } else {
        // All modules done, move to quizzes or complete
        if (includeQuizzes && extractedContent?.quizzes && extractedContent.quizzes.length > 0) {
          setCurrentStep('quizzes')
          setCurrentQuizIndex(0)
        } else {
          setCurrentStep('complete')
        }
      }
    }
  }

  // Handle quiz save and navigation
  const handleQuizSave = async (questions: any[]) => {
    const quizId = await saveCurrentQuiz(questions)
    if (quizId) {
      toast.success(`Quiz ${currentQuizIndex + 1} saved!`)

      if (currentQuizIndex < (extractedContent?.quizzes.length || 0) - 1) {
        setCurrentQuizIndex(prev => prev + 1)
      } else {
        setCurrentStep('complete')
      }
    }
  }

  // Handle path save and move to modules
  const handlePathContinue = async () => {
    if (saving) return // Prevent multiple clicks

    console.log('handlePathContinue called, saving career path...')
    const pathId = await saveCareerPath()
    console.log('saveCareerPath returned:', pathId)

    if (pathId) {
      console.log('Setting step to modules, currentModuleIndex to 0')
      toast.success('Career path created!')
      setCurrentModuleIndex(0)
      setCurrentStep('modules')
    } else {
      console.log('pathId is null, not advancing')
    }
  }

  // Progress indicator component
  const ProgressIndicator = () => {
    const steps = getSteps()
    const currentIndex = steps.findIndex(s => s.key === currentStep)

    return (
      <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition whitespace-nowrap ${index < currentIndex
              ? 'bg-green-500/20 text-green-400'
              : index === currentIndex
                ? 'bg-purple-500/20 text-purple-400 ring-2 ring-purple-500/50'
                : 'bg-slate-800 text-slate-500'
              }`}>
              <span className="flex-shrink-0">{step.icon}</span>
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">{step.label}</span>
              {index < currentIndex && <Check className="w-3 h-3 text-green-400 flex-shrink-0" />}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-4 sm:w-8 h-0.5 mx-1 ${index < currentIndex ? 'bg-green-500' : 'bg-slate-700'
                }`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-700 bg-gradient-to-r from-purple-900/50 to-blue-900/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl">
              <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">AI Content Generator</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {currentStep === 'input' && 'Generate learning content from PDF or AI prompt'}
                {currentStep === 'path' && 'Configure your career path details'}
                {currentStep === 'modules' && `Editing Module ${currentModuleIndex + 1} of ${extractedContent?.modules.length || 0}`}
                {currentStep === 'quizzes' && `Editing Quiz ${currentQuizIndex + 1} of ${extractedContent?.quizzes.length || 0}`}
                {currentStep === 'complete' && 'All content has been created!'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Indicator (shown after input step) */}
      {currentStep !== 'input' && (
        <div className="px-4 sm:px-6 pt-4 flex-shrink-0">
          <ProgressIndicator />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* STEP: Input (PDF or Prompt) */}
        {currentStep === 'input' && (
          <div className="space-y-6">
            {/* Mode Selector Tabs */}
            <div className="flex gap-2 p-1 bg-slate-800 rounded-xl">
              <button
                onClick={() => setInputMode('pdf')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition text-sm sm:text-base ${inputMode === 'pdf'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>PDF Upload</span>
              </button>
              <button
                onClick={() => setInputMode('prompt')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition text-sm sm:text-base ${inputMode === 'prompt'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>AI Prompt</span>
              </button>
            </div>

            {/* PDF Upload Section */}
            {inputMode === 'pdf' && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${file
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-slate-600 hover:border-purple-500/50 hover:bg-purple-500/5'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
                      <div className="text-left">
                        <p className="text-white font-medium text-sm sm:text-base">{file.name}</p>
                        <p className="text-xs sm:text-sm text-slate-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500 mx-auto mb-3" />
                      <p className="text-white font-medium mb-1 text-sm sm:text-base">
                        Click to upload PDF
                      </p>
                      <p className="text-xs sm:text-sm text-slate-400">
                        Maximum file size: 10MB
                      </p>
                    </>
                  )}
                </div>

                {file && (
                  <button
                    onClick={handleExtract}
                    disabled={extracting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 rounded-xl text-white font-medium transition-all"
                  >
                    {extracting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Extracting with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Extract Content with AI
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* AI Prompt Section */}
            {inputMode === 'prompt' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Describe the course you want to create
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="E.g., Create a comprehensive Python programming course for beginners covering variables, data types, control flow, functions, and object-oriented programming..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none text-sm sm:text-base"
                  />
                </div>

                {/* Quick Suggestions */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Quick suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Python Basics',
                      'Web Development',
                      'Data Structures',
                      'SQL & Databases',
                      'Machine Learning'
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setPromptText(`Create a comprehensive ${suggestion} course for college students with detailed modules and practical exercises`)}
                        className="px-2 sm:px-3 py-1.5 text-xs bg-slate-800 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 hover:border-purple-500 transition"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-slate-300">Modules:</label>
                    <select
                      value={moduleCount}
                      onChange={(e) => setModuleCount(parseInt(e.target.value))}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                    >
                      {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeQuizzes}
                      onChange={(e) => setIncludeQuizzes(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-xs sm:text-sm text-slate-300">Include quizzes</span>
                  </label>
                </div>

                <button
                  onClick={handleGenerateFromPrompt}
                  disabled={extracting || !promptText.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Learning Content
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-200">
                <p className="font-medium mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-300">
                  <li>Upload PDF or describe your course</li>
                  <li>AI generates path, modules & quizzes</li>
                  <li>Edit each component with rich editors</li>
                  <li>Save - content is created automatically</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Path Setup */}
        {currentStep === 'path' && extractedContent && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Course Name</label>
                <input
                  type="text"
                  value={extractedContent.path.name}
                  onChange={(e) => updatePath('name', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Program</label>
                <select
                  value={extractedContent.path.program_type}
                  onChange={(e) => updatePath('program_type', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="bsit">BS Information Technology</option>
                  <option value="bscs">BS Computer Science</option>
                  <option value="bsis">BS Information Systems</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Difficulty</label>
                <select
                  value={extractedContent.path.difficulty_level}
                  onChange={(e) => updatePath('difficulty_level', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Duration (weeks)</label>
                <input
                  type="number"
                  value={extractedContent.path.estimated_duration}
                  onChange={(e) => updatePath('estimated_duration', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                value={extractedContent.path.description}
                onChange={(e) => updatePath('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Content Summary</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-400">{extractedContent.modules.length} Modules</span>
                </div>
                {includeQuizzes && extractedContent.quizzes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-green-400" />
                    <span className="text-slate-400">{extractedContent.quizzes.length} Quizzes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handlePathContinue}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 rounded-xl text-white font-medium transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Modules
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP: Modules Editor */}
        {currentStep === 'modules' && extractedContent && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-1">
                {extractedContent.modules[currentModuleIndex]?.title || `Module ${currentModuleIndex + 1}`}
              </h3>
              <p className="text-sm text-slate-400">
                {extractedContent.modules[currentModuleIndex]?.description}
              </p>
            </div>

            <SlideBasedModuleEditor
              onSave={handleModuleSave}
              onCancel={() => {
                // Skip this module and move to next or complete
                if (currentModuleIndex < (extractedContent?.modules.length || 0) - 1) {
                  setCurrentModuleIndex(prev => prev + 1)
                } else {
                  if (includeQuizzes && extractedContent?.quizzes && extractedContent.quizzes.length > 0) {
                    setCurrentStep('quizzes')
                    setCurrentQuizIndex(0)
                  } else {
                    setCurrentStep('complete')
                  }
                }
              }}
              initialSlides={splitContentIntoSlides(
                extractedContent.modules[currentModuleIndex]?.content || '',
                extractedContent.modules[currentModuleIndex]?.title || `Module ${currentModuleIndex + 1}`
              )}
            />
          </div>
        )}

        {/* STEP: Quizzes Editor */}
        {currentStep === 'quizzes' && extractedContent && extractedContent.quizzes[currentQuizIndex] && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-1">
                {extractedContent.quizzes[currentQuizIndex]?.title || `Quiz ${currentQuizIndex + 1}`}
              </h3>
              <p className="text-sm text-slate-400">
                For Module {extractedContent.quizzes[currentQuizIndex].module_index + 1}: {extractedContent.modules[extractedContent.quizzes[currentQuizIndex].module_index]?.title}
              </p>
            </div>

            <QuizEditor
              initialQuestions={convertToQuizEditorFormat(extractedContent.quizzes[currentQuizIndex])}
              onSave={handleQuizSave}
            />
          </div>
        )}

        {/* STEP: Complete */}
        {currentStep === 'complete' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Content Created Successfully!</h3>
            <p className="text-slate-400 mb-6">
              Your learning content has been saved and is ready for students.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  onContentCreated?.({ path_id: savedPathId })
                  onClose?.()
                }}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-medium transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
