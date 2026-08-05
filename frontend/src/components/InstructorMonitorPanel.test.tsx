import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InstructorMonitorPanel from './InstructorMonitorPanel'

/**
 * The proctor's window.
 *
 * The layout flaw worth a test: the roster and the activity feed used to be TABS,
 * so an instructor watching an exam could only ever see half of it — the student
 * they needed to act on, or the violation telling them to. They now sit side by
 * side, and only a phone falls back to switching.
 *
 * Also pins the socket contract, because the panel is useless if the messages it
 * sends stop matching what LiveQuizConsumer handles.
 */

vi.mock('react-hot-toast', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))

const sockets: FakeSocket[] = []
class FakeSocket {
  static OPEN = 1
  readyState = 1
  onopen: any = null
  onmessage: any = null
  onclose: any = null
  onerror: any = null
  sent: string[] = []
  url: string
  constructor(url: string) {
    this.url = url
    sockets.push(this)
  }
  send(payload: string) { this.sent.push(payload) }
  close() {}
}

/** Deliver a server frame to the panel. */
function deliver(payload: Record<string, unknown>) {
  sockets.at(-1)?.onmessage?.({ data: JSON.stringify(payload) })
}

const PARTICIPANTS = [
  { participant_id: 'p1', nickname: 'Ana', score: 30, violations: 0, is_flagged: false, is_paused: false },
  { participant_id: 'p2', nickname: 'Ben', score: 10, violations: 4, is_flagged: true, is_paused: false },
  { participant_id: 'p3', nickname: 'Cy', score: 20, violations: 1, is_flagged: false, is_paused: true, pause_reason: 'Tab switch' },
]

afterEach(cleanup)
beforeEach(() => {
  sockets.length = 0
  vi.stubGlobal('WebSocket', FakeSocket as any)
})

async function show() {
  const view = render(
    <InstructorMonitorPanel joinCode="ABC123" quizTitle="Midterm" onClose={() => {}} />,
  )
  await waitFor(() => expect(sockets.length).toBeGreaterThan(0))
  sockets[0].onopen?.()
  return view
}

describe('connecting', () => {
  it('registers as an instructor so it joins the alert group', async () => {
    await show()

    // Without this the consumer never adds the connection to quiz_<code>_instructor
    // and no violation alert is ever delivered.
    expect(sockets[0].sent.map(s => JSON.parse(s))).toEqual([
      { type: 'instructor_join', join_code: 'ABC123' },
    ])
    expect(sockets[0].url).toContain('/quiz/ABC123/')
  })

  it('shows the session it is watching', async () => {
    await show()
    expect(screen.getByText(/Midterm/)).toBeTruthy()
    expect(screen.getByText('ABC123')).toBeTruthy()
  })

  it('offers a reconnect when the socket drops', async () => {
    await show()
    expect(screen.queryByRole('button', { name: /reconnect/i })).toBeNull()

    sockets[0].onclose?.({})

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /reconnect/i })).toBeTruthy())
  })
})

describe('the roster and the activity feed', () => {
  it('shows both at once rather than making the instructor choose', async () => {
    await show()
    deliver({ type: 'instructor_participant_update', participants: PARTICIPANTS })
    deliver({
      type: 'violation_alert', participant_id: 'p2', nickname: 'Ben',
      violation_type: 'tab_switch', total_violations: 4, is_flagged: true,
    })

    // A student from the roster and the violation about them, together.
    await waitFor(() => expect(screen.getByText('Ana')).toBeTruthy())
    // Ben twice: once in the roster, once in the feed. That is the whole point —
    // as tabs, only one of the two was ever on screen.
    expect(screen.getAllByText('Ben').length).toBeGreaterThanOrEqual(2)
    // Also matches Cy's pause reason, so counted rather than fetched singly.
    expect(screen.getAllByText(/tab switch/i).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/4 total/)).toBeTruthy()
  })

  it('reveals both panes from lg up, and only switches on a phone', async () => {
    // The assertion above proves both panes' DATA renders, which was already true
    // when they were tabs — jsdom applies no media queries, so DOM presence cannot
    // tell the two designs apart. This checks the mechanism that actually makes
    // them visible together.
    const view = await show()
    const panes = [...view.baseElement.querySelectorAll('section')]
      .filter(el => /min-h-0/.test(el.className))

    expect(panes, 'the two body panes are gone or restructured').toHaveLength(2)
    for (const pane of panes) {
      expect(pane.className, `pane must un-hide at lg: ${pane.className}`).toMatch(/lg:flex/)
    }
    // And exactly one is showing below lg — that is the phone fallback.
    expect(panes.filter(p => /(^|\s)flex(\s|$)/.test(p.className))).toHaveLength(1)
    expect(panes.filter(p => /(^|\s)hidden(\s|$)/.test(p.className))).toHaveLength(1)
  })

  it('puts flagged students at the top, where they get looked at', async () => {
    await show()
    deliver({ type: 'instructor_participant_update', participants: PARTICIPANTS })

    await waitFor(() => expect(screen.getByText('Ana')).toBeTruthy())
    const rendered = screen.getAllByRole('listitem').map(li => li.textContent ?? '')
    const names = rendered.filter(t => /Ana|Ben|Cy/.test(t))

    // Ben is flagged, so first despite the lowest score.
    expect(names[0]).toContain('Ben')
  })

  it('marks paused students and offers resume instead of pause', async () => {
    await show()
    deliver({ type: 'instructor_participant_update', participants: PARTICIPANTS })

    await waitFor(() => expect(screen.getByText('Cy')).toBeTruthy())
    // Appears twice by design: Cy's pause reason, and the label on any tab-switch
    // violation in the feed.
    expect(screen.getAllByText(/tab switch/i).length).toBeGreaterThan(0)
    // Cy is paused → one Resume; the other two → two Pause.
    expect(screen.getAllByRole('button', { name: /^resume$/i })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /^pause$/i })).toHaveLength(2)
  })

  it('says so when nothing has happened yet, rather than showing blank panes', async () => {
    await show()
    expect(screen.getByText(/nobody has joined yet/i)).toBeTruthy()
    expect(screen.getByText(/nothing flagged yet/i)).toBeTruthy()
  })

  it('counts what is going on in the header', async () => {
    await show()
    deliver({ type: 'instructor_participant_update', participants: PARTICIPANTS })

    // 'In session' and 'Violations' are chip-only. 'Flagged' and 'Paused' are
    // deliberately also row badges, so they are not unique and not asserted here.
    await waitFor(() => expect(screen.getByText('In session')).toBeTruthy())
    expect(screen.getByText('Violations')).toBeTruthy()
    expect(screen.getAllByText('Flagged').length).toBeGreaterThan(0)
  })
})

describe('acting on a student', () => {
  it('sends a pause the consumer will understand', async () => {
    const user = userEvent.setup()
    await show()
    deliver({ type: 'instructor_participant_update', participants: PARTICIPANTS })
    await waitFor(() => expect(screen.getByText('Ana')).toBeTruthy())

    await user.click(screen.getAllByRole('button', { name: /^pause$/i })[0])

    const sent = sockets[0].sent.map(s => JSON.parse(s))
    const pause = sent.find(m => m.type === 'pause_participant')
    expect(pause, `no pause_participant sent; saw ${sent.map(m => m.type).join(', ')}`).toBeTruthy()
    expect(pause.participant_id).toBeTruthy()
    expect(pause.reason).toBeTruthy()
  })

  it('sends a resume for a paused student', async () => {
    const user = userEvent.setup()
    await show()
    deliver({ type: 'instructor_participant_update', participants: PARTICIPANTS })
    await waitFor(() => expect(screen.getByText('Cy')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: /^resume$/i }))

    const sent = sockets[0].sent.map(s => JSON.parse(s))
    expect(sent.find(m => m.type === 'resume_participant')?.participant_id).toBe('p3')
  })
})
