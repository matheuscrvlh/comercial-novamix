import { nomeFilial } from '../constants/filiais'
import { formatCurrency, formatPercent } from '../lib/format'
import Spinner from './Spinner'
import type { LucroBrutoRow, VendaBrutaRow } from '../types/financeiro'

const TOTAL_FILIAIS = 100

type VendaRankingChartProps = {
    rows: VendaBrutaRow[]
    lucroBrutoRows: LucroBrutoRow[]
    selecionadas: number[]
    loading: boolean
    erro: string | null
}

// Ramp sequencial (um hue, mais escuro = maior venda) — magnitude, não identidade.
const RAMP_SEQUENCIAL = ['#0d366b', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#86b6ef']

export default function VendaRankingChart({ rows, lucroBrutoRows, selecionadas, loading, erro }: VendaRankingChartProps) {
    const ranking = selecionadas
        .map((id) => ({
            id,
            nome: nomeFilial(id),
            valor: Number(rows.find((row) => row.IDEMPRESA === id)?.VALOR_VENDA_BRUTA ?? 0),
        }))
        .sort((a, b) => b.valor - a.valor)

    const maior = Math.max(...ranking.map((item) => item.valor), 1)

    const totalVenda = Number(rows.find((row) => row.IDEMPRESA === TOTAL_FILIAIS)?.VALOR_VENDA_BRUTA ?? 0)
    const totalLucroBruto = Number(
        lucroBrutoRows.find((row) => row.IDEMPRESA === TOTAL_FILIAIS)?.LUCRO_BRUTO ?? 0
    )
    const margem = totalVenda !== 0 ? totalLucroBruto / totalVenda : 0

    return (
        <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
                <span className='text-sm font-medium text-gray-text dark:text-dark-text'>
                    Venda bruta — ranking por filial
                </span>

                {!erro && (
                    <div className='text-right'>
                        <div className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                            Total
                        </div>
                        <div className='text-sm font-semibold text-gray-text dark:text-dark-text'>
                            {loading ? <Spinner className='h-3.5 w-3.5' /> : formatCurrency(totalVenda)}
                        </div>
                        <div className='mt-1 text-xs text-gray-dark dark:text-dark-text-muted'>
                            Margem: {loading ? <Spinner className='inline h-3 w-3' /> : formatPercent(margem)}
                        </div>
                    </div>
                )}
            </div>

            {erro && (
                <div className='mt-3 rounded-lg px-4 py-3 text-sm font-medium bg-red-light/10 text-red-base'>
                    {erro}
                </div>
            )}

            {!erro && (
                <div className='mt-6 min-w-0 overflow-x-auto'>
                    <div className='flex h-72 min-w-full items-end gap-1.5 px-1 sm:gap-3 lg:h-96 lg:gap-6'>
                        {ranking.map((item, indice) => {
                            const altura = loading ? 0 : Math.max((item.valor / maior) * 100, 2)
                            const cor = RAMP_SEQUENCIAL[Math.min(indice, RAMP_SEQUENCIAL.length - 1)]

                            return (
                                <div key={item.id} className='flex h-full min-w-11 flex-1 flex-col items-center justify-end gap-1.5 sm:min-w-16 sm:gap-2 lg:min-w-20'>
                                    <span className='flex w-full items-center justify-center text-center text-[10px] font-semibold tabular-nums text-gray-text dark:text-dark-text sm:text-xs'>
                                        {loading ? <Spinner className='h-3 w-3' /> : formatCurrency(item.valor)}
                                    </span>
                                    <div
                                        className='w-full max-w-8 rounded-t-sm bg-gray transition-all duration-300 hover:brightness-110 dark:bg-dark-surface-2 sm:max-w-12 lg:max-w-16'
                                        style={{ height: `${altura}%`, backgroundColor: cor }}
                                        title={`${item.nome}: ${formatCurrency(item.valor)}`}
                                        tabIndex={0}
                                    />
                                    <span className='w-full truncate text-center text-[10px] font-medium text-gray-dark dark:text-dark-text-muted'>
                                        {item.nome}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
