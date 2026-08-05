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
