import type { ReactNode } from 'react'

type MobileCardProps = {
    children: ReactNode
    onClick?: () => void
}

export function MobileCard({ children, onClick }: MobileCardProps) {
    const className =
        'w-full rounded-lg border border-gray-base/30 bg-white p-3 text-left shadow-sm dark:border-dark-border dark:bg-dark-surface' +
        (onClick ? ' transition hover:border-orange-base' : '')

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={className}>
                {children}
            </button>
        )
    }

    return <div className={className}>{children}</div>
}

type CardFieldProps = {
    label: string
    value: ReactNode
    valueClassName?: string
}

export function CardField({ label, value, valueClassName }: CardFieldProps) {
    return (
        <div className="flex items-center justify-between gap-3 py-1">
            <span className="shrink-0 text-xs text-gray-dark dark:text-dark-text-muted">{label}</span>
            <span className={`min-w-0 text-right text-sm font-medium text-gray-text dark:text-dark-text ${valueClassName ?? ''}`}>
                {value}
            </span>
        </div>
    )
}
