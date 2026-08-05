import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * What every visitor downloads.
 *
 * Sixteen pages were imported eagerly into App.tsx, so landing on the marketing
 * page pulled the learning dashboards, quiz taking and module learning with it —
 * a 1017 KB main chunk. Adding one more eager page costs everyone, and nothing
 * about writing `import Foo from './pages/Foo'` looks expensive.
 *
 * Three pages stay eager on purpose: the landing page and the two ways in must
 * not wait on a chunk.
 */

const APP = readFileSync(join(__dirname, 'App.tsx'), 'utf8')

const ALLOWED_EAGER = ['HomeEnhanced', 'Login', 'Register']

describe('page imports in App.tsx', () => {
  it('are lazy, apart from the first-paint three', () => {
    const eager = [...APP.matchAll(/^import (\w+) from '\.\/pages\/[\w/]+'/gm)]
      .map(match => match[1])
      .filter(name => !ALLOWED_EAGER.includes(name))

    expect(eager, [
      `These pages are imported eagerly: ${eager.join(', ')}.`,
      'Everything a signed-in user reaches should be lazy() so it is not in the',
      'chunk a first-time visitor downloads. Only the landing page and the login',
      'and register screens are exempt.',
    ].join('\n')).toEqual([])
  })

  it('still loads the landing page and the way in without a chunk hop', () => {
    // The other direction: if these become lazy, the first paint of the marketing
    // page is a spinner. That is a worse trade than a slightly larger chunk.
    for (const name of ALLOWED_EAGER) {
      expect(APP, `${name} should stay eager`).toMatch(
        new RegExp(`^import ${name} from '\\./pages/`, 'm'),
      )
    }
  })

  it('wraps the routes in Suspense, or a lazy page renders nothing', () => {
    expect(APP).toMatch(/<Suspense fallback=/)
  })
})

/**
 * The AI Mentor must not be reachable on anything being graded.
 *
 * hideOnRoutes listed '/challenges/', but coding challenges live at
 * /learning/challenges/:slug — so startsWith() never matched and a floating AI
 * assistant sat on top of a page that blocks the clipboard and counts
 * tab-switches. /quiz/:quizId was not listed at all.
 */
describe('AI Mentor visibility', () => {
  const hideList = (() => {
    const match = /const hideOnRoutes = \[([^\]]+)\]/.exec(APP)
    return match ? [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]) : null
  })()

  /** Every route that renders a graded surface, taken from the route table. */
  const GRADED = [
    '/quiz/live/ABC123',
    '/quiz/self-paced/ABC123',
    '/quiz/lobby/ABC123',
    '/quiz/some-quiz-id',
    '/learning/challenges/two-sum',
  ]

  it('has a hide list at all', () => {
    expect(hideList, 'hideOnRoutes was renamed or removed').not.toBeNull()
    expect(hideList!.length).toBeGreaterThan(0)
  })

  it('covers every graded route', () => {
    const exposed = GRADED.filter(path => !hideList!.some(prefix => path.startsWith(prefix)))

    expect(exposed, [
      `The AI Mentor is reachable on: ${exposed.join(', ')}.`,
      `hideOnRoutes is [${hideList!.join(', ')}] and these paths do not start with`,
      'any of them. An AI assistant during a graded exam defeats the lockdown.',
    ].join('\n')).toEqual([])
  })

  it('leaves ordinary pages alone', () => {
    for (const path of ['/dashboard', '/learning', '/projects', '/community', '/chat']) {
      expect(hideList!.some(p => path.startsWith(p)), `${path} should keep the mentor`).toBe(false)
    }
  })
})
