import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import Spinner from '../components/Spinner'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import { getPresetRange } from '../lib/date'
import { comFiltroEcommerce } from '../constants/filiais'
import type { DashboardResumo } from '../types/comercial'

function mesanoDe(data: string) {
    return data.replace(/-\d{2}$/, '').replace('-', '')
}

const PAGINAS = [
    { to: '/gestao-comercial', titulo: 'Gestão Comercial', descricao: 'Venda, margem, compra e estoque por seção vs. meta.' },
    { to: '/estoque-transferencias', titulo: 'Estoque & Transferências', descricao: 'Transferências entre lojas, estoque negativo e parado.' },
    { to: '/comparativo-fabricante', titulo: 'Comparativo por Fabricante', descricao: 'Venda e lucro por produto, comparado a anos anteriores.' },
    { to: '/analise-margem', titulo: 'Análise de Margem', descricao: 'Produtos com margem fora do esperado no período.' },
    { to: '/ticket-operador', titulo: 'Ticket por Operador', descricao: 'Cupons com lucro positivo x negativo por operador.' },
    { to: '/tributacao', titulo: 'Tributação', descricao: 'Consulta de ICMS por produto.' },
    { to: '/catalogo-produtos', titulo: 'Catálogo de Produtos', descricao: 'Hierarquia mercadológica e status ativo/inativo por produto.' },
    { to: '/configuracoes', titulo: 'Configurações', descricao: 'Metas mensais de venda, margem e compra por seção.' },
]

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

export default function Home() {
    const { me, loading: loadingMe } = useMe()

    const [inicio, setInicio] = useState(() => getPresetRange('hoje').inicio)
    const [fim, setFim] = useState(() => getPresetRange('hoje').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = comFiltroEcommerce(me?.branches ?? [])
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis
    const mesano = mesanoDe(fim)

    const isAdmin = me?.isAdmin ?? false
    const temAcesso = me !== null

    const { data, loading, erro } = useApi<DashboardResumo>(
        '/dashboard/resumo',
        { inicio, fim, filiais: filiaisAtivas.join(','), mesano },
        temAcesso
    )

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
                                <div className={cardClass}>
                                    <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                        Venda no período
                                    </span>
                                    <div className='mt-2 text-xl font-semibold text-gray-text dark:text-dark-text'>
                                        {loading ? <Spinner className='h-5 w-5' /> : formatCurrency(data?.vendaHoje ?? 0)}
                                    </div>
                                </div>
                                <div className={cardClass}>
                                    <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                        Margem
                                    </span>
                                    <div className='mt-2 text-xl font-semibold text-gray-text dark:text-dark-text'>
                                        {loading ? (
                                            <Spinner className='h-5 w-5' />
                                        ) : (
                                            <>
                                                {formatPercent(data?.margemHoje ?? 0)}{' '}
                                                <span className='text-sm font-normal text-gray-dark dark:text-dark-text-muted'>
                                                    ({formatCurrency(data?.lucroHoje ?? 0)})
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className={cardClass}>
                                    <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                                        Compra no período
                                    </span>
                                    <div className='mt-2 text-xl font-semibold text-gray-text dark:text-dark-text'>
                                        {loading ? <Spinner className='h-5 w-5' /> : formatCurrency(data?.compraHoje ?? 0)}
                                    </div>
                                </div>
                            </div>

                            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
                                <AlertCard to='/estoque-transferencias' clicavel={isAdmin} label='Estoque negativo'>
                                    <span className='text-red-base'>
                                        {loading ? (
                                            <Spinner className='h-4 w-4' />
                                        ) : (
                                            `${formatNumber(data?.estoqueNegativoCount ?? 0)} itens`
                                        )}
                                    </span>
                                </AlertCard>
                                <AlertCard to='/analise-margem' clicavel={isAdmin} label='Exceções de margem'>
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
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <h2 className='text-lg font-semibold text-gray-text dark:text-dark-text mb-4'>Telas</h2>
                            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                                {PAGINAS.map((pagina) => (
                                    <Link
                                        key={pagina.to}
                                        to={pagina.to}
                                        className={`${cardClass} transition hover:border-orange-base`}
                                    >
                                        <h3 className='font-semibold text-gray-text dark:text-dark-text mb-1'>{pagina.titulo}</h3>
                                        <p className='text-sm text-gray-dark dark:text-dark-text-muted'>{pagina.descricao}</p>
                                    </Link>
                                ))}
                            </div>
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
