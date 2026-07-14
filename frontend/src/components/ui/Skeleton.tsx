import { HTMLAttributes } from 'react'
import { cn } from './cn'

/** Base loading placeholder block. Compose to match the final layout geometry. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-neutral-800/80', className)}
      {...props}
    />
  )
}

/** Stack of text-line placeholders (last line shorter). */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

/** Card-shaped placeholder matching the standard content card. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-xl border border-neutral-800 bg-neutral-900 p-5', className)}
    >
      <Skeleton className="mb-4 h-5 w-1/2" />
      <SkeletonText lines={2} />
    </div>
  )
}

/** Placeholder matching the dashboard stat card pattern. */
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6', className)}
    >
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="mb-2 h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

/** Placeholder matching a list/feed row (avatar + two lines). */
export function SkeletonListRow({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex items-center gap-3 px-4 py-3 sm:px-5', className)}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}
