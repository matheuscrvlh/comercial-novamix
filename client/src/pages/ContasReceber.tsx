import { useState } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import BarList from '../components/BarList'
import DataTable from '../components/DataTable'
import { useMe } from '../hooks/useMe'
import { useFinanceiro } from '../hooks/useFinanceiro'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import type { ContasReceberDetalheResponse } from '../types/financeiro'

export default function ContasReceber() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = me ? me.branches : []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useFinanceiro<ContasReceberDetalheResponse>(
        '/financeiro/contas-receber-detalhe',
        { filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const situacao = data?.situacao ?? []
    const clientes = data?.clientes ?? []
    const formaPagamento = data?.formaPagamento ?? []
    const recorrencia = data?.recorrencia ?? []

    const emAberto = situacao.filter((row) => row.ESTADO === 'Em aberto')
    const vencido = emAberto.find((row) => row.SITUACAO === 'Vencido')
    const aVencer = emAberto.find((row) => row.SITUACAO === 'A vencer')
    const totalEmAberto = (vencido?.SALDO ?? 0) + (aVencer?.SALDO ?? 0)
    const inadimplencia = totalEmAberto > 0 ? (vencido?.SALDO ?? 0) / totalEmAberto : 0

    const meses = [...new Set(recorrencia.map((row) => row.MES))].sort()
    const ultimoMes = meses[meses.length - 1]
    const recorrentesUltimoMes = recorrencia.find((row) => row.MES === ultimoMes && row.TIPO === 'Recorrentes')
    const naoRecorrentesUltimoMes = recorrencia.find((row) => row.MES === ultimoMes && row.TIPO === 'Nao recorrentes')

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={habilitado}
            titulo='Contas a Receber'
            subtitulo='Carteira em aberto, aging, top clientes e recorrência.'
            filtros={
                <FiltersMenu>
                    <div className='flex flex-col gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                            Filiais
                        </span>
                        <FilialMultiFilter branches={branchesDisponiveis} selected={filiaisAtivas} onChange={setSelecionadas} />
                    </div>
                </FiltersMenu>
            }
        >
            {erro && (
                <div className='mb-6 rounded-lg px-4 py-3 text-sm font-medium bg-red-light/10 text-red-base'>{erro}</div>
            )}

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>Total em aberto</span>
                    <div className='mt-3 text-2xl font-semibold text-gray-text dark:text-dark-text'>
                        {loading ? <Spinner className='h-5 w-5' /> : formatCurrency(totalEmAberto)}
                    </div>
                </div>
                <div className='rounded-xl border border-red-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>Vencido</span>
                    <div className='mt-3 text-2xl font-semibold text-red-base'>
                        {loading ? <Spinner className='h-5 w-5' /> : formatCurrency(vencido?.SALDO ?? 0)}
                    </div>
                    <span className='text-xs text-gray-dark dark:text-dark-text-muted'>
                        {loading ? '' : `${formatPercent(inadimplencia)} do total em aberto`}
                    </span>
                </div>
                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>A vencer</span>
                    <div className='mt-3 text-2xl font-semibold text-gray-text dark:text-dark-text'>
                        {loading ? <Spinner className='h-5 w-5' /> : formatCurrency(aVencer?.SALDO ?? 0)}
                    </div>
                    <span className='text-xs text-gray-dark dark:text-dark-text-muted'>
                        {loading ? '' : `${formatNumber(aVencer?.TITULOS ?? 0)} títulos`}
                    </span>
                </div>
            </div>

            <div className='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <BarList
                    titulo='Carteira em aberto por forma de pagamento'
                    items={formaPagamento.map((row) => ({ label: row.FORMA_PAGAMENTO.trim(), valor: Number(row.SALDO) }))}
                    formatValor={formatCurrency}
                    loading={loading}
                />
                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>
                        Clientes recorrentes x não recorrentes ({ultimoMes ?? '—'})
                    </span>
                    {!loading && ultimoMes && (
                        <ul className='mt-4 flex flex-col gap-3 text-sm'>
                            <li className='flex items-center justify-between'>
                                <span className='text-gray-dark dark:text-dark-text-muted'>
                                    Recorrentes ({formatNumber(recorrentesUltimoMes?.QTD_CLIENTES ?? 0)} clientes)
                                </span>
                                <span className='font-semibold text-gray-text dark:text-dark-text'>
                                    {formatCurrency(recorrentesUltimoMes?.VALOR ?? 0)}
                                </span>
                            </li>
                            <li className='flex items-center justify-between'>
                                <span className='text-gray-dark dark:text-dark-text-muted'>
                                    Não recorrentes ({formatNumber(naoRecorrentesUltimoMes?.QTD_CLIENTES ?? 0)} clientes)
                                </span>
                                <span className='font-semibold text-gray-text dark:text-dark-text'>
                                    {formatCurrency(naoRecorrentesUltimoMes?.VALOR ?? 0)}
                                </span>
                            </li>
                        </ul>
                    )}
                    {loading && (
                        <div className='mt-4 flex items-center justify-center py-6'>
                            <Spinner className='h-5 w-5' />
                        </div>
                    )}
                </div>
            </div>

            <div className='mt-6'>
                <DataTable
                    titulo='Detalhe por situação'
                    loading={loading}
                    rows={situacao}
                    columns={[
                        { key: 'estado', label: 'Estado', render: (row) => row.ESTADO },
                        { key: 'situacao', label: 'Situação', render: (row) => row.SITUACAO },
                        { key: 'titulos', label: 'Títulos', align: 'right', render: (row) => formatNumber(row.TITULOS) },
                        { key: 'valor', label: 'Valor', align: 'right', render: (row) => formatCurrency(row.VALOR) },
                        { key: 'saldo', label: 'Saldo', align: 'right', render: (row) => formatCurrency(row.SALDO) },
                    ]}
                />
            </div>

            <div className='mt-6'>
                <DataTable
                    titulo='Clientes com saldo em aberto (top 45)'
                    loading={loading}
                    rows={clientes}
                    rodape='Adquirentes de cartão, intercompany e consumidor final genérico não representam crédito concedido a cliente.'
                    columns={[
                        { key: 'cliente', label: 'Cliente', render: (row) => row.CLIENTE },
                        { key: 'titulos', label: 'Títulos', align: 'right', render: (row) => formatNumber(row.TITULOS) },
                        { key: 'saldo', label: 'Saldo', align: 'right', render: (row) => formatCurrency(row.SALDO) },
                        { key: 'vencido', label: 'Vencido', align: 'right', render: (row) => formatCurrency(row.VENCIDO) },
                        {
                            key: 'atraso',
                            label: 'Dias atraso',
                            align: 'right',
                            render: (row) => formatNumber(row.DIAS_ATRASO),
                            destaque: (row) => row.DIAS_ATRASO > 60,
                        },
                    ]}
                />
            </div>
        </PageShell>
    )
}
