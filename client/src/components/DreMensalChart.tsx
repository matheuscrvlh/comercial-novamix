import Spinner from './Spinner'
import { calcularCascata } from '../lib/dre'
import { formatCurrency, formatPercent } from '../lib/format'
import { formatMes } from '../lib/date'
import type { ResultadoDreMensalRow } from '../types/financeiro'

type DreMensalChartProps = {
    rows: ResultadoDreMensalRow[]
    loading?: boolean
    erro?: string | null
}

export default function DreMensalChart({ rows, loading, erro }: DreMensalChartProps) {
    const meses = rows
        .map((row) => ({ mes: row.MES, ...calcularCascata(row) }))
        .sort((a, b) => a.mes.localeCompare(b.mes))

    const maior = Math.max(...meses.map((m) => Math.max(m.receitaLiquida, Math.abs(m.resultadoLiquido))), 1)

    return (
        <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
            <span className='text-sm font-medium text-gray-text dark:text-dark-text'>
                Resultado mensal — últimos 3 meses fechados
            </span>

            {erro && (
                <div className='mt-3 rounded-lg px-4 py-3 text-sm font-medium bg-red-light/10 text-red-base'>{erro}</div>
            )}

            {!erro && loading && (
                <div className='mt-4 flex items-center justify-center py-6'>
                    <Spinner className='h-5 w-5' />
                </div>
            )}

            {!erro && !loading && meses.length === 0 && (
                <div className='mt-3 text-sm text-gray-dark dark:text-dark-text-muted'>Sem dados no período.</div>
            )}

            {!erro && !loading && meses.length > 0 && (
                <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3'>
                    {meses.map((m) => (
                        <div key={m.mes} className='rounded-lg border border-gray-base/20 dark:border-dark-border p-4'>
                            <div className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                {formatMes(m.mes)}
                            </div>

                            <div className='mt-3 flex h-28 items-end gap-3'>
                                <div className='flex flex-1 flex-col items-center gap-1.5'>
                                    <span className='text-[10px] font-semibold tabular-nums text-gray-text dark:text-dark-text'>
                                        {formatCurrency(m.receitaLiquida)}
                                    </span>
                                    <div
                                        className='w-full max-w-10 rounded-t-sm bg-blue-500 transition-all duration-300'
                                        style={{ height: `${Math.max((m.receitaLiquida / maior) * 100, 2)}%` }}
                                    />
                                    <span className='text-[10px] text-gray-dark dark:text-dark-text-muted'>Rec. líquida</span>
                                </div>
                                <div className='flex flex-1 flex-col items-center gap-1.5'>
                                    <span
                                        className={`text-[10px] font-semibold tabular-nums ${m.resultadoLiquido < 0 ? 'text-red-base' : 'text-gray-text dark:text-dark-text'}`}
                                    >
                                        {formatCurrency(m.resultadoLiquido)}
                                    </span>
                                    <div
                                        className={`w-full max-w-10 rounded-t-sm transition-all duration-300 ${m.resultadoLiquido < 0 ? 'bg-red-base' : 'bg-green-600'}`}
                                        style={{ height: `${Math.max((Math.abs(m.resultadoLiquido) / maior) * 100, 2)}%` }}
                                    />
                                    <span className='text-[10px] text-gray-dark dark:text-dark-text-muted'>Resultado</span>
                                </div>
                            </div>

                            <div className='mt-3 border-t border-gray-base/20 pt-2 text-xs dark:border-dark-border'>
                                <span className='text-gray-dark dark:text-dark-text-muted'>Margem bruta: </span>
                                <span className='font-semibold text-gray-text dark:text-dark-text'>
                                    {formatPercent(m.margemBruta)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
