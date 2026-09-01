import { useRef, useState } from 'react'
import Spinner from '../Spinner'
import { CHART_GRID, CHART_SERIES_1, CHART_SERIES_1_WASH, CHART_SERIES_2 } from '../../lib/chartColors'
import { formatDate } from '../../lib/format'

export interface TrendPoint {
    dia: number
    data: string
    atual: number
    anterior: number
}

export type UnidadeTrend = 'moeda' | 'percentual'

export interface TrendMetrica {
    id: string
    label: string
    dados: TrendPoint[]
    unidade: UnidadeTrend
}

type TrendChartProps = {
    titulo: string
    legendaAtual: string
    legendaAnterior: string
    metricas: TrendMetrica[]
    metricaAtiva: string
    onChangeMetrica: (id: string) => void
    loading: boolean
}

const LARGURA = 960
const ALTURA = 340
const PAD_ESQ = 72
const PAD_DIR = 16
const PAD_TOPO = 20
const PAD_BASE = 32

function formatEixo(valor: number, unidade: UnidadeTrend) {
    if (unidade === 'percentual') {
        return `${(valor * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`
    }
    return new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL', maximumFractionDigits: 1 }).format(
        valor
    )
}

function formatValor(valor: number, unidade: UnidadeTrend) {
    if (unidade === 'percentual') {
        return valor.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
    }
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function TrendChart({ titulo, legendaAtual, legendaAnterior, metricas, metricaAtiva, onChangeMetrica, loading }: TrendChartProps) {
    const svgRef = useRef<SVGSVGElement>(null)
    const [hoverIndex, setHoverIndex] = useState<number | null>(null)

    const metrica = metricas.find((m) => m.id === metricaAtiva) ?? metricas[0]
    const dados = metrica?.dados ?? []
    const unidade = metrica?.unidade ?? 'moeda'

    const areaLargura = LARGURA - PAD_ESQ - PAD_DIR
    const areaAltura = ALTURA - PAD_TOPO - PAD_BASE

    const maxValor = Math.max(unidade === 'percentual' ? 0.01 : 1, ...dados.flatMap((d) => [d.atual, d.anterior]))

    function x(i: number) {
        if (dados.length <= 1) return PAD_ESQ
        return PAD_ESQ + (i / (dados.length - 1)) * areaLargura
    }

    function y(valor: number) {
        return PAD_TOPO + areaAltura - (valor / maxValor) * areaAltura
    }

    const linhaAtual = dados.map((d, i) => `${x(i).toFixed(1)},${y(d.atual).toFixed(1)}`).join(' ')
    const linhaAnterior = dados.map((d, i) => `${x(i).toFixed(1)},${y(d.anterior).toFixed(1)}`).join(' ')
    const areaAtual = `${PAD_ESQ.toFixed(1)},${(PAD_TOPO + areaAltura).toFixed(1)} ${linhaAtual} ${x(dados.length - 1).toFixed(1)},${(
        PAD_TOPO + areaAltura
    ).toFixed(1)}`

    const ticksY = 5
    const valoresTickY = Array.from({ length: ticksY + 1 }, (_, i) => (maxValor / ticksY) * i)

    function aoMoverMouse(e: React.MouseEvent<SVGSVGElement>) {
        if (!svgRef.current || dados.length === 0) return
        const rect = svgRef.current.getBoundingClientRect()
        const relX = ((e.clientX - rect.left) / rect.width) * LARGURA
        const posicao = ((relX - PAD_ESQ) / areaLargura) * (dados.length - 1)
        const indice = Math.min(dados.length - 1, Math.max(0, Math.round(posicao)))
        setHoverIndex(indice)
    }

    const pontoAtivo = hoverIndex !== null ? dados[hoverIndex] : null

    return (
        <div className="rounded-xl border border-gray-base/30 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-text dark:text-dark-text">{titulo}</h3>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex gap-1 rounded-lg border border-gray-base/30 p-0.5 dark:border-dark-border">
                        {metricas.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => onChangeMetrica(m.id)}
                                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                    m.id === metricaAtiva
                                        ? 'bg-orange-base text-white'
                                        : 'text-gray-dark hover:bg-gray-base/10 dark:text-dark-text-muted dark:hover:bg-dark-border/30'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-dark dark:text-dark-text-muted">
                        <span className="flex items-center gap-1.5">
                            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: CHART_SERIES_1 }} />
                            {legendaAtual}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: CHART_SERIES_2 }} />
                            {legendaAnterior}
                        </span>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="flex aspect-960/340 w-full items-center justify-center">
                    <Spinner className="h-6 w-6" />
                </div>
            )}

            {!loading && dados.length === 0 && (
                <div className="flex aspect-960/340 w-full items-center justify-center text-sm text-gray-dark dark:text-dark-text-muted">
                    Sem dados no período.
                </div>
            )}

            {!loading && dados.length > 0 && (
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${LARGURA} ${ALTURA}`}
                    onMouseMove={aoMoverMouse}
                    onMouseLeave={() => setHoverIndex(null)}
                    className="aspect-960/340 w-full overflow-visible"
                >
                    {valoresTickY.map((v, i) => (
                        <g key={i}>
                            <line x1={PAD_ESQ} x2={LARGURA - PAD_DIR} y1={y(v)} y2={y(v)} stroke={CHART_GRID} strokeWidth={1} />
                            <text
                                x={PAD_ESQ - 10}
                                y={y(v)}
                                textAnchor="end"
                                dominantBaseline="middle"
                                className="fill-gray-dark text-[11px] dark:fill-dark-text-muted"
                            >
                                {formatEixo(v, unidade)}
                            </text>
                        </g>
                    ))}

                    <polygon points={areaAtual} fill={CHART_SERIES_1_WASH} stroke="none" />
                    <polyline points={linhaAnterior} fill="none" stroke={CHART_SERIES_2} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    <polyline points={linhaAtual} fill="none" stroke={CHART_SERIES_1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

                    {dados.length <= 40 &&
                        [0, Math.floor(dados.length / 2), dados.length - 1].map((i) => (
                            <text
                                key={i}
                                x={x(i)}
                                y={ALTURA - 8}
                                textAnchor={i === 0 ? 'start' : i === dados.length - 1 ? 'end' : 'middle'}
                                className="fill-gray-dark text-[11px] dark:fill-dark-text-muted"
                            >
                                {formatDate(dados[i].data)}
                            </text>
                        ))}

                    {pontoAtivo && (
                        <g>
                            <line
                                x1={x(hoverIndex!)}
                                x2={x(hoverIndex!)}
                                y1={PAD_TOPO}
                                y2={PAD_TOPO + areaAltura}
                                stroke={CHART_GRID}
                                strokeWidth={1}
                            />
                            <circle cx={x(hoverIndex!)} cy={y(pontoAtivo.atual)} r={4} fill={CHART_SERIES_1} stroke="white" strokeWidth={2} />
                            <circle
                                cx={x(hoverIndex!)}
                                cy={y(pontoAtivo.anterior)}
                                r={4}
                                fill={CHART_SERIES_2}
                                stroke="white"
                                strokeWidth={2}
                            />

                            {(() => {
                                const larguraCaixa = 168
                                const alturaCaixa = 64
                                const cxCaixa = Math.min(Math.max(x(hoverIndex!) - larguraCaixa / 2, 0), LARGURA - larguraCaixa)
                                const cyCaixa = PAD_TOPO
                                return (
                                    <g transform={`translate(${cxCaixa}, ${cyCaixa})`}>
                                        <rect
                                            width={larguraCaixa}
                                            height={alturaCaixa}
                                            rx={8}
                                            className="fill-white stroke-gray-base/30 dark:fill-dark-surface dark:stroke-dark-border"
                                            strokeWidth={1}
                                        />
                                        <text x={12} y={20} className="fill-gray-dark text-[11px] font-medium dark:fill-dark-text-muted">
                                            {formatDate(pontoAtivo.data)}
                                        </text>
                                        <line x1={12} x2={24} y1={34} y2={34} stroke={CHART_SERIES_1} strokeWidth={2} />
                                        <text x={30} y={38} className="fill-gray-text text-xs font-semibold dark:fill-dark-text">
                                            {formatValor(pontoAtivo.atual, unidade)}
                                        </text>
                                        <line x1={12} x2={24} y1={52} y2={52} stroke={CHART_SERIES_2} strokeWidth={2} />
                                        <text x={30} y={56} className="fill-gray-text text-xs font-semibold dark:fill-dark-text">
                                            {formatValor(pontoAtivo.anterior, unidade)}
                                        </text>
                                    </g>
                                )
                            })()}
                        </g>
                    )}
                </svg>
            )}
        </div>
    )
}
