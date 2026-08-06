import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Modal from './Modal'

/**
 * Typing inside a dialog must not move focus.
 *
 * Reported as "when I type a comment the keyboard just auto closes". The focus
 * trap had `onClose` in its dependency list, and every caller passes an inline
 * arrow, so the effect tore down and re-ran on each parent render — calling
 * previouslyFocused.focus() then panelRef.focus() and taking focus off the field
 * being typed into. On a phone, losing focus dismisses the keyboard.
 */

afterEach(cleanup)

/** A dialog with a controlled field, the shape the comments dialog uses. */
function CommentsLikeDialog() {
  const [value, setValue] = useState('')
  return (
    <Modal
      open
      // Deliberately a new function every render, as every real caller does.
      onClose={() => {}}
      title="Comments"
      footer={
        <input
          aria-label="Write a comment"
          value={value}
          onChange={event => setValue(event.target.value)}
        />
      }
    >
      <p>thread</p>
    </Modal>
  )
}

describe('typing in a dialog', () => {
  it('keeps focus on the field across keystrokes', async () => {
    const user = userEvent.setup()
    render(<CommentsLikeDialog />)
    const field = screen.getByLabelText('Write a comment')

    await user.click(field)
    expect(document.activeElement).toBe(field)

    await user.type(field, 'hello there')

    expect(document.activeElement, [
      'Focus left the field while typing.',
      'The dialog is stealing it back on re-render, which closes the keyboard on a phone.',
    ].join('\n')).toBe(field)
    expect((field as HTMLInputElement).value).toBe('hello there')
  })

  it('does not re-run its focus trap when only onClose identity changes', async () => {
    // The mechanism, isolated: a parent re-render with a fresh onClose must not
    // move focus.
    const focusSpy = vi.fn()
    function Harness() {
      const [, bump] = useState(0)
      return (
        <>
          <button onClick={() => bump(n => n + 1)}>rerender</button>
          <Modal open onClose={() => {}} title="T">
            <input aria-label="field" onFocus={focusSpy} />
          </Modal>
        </>
      )
    }
    const user = userEvent.setup()
    render(<Harness />)
    const field = screen.getByLabelText('field')
    await user.click(field)
    const focusesAfterClick = focusSpy.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'rerender' }))
    field.focus()
    await user.keyboard('x')

    // Not re-focused by the dialog in between.
    expect(focusSpy.mock.calls.length).toBeLessThanOrEqual(focusesAfterClick + 1)
  })

  it('still closes on Escape', async () => {
    // The ref must not break what the effect is for.
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Modal open onClose={onClose} title="T"><p>body</p></Modal>)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls the latest onClose, not a stale one', async () => {
    // A ref that is never updated would call the first render's handler forever.
    const first = vi.fn()
    const second = vi.fn()
    const view = render(<Modal open onClose={first} title="T"><p>b</p></Modal>)
    view.rerender(<Modal open onClose={second} title="T"><p>b</p></Modal>)

    await userEvent.keyboard('{Escape}')

    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })
})
