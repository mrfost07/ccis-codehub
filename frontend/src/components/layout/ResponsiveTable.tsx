/**
 * Responsive table wrapper to prevent horizontal overflow on mobile
 */

import { ReactNode } from 'react'

interface ResponsiveTableProps {
    children: ReactNode
    className?: string
}

export default function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
    return (
        <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
            <div className="min-w-full inline-block align-middle">
                {children}
            </div>
        </div>
    )
}

// Styled table with consistent glass styling
export function GlassTable({
    children,
    className = '',
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <table className={`w-full min-w-[600px] ${className}`}>
            {children}
        </table>
    )
}

export function GlassTableHead({ children }: { children: ReactNode }) {
    return (
        <thead className="bg-slate-800/50">
            {children}
        </thead>
    )
}

export function GlassTableBody({ children }: { children: ReactNode }) {
    return (
        <tbody className="divide-y divide-slate-700/50">
            {children}
        </tbody>
    )
}

export function GlassTableRow({
    children,
    onClick,
    clickable = false,
}: {
    children: ReactNode
    onClick?: () => void
    clickable?: boolean
}) {
    return (
        <tr
            onClick={onClick}
            className={`
        ${clickable ? 'cursor-pointer hover:bg-slate-700/30' : ''}
        transition-colors
      `}
        >
            {children}
        </tr>
    )
}

export function GlassTableHeader({
    children,
    className = '',
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <th className={`px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider ${className}`}>
            {children}
        </th>
    )
}

export function GlassTableCell({
    children,
    className = '',
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <td className={`px-4 py-3 text-sm text-slate-300 whitespace-nowrap ${className}`}>
            {children}
        </td>
    )
}
