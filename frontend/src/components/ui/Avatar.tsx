import { useState } from 'react'
import { cn } from './cn'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

interface AvatarProps {
  src?: string | null
  /** Name used for the initials fallback and alt text. */
  name?: string
  size?: AvatarSize
  /** Show a green presence dot (online/live). */
  online?: boolean
  className?: string
}

const sizes: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

function initialsOf(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

/** User avatar with initials fallback and optional presence dot. */
export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {showImage ? (
        <img
          src={src}
          alt={name ?? 'User avatar'}
          onError={() => setFailed(true)}
          className={cn('rounded-full object-cover', sizes[size])}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-neutral-800 font-medium text-neutral-300',
            sizes[size],
          )}
        >
          {initialsOf(name)}
        </span>
      )}
      {online && (
        <span
          aria-label="Online"
          className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-neutral-900"
        />
      )}
    </span>
  )
}

export default Avatar
