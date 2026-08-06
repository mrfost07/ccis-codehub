import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Ban, Edit3, Flag, Link2, MoreHorizontal, Share2, Trash2,
} from 'lucide-react'

/**
 * The "..." menu on a post or a comment.
 *
 * One component for both, and for both post surfaces. Edit and delete already
 * existed twice — once in GroupPostCard and once in the main feed — and had begun
 * to drift; adding four more items to each copy would have made that permanent.
 *
 * Which items appear is decided by what the viewer may do, not by hiding disabled
 * buttons: a menu of greyed-out rows tells you nothing useful.
 */

export type ContentActionKey =
  | 'copy-link'
  | 'report'
  | 'delete'
  | 'move-to-channel'
  | 'edit'
  | 'toggle-comments'

export interface ContentAction {
  key: ContentActionKey
  label: string
  onSelect: () => void
  /** Renders red and asks for confirmation before firing. */
  destructive?: boolean
  confirm?: string
}

const ICONS: Record<ContentActionKey, typeof Link2> = {
  'copy-link': Link2,
  report: Flag,
  delete: Trash2,
  'move-to-channel': Share2,
  edit: Edit3,
  'toggle-comments': Ban,
}

/** Menu width, in px. Needed before render to keep it inside the viewport. */
const MENU_WIDTH = 224

/** Row height plus the container's padding — close enough to decide flip. */
const estimatedHeight = (rows: number) => rows * 44 + 8

export default function ContentActionMenu({
  actions,
  label = 'More actions',
}: {
  actions: ContentAction[]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  // Close on an outside click or Escape. Without both, the menu of one post stays
  // open while you read another, and on a phone there is nothing else to tap.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      // The menu is portalled out of `wrapper`, so it has to be checked too or
      // clicking an item counts as clicking outside and closes before it fires.
      if (wrapper.current?.contains(target) || menu.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (actions.length === 0) return null

  const run = (action: ContentAction) => {
    setOpen(false)
    if (action.confirm && !window.confirm(action.confirm)) return
    action.onSelect()
  }

  /**
   * Where to draw the menu, in viewport coordinates.
   *
   * Measured on open and rendered through a portal, because `absolute` inside the
   * card is clipped by any ancestor with overflow-hidden — which the comments
   * dialog has. That is the bug in the screenshot: a 224px menu anchored right-0
   * in a narrow column ran off the left edge of the modal and was sliced in half,
   * leaving "py Link" and "port Comment".
   */
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const place = () => {
    const anchor = button.current?.getBoundingClientRect()
    if (!anchor) return
    const MARGIN = 8
    // Right-aligned to the button, then pulled back inside the viewport rather
    // than trusting there is room.
    let left = anchor.right - MENU_WIDTH
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - MENU_WIDTH - MARGIN))

    const height = estimatedHeight(actions.length)
    // Flip above the button when there is not room below.
    const below = anchor.bottom + 4
    const top = below + height > window.innerHeight - MARGIN
      ? Math.max(MARGIN, anchor.top - height - 4)
      : below

    setCoords({ top, left })
  }

  const toggle = () => {
    if (open) { setOpen(false); return }
    place()
    setOpen(true)
  }

  // Reposition while open: a scroll or resize moves the button but not a fixed
  // menu, which would otherwise float away from what it belongs to.
  useEffect(() => {
    if (!open) return
    const reposition = () => place()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, actions.length])

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        onClick={event => { event.stopPropagation(); toggle() }}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        // 44px on touch per DESIGN_SYSTEM.md §4; smaller only where there is a pointer.
        className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-neutral-400
          transition-colors hover:bg-neutral-800 hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && coords && createPortal(
        <div
          ref={menu}
          role="menu"
          style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
          // Fixed and portalled, so no ancestor can clip it.
          //
          // z-[55] rather than the popover tier: this opens from inside a dialog,
          // and DESIGN_SYSTEM.md §6 puts dialogs at z-50. It sits in the gap
          // between the modal layer and toasts (z-60), which keeps a toast about
          // the action visible above the menu that triggered it.
          className="fixed z-[55] overflow-hidden rounded-xl border border-neutral-800
            bg-neutral-900 py-1 shadow-xl shadow-black/50"
        >
          {actions.map(action => {
            const Icon = ICONS[action.key]
            return (
              <button
                key={action.key}
                role="menuitem"
                onClick={event => { event.stopPropagation(); run(action) }}
                // py-3 on touch: py-2.5 around text-sm is a 40px row, and these are
                // the rows that delete a post.
                className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm
                  sm:py-2.5 transition-colors ${action.destructive
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-neutral-200 hover:bg-neutral-800'}`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                {action.label}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}

/**
 * The actions for one post or comment, given who is looking.
 *
 * Kept here rather than in each surface so the two feeds cannot end up offering
 * different menus for the same post.
 */
export function buildContentActions({
  kind,
  canEdit,
  canDelete,
  commentsDisabled,
  onCopyLink,
  onReport,
  onDelete,
  onMoveToChannel,
  onEdit,
  onToggleComments,
}: {
  kind: 'post' | 'comment'
  canEdit: boolean
  canDelete: boolean
  commentsDisabled?: boolean
  onCopyLink: () => void
  onReport: () => void
  onDelete: () => void
  onMoveToChannel?: () => void
  onEdit: () => void
  onToggleComments?: () => void
}): ContentAction[] {
  const noun = kind === 'post' ? 'Post' : 'Comment'
  const actions: ContentAction[] = [
    { key: 'copy-link', label: 'Copy Link', onSelect: onCopyLink },
    // Reporting your own content is pointless, so it is offered to everyone else.
    ...(canEdit ? [] : [{ key: 'report' as const, label: `Report ${noun}`, onSelect: onReport }]),
  ]

  if (canDelete) {
    actions.push({
      key: 'delete',
      label: `Delete ${noun}`,
      onSelect: onDelete,
      destructive: true,
      confirm: `Delete this ${kind}? This cannot be undone.`,
    })
  }

  if (kind === 'post' && onMoveToChannel) {
    actions.push({ key: 'move-to-channel', label: 'Move to Channel', onSelect: onMoveToChannel })
  }

  if (canEdit) {
    actions.push({ key: 'edit', label: `Edit ${noun}`, onSelect: onEdit })
  }

  if (kind === 'post' && canEdit && onToggleComments) {
    actions.push({
      key: 'toggle-comments',
      label: commentsDisabled ? 'Enable Comments' : 'Disable Comments',
      onSelect: onToggleComments,
    })
  }

  return actions
}
