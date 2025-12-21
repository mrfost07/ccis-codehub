/**
 * GlassCard - Reusable card component with frosted glass effect
 * 
 * Used for consistent styling across all dashboard sections
 */

import { ReactNode } from 'react'

interface GlassCardProps {
    children: ReactNode
    className?: string
    padding?: 'none' | 'sm' | 'md' | 'lg'
    glow?: 'none' | 'purple' | 'blue' | 'green'
}

export default function GlassCard({
    children,
    className = '',
    padding = 'md',
    glow = 'none',
}: GlassCardProps) {
    const paddingClasses = {
        none: '',
        sm: 'p-3 sm:p-4',
        md: 'p-4 sm:p-5 md:p-6',
        lg: 'p-5 sm:p-6 md:p-8',
    }

    const glowClasses = {
        none: '',
        purple: 'shadow-lg shadow-purple-500/5 border-purple-500/20',
        blue: 'shadow-lg shadow-blue-500/5 border-blue-500/20',
        green: 'shadow-lg shadow-green-500/5 border-green-500/20',
    }

    return (
        <div
            className={`
        bg-slate-800/40 backdrop-blur-xl
        border border-slate-700/50
        rounded-2xl
        ${paddingClasses[padding]}
        ${glowClasses[glow]}
        ${className}
      `}
        >
            {children}
        </div>
    )
}

// Sub-components for consistent card sections
export function GlassCardHeader({
    children,
    className = '',
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <div className={`flex items-center justify-between mb-4 ${className}`}>
            {children}
        </div>
    )
}

export function GlassCardTitle({
    children,
    icon: Icon,
    iconColor = 'text-purple-400',
}: {
    children: ReactNode
    icon?: React.ComponentType<{ className?: string }>
    iconColor?: string
}) {
    return (
        <div className="flex items-center gap-3">
            {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
            <h3 className="text-lg font-semibold text-white">{children}</h3>
        </div>
    )
}

export function GlassCardContent({
    children,
    className = '',
}: {
    children: ReactNode
    className?: string
}) {
    return <div className={className}>{children}</div>
}
