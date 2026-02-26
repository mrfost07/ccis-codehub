import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Save, Upload, Loader2, Check, X, Clock, Award, ChevronLeft, ChevronRight, FileText, HelpCircle, Zap, Info, AlertCircle } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import liveQuizService, { LiveQuizQuestion, CreateQuestionData } from '../services/liveQuizService'

interface LiveQuizQuestionEditorProps {
    quizId: string
    initialQuestions?: LiveQuizQuestion[]
    onClose: () => void
    onQuestionsChange?: (questions: LiveQuizQuestion[]) => void
}

interface LocalQuestion {
    id?: string
    question_text: string
    question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'coding'
    order: number
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: string
    explanation: string
    points: number
    time_limit: number
    time_bonus_enabled: boolean
    isDirty?: boolean
}

const getDefaultQuestion = (order: number): LocalQuestion => ({
    question_text: '',
    question_type: 'multiple_choice',
    order,
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    explanation: '',
    points: 10,
    time_limit: 30,
    time_bonus_enabled: true,
    isDirty: true
})

export default function LiveQuizQuestionEditor({
    quizId,
    initialQuestions = [],
    onClose,
    onQuestionsChange
}: LiveQuizQuestionEditorProps) {
    const [questions, setQuestions] = useState<LocalQuestion[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(true)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const tabsContainerRef = useRef<HTMLDivElement>(null)

    // Scroll tabs to show current question
    const scrollTabsToIndex = (index: number) => {
        if (tabsContainerRef.current) {
            const container = tabsContainerRef.current
            const tabs = container.querySelectorAll('[data-tab]')
            if (tabs[index]) {
                tabs[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
            }
        }
    }

    const scrollTabs = (direction: 'left' | 'right') => {
        if (tabsContainerRef.current) {
            const container = tabsContainerRef.current
            const scrollAmount = 150
            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    useEffect(() => {
        loadQuestions()
    }, [quizId])

    const loadQuestions = async () => {
        try {
            setLoading(true)
            const apiQuestions = await liveQuizService.getQuestions(quizId)
            if (apiQuestions.length > 0) {
                setQuestions(apiQuestions.map(q => ({
                    id: q.id,
                    question_text: q.question_text,
                    question_type: q.question_type,
                    order: q.order,
                    option_a: q.option_a || '',
                    option_b: q.option_b || '',
                    option_c: q.option_c || '',
                    option_d: q.option_d || '',
                    correct_answer: q.correct_answer,
                    explanation: q.explanation || '',
                    points: q.points,
                    time_limit: q.time_limit,
                    time_bonus_enabled: q.time_bonus_enabled,
                    isDirty: false
                })))
            } else {
                setQuestions([getDefaultQuestion(0)])
            }
        } catch (error) {
            console.error('Failed to load questions:', error)
            toast.error('Failed to load questions')
            setQuestions([getDefaultQuestion(0)])
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const validTypes = ['.pdf', '.docx', '.doc']
        const isValidType = validTypes.some(ext => file.name.toLowerCase().endsWith(ext))
        if (!isValidType) {
            toast.error('Please upload a PDF or Word document')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size exceeds 10MB limit')
            return
        }

        setUploading(true)
        toast.loading('Extracting questions...', { id: 'extract' })

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await api.post('/learning/quizzes/extract_questions/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            if (response.data.success && response.data.questions) {
                const extractedQuestions: LocalQuestion[] = response.data.questions.map((q: any, index: number) => {
                    let optionA = '', optionB = '', optionC = '', optionD = ''
                    let correctAnswer = 'A'

                    if (q.choices && q.choices.length > 0) {
                        optionA = q.choices[0]?.text || ''
                        optionB = q.choices[1]?.text || ''
                        optionC = q.choices[2]?.text || ''
                        optionD = q.choices[3]?.text || ''

                        const correctIndex = q.choices.findIndex((c: any) => c.isCorrect)
                        if (correctIndex >= 0) {
                            correctAnswer = String.fromCharCode(65 + correctIndex)
                        }
                    }

                    let questionType: LocalQuestion['question_type'] = 'multiple_choice'
                    if (q.type === 'true_false') questionType = 'true_false'
                    else if (q.type === 'short_answer' || q.type === 'essay' || q.type === 'enumeration') questionType = 'short_answer'

                    if (questionType === 'true_false') {
                        correctAnswer = q.correctAnswer === 'true' ? 'true' : 'false'
                    }

                    return {
                        question_text: q.content || q.title || `Question ${index + 1}`,
                        question_type: questionType,
                        order: index,
                        option_a: optionA,
                        option_b: optionB,
                        option_c: optionC,
                        option_d: optionD,
                        correct_answer: correctAnswer,
                        explanation: '',
                        points: q.points || 10,
                        time_limit: 30,
                        time_bonus_enabled: true,
                        isDirty: true
                    }
                })

                setQuestions(extractedQuestions)
                setCurrentIndex(0)
                toast.success(`${extractedQuestions.length} questions extracted`, { id: 'extract' })
            } else {
                throw new Error(response.data.error || 'Extraction failed')
            }
        } catch (error: any) {
            console.error('Error extracting questions:', error)
            toast.error(error.response?.data?.error || 'Failed to extract questions', { id: 'extract' })
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const addQuestion = () => {
        const newQuestion = getDefaultQuestion(questions.length)
        setQuestions([...questions, newQuestion])
        setCurrentIndex(questions.length)
    }

    const deleteQuestion = async (index: number) => {
        if (questions.length <= 1) {
            toast.error('At least one question required')
            return
        }

        const question = questions[index]

        if (question.id) {
            try {
                await liveQuizService.deleteQuestion(question.id)
                toast.success('Question deleted')
            } catch (error) {
                toast.error('Failed to delete')
                return
            }
        }

        const newQuestions = questions.filter((_, i) => i !== index)
        newQuestions.forEach((q, i) => { q.order = i })
        setQuestions(newQuestions)

        if (currentIndex >= newQuestions.length) {
            setCurrentIndex(newQuestions.length - 1)
        }
    }

    const updateQuestion = (field: keyof LocalQuestion, value: any) => {
        const newQuestions = [...questions]
        newQuestions[currentIndex] = {
            ...newQuestions[currentIndex],
            [field]: value,
            isDirty: true
        }
        setQuestions(newQuestions)
    }

    const saveCurrentQuestion = async () => {
        const question = questions[currentIndex]
        if (!question.question_text.trim()) {
            toast.error('Question text is required')
            return false
        }

        setSaving(true)
        try {
            const data: CreateQuestionData = {
                question_text: question.question_text,
                question_type: question.question_type,
                order: question.order,
                option_a: question.option_a,
                option_b: question.option_b,
                option_c: question.option_c,
                option_d: question.option_d,
                correct_answer: question.correct_answer,
                explanation: question.explanation,
                points: question.points,
                time_limit: question.time_limit,
                time_bonus_enabled: question.time_bonus_enabled
            }

            let savedQuestion: LiveQuizQuestion
            if (question.id) {
                savedQuestion = await liveQuizService.updateQuestion(question.id, data)
            } else {
                savedQuestion = await liveQuizService.createQuestion(quizId, data)
            }

            const newQuestions = [...questions]
            newQuestions[currentIndex] = {
                ...newQuestions[currentIndex],
                id: savedQuestion.id,
                isDirty: false
            }
            setQuestions(newQuestions)
            toast.success('Saved')
            return true
        } catch (error: any) {
            console.error('Failed to save question:', error)
            toast.error(error.response?.data?.error || 'Save failed')
            return false
        } finally {
            setSaving(false)
        }
    }

    const saveAllQuestions = async () => {
        setSaving(true)
        let allSaved = true

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i]
            if (!question.isDirty) continue
            if (!question.question_text.trim()) {
                toast.error(`Question ${i + 1} is empty`)
                allSaved = false
                continue
            }

            try {
                const data: CreateQuestionData = {
                    question_text: question.question_text,
                    question_type: question.question_type,
                    order: i,
                    option_a: question.option_a,
                    option_b: question.option_b,
                    option_c: question.option_c,
                    option_d: question.option_d,
                    correct_answer: question.correct_answer,
                    explanation: question.explanation,
                    points: question.points,
                    time_limit: question.time_limit,
                    time_bonus_enabled: question.time_bonus_enabled
                }

                let savedQuestion: LiveQuizQuestion
                if (question.id) {
                    savedQuestion = await liveQuizService.updateQuestion(question.id, data)
                } else {
                    savedQuestion = await liveQuizService.createQuestion(quizId, data)
                }

                questions[i] = { ...questions[i], id: savedQuestion.id, isDirty: false }
            } catch (error) {
                console.error(`Failed to save question ${i + 1}:`, error)
                allSaved = false
            }
        }

        setQuestions([...questions])
        setSaving(false)

        if (allSaved) {
            toast.success('All questions saved')
            onQuestionsChange?.(questions as any)
        } else {
            toast.error('Some questions failed to save')
        }
    }

    const handleClose = () => {
        const hasUnsaved = questions.some(q => q.isDirty)
        if (hasUnsaved) {
            if (!confirm('Discard unsaved changes?')) {
                return
            }
        }
        onClose()
    }

    const currentQuestion = questions[currentIndex]

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* Header - Responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <h4 className="text-sm font-medium text-white">Question Editor</h4>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/30 rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span className="hidden xs:inline">{uploading ? 'Extracting...' : 'Upload PDF'}</span>
                        <span className="xs:hidden">{uploading ? '...' : 'PDF'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={saveAllQuestions}
                        disabled={saving}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save All
                    </button>
                </div>
            </div>

            {/* Question Tabs with Scroll Arrows */}
            <div className="flex items-center gap-1">
                {/* Left Scroll Arrow */}
                <button
                    type="button"
                    onClick={() => scrollTabs('left')}
                    className="p-1.5 bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg transition flex-shrink-0"
                    title="Scroll left"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Scrollable Tabs Container */}
                <div
                    ref={tabsContainerRef}
                    className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-hide scroll-smooth"
                >
                    {questions.map((q, index) => (
                        <div key={index} data-tab className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setCurrentIndex(index)
                                    scrollTabsToIndex(index)
                                }}
                                className={`px-3 py-1.5 text-xs rounded-lg transition relative ${currentIndex === index
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                Q{index + 1}
                                {q.isDirty && (
                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                                )}
                            </button>
                            {questions.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => deleteQuestion(index)}
                                    className="p-1 bg-red-600/10 hover:bg-red-600/30 text-red-400 rounded transition"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addQuestion}
                        className="px-2.5 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg transition flex items-center gap-1 flex-shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Right Scroll Arrow */}
                <button
                    type="button"
                    onClick={() => scrollTabs('right')}
                    className="p-1.5 bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg transition flex-shrink-0"
                    title="Scroll right"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Question Editor - Compact */}
            {currentQuestion && (
                <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-700/50 space-y-4">
                    {/* Question Text */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Question Text
                        </label>
                        <textarea
                            value={currentQuestion.question_text}
                            onChange={(e) => updateQuestion('question_text', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none transition"
                            placeholder="Enter your question..."
                        />
                    </div>

                    {/* Type, Points, Time - Responsive Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                            <select
                                value={currentQuestion.question_type}
                                onChange={(e) => updateQuestion('question_type', e.target.value)}
                                className="w-full px-2.5 py-2 sm:py-1.5 text-sm bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:ring-1 focus:ring-orange-500 transition"
                            >
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="true_false">True/False</option>
                                <option value="short_answer">Short Answer</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:contents">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                                    <Award className="w-3 h-3" /> Points
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={currentQuestion.points}
                                    onChange={(e) => updateQuestion('points', parseInt(e.target.value) || 10)}
                                    className="w-full px-2.5 py-2 sm:py-1.5 text-sm bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:ring-1 focus:ring-orange-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Seconds
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="120"
                                    value={currentQuestion.time_limit}
                                    onChange={(e) => updateQuestion('time_limit', parseInt(e.target.value) || 30)}
                                    className="w-full px-2.5 py-2 sm:py-1.5 text-sm bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:ring-1 focus:ring-orange-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Multiple Choice Options - Compact */}
                    {currentQuestion.question_type === 'multiple_choice' && (
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-400">Answer Options</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                                    const optionKey = `option_${letter.toLowerCase()}` as keyof LocalQuestion
                                    const isCorrect = currentQuestion.correct_answer === letter
                                    return (
                                        <div key={letter} className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => updateQuestion('correct_answer', letter)}
                                                className={`w-7 h-7 rounded text-xs font-medium transition flex items-center justify-center flex-shrink-0 ${isCorrect
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-slate-700/80 text-slate-400 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {isCorrect ? <Check className="w-3.5 h-3.5" /> : letter}
                                            </button>
                                            <input
                                                type="text"
                                                value={currentQuestion[optionKey] as string}
                                                onChange={(e) => updateQuestion(optionKey, e.target.value)}
                                                className="flex-1 px-2.5 py-1.5 text-sm bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:ring-1 focus:ring-orange-500 transition"
                                                placeholder={`Option ${letter}`}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Info className="w-3 h-3" /> Click the letter to mark it as correct
                            </p>
                        </div>
                    )}

                    {/* True/False - Compact */}
                    {currentQuestion.question_type === 'true_false' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Correct Answer</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateQuestion('correct_answer', 'true')}
                                    className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${currentQuestion.correct_answer === 'true'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                                        }`}
                                >
                                    True
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateQuestion('correct_answer', 'false')}
                                    className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${currentQuestion.correct_answer === 'false'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                                        }`}
                                >
                                    False
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Short Answer - Compact */}
                    {currentQuestion.question_type === 'short_answer' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Expected Answer</label>
                            <input
                                type="text"
                                value={currentQuestion.correct_answer}
                                onChange={(e) => updateQuestion('correct_answer', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-sm bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:ring-1 focus:ring-orange-500 transition"
                                placeholder="Enter the expected answer..."
                            />
                        </div>
                    )}

                    {/* Explanation - Compact */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Explanation (optional)</label>
                        <input
                            type="text"
                            value={currentQuestion.explanation}
                            onChange={(e) => updateQuestion('explanation', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:ring-1 focus:ring-orange-500 transition"
                            placeholder="Why is this the correct answer?"
                        />
                    </div>

                    {/* Time Bonus Toggle - Compact */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={currentQuestion.time_bonus_enabled}
                            onChange={(e) => updateQuestion('time_bonus_enabled', e.target.checked)}
                            className="w-4 h-4 text-orange-500 bg-slate-800 border-slate-600 rounded focus:ring-orange-500 focus:ring-offset-0"
                        />
                        <span className="text-xs text-slate-400 group-hover:text-slate-300 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Time bonus enabled
                        </span>
                    </label>
                </div>
            )}

            {/* Footer Navigation - Responsive */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-2">
                <div className="flex gap-1.5 order-2 sm:order-1">
                    <button
                        type="button"
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs bg-slate-700/80 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-1"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                        disabled={currentIndex === questions.length - 1}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs bg-slate-700/80 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-1"
                    >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex gap-1.5 order-1 sm:order-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs bg-slate-700/80 hover:bg-slate-600 text-white rounded-lg transition"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={saveCurrentQuestion}
                        disabled={saving}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                    </button>
                </div>
            </div>

            {/* Stats Bar - Responsive */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {questions.length}
                    </span>
                    <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" /> {questions.reduce((sum, q) => sum + q.points, 0)} pts
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {questions.reduce((sum, q) => sum + q.time_limit, 0)}s
                    </span>
                </div>
                <div className="flex gap-2 text-slate-500">
                    <span>{questions.filter(q => q.question_type === 'multiple_choice').length} MC</span>
                    <span>{questions.filter(q => q.question_type === 'true_false').length} T/F</span>
                    <span>{questions.filter(q => q.question_type === 'short_answer').length} SA</span>
                </div>
            </div>
        </div>
    )
}
