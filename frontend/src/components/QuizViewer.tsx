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
    // Kept as a fallback only, for the unlikely case the server omits a figure.
    const { earned, total, percentage } = calculateScore()
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)

    try {
      setSubmitting(true)
      // The answers are what gets sent; the server grades them and its result
      // is what we display. This used to post `score` and nothing else, so the
      // browser was both the only thing that knew the correct answers and the
      // sole authority on the grade - a student could post any score they liked.
      const response = await api.post(`/learning/quizzes/${quizId}/submit_simple/`, {
        answers,
        time_taken_seconds: timeTaken
      })

      // Everything shown comes from the server's grading, including pass/fail.
      // Reporting the locally computed result would mean a student sees one
      // outcome while a different one is recorded against them.
      const serverScore = response.data.score ?? percentage
      const serverPassed = response.data.passed ?? serverScore >= passingScore

      setScore(serverScore)
      setPointsEarned(response.data.points_earned ?? earned)
      setTotalPoints(response.data.total_points ?? total)
      setAttemptsUsed(response.data.attempts_used || 1)
      setAttemptsRemaining(response.data.attempts_remaining || 0)
      setQuizState(serverPassed ? 'passed' : 'failed')

      if (serverPassed) {
        toast.success(`Congratulations! You passed with ${serverScore}%.`)
        onComplete(serverScore, true)
      } else {
        toast.error(`Score: ${serverScore}%. You need ${passingScore}% to pass.`)
        onComplete(serverScore, false)
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
        <p className="text-neutral-400">Loading quiz questions...</p>
      </div>
    )
  }

  // PASSED SCREEN - Compact for mobile
  if (quizState === 'passed') {
    return (
      <div className="max-w-md mx-auto text-center py-4 sm:py-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
          Congratulations!
        </h2>
        <p className="text-sm sm:text-base text-green-400 mb-4">You passed the quiz.</p>

        <div className="bg-neutral-900 rounded-xl p-4 mb-4 border border-neutral-800">
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-green-400 tabular-nums">{score}%</p>
              <p className="text-xs text-neutral-400">Score</p>
            </div>
            <div className="w-px h-10 bg-neutral-700"></div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{pointsEarned}/{totalPoints}</p>
              <p className="text-xs text-neutral-400">Points</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-800 tabular-nums">
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
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">Quiz Not Passed</h2>
        <p className="text-sm text-red-400 mb-4">Review and try again.</p>

        <div className="bg-neutral-900 rounded-xl p-4 mb-4 border border-neutral-800">
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-red-400 tabular-nums">{score}%</p>
              <p className="text-xs text-neutral-400">Score</p>
            </div>
            <div className="w-px h-10 bg-neutral-700"></div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{pointsEarned}/{totalPoints}</p>
              <p className="text-xs text-neutral-400">Points</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-800 tabular-nums">
            Need: {passingScore}% • Attempts: {attemptsUsed}/{maxAttempts}
          </p>
        </div>

        {attemptsRemaining > 0 ? (
          <div className="space-y-3">
            <div className="bg-amber-600/20 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2 justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-amber-300 text-sm">{attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} left</p>
            </div>
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
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
          <p className="text-sm text-neutral-400 mb-4">Select all correct answers:</p>
          {choices.map((choice, index) => {
            const isSelected = ((userAnswer as string[]) || []).includes(choice.id)
            return (
              <label
                key={choice.id}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${isSelected
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleCheckboxChange(number, choice.id)}
                  className="sr-only"
                />
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${isSelected
                    ? 'bg-white/15 text-white'
                    : 'bg-neutral-700/60 text-neutral-300'
                    }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{choice.text}</span>
                {isSelected && <CheckCircle className="w-5 h-5 shrink-0 text-white/80" />}
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
          {options.map((option, index) => {
            const isSelected = ((userAnswer as string[]) || []).includes(option.id)
            return (
              <label
                key={option.id}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${isSelected
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600'
                  }`}
              >
                <input
                  type="radio"
                  name={`question-${number}`}
                  checked={isSelected}
                  onChange={() => setAnswers({ ...answers, [number]: [option.id] })}
                  className="sr-only"
                />
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${isSelected
                    ? 'bg-white/15 text-white'
                    : 'bg-neutral-700/60 text-neutral-300'
                    }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 font-medium">{option.text}</span>
                {isSelected && <CheckCircle className="w-5 h-5 shrink-0 text-white/80" />}
              </label>
            )
          })}
        </div>
      )
    }

    if (type === 'enumeration' || type === 'short_answer') {
      return (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400 mb-4">Type your answer:</p>
          <input
            type="text"
            value={(userAnswer as string) || ''}
            onChange={(e) => handleTextChange(number, e.target.value)}
            placeholder="Enter your answer..."
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-lg"
          />
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-400 mb-4">Write your answer:</p>
        <textarea
          value={(userAnswer as string) || ''}
          onChange={(e) => handleTextChange(number, e.target.value)}
          rows={5}
          placeholder="Type your answer here..."
          className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-400 tabular-nums">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-neutral-400 tabular-nums">
            Answered: {questions.filter(q => isAnswered(q.number)).length}/{questions.length}
          </span>
        </div>
        <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-purple-500 h-2 rounded-full transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-neutral-900 rounded-xl p-6 sm:p-8 border border-neutral-800">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full border border-neutral-700 bg-neutral-800 text-neutral-300 text-xs font-medium">
              Question {currentQuestion.number}
            </span>
            <span className="px-2.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium">
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
          className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex gap-2 overflow-x-auto max-w-[200px] sm:max-w-none">
          {questions.map((q, index) => (
            <button
              key={q.number}
              onClick={() => goToQuestion(index)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm font-medium tabular-nums transition-colors flex-shrink-0 ${index === currentQuestionIndex
                ? 'bg-purple-600 text-white'
                : isAnswered(q.number)
                  ? 'bg-green-500/15 text-green-300 border border-green-500/30'
                  : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
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
            className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
          >
            {submitting ? 'Submitting…' : 'Submit'}
            <CheckCircle className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-100 rounded-lg transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
