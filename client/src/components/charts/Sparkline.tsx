import { CHART_SERIES_1 } from '../../lib/chartColors'

type SparklineProps = {
    valores: number[]
    largura?: number
    altura?: number
    cor?: string
}

export default function Sparkline({ valores, largura = 72, altura = 24, cor = CHART_SERIES_1 }: SparklineProps) {
    if (valores.length < 2) return null

    const max = Math.max(...valores)
    const min = Math.min(...valores)
    const range = max - min || 1

    const pontos = valores.map((v, i) => {
        const x = (i / (valores.length - 1)) * largura
        const y = altura - ((v - min) / range) * altura
        return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    return (
        <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} className="overflow-visible">
            <polyline points={pontos.join(' ')} fill="none" stroke={cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    )
}
