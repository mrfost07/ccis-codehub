import { HTMLAttributes, ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from './cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Accessible title shown in the header. */
  title?: ReactNode
  /** Max width of the panel on ≥sm screens. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  /** Footer content (typically action buttons, right-aligned). */
  footer?: ReactNode
  className?: string
}

const sizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

/**
 * Dialog per DESIGN_SYSTEM.md §10 — centered, with breathing room on every size.
 * Esc + overlay click close; body scroll locked; focus moves into the panel.
 *
 * This was a bottom sheet flush to the viewport edge on mobile (`items-end p-0`),
 * which put its lower rows underneath the mobile bottom nav and, on phones with a
 * home indicator, underneath that too. Centering with padding keeps the panel
 * clear of both without every caller having to know they exist.
 *
 * Heights use dvh on mobile rather than vh: vh is the *largest* viewport on
 * mobile browsers, measured as though the address bar were hidden, so `90vh`
 * overflows behind the browser chrome while the bar is showing.
 */
export function Modal({ open, onClose, title, size = 'md', children, footer, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panelRef.current) {
        // Minimal focus trap: keep Tab cycling inside the panel.
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      // Keeps the panel off the home indicator on phones that have one, without
      // ever shrinking the gap below the 1rem the padding already gives.
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[85dvh] w-full flex-col animate-scale-in rounded-2xl',
          'border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40',
          'outline-none sm:max-h-[90vh]',
          sizes[size],
          className,
        )}
      >
        {title !== undefined && (
          // Tighter padding under sm: on a phone, 20px of chrome on all four
          // sides of a dialog is most of the room the content needed.
          <div className="flex items-center justify-between border-b border-neutral-800 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              // >= 44px of tappable area on mobile per DESIGN_SYSTEM.md §4.
              className="-m-1.5 flex h-10 w-10 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white sm:h-8 sm:w-8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-neutral-800 p-4 sm:p-5">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ModalDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-relaxed text-neutral-400', className)} {...props} />
}

export default Modal
