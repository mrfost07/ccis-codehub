import { ReactNode } from 'react'
import { cn } from './cn'

export interface TabItem {
  id: string
  label: ReactNode
  /** Optional count pill rendered after the label. */
  count?: number
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

/** Underline tabs — the default for page sections (DESIGN_SYSTEM.md §10). */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('flex gap-1 overflow-x-auto border-b border-neutral-800 scrollbar-hide', className)}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors',
              active ? 'text-white' : 'text-neutral-400 hover:text-neutral-200',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 text-xs tabular-nums text-neutral-500">{item.count}</span>
            )}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-purple-500" />
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Pill-style segmented control — for compact view switchers. */
export function SegmentedControl({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex rounded-lg border border-neutral-800 bg-neutral-900 p-1',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 text-xs tabular-nums text-neutral-500">{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
