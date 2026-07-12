import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from './cn'

/** Centered loading spinner. */
export function Spinner({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <Loader2
      className={cn('animate-spin text-purple-500', className)}
      style={{ width: size, height: size }}
    />
  )
}

/** Full-area centered loading state. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-neutral-400">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  )
}

/** Empty / zero-data state with optional icon and action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-neutral-600">{icon}</div>}
      <h3 className="text-base font-semibold text-neutral-200">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
