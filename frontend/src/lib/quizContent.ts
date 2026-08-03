/**
 * Read and write the HTML that slide-based quizzes are stored as.
 *
 * Quiz questions are not stored relationally anywhere in this project -
 * Quiz.questions is empty for every quiz in the database - so this markup IS the
 * question bank. Three separate pieces of code read it: the student quiz player,
 * the instructor editor, and (since server-side grading) the backend at
 * apps/learning/quiz_content.py.
 *
 * Parser and serializer live in one file deliberately. They were previously
 * apart, in InstructorDashboard.tsx, and had drifted to the point where the
 * editor could not read back what it had just written:
 *
 *   the serializer wrote   data-choice-id="1" data-correct="true"
 *   the parser looked for  data-choice="A"    data-correct="A"
 *
 * Nothing matched, so parsing fell through to a fallback that produced four
 * blank options with A marked correct - and saving wrote that back over the real
 * questions. Opening a quiz and pressing save destroyed it.
 *
 * The old parser also split on '<hr class="slide-separator"'. Content written by
 * this file omits the trailing separator, but the seeded course emits one after
 * every question, so splitting produced a bogus empty question at the end.
 * Slides are matched on their opening div instead, which is what the player and
 * the backend both do.
 *
 * If you change the shape here, change apps/learning/quiz_content.py with it.
 * A student is shown one thing and graded on the other.
 */

export type QuizQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'enumeration'

export interface QuizChoice {
  id: string
  text: string
  isCorrect: boolean
}

export interface QuizQuestion {
  id: string
  title: string
  /** Question body, as HTML. */
  content: string
  type: QuizQuestionType
  points: number
  choices?: QuizChoice[]
}

const SLIDE_RE =
  /<div class="module-slide" data-slide="(\d+)">([\s\S]*?)(?=<div class="module-slide"|$)/g
const CHOICE_RE =
  /data-choice-id="([^"]*)"[^>]*data-correct="([^"]*)"[^>]*>[\s\S]*?([A-Z])\.\s*([^<]*)/g
const TITLE_RE = /Question \d+:\s*([^<]+)/
const POINTS_RE = /(\d+)\s*points?/i
const BODY_RE = /<div class="question-content"[^>]*>([\s\S]*?)<\/div>/

/** Question type, sniffed from the slide text exactly as the player does. */
function sniffType(slide: string): QuizQuestionType {
  if (slide.includes('TRUE') && slide.includes('FALSE')) return 'true_false'
  if (slide.includes('SHORT ANSWER')) return 'short_answer'
  if (slide.includes('ESSAY')) return 'essay'
  if (slide.includes('ENUMERATION')) return 'enumeration'
  return 'multiple_choice'
}

export function parseQuizContent(content: string): QuizQuestion[] {
  if (!content) return []

  const questions: QuizQuestion[] = []
  for (const match of Array.from(content.matchAll(SLIDE_RE))) {
    const slide = match[2]
    const index = questions.length

    const titleMatch = slide.match(TITLE_RE)
    const pointsMatch = slide.match(POINTS_RE)
    const bodyMatch = slide.match(BODY_RE)
    const type = sniffType(slide)

    let choices: QuizChoice[] | undefined
    if (type === 'multiple_choice' || type === 'true_false') {
      choices = Array.from(slide.matchAll(CHOICE_RE)).map(([, id, correct, , text]) => ({
        id,
        text: text.trim(),
        isCorrect: correct === 'true',
      }))

      // An empty set means the markup could not be read. Return none rather than
      // inventing four blanks with the first marked correct, which is what the
      // previous fallback did - and then saved over the real question bank.
      if (choices.length === 0) choices = []
    }

    questions.push({
      id: `${index + 1}`,
      title: titleMatch ? titleMatch[1].trim() : `Question ${index + 1}`,
      content: bodyMatch ? bodyMatch[1].trim() : '',
      type,
      points: pointsMatch ? parseInt(pointsMatch[1], 10) : 1,
      choices,
    })
  }
  return questions
}

const CHOICE_STYLE =
  'padding: 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.05); ' +
  'border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; cursor: pointer;'
const LABEL_STYLE = 'display: flex; align-items: center; cursor: pointer;'
const RADIO_STYLE = 'margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;'
const H2_STYLE = 'color: #60a5fa; margin-bottom: 1rem; font-size: 1.5rem; font-weight: bold;'
const INFO_STYLE =
  'display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.875rem; color: #94a3b8;'
const FREE_TEXT_STYLE =
  'width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); ' +
  'border: 1px solid rgba(255,255,255,0.2); border-radius: 0.5rem; color: white;'

function renderChoices(question: QuizQuestion, number: number): string {
  if (question.type === 'short_answer' || question.type === 'enumeration') {
    return `
          <div style="margin-top: 1rem;">
            <input type="text" placeholder="Type your answer here..." style="${FREE_TEXT_STYLE}">
          </div>`
  }
  if (question.type === 'essay') {
    return `
          <div style="margin-top: 1rem;">
            <textarea placeholder="Type your answer here..." rows="4" style="${FREE_TEXT_STYLE}"></textarea>
          </div>`
  }

  const choices = question.choices ?? []
  const rendered = choices
    .map(
      (choice, position) => `
            <div class="quiz-choice" style="${CHOICE_STYLE}" data-choice-id="${choice.id}" data-correct="${choice.isCorrect}">
              <label style="${LABEL_STYLE}">
                <input type="radio" name="question-${number}" value="${choice.id}" style="${RADIO_STYLE}">
                <span style="font-size: 1rem;">${String.fromCharCode(65 + position)}. ${choice.text}</span>
              </label>
            </div>`,
    )
    .join('')

  return `
          <div class="quiz-choices" style="margin-top: 1rem;">${rendered}
          </div>`
}

export function buildQuizContent(questions: QuizQuestion[]): string {
  return questions
    .map((question, index) => {
      const number = index + 1
      const points = question.points ?? 1
      // The player sniffs the type from this label, so 'true_false' has to
      // surface both TRUE and FALSE in capitals.
      const label = question.type.replace(/_/g, ' ').toUpperCase()

      return `<div class="module-slide" data-slide="${number}">
          <h2 style="${H2_STYLE}">
            Question ${number}: ${question.title}
          </h2>
          <div class="question-content" style="margin-bottom: 1.5rem;">
            ${question.content || ''}
          </div>
          <div class="question-info" style="${INFO_STYLE}">
            <span>${label}</span>
            <span>${points} ${points === 1 ? 'point' : 'points'}</span>
          </div>${renderChoices(question, number)}
          <hr class="slide-separator" />
        </div>`
    })
    .join('\n\n')
}
