import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Every displayed like count must be openable.
 *
 * This exists because of a real miss. When "who reacted" was added, the count was
 * wired up in GroupPostCard — and the main feed's post card, which is a *second*
 * complete implementation further down the same 3,000-line file, was left as a
 * plain <span>. Comments and replies had the same duplication. The feature looked
 * finished and shipped, and the counts on the actual feed still did nothing.
 *
 * Nothing failed: both renderers compile, both show the right number, and the
 * tests for the component itself all passed. The only symptom was a number that
 * would not respond to a tap.
 *
 * So this asserts coverage rather than behaviour: if a new surface renders a like
 * count, it has to sit inside a <Reactors> trigger, or this test names the file
 * and line. Add to ALLOWED only when a count genuinely should not be openable,
 * and say why.
 */

const SRC = join(__dirname, '..')

/** Renders a like count into the DOM, e.g. `{post.like_count}`. */
const RENDERS_COUNT = /\{\s*(?:post|comment|reply)\.like_count(?:\s*\|\|\s*0)?\s*\}/

/** How far above the line a <Reactors> may open and still enclose it. */
const ENCLOSING_LINES = 14

const ALLOWED: Array<{ file: string; why: string }> = [
  {
    file: 'components/ContentModeration.tsx',
    why: 'admin moderation table — a row is a post to action, not a reaction to browse',
  },
]

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return tsxFiles(path)
    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : []
  })
}

function relative(path: string) {
  return path.slice(SRC.length + 1).split('\\').join('/')
}

describe('every like count on screen can be opened', () => {
  const sites = tsxFiles(SRC).flatMap(path => {
    const lines = readFileSync(path, 'utf8').split('\n')
    return lines.flatMap((line, index) => {
      if (!RENDERS_COUNT.test(line)) return []
      const above = lines.slice(Math.max(0, index - ENCLOSING_LINES), index).join('\n')
      return [{
        file: relative(path),
        line: index + 1,
        wrapped: above.includes('<Reactors'),
        text: line.trim().slice(0, 60),
      }]
    })
  })

  it('finds the like counts at all, so a rename cannot silently pass this', () => {
    // If the field is renamed, every site becomes invisible to the regex and the
    // suite would go green while checking nothing.
    expect(sites.length).toBeGreaterThan(5)
  })

  it('has each one inside a Reactors trigger', () => {
    const allowed = new Set(ALLOWED.map(entry => entry.file))
    const bare = sites
      .filter(site => !site.wrapped && !allowed.has(site.file))
      .map(site => `${site.file}:${site.line}  ${site.text}`)

    expect(bare, [
      'These render a like count that no one can tap:',
      ...bare.map(entry => `  ${entry}`),
      '',
      'Wrap it in <Reactors> (see CommunityEnhanced.tsx), or add it to ALLOWED',
      'in this file with a reason.',
    ].join('\n')).toEqual([])
  })

  it('keeps the allow-list honest', () => {
    // An entry that no longer renders a count is stale and should go, otherwise
    // the list slowly becomes a place bugs hide.
    const withCounts = new Set(sites.map(site => site.file))
    for (const entry of ALLOWED) {
      expect(withCounts.has(entry.file), `${entry.file} is allow-listed but renders no like count`)
        .toBe(true)
    }
  })
})
