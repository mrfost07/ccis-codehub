import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ContentActionMenu, { buildContentActions } from './ContentActionMenu'

/**
 * Which items the menu offers, and to whom.
 *
 * This is the part that goes wrong quietly: an author offered "Report your own
 * post", a stranger offered "Delete", or a delete that fires without asking. None
 * of it is visible in a screenshot of the closed menu.
 */

afterEach(cleanup)

const handlers = () => ({
  onCopyLink: vi.fn(),
  onReport: vi.fn(),
  onDelete: vi.fn(),
  onMoveToChannel: vi.fn(),
  onEdit: vi.fn(),
  onToggleComments: vi.fn(),
})

describe('what a post author is offered', () => {
  it('gets the full set, and is not asked to report themselves', () => {
    const actions = buildContentActions({
      kind: 'post', canEdit: true, canDelete: true, ...handlers(),
    })
    const keys = actions.map(a => a.key)

    expect(keys).toEqual([
      'copy-link', 'delete', 'move-to-channel', 'edit', 'toggle-comments',
    ])
    expect(keys).not.toContain('report')
  })

  it('is offered Enable Comments once they are off, not Disable again', () => {
    const actions = buildContentActions({
      kind: 'post', canEdit: true, canDelete: true, commentsDisabled: true, ...handlers(),
    })

    expect(actions.find(a => a.key === 'toggle-comments')?.label).toBe('Enable Comments')
  })
})

describe('what someone else is offered', () => {
  it('can copy, report and share, but not edit, delete or disable', () => {
    const actions = buildContentActions({
      kind: 'post', canEdit: false, canDelete: false, ...handlers(),
    })
    const keys = actions.map(a => a.key)

    // Sharing is deliberately open to anyone who can already see the post — it is
    // a read of the post plus a write to a channel, and the server gates only the
    // channel. Editing, deleting and switching comments off are the author's.
    expect(keys).toEqual(['copy-link', 'report', 'move-to-channel'])
  })

  it('a moderator who can delete but not edit gets delete and report', () => {
    // Staff can remove other people's posts without being able to rewrite them.
    const actions = buildContentActions({
      kind: 'post', canEdit: false, canDelete: true, ...handlers(),
    })
    const keys = actions.map(a => a.key)

    expect(keys).toContain('delete')
    expect(keys).toContain('report')
    expect(keys).not.toContain('edit')
    expect(keys).not.toContain('toggle-comments')
  })
})

describe('comments get a narrower menu', () => {
  it('has no Move to Channel or Disable Comments', () => {
    // Both are post-level ideas; a comment has neither a channel nor replies to
    // switch off.
    const actions = buildContentActions({
      kind: 'comment', canEdit: true, canDelete: true, ...handlers(),
    })
    const keys = actions.map(a => a.key)

    expect(keys).toEqual(['copy-link', 'delete', 'edit'])
  })

  it('labels its items as comment actions', () => {
    const actions = buildContentActions({
      kind: 'comment', canEdit: false, canDelete: false, ...handlers(),
    })

    expect(actions.find(a => a.key === 'report')?.label).toBe('Report Comment')
  })
})

describe('the menu as rendered', () => {
  it('stays closed until asked', async () => {
    render(<ContentActionMenu actions={buildContentActions({
      kind: 'post', canEdit: true, canDelete: true, ...handlers(),
    })} />)

    expect(screen.queryByRole('menu')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /more actions/i }))
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('shows the items from the screenshot, in that order', async () => {
    render(<ContentActionMenu actions={buildContentActions({
      kind: 'post', canEdit: false, canDelete: true, ...handlers(),
    })} />)
    await userEvent.click(screen.getByRole('button', { name: /more actions/i }))

    const labels = screen.getAllByRole('menuitem').map(el => el.textContent?.trim())
    expect(labels).toEqual(['Copy Link', 'Report Post', 'Delete Post', 'Move to Channel'])
  })

  it('closes on Escape', async () => {
    render(<ContentActionMenu actions={buildContentActions({
      kind: 'post', canEdit: true, canDelete: true, ...handlers(),
    })} />)
    await userEvent.click(screen.getByRole('button', { name: /more actions/i }))

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('confirms before deleting, and does nothing if you say no', async () => {
    const spies = handlers()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ContentActionMenu actions={buildContentActions({
      kind: 'post', canEdit: true, canDelete: true, ...spies,
    })} />)
    await userEvent.click(screen.getByRole('button', { name: /more actions/i }))

    await userEvent.click(screen.getByRole('menuitem', { name: /delete post/i }))

    expect(confirm).toHaveBeenCalled()
    expect(spies.onDelete).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('deletes when confirmed', async () => {
    const spies = handlers()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ContentActionMenu actions={buildContentActions({
      kind: 'post', canEdit: true, canDelete: true, ...spies,
    })} />)
    await userEvent.click(screen.getByRole('button', { name: /more actions/i }))

    await userEvent.click(screen.getByRole('menuitem', { name: /delete post/i }))

    expect(spies.onDelete).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })

  it('fires a non-destructive item without a prompt', async () => {
    const spies = handlers()
    const confirm = vi.spyOn(window, 'confirm')
    render(<ContentActionMenu actions={buildContentActions({
      kind: 'post', canEdit: true, canDelete: true, ...spies,
    })} />)
    await userEvent.click(screen.getByRole('button', { name: /more actions/i }))

    await userEvent.click(screen.getByRole('menuitem', { name: /copy link/i }))

    expect(spies.onCopyLink).toHaveBeenCalledTimes(1)
    expect(confirm).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('renders nothing at all when there is nothing to offer', () => {
    // Rather than an empty popover behind a button that appears to do nothing.
    render(<ContentActionMenu actions={[]} />)
    expect(screen.queryByRole('button', { name: /more actions/i })).toBeNull()
  })
})
