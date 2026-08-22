import { useState } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import BarList from '../components/BarList'
import DataTable from '../components/DataTable'
import { useMe } from '../hooks/useMe'
import { useFinanceiro } from '../hooks/useFinanceiro'
import { formatCurrency, formatPercent } from '../lib/format'
import { nomeFilial } from '../constants/filiais'
import { getUltimosMesesFechados } from '../lib/date'
import { idealDespesaPara } from '../constants/despesaIdeal'
import type { DespesasResponse } from '../types/financeiro'

const TOTAL_FILIAIS = 100

export default function Despesas() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const periodoPadrao = getUltimosMesesFechados(3)
    const [inicio, setInicio] = useState(periodoPadrao.inicio)
    const [fim, setFim] = useState(periodoPadrao.fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = me ? me.branches : []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useFinanceiro<DespesasResponse>(
        '/financeiro/despesas',
        { inicio, fim, filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const porNatureza = data?.porNatureza ?? []
    const porLoja = data?.porLoja.filter((row) => row.IDEMPRESA !== TOTAL_FILIAIS) ?? []
    const porNaturezaLoja = data?.porNaturezaLoja ?? []
    const evolucaoMensal = data?.evolucaoMensal ?? []
    const receitaLiquida = data?.receitaLiquida.find((row) => row.IDEMPRESA === TOTAL_FILIAIS)?.RECEITA_LIQUIDA ?? 0

    const despesaTotal = porNatureza.reduce((soma, row) => soma + Number(row.VALOR_DESPESA), 0)
    const despesaSobreReceita = receitaLiquida > 0 ? despesaTotal / receitaLiquida : 0

    const naturezasComIdeal = porNatureza.map((row) => {
        const valor = Number(row.VALOR_DESPESA)
        const percentual = receitaLiquida > 0 ? valor / receitaLiquida : 0
        const idealPercentual = idealDespesaPara(row.NATUREZA)
        const idealValor = idealPercentual !== null ? idealPercentual * receitaLiquida : null
        const excesso = idealPercentual !== null ? percentual - idealPercentual : null
        return { natureza: row.NATUREZA, valor, percentual, idealPercentual, idealValor, excesso }
    })

    const piorNatureza = naturezasComIdeal
        .filter((item) => item.excesso !== null && item.excesso > 0)
        .sort((a, b) => (b.excesso ?? 0) - (a.excesso ?? 0))[0]

    const lojas = [...new Map(porNaturezaLoja.map((row) => [row.IDEMPRESA, row.NOME_EMPRESA])).keys()]
    const naturezas = [...new Set(porNaturezaLoja.map((row) => row.NATUREZA))]
    const meses = [...new Set(evolucaoMensal.map((row) => row.MES))].sort()

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={habilitado}
            titulo='Despesas'
            subtitulo='Detalhamento contábil por natureza, loja e mês.'
            filtros={
                <FiltersMenu>
                    <div className='flex flex-col gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                            Filiais
                        </span>
                        <FilialMultiFilter branches={branchesDisponiveis} selected={filiaisAtivas} onChange={setSelecionadas} />
                    </div>
                    <div className='flex flex-col gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                            Período
                        </span>
                        <DateRangeFilter inicio={inicio} fim={fim} onChangeInicio={setInicio} onChangeFim={setFim} />
                    </div>
                </FiltersMenu>
            }
        >
            {erro && (
                <div className='mb-6 rounded-lg px-4 py-3 text-sm font-medium bg-red-light/10 text-red-base'>{erro}</div>
            )}

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>Despesa total (período)</span>
                    <div className='mt-3 text-2xl font-semibold text-gray-text dark:text-dark-text'>
                        {loading ? <Spinner className='h-5 w-5' /> : formatCurrency(despesaTotal)}
                    </div>
                </div>
                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>Despesa / receita líquida</span>
                    <div className='mt-3 text-2xl font-semibold text-gray-text dark:text-dark-text'>
                        {loading ? <Spinner className='h-5 w-5' /> : formatPercent(despesaSobreReceita)}
                    </div>
                </div>
                <div
                    className={`rounded-xl border bg-white dark:bg-dark-surface p-6 shadow-sm ${
                        piorNatureza
                            ? 'border-red-base/40 dark:border-red-base/40'
                            : 'border-gray-base/30 dark:border-dark-border'
                    }`}
                >
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>Alerta de despesa</span>
                    <div
                        className={`mt-3 text-2xl font-semibold ${piorNatureza ? 'text-red-base' : 'text-green-600'}`}
                    >
                        {loading ? <Spinner className='h-5 w-5' /> : (piorNatureza?.natureza ?? 'Dentro do ideal')}
                    </div>
                    {!loading && piorNatureza && (
                        <span className='text-xs text-red-base'>
                            {formatPercent(piorNatureza.percentual)} da receita — ideal até{' '}
                            {formatPercent(piorNatureza.idealPercentual ?? 0)}
                        </span>
                    )}
                    {!loading && !piorNatureza && (
                        <span className='text-xs text-gray-dark dark:text-dark-text-muted'>
                            Nenhuma natureza acima do teto definido
                        </span>
                    )}
                </div>
            </div>

            <div className='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <BarList
                    titulo='Despesa por natureza (acumulado no período) — linha marca o teto ideal'
                    items={naturezasComIdeal.map((item) => ({
                        label: item.natureza,
                        valor: item.valor,
                        limite: item.idealValor ?? undefined,
                        sublabel: item.idealPercentual !== null ? `real ${formatPercent(item.percentual)} / ideal ${formatPercent(item.idealPercentual)}` : undefined,
                    }))}
                    formatValor={formatCurrency}
                    loading={loading}
                    cor='#c53434'
                />
                <BarList
                    titulo='Despesa por loja'
                    items={porLoja.map((row) => ({ label: nomeFilial(row.IDEMPRESA), valor: Number(row.VALOR_DESPESA) }))}
                    formatValor={formatCurrency}
                    loading={loading}
                />
            </div>

            <div className='mt-6'>
                <DataTable
                    titulo='Despesa por natureza x loja'
                    loading={loading}
                    rows={naturezas.map((natureza) => {
                        const linha: Record<string, unknown> = { NATUREZA: natureza }
                        lojas.forEach((idEmpresa) => {
                            const encontrado = porNaturezaLoja.find(
                                (row) => row.NATUREZA === natureza && row.IDEMPRESA === idEmpresa
                            )
                            linha[`L${idEmpresa}`] = Number(encontrado?.VALOR_DESPESA ?? 0)
                        })
                        linha.TOTAL = lojas.reduce((soma, idEmpresa) => soma + Number(linha[`L${idEmpresa}`]), 0)
                        return linha
                    })}
                    columns={[
                        { key: 'natureza', label: 'Natureza', render: (row) => String(row.NATUREZA) },
                        ...lojas.map((idEmpresa) => ({
                            key: `l${idEmpresa}`,
                            label: nomeFilial(idEmpresa),
                            align: 'right' as const,
                            render: (row: Record<string, unknown>) => formatCurrency(Number(row[`L${idEmpresa}`])),
                        })),
                        {
                            key: 'total',
                            label: 'Total',
                            align: 'right' as const,
                            render: (row: Record<string, unknown>) => formatCurrency(Number(row.TOTAL)),
                        },
                    ]}
                />
            </div>

            <div className='mt-6'>
                <DataTable
                    titulo='Evolução mensal por natureza'
                    loading={loading}
                    rows={meses.map((mes) => {
                        const linha: Record<string, unknown> = { MES: mes }
                        naturezas.forEach((natureza) => {
                            const encontrado = evolucaoMensal.find((row) => row.MES === mes && row.NATUREZA === natureza)
                            linha[natureza] = Number(encontrado?.VALOR_DESPESA ?? 0)
                        })
                        return linha
                    })}
                    columns={[
                        { key: 'mes', label: 'Mês', render: (row) => String(row.MES) },
                        ...naturezas.map((natureza) => ({
                            key: natureza,
                            label: natureza,
                            align: 'right' as const,
                            render: (row: Record<string, unknown>) => formatCurrency(Number(row[natureza])),
                        })),
                    ]}
                />
            </div>
        </PageShell>
    )
}
