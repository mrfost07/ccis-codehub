import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from './cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

/** Text input with optional label, leading icon, and error state. */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon, className, id, ...props },
  ref,
) {
  const inputId = id || props.name
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-neutral-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-lg border bg-neutral-900 text-neutral-100 placeholder:text-neutral-500',
            'px-3 text-sm transition-colors',
            'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500',
            !!icon && 'pl-10',
            error ? 'border-red-500/60' : 'border-neutral-700',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
})

export default Input
