import { describe, expect, it } from 'vitest'

import {
  GROUP_WINDOW_MS, dayLabel, isGroupedWith, startsNewDay,
} from './messageGrouping'

/**
 * These are pure on purpose. Grouping is the one decision the project channel and
 * the community chat genuinely share, and getting it wrong is invisible in a
 * screenshot — two people's messages silently merging into one run reads as a
 * single person having said all of it.
 */

/**
 * Fixtures are built in LOCAL time, not UTC.
 *
 * dayLabel compares calendar days with getFullYear/getMonth/getDate, which is
 * correct — a student sees their own days, not the server's. Writing the
 * fixtures as '...Z' encoded a UTC assumption instead: on a UTC+8 machine
 * 2026-08-03T23:50Z is already the morning of the 4th, so the "across midnight"
 * cases asserted the opposite of what they meant and failed against working code.
 */
const at = (year: number, month: number, day: number, hour: number, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).toISOString()

const NOW = new Date(2026, 7, 4, 12, 0)          // 4 August 2026, midday, local
const today = (hour: number, minute = 0) => at(2026, 8, 4, hour, minute)
const yesterday = (hour: number, minute = 0) => at(2026, 8, 3, hour, minute)

const msg = (authorId: string | null, createdAt: string) => ({ authorId, createdAt })

describe('dayLabel', () => {
  it('names today and yesterday rather than dating them', () => {
    expect(dayLabel(today(9), NOW)).toBe('Today')
    expect(dayLabel(yesterday(9), NOW)).toBe('Yesterday')
  })

  it('compares calendar days, not elapsed hours', () => {
    // 23:50 and 00:10 are twenty minutes apart but belong under different
    // headings. Subtracting timestamps gets this backwards.
    const lateLastNight = yesterday(23, 50)
    const justAfterMidnight = today(0, 10)

    expect(dayLabel(lateLastNight, NOW)).toBe('Yesterday')
    expect(dayLabel(justAfterMidnight, NOW)).toBe('Today')
  })

  it('omits the year within the current one and shows it otherwise', () => {
    expect(dayLabel(at(2026, 3, 12, 9), NOW)).not.toMatch(/2026/)
    expect(dayLabel(at(2024, 3, 12, 9), NOW)).toMatch(/2024/)
  })

  it('survives a nonsense timestamp instead of rendering "Invalid Date"', () => {
    expect(dayLabel('not-a-date', NOW)).toBe('')
  })

  it('handles a future timestamp from clock skew', () => {
    // Server and client clocks disagree often enough that this must not render
    // as a negative day count.
    expect(dayLabel(at(2026, 8, 5, 9), NOW)).toBe('Tomorrow')
  })
})

describe('startsNewDay', () => {
  it('is true for the very first message', () => {
    expect(startsNewDay(msg('a', today(9)), undefined, NOW)).toBe(true)
  })

  it('is false within the same day and true across midnight', () => {
    expect(startsNewDay(
      msg('a', today(9, 5)), msg('a', today(9)), NOW,
    )).toBe(false)

    expect(startsNewDay(
      msg('a', today(0, 10)), msg('a', yesterday(23, 50)), NOW,
    )).toBe(true)
  })
})

describe('isGroupedWith', () => {
  it('never groups the first message', () => {
    expect(isGroupedWith(msg('a', today(9)), undefined, { now: NOW })).toBe(false)
  })

  it('groups the same author inside the window', () => {
    expect(isGroupedWith(
      msg('a', today(9, 4)), msg('a', today(9)), { now: NOW },
    )).toBe(true)
  })

  it('does not group a different author, however close', () => {
    expect(isGroupedWith(
      msg('b', today(9)), msg('a', today(9)), { now: NOW },
    )).toBe(false)
  })

  it('does not group the same author outside the window', () => {
    expect(isGroupedWith(
      msg('a', today(9, 6)), msg('a', today(9)), { now: NOW },
    )).toBe(false)
  })

  it('never groups two unknown authors together', () => {
    // Otherwise two different people whose sender failed to serialise merge into
    // one run, and the second appears to have been said by the first.
    expect(isGroupedWith(
      msg(null, today(9, 1)), msg(null, today(9)), { now: NOW },
    )).toBe(false)
  })

  it('never groups across a day divider, even for the same author in-window', () => {
    // The heading would sit above a message whose name is hidden, so the run
    // would look like it began before the day it is filed under.
    expect(isGroupedWith(
      msg('a', today(0, 1)), msg('a', yesterday(23, 59)), { now: NOW },
    )).toBe(false)
  })

  it('does not group a message that predates the one above it', () => {
    // Out-of-order rows should render as their own block rather than silently
    // folding into a run they came before.
    expect(isGroupedWith(
      msg('a', today(9)), msg('a', today(9, 4)), { now: NOW },
    )).toBe(false)
  })

  it('respects a custom window', () => {
    const args = [msg('a', today(9, 4)), msg('a', today(9))] as const
    expect(isGroupedWith(...args, { now: NOW, windowMs: 60_000 })).toBe(false)
    expect(isGroupedWith(...args, { now: NOW, windowMs: GROUP_WINDOW_MS })).toBe(true)
  })
})

describe('dayLabel month style', () => {
  it('can render a short month for narrow surfaces', () => {
    // The floating community chat panel is about 20rem wide; "12 September"
    // wraps in its divider where "12 Sep" does not.
    const long = dayLabel(at(2026, 9, 12, 9), NOW)
    const short = dayLabel(at(2026, 9, 12, 9), NOW, { month: 'short' })

    expect(short.length).toBeLessThanOrEqual(long.length)
    expect(short).toMatch(/Sep/)
  })

  it('still says Today and Yesterday regardless of month style', () => {
    expect(dayLabel(today(9), NOW, { month: 'short' })).toBe('Today')
    expect(dayLabel(yesterday(9), NOW, { month: 'short' })).toBe('Yesterday')
  })
})

describe('startsNewDay compares days, not labels', () => {
  it('separates two days that would format identically', () => {
    // Labels take options now, so comparing rendered strings could collapse two
    // real days into one divider. Same day-of-month, different month.
    expect(startsNewDay(
      msg('a', at(2026, 8, 12, 9)), msg('a', at(2026, 7, 12, 9)), NOW,
    )).toBe(true)
  })

  it('does not claim a new day for an unparseable timestamp', () => {
    expect(startsNewDay(msg('a', 'nonsense'), msg('a', today(9)), NOW)).toBe(false)
  })
})
