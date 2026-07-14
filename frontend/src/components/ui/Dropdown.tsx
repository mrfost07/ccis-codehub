import {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { cn } from './cn'

interface DropdownProps {
  /** Render prop for the trigger; receives open state and toggle handler. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  /** Menu alignment relative to the trigger. */
  align?: 'start' | 'end'
  children: ReactNode
  className?: string
}

/**
 * Lightweight dropdown menu per DESIGN_SYSTEM.md §10.
 * Closes on outside click, Esc, or item click.
 */
export function Dropdown({ trigger, align = 'end', children, className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-30 mt-1 min-w-[180px] origin-top animate-scale-in rounded-xl border border-neutral-700/60',
            'bg-neutral-900 p-1 shadow-xl shadow-black/40',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  /** Destructive styling (red text, red tint on hover). */
  danger?: boolean
}

export function DropdownItem({ icon, danger, className, children, ...props }: DropdownItemProps) {
  return (
    <button
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-neutral-300 hover:bg-neutral-800 hover:text-white',
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      {children}
    </button>
  )
}

export function DropdownSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" className={cn('my-1 h-px bg-neutral-800', className)} {...props} />
}

export default Dropdown
