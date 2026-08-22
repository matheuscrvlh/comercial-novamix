import { useState } from 'react'
import PageShell from '../components/PageShell'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import DataTable from '../components/DataTable'
import DreMensalChart from '../components/DreMensalChart'
import { useMe } from '../hooks/useMe'
import { useFinanceiro } from '../hooks/useFinanceiro'
import { calcularCascata } from '../lib/dre'
import { formatCurrency, formatPercent } from '../lib/format'
import { nomeFilial } from '../constants/filiais'
import { getPresetRange, getUltimosMesesFechados } from '../lib/date'
import type { ResultadoDreRow, ResultadoDreMensalRow } from '../types/financeiro'

const TOTAL_FILIAIS = 100

function inicioDoAno() {
    return `${new Date().getFullYear()}-01-01`
}

export default function Resultado() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [inicio, setInicio] = useState(inicioDoAno)
    const [fim, setFim] = useState(() => getPresetRange('hoje').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = me ? me.branches : []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useFinanceiro<ResultadoDreRow[]>(
        '/financeiro/resultado-dre',
        { inicio, fim, filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const mensal = getUltimosMesesFechados(3)
    const dreMensal = useFinanceiro<ResultadoDreMensalRow[]>(
        '/financeiro/resultado-dre-mensal',
        { inicio: mensal.inicio, fim: mensal.fim, filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const rows = data ?? []
    const consolidado = rows.find((row) => row.IDEMPRESA === TOTAL_FILIAIS)
    const cascata = consolidado ? calcularCascata(consolidado) : null
    const porLoja = rows.filter((row) => row.IDEMPRESA !== TOTAL_FILIAIS).map((row) => ({
        idEmpresa: row.IDEMPRESA,
        ...calcularCascata(row),
    }))

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={habilitado}
            titulo='Resultado (DRE)'
            subtitulo='Demonstração do Resultado do Exercício, por período e por loja.'
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

            <DreMensalChart rows={dreMensal.data ?? []} loading={dreMensal.loading} erro={dreMensal.erro} />

            <div className='mt-6'>
                <DataTable
                    titulo='Cascata do resultado — consolidado (filiais selecionadas)'
                loading={loading}
                rows={
                    cascata
                        ? [
                              { linha: '(+) Receita bruta', valor: cascata.receitaBruta },
                              { linha: '(-) Deduções e impostos', valor: cascata.deducoes },
                              { linha: '(=) Receita líquida', valor: cascata.receitaLiquida },
                              { linha: '(-) CMV', valor: -cascata.cmv },
                              { linha: '(=) Lucro bruto', valor: cascata.lucroBruto },
                              { linha: '(-) Despesas operacionais', valor: -cascata.despesasOperacionais },
                              { linha: '(+) Receitas financeiras', valor: cascata.receitasFinanceiras },
                              { linha: '(-) Despesas financeiras', valor: -cascata.despesasFinanceiras },
                              { linha: '(=) Resultado líquido', valor: cascata.resultadoLiquido },
                          ]
                        : []
                }
                columns={[
                    { key: 'linha', label: 'Linha', render: (row) => String(row.linha) },
                    {
                        key: 'valor',
                        label: 'Valor',
                        align: 'right',
                        render: (row) => formatCurrency(Number(row.valor)),
                        destaque: (row) => String(row.linha).startsWith('(=) Resultado'),
                    },
                ]}
                />
            </div>

            <div className='mt-6'>
                <DataTable
                    titulo='Resultado por loja'
                    loading={loading}
                    rows={porLoja}
                    columns={[
                        { key: 'loja', label: 'Loja', render: (row) => nomeFilial(Number(row.idEmpresa)) },
                        {
                            key: 'receitaLiquida',
                            label: 'Rec. líquida',
                            align: 'right',
                            render: (row) => formatCurrency(Number(row.receitaLiquida)),
                        },
                        {
                            key: 'margemBruta',
                            label: 'Margem bruta',
                            align: 'right',
                            render: (row) => formatPercent(Number(row.margemBruta)),
                        },
                        {
                            key: 'despesas',
                            label: 'Despesas',
                            align: 'right',
                            render: (row) => formatCurrency(Number(row.despesasOperacionais) + Number(row.despesasFinanceiras)),
                        },
                        {
                            key: 'resultado',
                            label: 'Resultado',
                            align: 'right',
                            render: (row) => formatCurrency(Number(row.resultadoLiquido)),
                            destaque: (row) => Number(row.resultadoLiquido) < 0,
                        },
                    ]}
                />
            </div>
        </PageShell>
    )
}
