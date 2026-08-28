import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import Spinner from '../components/Spinner'
import StatCard from '../components/charts/StatCard'
import TrendChart, { type TrendMetrica } from '../components/charts/TrendChart'
import Meter from '../components/charts/Meter'
import RankingBars from '../components/charts/RankingBars'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import { getPresetRange, getRangeDias } from '../lib/date'
import { comFiltroEcommerce } from '../constants/filiais'
import { CHART_SERIES_2, CHART_SERIES_2_TRACK, CHART_SERIES_3, CHART_SERIES_3_TRACK } from '../lib/chartColors'
import type {
    DashboardResumo,
    GestaoEstoqueListasData,
    OperacionalData,
    ValidadeRow,
    VendaDiariaRow,
    VendaMetaSecaoRow,
} from '../types/comercial'

function mesanoDe(data: string) {
    return data.replace(/-\d{2}$/, '').replace('-', '')
}

const cardClass =
    'rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-5 shadow-sm'

type AlertCardProps = {
    to: string
    clicavel: boolean
    label: string
    children: ReactNode
}

function AlertCard({ to, clicavel, label, children }: AlertCardProps) {
    const conteudo = (
        <>
            <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                {label}
            </span>
            <div className='mt-2 text-lg font-semibold'>{children}</div>
        </>
    )

    if (clicavel) {
        return (
            <Link to={to} className={`${cardClass} transition hover:border-orange-base`}>
                {conteudo}
            </Link>
        )
    }

    return <div className={cardClass}>{conteudo}</div>
}

function SectionTitle({ children }: { children: ReactNode }) {
    return <h2 className='mb-3 text-lg font-semibold text-gray-text dark:text-dark-text'>{children}</h2>
}

export default function Home() {
    const { me, loading: loadingMe } = useMe()

    const [inicio, setInicio] = useState(() => getPresetRange('mes').inicio)
    const [fim, setFim] = useState(() => getPresetRange('mes').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])
    const [metricaTendencia, setMetricaTendencia] = useState('venda')

    const branchesDisponiveis = comFiltroEcommerce(me?.branches ?? [])
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis
    const mesano = mesanoDe(fim)
    const filiaisParam = filiaisAtivas.join(',')

    const isAdmin = me?.isAdmin ?? false
    const temAcesso = me !== null

    const { data, loading, erro } = useApi<DashboardResumo>(
        '/dashboard/resumo',
        { inicio, fim, filiais: filiaisParam, mesano },
        temAcesso
    )

    const { data: vendaDiaria, loading: loadingVendaDiaria } = useApi<VendaDiariaRow[]>(
        '/comercial/venda-diaria',
        { inicio, fim, filiais: filiaisParam },
        isAdmin
    )

    const { data: vendaMetaSecao, loading: loadingMetaSecao } = useApi<VendaMetaSecaoRow[]>(
        '/comercial/venda-meta-secao',
        { inicio, fim, filiais: filiaisParam, mesano },
        isAdmin
    )

    const { data: operacional, loading: loadingOperacional } = useApi<OperacionalData>(
        '/comercial/operacional',
        { inicio, fim, filiais: filiaisParam },
        isAdmin
    )

    const { data: estoqueListas, loading: loadingEstoqueListas } = useApi<GestaoEstoqueListasData>(
        '/comercial/estoque-listas',
        { filiais: filiaisParam },
        isAdmin
    )

    const janelaVencimento = useMemo(() => getRangeDias(0, 30), [])
    const { data: produtosVencendo, loading: loadingVencendo } = useApi<ValidadeRow[]>(
        '/validade',
        {
            filiais: filiaisParam,
            vencimentoInicio: janelaVencimento.inicio,
            vencimentoFim: janelaVencimento.fim,
        },
        isAdmin
    )

    const metricasTendencia: TrendMetrica[] = useMemo(() => {
        const dias = vendaDiaria ?? []
        return [
            {
                id: 'venda',
                label: 'Venda',
                unidade: 'moeda',
                dados: dias.map((d) => ({ dia: d.DIA, data: d.DATA, atual: d.VENDA_ATUAL, anterior: d.VENDA_ANO_ANTERIOR })),
            },
            {
                id: 'margem',
                label: 'Margem',
                unidade: 'percentual',
                dados: dias.map((d) => ({
                    dia: d.DIA,
                    data: d.DATA,
                    atual: d.VENDA_ATUAL > 0 ? d.LUCRO_ATUAL / d.VENDA_ATUAL : 0,
                    anterior: d.VENDA_ANO_ANTERIOR > 0 ? d.LUCRO_ANO_ANTERIOR / d.VENDA_ANO_ANTERIOR : 0,
                })),
            },
            {
                id: 'compra',
                label: 'Compra',
                unidade: 'moeda',
                dados: dias.map((d) => ({ dia: d.DIA, data: d.DATA, atual: d.COMPRA_ATUAL, anterior: d.COMPRA_ANO_ANTERIOR })),
            },
        ]
    }, [vendaDiaria])

    const sparklineVenda = useMemo(() => (vendaDiaria ?? []).map((d) => d.VENDA_ATUAL), [vendaDiaria])

    const totaisAnoAnterior = useMemo(
        () =>
            (vendaDiaria ?? []).reduce(
                (acc, d) => ({
                    venda: acc.venda + d.VENDA_ANO_ANTERIOR,
                    lucro: acc.lucro + d.LUCRO_ANO_ANTERIOR,
                    compra: acc.compra + d.COMPRA_ANO_ANTERIOR,
                }),
                { venda: 0, lucro: 0, compra: 0 }
            ),
        [vendaDiaria]
    )
    const deltaVenda = totaisAnoAnterior.venda > 0 && data ? (data.vendaHoje - totaisAnoAnterior.venda) / totaisAnoAnterior.venda : null
    const margemAnoAnterior = totaisAnoAnterior.venda > 0 ? totaisAnoAnterior.lucro / totaisAnoAnterior.venda : null
    const deltaMargem = margemAnoAnterior !== null && data ? data.margemHoje - margemAnoAnterior : null
    const deltaCompra =
        totaisAnoAnterior.compra > 0 && data ? (data.compraHoje - totaisAnoAnterior.compra) / totaisAnoAnterior.compra : null

    const secoesPorMeta = useMemo(() => [...(vendaMetaSecao ?? [])].sort((a, b) => b.VENDA_ATUAL - a.VENDA_ATUAL).slice(0, 8), [vendaMetaSecao])
    const maxVendaSecoes = useMemo(() => Math.max(1, ...secoesPorMeta.map((s) => s.VENDA_ATUAL)), [secoesPorMeta])

    const projecaoTotal = useMemo(() => (vendaMetaSecao ?? []).reduce((acc, s) => acc + s.PROJECAO_VENDA, 0), [vendaMetaSecao])

    const comprarUrgente = estoqueListas?.comprarUrgente ?? []
    const excessoEstoque = estoqueListas?.excessoEstoque ?? []
    const candidatosInativar = estoqueListas?.inativar ?? []
    const somaValor = (itens: { VALATUALESTOQUE: number }[]) => itens.reduce((acc, i) => acc + i.VALATUALESTOQUE, 0)
    const valorVencendo = useMemo(() => (produtosVencendo ?? []).reduce((acc, p) => acc + p.VALOR_ESTIMADO, 0), [produtosVencendo])

    return (
        <div className='flex w-full min-h-screen bg-gray dark:bg-dark-bg'>
            <Sidebar isAdmin={isAdmin} />

            <main className='flex-1 min-w-0 flex flex-col lg:ml-64'>
                <section className='flex-1 w-full max-w-6xl mx-auto px-6 pt-20 pb-10 lg:pt-10'>
                    <h1 className='text-2xl font-semibold text-gray-text dark:text-dark-text mb-1'>Comercial Novamix</h1>
                    <p className='text-sm text-gray-dark dark:text-dark-text-muted mb-6'>
                        Visão geral do período selecionado.
                    </p>

                    {loadingMe && (
                        <div className='flex justify-center py-16'>
                            <Spinner className='h-6 w-6' />
                        </div>
                    )}

                    {!loadingMe && temAcesso && (
                        <>
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
                                    <DateRangeFilter
                                        inicio={inicio}
                                        fim={fim}
                                        onChangeInicio={setInicio}
                                        onChangeFim={setFim}
                                    />
                                </div>
                            </FiltersMenu>

                            {erro && <p className='text-sm text-red-base mb-4'>{erro}</p>}

                            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4'>
                                <StatCard
                                    label='Venda no período'
                                    loading={loading}
                                    valor={formatCurrency(data?.vendaHoje ?? 0)}
                                    delta={isAdmin ? deltaVenda : undefined}
                                    deltaLabel='vs. ano anterior'
                                    tendencia={isAdmin ? sparklineVenda : undefined}
                                    rodape={isAdmin && projecaoTotal > 0 ? `Projeção fim do período: ${formatCurrency(projecaoTotal)}` : undefined}
                                />
                                <StatCard
                                    label='Margem'
                                    loading={loading}
                                    valor={
                                        <>
                                            {formatPercent(data?.margemHoje ?? 0)}{' '}
                                            <span className='text-sm font-normal text-gray-dark dark:text-dark-text-muted'>
                                                ({formatCurrency(data?.lucroHoje ?? 0)})
                                            </span>
                                        </>
                                    }
                                    delta={isAdmin ? deltaMargem : undefined}
                                    deltaLabel='p.p. vs. ano anterior'
                                />
                                <StatCard
                                    label='Compra no período'
                                    loading={loading}
                                    valor={formatCurrency(data?.compraHoje ?? 0)}
                                    delta={isAdmin ? deltaCompra : undefined}
                                    deltaLabel='vs. ano anterior'
                                />
                            </div>

                            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
                                <AlertCard to='/estoque' clicavel={isAdmin} label='Estoque negativo'>
                                    <span className='text-red-base'>
                                        {loading ? (
                                            <Spinner className='h-4 w-4' />
                                        ) : (
                                            `${formatNumber(data?.estoqueNegativoCount ?? 0)} itens`
                                        )}
                                    </span>
                                </AlertCard>
                                <AlertCard to='/analise-comercial' clicavel={isAdmin} label='Exceções de margem'>
                                    <span className='text-orange-base'>
                                        {loading ? (
                                            <Spinner className='h-4 w-4' />
                                        ) : (
                                            `${formatNumber(data?.margemExcecoesCount ?? 0)} produtos`
                                        )}
                                    </span>
                                </AlertCard>
                                <AlertCard to='/gestao-comercial' clicavel={isAdmin} label='Pedidos pendentes'>
                                    <span className='text-gray-text dark:text-dark-text'>
                                        {loading ? <Spinner className='h-4 w-4' /> : formatCurrency(data?.pedidosPendentesValor ?? 0)}
                                    </span>
                                </AlertCard>
                                <AlertCard to='/gestao-comercial' clicavel={isAdmin} label='Perdas no período'>
                                    <span className='text-gray-text dark:text-dark-text'>
                                        {loading ? <Spinner className='h-4 w-4' /> : formatCurrency(data?.perdasValor ?? 0)}
                                    </span>
                                </AlertCard>
                            </div>

                            {isAdmin && (
                                <>
                                    <div className='mb-8'>
                                        <TrendChart
                                            titulo='Evolução'
                                            legendaAtual='Período atual'
                                            legendaAnterior='Mesmo período, ano anterior'
                                            metricas={metricasTendencia}
                                            metricaAtiva={metricaTendencia}
                                            onChangeMetrica={setMetricaTendencia}
                                            loading={loadingVendaDiaria}
                                        />
                                    </div>

                                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
                                        <StatCard
                                            label='Comprar urgente'
                                            loading={loadingEstoqueListas}
                                            to='/estoque'
                                            corValor='text-red-base'
                                            valor={`${formatNumber(comprarUrgente.length)} itens`}
                                        />
                                        <StatCard
                                            label='Excesso de estoque'
                                            loading={loadingEstoqueListas}
                                            to='/estoque'
                                            corValor='text-orange-base'
                                            valor={formatCurrency(somaValor(excessoEstoque))}
                                        />
                                        <StatCard
                                            label='Candidatos a inativar'
                                            loading={loadingEstoqueListas}
                                            to='/estoque'
                                            valor={`${formatNumber(candidatosInativar.length)} produtos`}
                                        />
                                        <StatCard
                                            label='Produtos vencendo (30 dias)'
                                            loading={loadingVencendo}
                                            to='/estoque'
                                            corValor='text-orange-base'
                                            valor={formatCurrency(valorVencendo)}
                                        />
                                    </div>

                                    <div className='mb-8 rounded-xl border border-gray-base/30 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface'>
                                        <div className='mb-4 flex items-center justify-between'>
                                            <h3 className='text-sm font-semibold text-gray-text dark:text-dark-text'>
                                                Vendas por seção vs. meta
                                            </h3>
                                            <Link to='/gestao-comercial' className='text-xs font-medium text-orange-base hover:underline'>
                                                Ver tudo
                                            </Link>
                                        </div>
                                        {loadingMetaSecao && (
                                            <div className='flex justify-center py-6'>
                                                <Spinner className='h-5 w-5' />
                                            </div>
                                        )}
                                        {!loadingMetaSecao && secoesPorMeta.length === 0 && (
                                            <p className='text-sm text-gray-dark dark:text-dark-text-muted'>
                                                Nenhuma seção com venda no período.
                                            </p>
                                        )}
                                        {!loadingMetaSecao && secoesPorMeta.length > 0 && (
                                            <div className='grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2'>
                                                {secoesPorMeta.map((s) => (
                                                    <Meter
                                                        key={s.IDSECAO}
                                                        label={s.DESCRSECAO}
                                                        valor={s.VENDA_ATUAL}
                                                        meta={s.META_VENDA}
                                                        maxParaEscala={maxVendaSecoes}
                                                        formatValor={formatCurrency}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <SectionTitle>Rankings operacionais</SectionTitle>
                                    <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                                        <RankingBars
                                            titulo='Perdas por fornecedor'
                                            loading={loadingOperacional}
                                            formatValor={formatCurrency}
                                            itens={(operacional?.perdas ?? []).map((p) => ({ label: p.FORNECEDOR, valor: p.VALOR }))}
                                        />
                                        <RankingBars
                                            titulo='Avaria de estoque por fabricante'
                                            loading={loadingOperacional}
                                            formatValor={formatCurrency}
                                            cor={CHART_SERIES_2}
                                            corTrack={CHART_SERIES_2_TRACK}
                                            itens={(operacional?.avaria ?? []).map((a) => ({ label: a.FABRICANTE, valor: a.VALOR }))}
                                        />
                                        <RankingBars
                                            titulo='Pedidos de compra pendentes'
                                            loading={loadingOperacional}
                                            formatValor={formatCurrency}
                                            cor={CHART_SERIES_3}
                                            corTrack={CHART_SERIES_3_TRACK}
                                            itens={(operacional?.pedidosPendentes ?? []).map((p) => ({
                                                label: p.FORNECEDOR,
                                                valor: p.VALOR_PENDENTE,
                                                sublabel: `${p.QTD_PEDIDOS} pedido${p.QTD_PEDIDOS === 1 ? '' : 's'}`,
                                            }))}
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </section>

                <div className='pb-6'>
                    <Footer />
                </div>
            </main>
        </div>
    )
}
