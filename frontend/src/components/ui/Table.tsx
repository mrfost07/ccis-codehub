import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from './cn'

/**
 * Data table primitives per DESIGN_SYSTEM.md §10.
 * Desktop only — under `md`, render the same data as a stacked card list
 * (hide the table with `hidden md:block` on the wrapper).
 */
export function Table({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('overflow-hidden rounded-xl border border-neutral-800', className)}
      {...props}
    >
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-neutral-800/70', className)} {...props} />
}

export function Tr({
  className,
  interactive,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(interactive && 'cursor-pointer transition-colors hover:bg-neutral-900/60', className)}
      {...props}
    />
  )
}

export function HeadTr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-neutral-800 bg-neutral-900/60', className)} {...props} />
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500',
        className,
      )}
      {...props}
    />
  )
}

export function Td({
  className,
  numeric,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn('px-4 py-3 text-neutral-300', numeric && 'text-right tabular-nums', className)}
      {...props}
    />
  )
}

export default Table
