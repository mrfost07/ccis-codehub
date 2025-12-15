import { ReactNode } from 'react'

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
}

export function ResponsiveContainer({ children, className = '' }: ResponsiveContainerProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: ReactNode
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: string
  className?: string
}

export function ResponsiveGrid({ 
  children, 
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'gap-4 sm:gap-6',
  className = '' 
}: ResponsiveGridProps) {
  const gridCols = `grid-cols-${cols.mobile} sm:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop}`
  
  return (
    <div className={`grid ${gap} ${className}`} style={{
      gridTemplateColumns: `repeat(${cols.mobile}, minmax(0, 1fr))`,
    }}>
      {children}
    </div>
  )
}

interface ResponsiveCardProps {
  children: ReactNode
  className?: string
  padding?: string
  onClick?: () => void
}

export function ResponsiveCard({ 
  children, 
  className = '', 
  padding = 'p-4 sm:p-6',
  onClick 
}: ResponsiveCardProps) {
  return (
    <div 
      className={`bg-slate-900 rounded-lg sm:rounded-xl border border-slate-800 ${padding} ${className} ${onClick ? 'cursor-pointer hover:border-slate-700 transition' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface ResponsiveTableProps {
  headers: string[]
  children: ReactNode
  className?: string
}

export function ResponsiveTable({ headers, children, className = '' }: ResponsiveTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className={`w-full ${className}`}>
          <thead>
            <tr className="border-b border-slate-800">
              {headers.map((header, index) => (
                <th key={index} className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {children}
      </div>
    </>
  )
}

interface ResponsiveTextProps {
  children: ReactNode
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small'
  className?: string
}

export function ResponsiveText({ children, variant = 'body', className = '' }: ResponsiveTextProps) {
  const variants = {
    h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
    h2: 'text-xl sm:text-2xl lg:text-3xl font-bold',
    h3: 'text-lg sm:text-xl lg:text-2xl font-semibold',
    h4: 'text-base sm:text-lg lg:text-xl font-semibold',
    body: 'text-sm sm:text-base',
    small: 'text-xs sm:text-sm',
  }

  return (
    <div className={`${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}

interface ResponsiveButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  className?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

export function ResponsiveButton({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'medium',
  className = '',
  type = 'button',
  disabled = false
}: ResponsiveButtonProps) {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }

  const sizes = {
    small: 'px-3 py-1.5 text-xs sm:text-sm',
    medium: 'px-4 py-2 text-sm sm:text-base',
    large: 'px-6 py-3 text-base sm:text-lg',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  )
}
