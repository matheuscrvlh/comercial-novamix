import Spinner from './Spinner'
import { formatCurrency, formatNumber } from '../lib/format'

type RankingItem = {
    label: string
    quantidade?: number
    valor: number
}

type RankingListProps = {
    titulo: string
    itens: RankingItem[]
    loading: boolean
    erro?: string | null
    limite?: number
}

export default function RankingList({ titulo, itens, loading, erro, limite = 10 }: RankingListProps) {
    const visiveis = itens.slice(0, limite)

    return (
        <div className="rounded-xl border border-gray-base/30 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h3 className="mb-3 text-sm font-semibold text-gray-text dark:text-dark-text">{titulo}</h3>

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
                <ul className="flex flex-col gap-2">
                    {visiveis.map((item) => (
                        <li
                            key={item.label}
                            className="flex items-center justify-between gap-3 border-b border-gray-base/10 pb-2 text-sm last:border-0 last:pb-0 dark:border-dark-border/60"
                        >
                            <span className="min-w-0 flex-1 truncate text-gray-text dark:text-dark-text" title={item.label}>
                                {item.label}
                            </span>
                            <span className="shrink-0 text-right">
                                {item.quantidade !== undefined && (
                                    <span className="mr-2 text-xs text-gray-dark dark:text-dark-text-muted">
                                        {formatNumber(item.quantidade)} un
                                    </span>
                                )}
                                <span className="font-medium text-gray-text dark:text-dark-text">
                                    {formatCurrency(item.valor)}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
