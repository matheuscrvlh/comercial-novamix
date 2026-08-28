import Spinner from '../Spinner'
import { CHART_SERIES_1, CHART_SERIES_1_TRACK } from '../../lib/chartColors'

type RankingItem = {
    label: string
    valor: number
    sublabel?: string
}

type RankingBarsProps = {
    titulo: string
    itens: RankingItem[]
    loading: boolean
    erro?: string | null
    formatValor: (n: number) => string
    limite?: number
    cor?: string
    corTrack?: string
}

export default function RankingBars({
    titulo,
    itens,
    loading,
    erro,
    formatValor,
    limite = 6,
    cor = CHART_SERIES_1,
    corTrack = CHART_SERIES_1_TRACK,
}: RankingBarsProps) {
    const visiveis = itens.slice(0, limite)
    const max = Math.max(1, ...visiveis.map((i) => i.valor))

    return (
        <div className="rounded-xl border border-gray-base/30 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h3 className="mb-4 text-sm font-semibold text-gray-text dark:text-dark-text">{titulo}</h3>

            {loading && (
                <div className="flex justify-center py-6">
                    <Spinner className="h-5 w-5" />
                </div>
            )}

            {!loading && erro && <p className="text-sm text-red-base">{erro}</p>}

            {!loading && !erro && visiveis.length === 0 && (
                <p className="text-sm text-gray-dark dark:text-dark-text-muted">Nenhum registro no período.</p>
            )}

            {!loading && !erro && visiveis.length > 0 && (
                <ul className="flex flex-col gap-3">
                    {visiveis.map((item, i) => (
                        <li key={i} className="flex flex-col gap-1">
                            <div className="flex items-baseline justify-between gap-2 text-sm">
                                <span className="min-w-0 truncate text-gray-text dark:text-dark-text" title={item.label}>
                                    {item.label}
                                </span>
                                <span className="shrink-0 font-medium text-gray-text dark:text-dark-text">{formatValor(item.valor)}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: corTrack }}>
                                <div className="h-full rounded-full" style={{ width: `${(item.valor / max) * 100}%`, backgroundColor: cor }} />
                            </div>
                            {item.sublabel && (
                                <span className="text-xs text-gray-dark dark:text-dark-text-muted">{item.sublabel}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
