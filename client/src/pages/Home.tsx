import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import Spinner from '../components/Spinner'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import KpiCard from '../components/KpiCard'
import VendaRankingChart from '../components/VendaRankingChart'
import { useMe } from '../hooks/useMe'
import { useRelatorio } from '../hooks/useRelatorio'
import { useRelatorioAtual } from '../hooks/useRelatorioAtual'
import { useFinanceiro } from '../hooks/useFinanceiro'
import { calcularCascata } from '../lib/dre'
import { formatCurrency, formatNumber, formatPercent, formatRatio } from '../lib/format'
import { comFiltroEcommerce } from '../constants/filiais'
import { getPresetRange } from '../lib/date'
import type {
    CancelamentosRow,
    CuponsRow,
    DevolucoesRow,
    EstoqueRow,
    LiquidezCorrenteRow,
    LucroBrutoRow,
    LucroLiquidoRow,
    ResultadoDreRow,
    TicketMedioRow,
    VendaBrutaRow,
} from '../types/financeiro'

const TOTAL_FILIAIS = 100

export default function Home() {
    const { me, loading: loadingMe, error: meError } = useMe()

    const [inicio, setInicio] = useState(() => getPresetRange('hoje').inicio)
    const [fim, setFim] = useState(() => getPresetRange('hoje').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    // Indicadores financeiros (faturamento/margem) usam ano corrente até hoje, independente do
    // filtro do ranking de vendas: em janelas curtas (ex: "hoje") o DRE contábil por dia é
    // ruidoso e produz margem sem sentido.
    const inicioIndicadores = `${new Date().getFullYear()}-01-01`
    const fimIndicadores = getPresetRange('hoje').fim

    const branchesDisponiveis = me ? comFiltroEcommerce(me.branches) : []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null
    const habilitadoAdmin = habilitado && (me?.isAdmin ?? false)

    const vendaBruta = useRelatorio<VendaBrutaRow>('/financeiro/venda-bruta', inicio, fim, filiaisAtivas, habilitado)
    const lucroBruto = useRelatorio<LucroBrutoRow>('/financeiro/lucro-bruto', inicio, fim, filiaisAtivas, habilitado)
    const lucroLiquido = useRelatorio<LucroLiquidoRow>(
        '/financeiro/lucro-liquido',
        inicio,
        fim,
        filiaisAtivas,
        habilitado
    )
    const cancelamentos = useRelatorio<CancelamentosRow>(
        '/financeiro/cancelamentos',
        inicio,
        fim,
        filiaisAtivas,
        habilitado
    )
    const devolucoes = useRelatorio<DevolucoesRow>('/financeiro/devolucoes', inicio, fim, filiaisAtivas, habilitado)
    const cupons = useRelatorio<CuponsRow>('/financeiro/cupons', inicio, fim, filiaisAtivas, habilitado)
    const ticketMedio = useRelatorio<TicketMedioRow>(
        '/financeiro/ticket-medio',
        inicio,
        fim,
        filiaisAtivas,
        habilitado
    )

    const vendaBrutaIndicadores = useRelatorio<VendaBrutaRow>(
        '/financeiro/venda-bruta',
        inicioIndicadores,
        fimIndicadores,
        filiaisAtivas,
        habilitadoAdmin
    )
    const resultado = useFinanceiro<ResultadoDreRow[]>(
        '/financeiro/resultado-dre',
        { inicio: inicioIndicadores, fim: fimIndicadores, filiais: filiaisAtivas.join(',') },
        habilitadoAdmin
    )
    const estoque = useRelatorioAtual<EstoqueRow>('/financeiro/valor-estoque', filiaisAtivas, habilitadoAdmin)
    const liquidez = useRelatorioAtual<LiquidezCorrenteRow>(
        '/financeiro/liquidez-corrente',
        filiaisAtivas,
        habilitadoAdmin
    )

    const faturamento = Number(
        vendaBrutaIndicadores.rows.find((row) => row.IDEMPRESA === TOTAL_FILIAIS)?.VALOR_VENDA_BRUTA ?? 0
    )
    const dreConsolidado = resultado.data?.find((row) => row.IDEMPRESA === TOTAL_FILIAIS)
    const margemBruta = dreConsolidado ? calcularCascata(dreConsolidado).margemBruta : 0
    const valorEstoque = Number(estoque.rows.find((row) => row.IDEMPRESA === TOTAL_FILIAIS)?.VALOR_ESTOQUE ?? 0)
    const liquidezCorrente = Number(
        liquidez.rows.find((row) => row.IDEMPRESA === TOTAL_FILIAIS)?.LIQUIDEZ_CORRENTE ?? 0
    )

    if (loadingMe) {
        return (
            <div className='flex w-full min-h-screen bg-gray dark:bg-dark-bg'>
                <Sidebar isAdmin={false} />
                <main className='flex-1 min-w-0 flex items-center justify-center lg:ml-64'>
                    <span className='text-sm text-gray-dark dark:text-dark-text-muted'>Carregando...</span>
                </main>
            </div>
        )
    }

    if (meError || !me) {
        return (
            <div className='flex w-full min-h-screen bg-gray dark:bg-dark-bg'>
                <Sidebar isAdmin={false} />
                <main className='flex-1 min-w-0 flex items-center justify-center lg:ml-64'>
                    <span className='text-sm text-red-base'>{meError ?? 'Não foi possível carregar seus dados.'}</span>
                </main>
            </div>
        )
    }

    return (
        <div className='flex w-full min-h-screen bg-gray dark:bg-dark-bg'>
            <Sidebar isAdmin={me.isAdmin} />

            <main className='flex-1 min-w-0 flex flex-col lg:ml-64'>
                <section className='flex-1 w-full max-w-6xl mx-auto px-6 pt-20 pb-10 lg:pt-10'>
                    <h1 className='text-2xl font-semibold text-gray-text dark:text-dark-text mb-1'>
                        Financeiro Novamix
                    </h1>
                    <p className='text-sm text-gray-dark dark:text-dark-text-muted mb-6'>
                        Vendas por filial e indicadores financeiros consolidados.
                    </p>

                    <FiltersMenu>
                        <div className='flex flex-col gap-2'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                Filiais
                            </span>
                            <FilialMultiFilter
                                branches={branchesDisponiveis}
                                selected={filiaisAtivas}
                                onChange={setSelecionadas}
                            />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                Período
                            </span>
                            <DateRangeFilter inicio={inicio} fim={fim} onChangeInicio={setInicio} onChangeFim={setFim} />
                        </div>
                    </FiltersMenu>

                    <VendaRankingChart
                        rows={vendaBruta.rows}
                        lucroBrutoRows={lucroBruto.rows}
                        selecionadas={filiaisAtivas}
                        loading={vendaBruta.loading || lucroBruto.loading}
                        erro={vendaBruta.erro}
                    />

                    {me.isAdmin && (
                        <>
                            <div className='flex items-baseline justify-between mt-8 mb-4 flex-wrap gap-2'>
                                <h2 className='text-lg font-semibold text-gray-text dark:text-dark-text'>
                                    Indicadores financeiros
                                </h2>
                                <span className='text-xs text-gray-dark dark:text-dark-text-muted'>
                                    Ano corrente até hoje
                                </span>
                            </div>
                            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                                    <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                        Faturamento (período)
                                    </span>
                                    <div className='mt-2 text-xl font-semibold text-gray-text dark:text-dark-text'>
                                        {vendaBrutaIndicadores.loading ? (
                                            <Spinner className='h-5 w-5' />
                                        ) : (
                                            formatCurrency(faturamento)
                                        )}
                                    </div>
                                </div>
                                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                                    <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                        Margem bruta (DRE)
                                    </span>
                                    <div className='mt-2 text-xl font-semibold text-gray-text dark:text-dark-text'>
                                        {resultado.loading ? <Spinner className='h-5 w-5' /> : formatPercent(margemBruta)}
                                    </div>
                                </div>
                                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                                    <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                        Valor em estoque
                                    </span>
                                    <div className='mt-2 text-xl font-semibold text-gray-text dark:text-dark-text'>
                                        {estoque.loading ? <Spinner className='h-5 w-5' /> : formatCurrency(valorEstoque)}
                                    </div>
                                </div>
                                <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
                                    <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                        Liquidez corrente
                                    </span>
                                    <div className='mt-2 text-xl font-semibold text-gray-text dark:text-dark-text'>
                                        {liquidez.loading ? <Spinner className='h-5 w-5' /> : `${formatRatio(liquidezCorrente)}x`}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <h2 className='text-lg font-semibold text-gray-text dark:text-dark-text mt-8 mb-4'>Lucro</h2>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <KpiCard
                            titulo='Lucro bruto'
                            rows={lucroBruto.rows}
                            valueKey='LUCRO_BRUTO'
                            formatValor={formatCurrency}
                            selecionadas={filiaisAtivas}
                            loading={lucroBruto.loading}
                            erro={lucroBruto.erro}
                        />
                        <KpiCard
                            titulo='Lucro líquido'
                            rows={lucroLiquido.rows}
                            valueKey='LUCRO_LIQUIDO'
                            formatValor={formatCurrency}
                            selecionadas={filiaisAtivas}
                            loading={lucroLiquido.loading}
                            erro={lucroLiquido.erro}
                        />
                    </div>

                    <h2 className='text-lg font-semibold text-gray-text dark:text-dark-text mt-8 mb-4'>
                        Cancelamentos, devoluções e ticket
                    </h2>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                        <KpiCard
                            titulo='Cancelamentos'
                            rows={cancelamentos.rows}
                            valueKey='VALOR_CANCELAMENTOS'
                            formatValor={formatCurrency}
                            selecionadas={filiaisAtivas}
                            loading={cancelamentos.loading}
                            erro={cancelamentos.erro}
                        />
                        <KpiCard
                            titulo='Devoluções'
                            rows={devolucoes.rows}
                            valueKey='VALOR_DEVOLUCOES'
                            formatValor={formatCurrency}
                            selecionadas={filiaisAtivas}
                            loading={devolucoes.loading}
                            erro={devolucoes.erro}
                        />
                        <KpiCard
                            titulo='Cupons'
                            rows={cupons.rows}
                            valueKey='N_CUPONS'
                            formatValor={formatNumber}
                            selecionadas={filiaisAtivas}
                            loading={cupons.loading}
                            erro={cupons.erro}
                        />
                        <KpiCard
                            titulo='Ticket médio'
                            rows={ticketMedio.rows}
                            valueKey='TICKET_MEDIO'
                            formatValor={formatCurrency}
                            selecionadas={filiaisAtivas}
                            loading={ticketMedio.loading}
                            erro={ticketMedio.erro}
                        />
                    </div>
                </section>

                <div className='pb-6'>
                    <Footer />
                </div>
            </main>
        </div>
    )
}
