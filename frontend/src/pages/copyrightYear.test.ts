import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The copyright year has to be derived from the clock, not typed into the markup.
 *
 * The landing footer read "© 2025" well into 2026. Nothing catches this: it is
 * correct on the day it is written, no test exercises it, and a stale year is
 * only visible to someone who thinks to check the very bottom of the page.
 */

const SRC = join(__dirname, '..')

/** `© 2025`, `&copy; 2025`, `Copyright 2025` — a year written by hand. */
const HARDCODED = /(?:&copy;|©|[Cc]opyright)\s*(?:\(c\)\s*)?(\d{4})/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : []
  })
}

describe('the copyright year', () => {
  it('is never a literal in the source', () => {
    const offenders = sourceFiles(SRC).flatMap(file =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, number: i + 1 }))
        .filter(({ line }) => HARDCODED.test(line))
        .map(({ line, number }) => `${file.slice(SRC.length + 1)}:${number}  ${line.trim()}`),
    )

    expect(offenders, [
      'A copyright year is hardcoded and will go stale:',
      ...offenders,
      '',
      'Use {new Date().getFullYear()} instead.',
    ].join('\n')).toEqual([])
  })

  it('finds the notice it is guarding', () => {
    // Without this the assertion above passes if the footer is deleted, renamed,
    // or the entity changed — reporting success while checking nothing.
    const home = readFileSync(join(SRC, 'pages/HomeEnhanced.tsx'), 'utf8')

    expect(home).toMatch(/&copy;\s*\{new Date\(\)\.getFullYear\(\)\}/)
  })
})
