import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Clock, CheckCircle, XCircle, AlertCircle, Award, 
  ArrowRight, ArrowLeft, Flag, Trophy, Timer
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface Question {
  id: string
  question_text: string
  question_type: string
  points: number
  order: number
  choices?: Array<{
    id: string
    choice_text: string
    order: number
  }>
}

interface Quiz {
  id: string
  title: string
  description: string
  time_limit_minutes: number
  passing_score: number
  max_attempts: number
  randomize_questions: boolean
  questions: Question[]
}

export default function QuizTaking() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchQuiz()
  }, [quizId])

  useEffect(() => {
    if (quizStarted && timeRemaining > 0 && !quizCompleted) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [quizStarted, timeRemaining, quizCompleted])

  const fetchQuiz = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/learning/quizzes/${quizId}/`)
      setQuiz(response.data)
      setTimeRemaining(response.data.time_limit_minutes * 60)
    } catch (error) {
      console.error('Failed to fetch quiz:', error)
      toast.error('Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = () => {
    setQuizStarted(true)
    toast.success('Quiz started! Good luck!')
  }

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers({ ...answers, [questionId]: answer })
  }

  const toggleFlag = (index: number) => {
    const newFlagged = new Set(flaggedQuestions)
    if (newFlagged.has(index)) {
      newFlagged.delete(index)
    } else {
      newFlagged.add(index)
    }
    setFlaggedQuestions(newFlagged)
  }

  const handleSubmitQuiz = async () => {
    if (submitting) return

    const unanswered = quiz?.questions.filter((q) => !answers[q.id]) || []
    if (unanswered.length > 0 && !quizCompleted) {
      if (!confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) {
        return
      }
    }

    try {
      setSubmitting(true)
      const response = await api.post(`/learning/quizzes/${quizId}/submit/`, {
        answers
      })
      
      setScore(response.data.score)
      setQuizCompleted(true)
      toast.success(
        response.data.score >= (quiz?.passing_score || 70)
          ? 'Congratulations! You passed!'
          : 'Quiz completed. Keep practicing!'
      )
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = () => {
    if (timeRemaining < 60) return 'text-red-400'
    if (timeRemaining < 300) return 'text-yellow-400'
    return 'text-green-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading quiz...</div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-400 text-xl">Quiz not found</div>
      </div>
    )
  }

  // Quiz Start Screen
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 mb-6">
            <h1 className="text-4xl font-bold text-white mb-4">{quiz.title}</h1>
            <p className="text-purple-100 text-lg">{quiz.description}</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Quiz Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl">
                <Clock className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-slate-400 text-sm">Time Limit</div>
                  <div className="text-white text-xl font-bold">{quiz.time_limit_minutes} minutes</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-slate-400 text-sm">Passing Score</div>
                  <div className="text-white text-xl font-bold">{quiz.passing_score}%</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl">
                <AlertCircle className="w-8 h-8 text-yellow-400" />
                <div>
                  <div className="text-slate-400 text-sm">Questions</div>
                  <div className="text-white text-xl font-bold">{quiz.questions?.length || 0}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl">
                <Award className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-slate-400 text-sm">Max Attempts</div>
                  <div className="text-white text-xl font-bold">{quiz.max_attempts}</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600/20 border border-blue-600 rounded-xl p-4 mb-6">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Important Instructions
              </h3>
              <ul className="text-slate-300 space-y-2 ml-6 list-disc">
                <li>Once started, the timer cannot be paused</li>
                <li>You can navigate between questions freely</li>
                <li>Flag questions to review them later</li>
                <li>Quiz will auto-submit when time expires</li>
                <li>Make sure you have a stable internet connection</li>
              </ul>
            </div>

            <button
              onClick={startQuiz}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition flex items-center justify-center gap-2"
            >
              Start Quiz
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Quiz Results Screen
  if (quizCompleted && score !== null) {
    const passed = score >= quiz.passing_score
    
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className={`bg-gradient-to-r ${passed ? 'from-green-600 to-emerald-600' : 'from-red-600 to-pink-600'} rounded-2xl p-8 mb-6`}>
            <div className="text-center">
              {passed ? (
                <Trophy className="w-20 h-20 text-white mx-auto mb-4" />
              ) : (
                <XCircle className="w-20 h-20 text-white mx-auto mb-4" />
              )}
              <h1 className="text-4xl font-bold text-white mb-2">
                {passed ? 'Congratulations!' : 'Quiz Completed'}
              </h1>
              <p className="text-white/90 text-lg">
                {passed ? 'You passed the quiz!' : 'Keep practicing to improve your score'}
              </p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">Your Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-slate-700/50 rounded-xl">
                <div className="text-4xl font-bold text-white mb-2">{score}%</div>
                <div className="text-slate-400">Your Score</div>
              </div>

              <div className="text-center p-6 bg-slate-700/50 rounded-xl">
                <div className="text-4xl font-bold text-white mb-2">{quiz.passing_score}%</div>
                <div className="text-slate-400">Passing Score</div>
              </div>

              <div className="text-center p-6 bg-slate-700/50 rounded-xl">
                <div className={`text-4xl font-bold mb-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
                  {passed ? 'PASSED' : 'FAILED'}
                </div>
                <div className="text-slate-400">Status</div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate('/learning')}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition"
              >
                Back to Learning
              </button>
              {!passed && (
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz Taking Screen
  const question = quiz.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header with Timer */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
              <p className="text-slate-400 text-sm">
                Question {currentQuestion + 1} of {quiz.questions.length}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className={`flex items-center gap-2 ${getTimeColor()} font-mono text-xl font-bold`}>
                <Timer className="w-6 h-6" />
                {formatTime(timeRemaining)}
              </div>

              <button
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-xl p-4 sticky top-24">
              <h3 className="text-white font-semibold mb-4">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                {quiz.questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(index)}
                    className={`
                      aspect-square rounded-lg font-semibold transition-all
                      ${index === currentQuestion 
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400' 
                        : answers[q.id]
                          ? 'bg-green-600/20 text-green-400 border border-green-600'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }
                      ${flaggedQuestions.has(index) ? 'ring-2 ring-yellow-400' : ''}
                    `}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-4 h-4 bg-green-600/20 border border-green-600 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-4 h-4 bg-slate-700 rounded"></div>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-4 h-4 bg-purple-600 rounded"></div>
                  <span>Current</span>
                </div>
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800 rounded-xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="text-purple-400 text-sm font-semibold mb-2">
                    Question {currentQuestion + 1}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">
                    {question.question_text}
                  </h2>
                  <div className="text-slate-400 text-sm">
                    {question.points} {question.points === 1 ? 'point' : 'points'}
                  </div>
                </div>

                <button
                  onClick={() => toggleFlag(currentQuestion)}
                  className={`p-2 rounded-lg transition ${
                    flaggedQuestions.has(currentQuestion)
                      ? 'bg-yellow-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                  title="Flag for review"
                >
                  <Flag className="w-5 h-5" />
                </button>
              </div>

              {/* Answer Options */}
              <div className="space-y-3 mb-8">
                {question.question_type === 'multiple_choice' && question.choices?.map((choice) => (
                  <label
                    key={choice.id}
                    className={`
                      block p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${answers[question.id] === choice.id
                        ? 'border-purple-600 bg-purple-600/20'
                        : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        checked={answers[question.id] === choice.id}
                        onChange={() => handleAnswerChange(question.id, choice.id)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <span className="text-white text-lg">{choice.choice_text}</span>
                    </div>
                  </label>
                ))}

                {question.question_type === 'true_false' && (
                  <>
                    <label
                      className={`
                        block p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${answers[question.id] === true
                          ? 'border-purple-600 bg-purple-600/20'
                          : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={answers[question.id] === true}
                          onChange={() => handleAnswerChange(question.id, true)}
                          className="w-5 h-5 text-purple-600"
                        />
                        <span className="text-white text-lg">True</span>
                      </div>
                    </label>

                    <label
                      className={`
                        block p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${answers[question.id] === false
                          ? 'border-purple-600 bg-purple-600/20'
                          : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={answers[question.id] === false}
                          onChange={() => handleAnswerChange(question.id, false)}
                          className="w-5 h-5 text-purple-600"
                        />
                        <span className="text-white text-lg">False</span>
                      </div>
                    </label>
                  </>
                )}

                {question.question_type === 'short_answer' && (
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border-2 border-slate-600 focus:border-purple-600 outline-none resize-none"
                    rows={4}
                    placeholder="Type your answer here..."
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-700">
                <button
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="px-6 py-3 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Previous
                </button>

                {currentQuestion < quiz.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    Submit Quiz
                    <CheckCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
