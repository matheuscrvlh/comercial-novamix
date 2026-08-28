import { CHART_CRITICAL, CHART_GOOD } from '../../lib/chartColors'

const TRACK = 'rgba(137, 135, 129, 0.18)'

type DonutStatProps = {
    label: string
    pct: number
    sublabel?: string
}

/**
 * Anel de progresso com o % no centro - pra "essa % bateu ou nao" isso le mais
 * rapido que barra empilhada, principalmente com poucos itens lado a lado
 * (aqui, uma por loja). Cor segue o mesmo corte de 50% ja usado na tabela desta
 * tela (status, nao serie generica - por isso foge do par azul/laranja).
 */
export default function DonutStat({ label, pct, sublabel }: DonutStatProps) {
    const r = 42
    const circ = 2 * Math.PI * r
    const pctClamp = Math.max(0, Math.min(1, pct))
    const offset = circ * (1 - pctClamp)
    const cor = pctClamp >= 0.5 ? CHART_GOOD : CHART_CRITICAL

    return (
        <div className="flex flex-col items-center gap-2">
            <svg width={100} height={100} viewBox="0 0 100 100">
                <circle cx={50} cy={50} r={r} fill="none" stroke={TRACK} strokeWidth={10} />
                <circle
                    cx={50}
                    cy={50}
                    r={r}
                    fill="none"
                    stroke={cor}
                    strokeWidth={10}
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                />
                <text
                    x={50}
                    y={50}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-gray-text text-lg font-semibold dark:fill-dark-text"
                >
                    {(pctClamp * 100).toFixed(0)}%
                </text>
            </svg>
            <span className="text-sm font-medium text-gray-text dark:text-dark-text">{label}</span>
            {sublabel && <span className="text-xs text-gray-dark dark:text-dark-text-muted">{sublabel}</span>}
        </div>
    )
}
