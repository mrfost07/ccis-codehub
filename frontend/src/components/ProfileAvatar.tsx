import { useState } from 'react'
import { getMediaUrl } from '../utils/mediaUrl'

interface ProfileAvatarProps {
    src: string | null | undefined
    alt: string
    fallbackText?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    variant?: 'purple' | 'cyan' | 'green' | 'orange'
}

/**
 * A profile avatar component with built-in error handling.
 * Falls back to initial-based avatar when image fails to load.
 */
export default function ProfileAvatar({
    src,
    alt,
    fallbackText,
    size = 'md',
    className = '',
    variant = 'purple'
}: ProfileAvatarProps) {
    const [imageError, setImageError] = useState(false)

    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg'
    }

    // Static gradient classes for Tailwind compatibility
    const gradientClasses = {
        purple: 'bg-gradient-to-br from-purple-500 to-pink-500',
        cyan: 'bg-gradient-to-br from-cyan-500 to-blue-500',
        green: 'bg-gradient-to-br from-green-500 to-emerald-500',
        orange: 'bg-gradient-to-br from-orange-500 to-red-500'
    }

    const mediaUrl = getMediaUrl(src)
    const initial = (fallbackText || alt || '?')[0]?.toUpperCase()

    // Show fallback if no URL or image failed to load
    const showFallback = !mediaUrl || imageError

    if (showFallback) {
        return (
            <div
                className={`${sizeClasses[size]} rounded-full ${gradientClasses[variant]} flex items-center justify-center text-white font-bold ${className}`}
            >
                {initial}
            </div>
        )
    }

    return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden ${gradientClasses[variant]} ${className}`}>
            <img
                src={mediaUrl}
                alt={alt}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
            />
        </div>
    )
}
