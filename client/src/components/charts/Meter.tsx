import { CHART_SERIES_1, CHART_SERIES_1_TRACK } from '../../lib/chartColors'

type MeterProps = {
    label: string
    valor: number
    meta: number
    formatValor: (n: number) => string
    /**
     * Escala usada quando nao ha meta configurada (meta <= 0): a barra vira uma
     * comparacao de magnitude (valor / maior valor do grupo) em vez de sumir
     * zerada - sem isso, uma secao sem meta cadastrada renderiza uma barra
     * invisivel mesmo tendo venda real.
     */
    maxParaEscala?: number
}

/**
 * Barra de progresso (mesma rampa track/fill) com um traço marcando a meta -
 * "razao unica contra um limite" pede Meter, nao pizza de 2 fatias.
 */
export default function Meter({ label, valor, meta, formatValor, maxParaEscala }: MeterProps) {
    const temMeta = meta > 0
    const pct = temMeta ? valor / meta : valor / (maxParaEscala && maxParaEscala > 0 ? maxParaEscala : 1)
    const pctFill = Math.min(pct, 1) * 100
    const bateuMeta = temMeta && pct >= 1

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-gray-text dark:text-dark-text">{label}</span>
                <span className="shrink-0 text-right">
                    <span className="text-sm font-semibold text-gray-text dark:text-dark-text">{formatValor(valor)}</span>
                    {temMeta && (
                        <span className="ml-1 text-xs text-gray-dark dark:text-dark-text-muted">/ meta {formatValor(meta)}</span>
                    )}
                </span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: CHART_SERIES_1_TRACK }}>
                <div
                    className="h-full rounded-full transition-[width]"
                    style={{ width: `${pctFill}%`, backgroundColor: CHART_SERIES_1 }}
                />
                {temMeta && (
                    <div className="absolute top-0 h-full w-0.5 bg-gray-text/70 dark:bg-dark-text/70" style={{ left: '100%' }} />
                )}
            </div>
            {temMeta && (
                <span className={`text-xs font-medium ${bateuMeta ? 'text-green-base' : 'text-gray-dark dark:text-dark-text-muted'}`}>
                    {(pct * 100).toFixed(0)}% da meta
                </span>
            )}
        </div>
    )
}
