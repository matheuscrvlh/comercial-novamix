import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../Spinner'
import Sparkline from './Sparkline'
import { formatPercent } from '../../lib/format'

type StatCardProps = {
    label: string
    valor: ReactNode
    loading?: boolean
    delta?: number | null
    deltaLabel?: string
    tendencia?: number[]
    to?: string
    corValor?: string
    rodape?: ReactNode
}

const cardBase =
    'flex flex-col gap-1 rounded-xl border border-gray-base/30 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface'

export default function StatCard({ label, valor, loading, delta, deltaLabel, tendencia, to, corValor, rodape }: StatCardProps) {
    const conteudo = (
        <>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">{label}</span>
            <div className="mt-1 flex items-end justify-between gap-3">
                <div className={`text-xl font-semibold ${corValor ?? 'text-gray-text dark:text-dark-text'}`}>
                    {loading ? <Spinner className="h-5 w-5" /> : valor}
                </div>
                {!loading && tendencia && tendencia.length > 1 && <Sparkline valores={tendencia} />}
            </div>
            {!loading && delta !== undefined && delta !== null && (
                <span className={`text-xs font-medium ${delta >= 0 ? 'text-green-base' : 'text-red-base'}`}>
                    {delta >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(delta))}
                    {deltaLabel && <span className="ml-1 font-normal text-gray-dark dark:text-dark-text-muted">{deltaLabel}</span>}
                </span>
            )}
            {!loading && rodape && <span className="text-xs text-gray-dark dark:text-dark-text-muted">{rodape}</span>}
        </>
    )

    if (to) {
        return (
            <Link to={to} className={`${cardBase} transition hover:border-orange-base`}>
                {conteudo}
            </Link>
        )
    }

    return <div className={cardBase}>{conteudo}</div>
}
