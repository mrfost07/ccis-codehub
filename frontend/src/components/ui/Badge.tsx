import { HTMLAttributes } from 'react'
import { cn } from './cn'

type Tone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const tones: Record<Tone, string> = {
  neutral: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  accent: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  success: 'bg-green-500/15 text-green-300 border-green-500/30',
  danger: 'bg-red-500/15 text-red-300 border-red-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
}

/** Small status/label pill. */
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

export default Badge
