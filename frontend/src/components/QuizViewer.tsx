import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, RotateCcw, Trophy, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface Choice {
  id: string
  text: string
  isCorrect: boolean
}

interface Question {
  number: number
  title: string
  type: string
  points: number
  choices?: Choice[]
}

interface QuizViewerProps {
  content: string
  quizId: string
  passingScore: number
  timeLimit: number
  maxAttempts: number
  onComplete: (score: number, passed: boolean) => void
}

export default function QuizViewer({ content, quizId, passingScore, timeLimit, maxAttempts, onComplete }: QuizViewerProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({})
  const [quizState, setQuizState] = useState<'taking' | 'passed' | 'failed'>('taking')
  const [score, setScore] = useState(0)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [attemptsRemaining, setAttemptsRemaining] = useState(maxAttempts)
  const [startTime] = useState(Date.now())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    parseQuestions()
  }, [content])

  const parseQuestions = () => {
    const slideRegex = /<div class="module-slide" data-slide="(\d+)">([\s\S]*?)(?=<div class="module-slide"|$)/g
    const matches = Array.from(content.matchAll(slideRegex))

    const parsedQuestions: Question[] = matches.map((match, index) => {
      const slideContent = match[2]

      const titleMatch = slideContent.match(/Question \d+:\s*([^<]+)/)
      const title = titleMatch ? titleMatch[1].trim() : `Question ${index + 1}`

      let type = 'multiple_choice'
      if (slideContent.includes('TRUE') && slideContent.includes('FALSE')) type = 'true_false'
      else if (slideContent.includes('SHORT ANSWER')) type = 'short_answer'
      else if (slideContent.includes('ESSAY')) type = 'essay'
      else if (slideContent.includes('ENUMERATION')) type = 'enumeration'

      const pointsMatch = slideContent.match(/(\d+)\s*points?/i)
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 1

      let choices: Choice[] = []
      if (type === 'multiple_choice' || type === 'true_false') {
        const choiceRegex = /data-choice-id="([^"]*)"[^>]*data-correct="([^"]*)"[^>]*>[\s\S]*?([A-Z])\.\s*([^<]+)/g
        const choiceMatches = Array.from(slideContent.matchAll(choiceRegex))
        choices = choiceMatches.map(cm => ({
          id: cm[1],
          text: cm[4].trim(),
          isCorrect: cm[2] === 'true'
        }))

        if (choices.length === 0) {
          const simpleChoiceRegex = /<span[^>]*>([A-D])\.\s*([^<]+)<\/span>/g
          const simpleMatches = Array.from(slideContent.matchAll(simpleChoiceRegex))
          choices = simpleMatches.map((cm, i) => ({
            id: cm[1],
            text: cm[2].trim(),
            isCorrect: i === 0
          }))
        }
      }

      return { number: index + 1, title, type, points, choices }
    })

    setQuestions(parsedQuestions.length > 0 ? parsedQuestions : [{
      number: 1, title: 'Question', type: 'multiple_choice', points: 1, choices: []
    }])
  }

  const handleCheckboxChange = (questionNumber: number, choiceId: string) => {
    const currentAnswers = (answers[questionNumber] as string[]) || []
    const newAnswers = currentAnswers.includes(choiceId)
      ? currentAnswers.filter(id => id !== choiceId)
      : [...currentAnswers, choiceId]
    setAnswers({ ...answers, [questionNumber]: newAnswers })
  }

  const handleTextChange = (questionNumber: number, text: string) => {
    setAnswers({ ...answers, [questionNumber]: text })
  }

  const calculateScore = () => {
    let earned = 0
    let total = 0

    questions.forEach(question => {
      total += question.points
      const userAnswer = answers[question.number]

      if (question.type === 'multiple_choice' && question.choices) {
        const correctChoices = question.choices.filter(c => c.isCorrect).map(c => c.id)
        const userChoices = (userAnswer as string[]) || []
        const allCorrect = correctChoices.every(id => userChoices.includes(id))
        const noWrong = userChoices.every(id => correctChoices.includes(id))
        if (allCorrect && noWrong && userChoices.length > 0) earned += question.points
      } else if (question.type === 'true_false' && question.choices) {
        const correctChoice = question.choices.find(c => c.isCorrect)
        const userChoices = (userAnswer as string[]) || []
        if (correctChoice && userChoices.includes(correctChoice.id)) earned += question.points
      } else if (userAnswer && typeof userAnswer === 'string' && userAnswer.trim()) {
        earned += question.points
      }
    })

    return { earned, total, percentage: total > 0 ? Math.round((earned / total) * 100) : 0 }
  }

  const handleSubmit = async () => {
    const { earned, total, percentage } = calculateScore()
    const quizPassed = percentage >= passingScore
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)

    try {
      setSubmitting(true)
      const response = await api.post(`/learning/quizzes/${quizId}/submit_simple/`, {
        score: percentage,
        points_earned: earned,
        total_points: total,
        time_taken_seconds: timeTaken
      })

      setScore(percentage)
      setPointsEarned(earned)
      setTotalPoints(total)
      setAttemptsUsed(response.data.attempts_used || 1)
      setAttemptsRemaining(response.data.attempts_remaining || 0)
      setQuizState(quizPassed ? 'passed' : 'failed')

      if (quizPassed) {
        toast.success(`🎉 Congratulations! You passed with ${percentage}%!`)
        onComplete(percentage, true)
      } else {
        toast.error(`Score: ${percentage}%. You need ${passingScore}% to pass.`)
        onComplete(percentage, false)
      }
    } catch (error: any) {
      console.error('Failed to submit quiz:', error)
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('Maximum attempts')) {
        toast.error('You have used all your attempts for this quiz.')
        setAttemptsRemaining(0)
      } else {
        toast.error(error.response?.data?.detail || 'Failed to submit quiz')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setCurrentQuestionIndex(0)
    setQuizState('taking')
    setScore(0)
    setPointsEarned(0)
    setTotalPoints(0)
  }

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index)
    }
  }

  const isAnswered = (qNum: number) => {
    const ans = answers[qNum]
    if (Array.isArray(ans)) return ans.length > 0
    return !!ans && ans.trim() !== ''
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading quiz questions...</p>
      </div>
    )
  }

  // PASSED SCREEN - Compact for mobile
  if (quizState === 'passed') {
    return (
      <div className="max-w-md mx-auto text-center py-4 sm:py-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
          🎉 Congratulations!
        </h2>
        <p className="text-sm sm:text-base text-green-400 mb-4">You passed the quiz!</p>

        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-green-500/30">
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{score}%</p>
              <p className="text-xs text-slate-400">Score</p>
            </div>
            <div className="w-px h-10 bg-slate-600"></div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-400">{pointsEarned}/{totalPoints}</p>
              <p className="text-xs text-slate-400">Points</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700">
            Passing: {passingScore}% • Attempts: {attemptsUsed}/{maxAttempts}
          </p>
        </div>

        <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2 justify-center">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-300 text-sm font-medium">Module Complete! Proceed to next.</p>
        </div>
      </div>
    )
  }

  // FAILED SCREEN - Compact for mobile
  if (quizState === 'failed') {
    return (
      <div className="max-w-md mx-auto text-center py-4 sm:py-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
          <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Quiz Not Passed</h2>
        <p className="text-sm text-red-400 mb-4">Review and try again.</p>

        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-red-500/30">
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-red-400">{score}%</p>
              <p className="text-xs text-slate-400">Score</p>
            </div>
            <div className="w-px h-10 bg-slate-600"></div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-400">{pointsEarned}/{totalPoints}</p>
              <p className="text-xs text-slate-400">Points</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700">
            Need: {passingScore}% • Attempts: {attemptsUsed}/{maxAttempts}
          </p>
        </div>

        {attemptsRemaining > 0 ? (
          <div className="space-y-3">
            <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2 justify-center">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <p className="text-yellow-300 text-sm">{attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} left</p>
            </div>
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Quiz
            </button>
          </div>
        ) : (
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 justify-center">
            <XCircle className="w-4 h-4 text-red-400" />
            <p className="text-red-300 text-sm">No attempts remaining</p>
          </div>
        )}
      </div>
    )
  }

  // QUIZ TAKING SCREEN
  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  const renderQuestionInput = () => {
    const { type, choices, number } = currentQuestion
    const userAnswer = answers[number]

    if (type === 'multiple_choice' && choices && choices.length > 0) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-400 mb-4">Select all correct answers:</p>
          {choices.map((choice, index) => {
            const isSelected = ((userAnswer as string[]) || []).includes(choice.id)
            return (
              <label
                key={choice.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleCheckboxChange(number, choice.id)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="font-medium text-blue-400 mr-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                <span className="flex-1">{choice.text}</span>
              </label>
            )
          })}
        </div>
      )
    }

    if (type === 'true_false') {
      const options = [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }]
      return (
        <div className="space-y-3">
          {options.map((option) => {
            const isSelected = ((userAnswer as string[]) || []).includes(option.id)
            return (
              <label
                key={option.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => setAnswers({ ...answers, [number]: [option.id] })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">{option.text}</span>
              </label>
            )
          })}
        </div>
      )
    }

    if (type === 'enumeration' || type === 'short_answer') {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-400 mb-4">Type your answer:</p>
          <input
            type="text"
            value={(userAnswer as string) || ''}
            onChange={(e) => handleTextChange(number, e.target.value)}
            placeholder="Enter your answer..."
            className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-0 text-lg"
          />
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-400 mb-4">Write your answer:</p>
        <textarea
          value={(userAnswer as string) || ''}
          onChange={(e) => handleTextChange(number, e.target.value)}
          rows={5}
          placeholder="Type your answer here..."
          className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-0 resize-none"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-slate-400">
            Answered: {questions.filter(q => isAnswered(q.number)).length}/{questions.length}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-slate-800/50 rounded-xl p-6 sm:p-8 border border-slate-700">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium">
              Question {currentQuestion.number}
            </span>
            <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-lg text-sm">
              {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {currentQuestion.title}
          </h3>
        </div>
        {renderQuestionInput()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex gap-2 overflow-x-auto max-w-[200px] sm:max-w-none">
          {questions.map((q, index) => (
            <button
              key={q.number}
              onClick={() => goToQuestion(index)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm font-medium transition flex-shrink-0 ${index === currentQuestionIndex
                ? 'bg-blue-600 text-white'
                : isAnswered(q.number)
                  ? 'bg-green-600/30 text-green-400 border border-green-600/50'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
            >
              {q.number}
            </button>
          ))}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition font-medium"
          >
            {submitting ? 'Submitting...' : 'Submit'}
            <CheckCircle className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
