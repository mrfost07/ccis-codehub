import { useEffect, useRef, useState } from 'react'
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

export default function ContentActionMenu({
  actions,
  label = 'More actions',
}: {
  actions: ContentAction[]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  // Close on an outside click or Escape. Without both, the menu of one post stays
  // open while you read another, and on a phone there is nothing else to tap.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
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

  return (
    <div ref={wrapper} className="relative">
      <button
        onClick={event => { event.stopPropagation(); setOpen(v => !v) }}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        // 44px on touch per DESIGN_SYSTEM.md §4; smaller only where there is a pointer.
        className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-neutral-400
          transition-colors hover:bg-neutral-800 hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          // z-30, the popover tier (DESIGN_SYSTEM.md §6). Above the card, below
          // any dialog an item opens.
          className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border
            border-neutral-800 bg-neutral-900 py-1 shadow-xl shadow-black/50"
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
        </div>
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
