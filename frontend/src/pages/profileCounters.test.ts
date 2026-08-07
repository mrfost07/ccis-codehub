import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The profile must not read its figures from the denormalised counters on
 * Profile.
 *
 * Those counters are unreliable, and two of them are dead:
 *
 *   `current_streak` and `total_posts` — nothing in the backend ever writes
 *   them. They are 0 for every user on the platform, forever. Production showed
 *   "Total Posts 0" on an account with two posts.
 *
 *   `total_courses_completed` — showed 0 to a student with two finished paths
 *   and two certificates, because nothing updates it when a path completes.
 *
 *   `certificates_earned` and `total_modules_completed` — written on some code
 *   paths and not others, so they drift.
 *
 * Every one of those numbers is computed correctly by /auth/profile/overview/.
 * This is a source check rather than a render test because the failure is a
 * quiet one: reading a dead counter renders a plausible 0 and nothing throws,
 * so a component test only catches it if it happens to assert that exact
 * figure. What actually needs pinning is the rule — don't read these fields.
 */

const PAGES = [
  'ProfileEnhanced.tsx',
  'UserProfileView.tsx',
  // Every figure on this one was wrong: a literal `current_streak: 3` shown to
  // every student, `total_courses_completed` labelled "modules done",
  // certificates counting finished enrolments, and a `total_points` that is
  // not on the profile payload at all.
  'StudentLearningDashboard.tsx',
]

const FORBIDDEN = [
  'current_streak',
  'total_posts',
  'total_courses_completed',
  'total_modules_completed',
  'certificates_earned',
  'total_projects',
  'contribution_points',
]

const source = (file: string) =>
  readFileSync(join(__dirname, file), 'utf8')

/** `profile.x` or `profile?.profile?.x` — a read, not the type declaration. */
const readsCounter = (text: string, field: string) =>
  new RegExp(`profile\\??\\.(?:profile\\??\\.)?${field}\\b`).test(text)

describe.each(PAGES)('%s', file => {
  it.each(FORBIDDEN)('does not show %s from the Profile counter', field => {
    expect(readsCounter(source(file), field)).toBe(false)
  })

  it('does not hand every reader the same invented figure', () => {
    // It shipped `current_streak: 3 // TODO: Calculate actual streak`, so
    // every student on the platform was congratulated on a three-day streak.
    // A zero initial value is honest; a non-zero literal is not.
    expect(source(file)).not.toMatch(/(streak|solved|completed|earned):\s*[1-9]/)
  })

  it('takes its figures from the overview endpoint instead', () => {
    // Guards against the rule being satisfied by deleting the numbers rather
    // than by sourcing them properly.
    expect(source(file)).toMatch(/[Oo]verview/)
  })
})
