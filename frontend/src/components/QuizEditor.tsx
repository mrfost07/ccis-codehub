import { useState, useEffect, useRef } from 'react'
import RichTextEditor from './RichTextEditor'
import { Plus, Trash2, Eye, Edit3, Check, X, GripVertical, Upload, Loader2, FileText } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface Choice {
  id: string
  text: string
  isCorrect: boolean
}

interface Question {
  id: string
  title: string
  content: string
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'enumeration'
  choices?: Choice[]
  correctAnswer?: string
  points: number
}

interface QuizEditorProps {
  initialQuestions?: Question[]
  onSave: (questions: Question[]) => void
}

export default function QuizEditor({ initialQuestions = [], onSave }: QuizEditorProps) {
  const getDefaultQuestion = () => ({
    id: '1',
    title: 'Question 1',
    content: '',
    type: 'multiple_choice' as const,
    choices: [
      { id: '1', text: 'Option A', isCorrect: true },
      { id: '2', text: 'Option B', isCorrect: false },
      { id: '3', text: 'Option C', isCorrect: false },
      { id: '4', text: 'Option D', isCorrect: false }
    ],
    points: 1
  })

  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions.length > 0 ? initialQuestions : [getDefaultQuestion()]
  )
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isPreview, setIsPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle PDF/DOCX upload and extraction
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['.pdf', '.docx', '.doc']
    const isValidType = validTypes.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!isValidType) {
      toast.error('Please upload a PDF or Word document')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB')
      return
    }

    setUploading(true)
    toast.loading('Extracting questions with AI...', { id: 'extract' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/learning/quizzes/extract_questions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data.success && response.data.questions) {
        const extractedQuestions = response.data.questions.map((q: any, index: number) => ({
          id: q.id || String(index + 1),
          title: q.title || `Question ${index + 1}`,
          content: q.content || '',
          type: q.type || 'multiple_choice',
          choices: q.choices || (q.type === 'multiple_choice' ? [
            { id: '1', text: 'Option A', isCorrect: true },
            { id: '2', text: 'Option B', isCorrect: false },
            { id: '3', text: 'Option C', isCorrect: false },
            { id: '4', text: 'Option D', isCorrect: false }
          ] : undefined),
          correctAnswer: q.correctAnswer,
          points: q.points || 1
        }))

        setQuestions(extractedQuestions)
        setCurrentQuestionIndex(0)
        toast.success(`Extracted ${extractedQuestions.length} questions!`, { id: 'extract' })
      } else {
        throw new Error(response.data.error || 'Failed to extract questions')
      }
    } catch (error: any) {
      console.error('Error extracting questions:', error)
      toast.error(error.response?.data?.error || 'Failed to extract questions', { id: 'extract' })
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Update questions when initialQuestions prop changes
  // Fix: Add deep comparison to prevent infinite loops from parent re-renders
  useEffect(() => {
    if (initialQuestions.length > 0) {
      // Check if IDs are different to determine if it's truly new content
      // or just a reference change from parent re-render
      const isDifferent = initialQuestions.length !== questions.length ||
        initialQuestions.some((q, i) => q.id !== questions[i]?.id);

      if (isDifferent) {
        console.log('QuizEditor: initialQuestions deeply changed, updating state:', initialQuestions.length)
        setQuestions(initialQuestions)
        setCurrentQuestionIndex(0)
      }
    }
  }, [initialQuestions])

  // Auto-save whenever questions change
  const prevQuestionsRef = useRef<Question[]>([])

  useEffect(() => {
    if (questions.length > 0) {
      // Check if content actually changed to avoid infinite loops
      const contentChanged = JSON.stringify(questions) !== JSON.stringify(prevQuestionsRef.current)

      if (contentChanged) {
        console.log('QuizEditor: Content changed, auto-saving:', questions.length)
        prevQuestionsRef.current = questions
        onSave(questions)
      }
    }
  }, [questions])

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      title: `Question ${questions.length + 1}`,
      content: '',
      type: 'multiple_choice',
      choices: [
        { id: '1', text: 'Option A', isCorrect: true },
        { id: '2', text: 'Option B', isCorrect: false },
        { id: '3', text: 'Option C', isCorrect: false },
        { id: '4', text: 'Option D', isCorrect: false }
      ],
      points: 1
    }
    setQuestions([...questions, newQuestion])
    setCurrentQuestionIndex(questions.length)
  }

  const deleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('Quiz must have at least one question')
      return
    }
    const newQuestions = questions.filter((_, i) => i !== index)
    setQuestions(newQuestions)
    if (currentQuestionIndex >= newQuestions.length) {
      setCurrentQuestionIndex(newQuestions.length - 1)
    }
  }

  const updateQuestionTitle = (index: number, title: string) => {
    const newQuestions = [...questions]
    newQuestions[index].title = title
    setQuestions(newQuestions)
  }

  const updateQuestionContent = (index: number, content: string) => {
    const newQuestions = [...questions]
    newQuestions[index].content = content
    setQuestions(newQuestions)
  }

  const updateQuestionType = (index: number, type: Question['type']) => {
    const newQuestions = [...questions]
    newQuestions[index].type = type

    // Initialize choices for multiple choice
    if (type === 'multiple_choice' && !newQuestions[index].choices) {
      newQuestions[index].choices = [
        { id: '1', text: 'Option A', isCorrect: true },
        { id: '2', text: 'Option B', isCorrect: false },
        { id: '3', text: 'Option C', isCorrect: false },
        { id: '4', text: 'Option D', isCorrect: false }
      ]
    }

    // Set correct answer for true/false
    if (type === 'true_false') {
      newQuestions[index].correctAnswer = 'true'
    }

    setQuestions(newQuestions)
  }

  const updateQuestionPoints = (index: number, points: number) => {
    const newQuestions = [...questions]
    newQuestions[index].points = points
    setQuestions(newQuestions)
  }

  const addChoice = (questionIndex: number) => {
    const newQuestions = [...questions]
    const question = newQuestions[questionIndex]
    if (question.choices) {
      const newChoice: Choice = {
        id: Date.now().toString(),
        text: `Option ${String.fromCharCode(65 + question.choices.length)}`,
        isCorrect: false
      }
      question.choices.push(newChoice)
      setQuestions(newQuestions)
    }
  }

  const removeChoice = (questionIndex: number, choiceId: string) => {
    const newQuestions = [...questions]
    const question = newQuestions[questionIndex]
    if (question.choices && question.choices.length > 2) {
      question.choices = question.choices.filter(c => c.id !== choiceId)
      setQuestions(newQuestions)
    }
  }

  const updateChoice = (questionIndex: number, choiceId: string, text: string) => {
    const newQuestions = [...questions]
    const question = newQuestions[questionIndex]
    if (question.choices) {
      const choice = question.choices.find(c => c.id === choiceId)
      if (choice) {
        choice.text = text
        setQuestions(newQuestions)
      }
    }
  }

  const toggleCorrectChoice = (questionIndex: number, choiceId: string) => {
    const newQuestions = [...questions]
    const question = newQuestions[questionIndex]
    if (question.choices) {
      question.choices.forEach(c => {
        c.isCorrect = c.id === choiceId
      })
      setQuestions(newQuestions)
    }
  }

  const handleSave = () => {
    // Generate HTML content from questions
    const htmlContent = questions.map((q, index) => {
      let choicesHtml = ''

      if (q.type === 'multiple_choice' && q.choices) {
        choicesHtml = `
          <div class="quiz-choices" style="margin-top: 1rem;">
            ${q.choices.map((choice, i) => `
              <div class="quiz-choice" style="padding: 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;" data-choice-id="${choice.id}" data-correct="${choice.isCorrect}">
                <label style="display: flex; align-items: center; cursor: pointer;">
                  <input type="radio" name="question-${q.id}" value="${choice.id}" style="margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;">
                  <span style="font-size: 1rem;">${String.fromCharCode(65 + i)}. ${choice.text}</span>
                </label>
              </div>
            `).join('')}
          </div>
        `
      } else if (q.type === 'true_false') {
        choicesHtml = `
          <div class="quiz-choices" style="margin-top: 1rem;">
            <div class="quiz-choice" style="padding: 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; cursor: pointer;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="radio" name="question-${q.id}" value="true" style="margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;">
                <span style="font-size: 1rem;">True</span>
              </label>
            </div>
            <div class="quiz-choice" style="padding: 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; cursor: pointer;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="radio" name="question-${q.id}" value="false" style="margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;">
                <span style="font-size: 1rem;">False</span>
              </label>
            </div>
          </div>
        `
      } else if (q.type === 'enumeration' || q.type === 'short_answer') {
        choicesHtml = `
          <div style="margin-top: 1rem;">
            <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.5rem;">ENUMERATION - Type your answer:</p>
            <input 
              type="text"
              placeholder="Enter your answer..." 
              style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 0.5rem; color: white; font-size: 1rem;"
            />
          </div>
        `
      } else {
        choicesHtml = `
          <div style="margin-top: 1rem;">
            <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.5rem;">ESSAY - Write your answer:</p>
            <textarea 
              placeholder="Type your answer here..." 
              rows="4" 
              style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 0.5rem; color: white; font-size: 1rem; resize: vertical;"
            ></textarea>
          </div>
        `
      }

      return `
        <div class="module-slide" data-slide="${index + 1}">
          <h2 style="color: #60a5fa; margin-bottom: 1rem; font-size: 1.5rem; font-weight: bold;">
            Question ${index + 1}: ${q.title}
          </h2>
          <div class="question-content" style="margin-bottom: 1.5rem;">
            ${q.content}
          </div>
          <div class="question-info" style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.875rem; color: #94a3b8;">
            <span>📝 ${q.type.replace('_', ' ').toUpperCase()}</span>
            <span>⭐ ${q.points} ${q.points === 1 ? 'point' : 'points'}</span>
          </div>
          ${choicesHtml}
        </div>
        ${index < questions.length - 1 ? '<hr class="slide-separator" />' : ''}
      `
    }).join('\n')

    onSave(questions)
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white">Quiz Question Editor</h3>
          <p className="text-slate-400 text-xs sm:text-sm">Create slide-based quiz questions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Upload PDF/DOCX Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/30 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload PDF/DOCX
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2"
          >
            {isPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
          >
            Save Quiz
          </button>
        </div>
      </div>

      {/* Question Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide touch-scroll">
        {questions.map((question, index) => (
          <div key={question.id} className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex(index)}
              className={`px-4 py-2 rounded-lg transition ${currentQuestionIndex === index
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
            >
              Q{index + 1}
            </button>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => deleteQuestion(index)}
                className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addQuestion}
          className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Question Editor */}
      {currentQuestion && (
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700">
          {/* Question Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Question {currentQuestionIndex + 1} Title
            </label>
            <input
              type="text"
              value={currentQuestion.title}
              onChange={(e) => updateQuestionTitle(currentQuestionIndex, e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., What is a variable in Python?"
            />
          </div>

          {/* Question Type and Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Question Type
              </label>
              <select
                value={currentQuestion.type}
                onChange={(e) => updateQuestionType(currentQuestionIndex, e.target.value as Question['type'])}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="enumeration">Enumeration</option>
                <option value="short_answer">Short Answer</option>
                <option value="essay">Essay</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Points
              </label>
              <input
                type="number"
                min="1"
                value={currentQuestion.points}
                onChange={(e) => updateQuestionPoints(currentQuestionIndex, parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Question Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Question Content
            </label>
            {isPreview ? (
              <div
                className="prose prose-invert prose-lg max-w-none bg-slate-900 rounded-lg p-6 border border-slate-700"
                dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
              />
            ) : (
              <RichTextEditor
                key={currentQuestion.id}
                value={currentQuestion.content}
                onChange={(content) => updateQuestionContent(currentQuestionIndex, content)}
                placeholder="Write your question here. Include code examples, images, or explanations..."
              />
            )}
          </div>

          {/* Multiple Choice Options */}
          {currentQuestion.type === 'multiple_choice' && currentQuestion.choices && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-300">
                  Answer Choices
                </label>
                <button
                  type="button"
                  onClick={() => addChoice(currentQuestionIndex)}
                  className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition text-sm flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Choice
                </button>
              </div>
              <div className="space-y-2">
                {currentQuestion.choices.map((choice, index) => (
                  <div key={choice.id} className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-sm w-8">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <input
                      type="text"
                      value={choice.text}
                      onChange={(e) => updateChoice(currentQuestionIndex, choice.id, e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleCorrectChoice(currentQuestionIndex, choice.id)}
                      className={`p-2 rounded-lg transition ${choice.isCorrect
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      title={choice.isCorrect ? 'Correct answer' : 'Mark as correct'}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    {currentQuestion.choices && currentQuestion.choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeChoice(currentQuestionIndex, choice.id)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Click the checkmark to set the correct answer
              </p>
            </div>
          )}

          {/* True/False */}
          {currentQuestion.type === 'true_false' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correct Answer
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const newQuestions = [...questions]
                    newQuestions[currentQuestionIndex].correctAnswer = 'true'
                    setQuestions(newQuestions)
                  }}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${currentQuestion.correctAnswer === 'true'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                  True
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newQuestions = [...questions]
                    newQuestions[currentQuestionIndex].correctAnswer = 'false'
                    setQuestions(newQuestions)
                  }}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${currentQuestion.correctAnswer === 'false'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                  False
                </button>
              </div>
            </div>
          )}

          {/* Short Answer / Essay */}
          {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'essay') && (
            <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                📝 This is an open-ended question. Students will type their answer in a text box.
                {currentQuestion.type === 'essay' && ' Essays allow longer responses with multiple paragraphs.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-blue-300 text-sm">
            📝 <strong>{questions.length}</strong> {questions.length === 1 ? 'question' : 'questions'} •
            ⭐ <strong>{questions.reduce((sum, q) => sum + q.points, 0)}</strong> total points
          </p>
          <div className="flex gap-2 text-xs text-blue-400">
            <span>{questions.filter(q => q.type === 'multiple_choice').length} MC</span>
            <span>{questions.filter(q => q.type === 'true_false').length} T/F</span>
            <span>{questions.filter(q => q.type === 'short_answer').length} SA</span>
            <span>{questions.filter(q => q.type === 'essay').length} Essay</span>
          </div>
        </div>
      </div>
    </div>
  )
}
