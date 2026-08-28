import Spinner from '../Spinner'
import { CHART_SERIES_1, CHART_SERIES_2 } from '../../lib/chartColors'
import { formatNumber } from '../../lib/format'

type GroupedItem = {
    label: string
    valorA: number
    valorB: number
    sublabel?: string
}

type GroupedBarsProps = {
    titulo: string
    legendaA: string
    legendaB: string
    itens: GroupedItem[]
    loading: boolean
    limite?: number
    corA?: string
    corB?: string
}

/**
 * Duas series lado a lado por categoria (ex: tickets positivos x negativos por
 * operador) - job de identidade, por isso categorico, nao sequencial.
 */
export default function GroupedBars({
    titulo,
    legendaA,
    legendaB,
    itens,
    loading,
    limite = 8,
    corA = CHART_SERIES_1,
    corB = CHART_SERIES_2,
}: GroupedBarsProps) {
    const visiveis = itens.slice(0, limite)
    const max = Math.max(1, ...visiveis.flatMap((i) => [i.valorA, i.valorB]))

    return (
        <div className="rounded-xl border border-gray-base/30 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-text dark:text-dark-text">{titulo}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-dark dark:text-dark-text-muted">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: corA }} />
                        {legendaA}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: corB }} />
                        {legendaB}
                    </span>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center py-6">
                    <Spinner className="h-5 w-5" />
                </div>
            )}

            {!loading && visiveis.length === 0 && (
                <p className="text-sm text-gray-dark dark:text-dark-text-muted">Nenhum registro no período.</p>
            )}

            {!loading && visiveis.length > 0 && (
                <ul className="flex flex-col gap-3">
                    {visiveis.map((item, i) => (
                        <li key={i} className="flex flex-col gap-1">
                            <span className="truncate text-sm text-gray-text dark:text-dark-text" title={item.label}>
                                {item.label}
                            </span>
                            {item.sublabel && (
                                <span className="text-xs text-gray-dark dark:text-dark-text-muted">{item.sublabel}</span>
                            )}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-base/10 dark:bg-dark-border/40">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${(item.valorA / max) * 100}%`, backgroundColor: corA }}
                                        />
                                    </div>
                                    <span className="w-10 shrink-0 text-right text-xs text-gray-dark dark:text-dark-text-muted">
                                        {formatNumber(item.valorA)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-base/10 dark:bg-dark-border/40">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${(item.valorB / max) * 100}%`, backgroundColor: corB }}
                                        />
                                    </div>
                                    <span className="w-10 shrink-0 text-right text-xs text-gray-dark dark:text-dark-text-muted">
                                        {formatNumber(item.valorB)}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
