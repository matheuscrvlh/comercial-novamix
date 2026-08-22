import { useState } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import BarList from '../components/BarList'
import DataTable from '../components/DataTable'
import { useMe } from '../hooks/useMe'
import { useFinanceiro } from '../hooks/useFinanceiro'
import { formatCurrency, formatNumber } from '../lib/format'
import { nomeFilial } from '../constants/filiais'
import type { ContasPagarDetalheResponse } from '../types/financeiro'

export default function ContasPagar() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = me ? me.branches : []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useFinanceiro<ContasPagarDetalheResponse>(
        '/financeiro/contas-pagar-detalhe',
        { filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const situacao = data?.situacao ?? []
    const fornecedores = data?.fornecedores ?? []
    const porLoja = data?.porLoja ?? []

    const emAberto = situacao.filter((row) => row.ESTADO === 'Em aberto')
    const vencido = emAberto.find((row) => row.SITUACAO === 'Vencido')
    const aVencer = emAberto.find((row) => row.SITUACAO === 'A vencer')
    const programado = emAberto.find((row) => row.SITUACAO === 'Programado (> 90 dias)')
    const totalEmAberto = (vencido?.SALDO ?? 0) + (aVencer?.SALDO ?? 0)

    const saldoPorLoja = [...new Set(porLoja.map((row) => row.IDEMPRESA))].map((idEmpresa) => ({
        idEmpresa,
        total: porLoja.filter((row) => row.IDEMPRESA === idEmpresa).reduce((soma, row) => soma + Number(row.VALOR_SALDO), 0),
    }))

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={habilitado}
            titulo='Contas a Pagar'
            subtitulo='Posição em aberto, aging e maiores fornecedores.'
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
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>Total em aberto (valor ideal)</span>
                    <div className='mt-3 text-2xl font-semibold text-gray-text dark:text-dark-text'>
                        {loading ? <Spinner className='h-5 w-5' /> : formatCurrency(totalEmAberto)}
                    </div>
                    <span className='text-xs text-gray-dark dark:text-dark-text-muted'>Vencido + a vencer em até 90 dias</span>
                </div>
                <div className='rounded-xl border border-red-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>Vencido</span>
                    <div className='mt-3 text-2xl font-semibold text-red-base'>
                        {loading ? <Spinner className='h-5 w-5' /> : formatCurrency(vencido?.SALDO ?? 0)}
                    </div>
                    <span className='text-xs text-gray-dark dark:text-dark-text-muted'>
                        {loading ? '' : `${formatNumber(vencido?.TITULOS ?? 0)} títulos`}
                    </span>
                </div>
                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                    <span className='text-sm font-medium text-gray-text dark:text-dark-text'>A vencer (até 90 dias)</span>
                    <div className='mt-3 text-2xl font-semibold text-gray-text dark:text-dark-text'>
                        {loading ? <Spinner className='h-5 w-5' /> : formatCurrency(aVencer?.SALDO ?? 0)}
                    </div>
                    <span className='text-xs text-gray-dark dark:text-dark-text-muted'>
                        {loading ? '' : `${formatNumber(aVencer?.TITULOS ?? 0)} títulos`}
                    </span>
                </div>
            </div>

            <div className='mt-4 rounded-xl border border-gray-base/20 bg-gray/40 dark:border-dark-border dark:bg-dark-surface-2/40 p-4 text-sm'>
                <span className='font-medium text-gray-text dark:text-dark-text'>
                    Programado, fora do valor ideal (vencimento a mais de 90 dias):{' '}
                </span>
                <span className='font-semibold text-gray-dark dark:text-dark-text-muted'>
                    {loading ? <Spinner className='h-4 w-4' /> : formatCurrency(programado?.SALDO ?? 0)}
                </span>
                <span className='ml-1 text-xs text-gray-dark dark:text-dark-text-muted'>
                    {loading ? '' : `(${formatNumber(programado?.TITULOS ?? 0)} títulos — parcelas de contratos/financiamentos já lançadas para o futuro; não entram no total em aberto acima)`}
                </span>
            </div>

            <div className='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <BarList
                    titulo='Posição em aberto'
                    items={[
                        { label: 'A vencer', valor: aVencer?.SALDO ?? 0 },
                        { label: 'Vencido', valor: vencido?.SALDO ?? 0 },
                    ]}
                    formatValor={formatCurrency}
                    loading={loading}
                    cor='#c53434'
                />
                <BarList
                    titulo='Saldo a pagar por loja'
                    items={saldoPorLoja.map((row) => ({ label: nomeFilial(row.idEmpresa), valor: row.total }))}
                    formatValor={formatCurrency}
                    loading={loading}
                />
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
                    titulo='Maiores fornecedores e credores em aberto (top 40)'
                    loading={loading}
                    rows={fornecedores}
                    rodape='Bancos, impostos, folha e partes relacionadas aparecem nesta lista porque também transitam pelo contas a pagar.'
                    columns={[
                        { key: 'fornecedor', label: 'Fornecedor/credor', render: (row) => row.FORNECEDOR },
                        { key: 'titulos', label: 'Títulos', align: 'right', render: (row) => formatNumber(row.TITULOS) },
                        { key: 'saldo', label: 'Saldo', align: 'right', render: (row) => formatCurrency(row.SALDO) },
                        {
                            key: 'atraso',
                            label: 'Dias em atraso',
                            align: 'right',
                            render: (row) => formatNumber(row.DIAS_ATRASO),
                            destaque: (row) => row.DIAS_ATRASO > 30,
                        },
                    ]}
                />
            </div>
        </PageShell>
    )
}
