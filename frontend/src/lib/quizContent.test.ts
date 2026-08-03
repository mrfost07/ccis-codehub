import { describe, expect, it } from 'vitest'

import {
  buildQuizContent,
  parseQuizContent,
  type QuizQuestion,
} from './quizContent'

/**
 * The editor could not read back what it had just written.
 *
 * Its serializer emitted data-choice-id="1" data-correct="true" while its parser
 * looked for data-choice="A" data-correct="A". Nothing matched, so parsing fell
 * through to a fallback that produced four blank options with A marked correct,
 * and saving wrote that over the real question bank. Opening a quiz and pressing
 * save destroyed it.
 *
 * The round-trip test below is the one that would have caught it.
 */

const QUESTIONS: QuizQuestion[] = [
  {
    id: '1',
    title: 'Capital of France',
    content: '<p>Which city is the capital of France?</p>',
    type: 'multiple_choice',
    points: 2,
    choices: [
      { id: '1', text: 'Berlin', isCorrect: false },
      { id: '2', text: 'Paris', isCorrect: true },
      { id: '3', text: 'Madrid', isCorrect: false },
    ],
  },
  {
    id: '2',
    title: 'Water Boils',
    content: '<p>Water boils at 100 degrees Celsius at sea level.</p>',
    type: 'true_false',
    points: 1,
    choices: [
      { id: '1', text: 'True', isCorrect: true },
      { id: '2', text: 'False', isCorrect: false },
    ],
  },
]

// What the seeded course emits: a separator after EVERY question, including the
// last. The old parser split on that separator and produced a bogus empty
// question at the end.
const SEEDED = `<div class="module-slide" data-slide="1">
          <h2 style="color: #60a5fa;">
            Question 1: Where the Effort Goes
          </h2>
          <div class="question-content" style="margin-bottom: 1.5rem;">
            <p>Which two stages consume the most work?</p>
          </div>
          <div class="question-info" style="color: #94a3b8;">
            <span>MULTIPLE CHOICE</span>
            <span>1 point</span>
          </div>
          <div class="quiz-choices" style="margin-top: 1rem;">
            <div class="quiz-choice" style="padding: 0.75rem;" data-choice-id="1" data-correct="false">
              <label><input type="radio" name="question-1" value="1"><span>A. Asking and communicating</span></label>
            </div>
            <div class="quiz-choice" style="padding: 0.75rem;" data-choice-id="2" data-correct="true">
              <label><input type="radio" name="question-1" value="2"><span>B. Cleaning and exploring</span></label>
            </div>
          </div>
          <hr class="slide-separator" />
        </div>`

describe('parseQuizContent', () => {
  it('returns nothing for empty content', () => {
    expect(parseQuizContent('')).toEqual([])
    expect(parseQuizContent(undefined as unknown as string)).toEqual([])
  })

  it('reads the format the serializer writes', () => {
    const parsed = parseQuizContent(buildQuizContent(QUESTIONS))

    expect(parsed).toHaveLength(2)
    expect(parsed[0].title).toBe('Capital of France')
    expect(parsed[0].type).toBe('multiple_choice')
    expect(parsed[0].points).toBe(2)
    expect(parsed[0].choices?.map(c => c.text)).toEqual(['Berlin', 'Paris', 'Madrid'])
    expect(parsed[0].choices?.filter(c => c.isCorrect).map(c => c.id)).toEqual(['2'])
  })

  it('detects true/false from the type label', () => {
    const parsed = parseQuizContent(buildQuizContent(QUESTIONS))
    expect(parsed[1].type).toBe('true_false')
    expect(parsed[1].choices?.find(c => c.isCorrect)?.text).toBe('True')
  })

  it('reads seeded content without inventing a trailing question', () => {
    // The old parser split on '<hr class="slide-separator"', and seeded content
    // ends every question with one, so it produced an extra empty question.
    const parsed = parseQuizContent(SEEDED)

    expect(parsed).toHaveLength(1)
    expect(parsed[0].title).toBe('Where the Effort Goes')
    expect(parsed[0].choices?.filter(c => c.isCorrect).map(c => c.id)).toEqual(['2'])
  })

  it('never invents blank choices with the first marked correct', () => {
    // This exact fallback is what overwrote real question banks on save.
    const unreadable = SEEDED.replace(/data-choice-id/g, 'data-broken-id')
    const parsed = parseQuizContent(unreadable)

    expect(parsed).toHaveLength(1)
    expect(parsed[0].choices).toEqual([])
  })

  it('keeps the question body', () => {
    const parsed = parseQuizContent(buildQuizContent(QUESTIONS))
    expect(parsed[0].content).toContain('capital of France')
  })

  it('survives a choice label wrapped in an inline tag', () => {
    // Many hand-authored quizzes wrap options in <code>, which truncates the
    // label. The option must still be found, and its correctness preserved,
    // even though the text comes back empty.
    const withCode = SEEDED.replace(
      '<span>B. Cleaning and exploring</span>',
      '<span>B. <code>Cleaning</code></span>',
    )
    const parsed = parseQuizContent(withCode)

    expect(parsed[0].choices).toHaveLength(2)
    expect(parsed[0].choices?.filter(c => c.isCorrect).map(c => c.id)).toEqual(['2'])
  })
})

describe('round trip', () => {
  it('preserves every question through parse then build then parse', () => {
    const once = parseQuizContent(buildQuizContent(QUESTIONS))
    const twice = parseQuizContent(buildQuizContent(once))

    expect(twice).toHaveLength(QUESTIONS.length)
    twice.forEach((question, index) => {
      expect(question.title).toBe(QUESTIONS[index].title)
      expect(question.type).toBe(QUESTIONS[index].type)
      expect(question.points).toBe(QUESTIONS[index].points)
      expect(question.choices?.map(c => c.text)).toEqual(
        QUESTIONS[index].choices?.map(c => c.text),
      )
      expect(question.choices?.map(c => c.isCorrect)).toEqual(
        QUESTIONS[index].choices?.map(c => c.isCorrect),
      )
    })
  })

  it('is stable: a second build produces identical markup', () => {
    const first = buildQuizContent(parseQuizContent(buildQuizContent(QUESTIONS)))
    const second = buildQuizContent(parseQuizContent(first))
    expect(second).toBe(first)
  })

  it('does not lose the correct answer after an edit and save cycle', () => {
    // Simulates the destructive path: open a saved quiz, change only the title,
    // save. Previously this returned four blank options with A correct.
    const stored = buildQuizContent(QUESTIONS)
    const opened = parseQuizContent(stored)
    opened[0].title = 'Renamed question'
    const saved = buildQuizContent(opened)
    const reopened = parseQuizContent(saved)

    expect(reopened[0].title).toBe('Renamed question')
    expect(reopened[0].choices?.map(c => c.text)).toEqual(['Berlin', 'Paris', 'Madrid'])
    expect(reopened[0].choices?.filter(c => c.isCorrect).map(c => c.text)).toEqual(['Paris'])
  })
})

describe('free-text questions', () => {
  it('round-trips an essay question without choices', () => {
    const essay: QuizQuestion[] = [{
      id: '1', title: 'Explain overfitting', content: '<p>In your own words.</p>',
      type: 'essay', points: 5,
    }]
    const parsed = parseQuizContent(buildQuizContent(essay))

    expect(parsed[0].type).toBe('essay')
    expect(parsed[0].points).toBe(5)
    expect(parsed[0].choices).toBeUndefined()
  })

  it('round-trips a short answer question', () => {
    const short: QuizQuestion[] = [{
      id: '1', title: 'Name the metric', content: '<p>Which metric?</p>',
      type: 'short_answer', points: 1,
    }]
    expect(parseQuizContent(buildQuizContent(short))[0].type).toBe('short_answer')
  })
})
