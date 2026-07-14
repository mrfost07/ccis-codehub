import { HTMLAttributes } from 'react'
import { cn } from './cn'

/** Keyboard shortcut hint per DESIGN_SYSTEM.md §10. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'rounded-md border border-neutral-700 bg-neutral-850 px-1.5 py-0.5 font-mono text-[11px]',
        'text-neutral-400 shadow-[inset_0_-1px_0_rgba(0,0,0,.4)]',
        className,
      )}
      {...props}
    />
  )
}

export default Kbd
