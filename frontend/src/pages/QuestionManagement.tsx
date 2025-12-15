import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Plus, Edit, Trash2, Save, X, ArrowLeft, CheckCircle, 
  List, GripVertical, AlertCircle
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface Question {
  id: string
  question_text: string
  question_type: string
  correct_answer: any
  points: number
  order: number
  explanation: string
  choices?: Choice[]
}

interface Choice {
  id?: string
  choice_text: string
  is_correct: boolean
  order: number
}

interface Quiz {
  id: string
  title: string
  learning_module: string
  module_title?: string
}

export default function QuestionManagement() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    correct_answer: '',
    points: 1,
    explanation: '',
    choices: [
      { choice_text: '', is_correct: false, order: 0 },
      { choice_text: '', is_correct: false, order: 1 },
      { choice_text: '', is_correct: false, order: 2 },
      { choice_text: '', is_correct: false, order: 3 }
    ] as Choice[]
  })

  useEffect(() => {
    fetchQuizAndQuestions()
  }, [quizId])

  const fetchQuizAndQuestions = async () => {
    try {
      setLoading(true)
      const [quizRes, questionsRes] = await Promise.all([
        api.get(`/learning/quizzes/${quizId}/`),
        api.get(`/learning/quizzes/${quizId}/questions/`)
      ])
      
      setQuiz(quizRes.data)
      setQuestions(questionsRes.data.results || questionsRes.data || [])
    } catch (error) {
      console.error('Error fetching quiz data:', error)
      toast.error('Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleAddChoice = () => {
    setQuestionForm({
      ...questionForm,
      choices: [
        ...questionForm.choices,
        { choice_text: '', is_correct: false, order: questionForm.choices.length }
      ]
    })
  }

  const handleRemoveChoice = (index: number) => {
    setQuestionForm({
      ...questionForm,
      choices: questionForm.choices.filter((_, i) => i !== index)
    })
  }

  const handleChoiceChange = (index: number, field: string, value: any) => {
    const newChoices = [...questionForm.choices]
    newChoices[index] = { ...newChoices[index], [field]: value }
    
    // For multiple choice, only one can be correct
    if (field === 'is_correct' && value && questionForm.question_type === 'multiple_choice') {
      newChoices.forEach((choice, i) => {
        if (i !== index) choice.is_correct = false
      })
    }
    
    setQuestionForm({ ...questionForm, choices: newChoices })
  }

  const resetForm = () => {
    setQuestionForm({
      question_text: '',
      question_type: 'multiple_choice',
      correct_answer: '',
      points: 1,
      explanation: '',
      choices: [
        { choice_text: '', is_correct: false, order: 0 },
        { choice_text: '', is_correct: false, order: 1 },
        { choice_text: '', is_correct: false, order: 2 },
        { choice_text: '', is_correct: false, order: 3 }
      ]
    })
    setEditingQuestion(null)
  }

  const handleSubmit = async () => {
    if (!questionForm.question_text.trim()) {
      toast.error('Question text is required')
      return
    }

    if (questionForm.question_type === 'multiple_choice') {
      const validChoices = questionForm.choices.filter(c => c.choice_text.trim())
      if (validChoices.length < 2) {
        toast.error('Please add at least 2 choices')
        return
      }
      
      const correctChoice = validChoices.find(c => c.is_correct)
      if (!correctChoice) {
        toast.error('Please mark one choice as correct')
        return
      }
    }

    if (questionForm.question_type === 'true_false' && !questionForm.correct_answer) {
      toast.error('Please select the correct answer (True or False)')
      return
    }

    try {
      const payload = {
        quiz: quizId,
        question_text: questionForm.question_text,
        question_type: questionForm.question_type,
        points: questionForm.points,
        explanation: questionForm.explanation,
        order: editingQuestion ? editingQuestion.order : questions.length
      }

      if (questionForm.question_type === 'multiple_choice') {
        const validChoices = questionForm.choices.filter(c => c.choice_text.trim())
        Object.assign(payload, {
          correct_answer: validChoices.find(c => c.is_correct)?.choice_text,
          choices: validChoices
        })
      } else if (questionForm.question_type === 'true_false') {
        Object.assign(payload, {
          correct_answer: questionForm.correct_answer === 'true'
        })
      } else {
        Object.assign(payload, {
          correct_answer: questionForm.correct_answer
        })
      }

      if (editingQuestion) {
        await api.put(`/learning/questions/${editingQuestion.id}/`, payload)
        toast.success('Question updated successfully')
      } else {
        await api.post('/learning/questions/', payload)
        toast.success('Question added successfully')
      }

      setShowForm(false)
      resetForm()
      fetchQuizAndQuestions()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save question')
    }
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      correct_answer: question.correct_answer,
      points: question.points,
      explanation: question.explanation || '',
      choices: question.choices || [
        { choice_text: '', is_correct: false, order: 0 },
        { choice_text: '', is_correct: false, order: 1 },
        { choice_text: '', is_correct: false, order: 2 },
        { choice_text: '', is_correct: false, order: 3 }
      ]
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      await api.delete(`/learning/questions/${id}/`)
      toast.success('Question deleted')
      fetchQuizAndQuestions()
    } catch (error) {
      toast.error('Failed to delete question')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-6">
          <button
            onClick={() => navigate('/learning-admin')}
            className="mb-3 px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Learning Admin
          </button>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Question Management
          </h1>
          <p className="text-purple-100">
            {quiz?.title} - {questions.length} {questions.length === 1 ? 'question' : 'questions'}
          </p>
        </div>

        {/* Add Question Button */}
        {!showForm && (
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="w-full mb-6 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Question
          </button>
        )}

        {/* Question Form */}
        {showForm && (
          <div className="bg-slate-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Question Text */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Question Text <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-purple-600 outline-none"
                  rows={3}
                  placeholder="Enter your question..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Question Type */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Question Type</label>
                  <select
                    value={questionForm.question_type}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True/False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                {/* Points */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Points</label>
                  <input
                    type="number"
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              {/* Multiple Choice Options */}
              {questionForm.question_type === 'multiple_choice' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-slate-400">
                      Answer Choices <span className="text-red-400">*</span>
                    </label>
                    <button
                      onClick={handleAddChoice}
                      className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Choice
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {questionForm.choices.map((choice, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={choice.choice_text}
                          onChange={(e) => handleChoiceChange(index, 'choice_text', e.target.value)}
                          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg"
                          placeholder={`Choice ${index + 1}`}
                        />
                        <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg cursor-pointer">
                          <input
                            type="radio"
                            checked={choice.is_correct}
                            onChange={() => handleChoiceChange(index, 'is_correct', true)}
                            className="text-purple-600"
                          />
                          <span className="text-white text-sm">Correct</span>
                        </label>
                        {questionForm.choices.length > 2 && (
                          <button
                            onClick={() => handleRemoveChoice(index)}
                            className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* True/False */}
              {questionForm.question_type === 'true_false' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Correct Answer <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 px-6 py-3 bg-slate-700 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        checked={questionForm.correct_answer === 'true'}
                        onChange={() => setQuestionForm({ ...questionForm, correct_answer: 'true' })}
                        className="text-purple-600"
                      />
                      <span className="text-white">True</span>
                    </label>
                    <label className="flex items-center gap-2 px-6 py-3 bg-slate-700 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        checked={questionForm.correct_answer === 'false'}
                        onChange={() => setQuestionForm({ ...questionForm, correct_answer: 'false' })}
                        className="text-purple-600"
                      />
                      <span className="text-white">False</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Short Answer */}
              {questionForm.question_type === 'short_answer' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Expected Answer <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg"
                    placeholder="Enter the expected answer..."
                  />
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Explanation (Optional)
                </label>
                <textarea
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border-2 border-slate-600 focus:border-purple-600 outline-none"
                  rows={2}
                  placeholder="Explain the correct answer (shown after submission)..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-12 text-center">
              <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Questions Yet</h3>
              <p className="text-slate-400">Add your first question to get started!</p>
            </div>
          ) : (
            questions.map((question, index) => (
              <div key={question.id} className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full font-bold">
                        {index + 1}
                      </span>
                      <span className="px-3 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full">
                        {question.question_type.replace('_', ' ')}
                      </span>
                      <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full">
                        {question.points} {question.points === 1 ? 'point' : 'points'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {question.question_text}
                    </h3>
                    
                    {/* Show choices for multiple choice */}
                    {question.question_type === 'multiple_choice' && question.choices && (
                      <div className="space-y-2 ml-11">
                        {question.choices.map((choice, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 p-2 rounded ${
                              choice.is_correct ? 'bg-green-600/20 text-green-400' : 'text-slate-400'
                            }`}
                          >
                            {choice.is_correct && <CheckCircle className="w-4 h-4" />}
                            <span>{choice.choice_text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show answer for other types */}
                    {question.question_type !== 'multiple_choice' && (
                      <div className="ml-11 mt-2">
                        <span className="text-sm text-slate-500">Correct Answer: </span>
                        <span className="text-green-400">
                          {question.question_type === 'true_false' 
                            ? (question.correct_answer ? 'True' : 'False')
                            : question.correct_answer}
                        </span>
                      </div>
                    )}

                    {question.explanation && (
                      <div className="ml-11 mt-2 p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-sm text-slate-500">Explanation: </span>
                        <span className="text-slate-300">{question.explanation}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(question)}
                      className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
