import { ReactNode, useRef, useState } from 'react'
import { cn } from './cn'

interface TooltipProps {
  /** Tooltip text — informational only, never actions. */
  content: ReactNode
  side?: 'top' | 'bottom'
  /** Hover delay in ms before showing (default 300). */
  delay?: number
  children: ReactNode
  className?: string
}

/** Hover/focus tooltip per DESIGN_SYSTEM.md §10. */
export function Tooltip({ content, side = 'top', delay = 300, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), delay)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setVisible(false)
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md',
            'border border-neutral-700/60 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 shadow-lg',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

export default Tooltip
