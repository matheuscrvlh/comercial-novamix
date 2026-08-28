import { useMemo, useState, type FocusEvent } from 'react'
import FiltersMenu from '../FiltersMenu'
import FilialMultiFilter from '../FilialMultiFilter'
import DateRangeFilter from '../DateRangeFilter'
import Spinner from '../Spinner'
import Modal from '../Modal'
import StatCard from '../charts/StatCard'
import RankingBars from '../charts/RankingBars'
import { CheckIcon, FilterIcon, TagIcon } from '../icons'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { formatCurrency, formatDate, formatNumber, formatPercent } from '../../lib/format'
import { getRangeDias } from '../../lib/date'
import { comFiltroEcommerce } from '../../constants/filiais'
import type { PromocaoDetalhe, PromocaoRow, StatusPromocao } from '../../types/comercial'

function formatDataHora(valor: string) {
    return formatDate(valor.slice(0, 10))
}

const STATUS_LABEL: Record<StatusPromocao, string> = {
    ativa: 'Ativa',
    futura: 'Futura',
    encerrada: 'Encerrada',
}

const STATUS_CLASSE: Record<StatusPromocao, string> = {
    ativa: 'bg-green-base/10 text-green-base',
    futura: 'bg-orange-base/10 text-orange-base',
    encerrada: 'bg-gray-base/20 text-gray-dark dark:text-dark-text-muted',
}

function StatusBadge({ status }: { status: StatusPromocao }) {
    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSE[status]}`}>
            {STATUS_LABEL[status]}
        </span>
    )
}

const STATUS_OPCOES: StatusPromocao[] = ['ativa', 'futura', 'encerrada']

function StatusFilterButton({
    selecionados,
    onChange,
}: {
    selecionados: StatusPromocao[]
    onChange: (value: StatusPromocao[]) => void
}) {
    const [open, setOpen] = useState(false)

    function toggle(status: StatusPromocao) {
        if (selecionados.includes(status)) {
            onChange(selecionados.filter((s) => s !== status))
            return
        }
        onChange([...selecionados, status])
    }

    function fecharSeForaDoContainer(event: FocusEvent<HTMLDivElement>) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false)
        }
    }

    return (
        <div className="relative" onBlur={fecharSeForaDoContainer}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Filtrar por status"
                className="flex items-center gap-1.5 rounded-lg border border-gray-base/30 bg-white px-3 py-1.5 text-xs font-medium text-gray-text transition hover:border-orange-base dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
            >
                <FilterIcon className="h-3.5 w-3.5" />
                Status
                {selecionados.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-base px-1 text-[10px] font-semibold text-white">
                        {selecionados.length}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-lg border border-gray-base/30 bg-white shadow-lg dark:border-dark-border dark:bg-dark-surface">
                    {selecionados.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-medium text-gray-text transition hover:bg-gray dark:text-dark-text dark:hover:bg-dark-surface-2"
                        >
                            Limpar seleção
                        </button>
                    )}
                    {STATUS_OPCOES.map((status) => {
                        const ativo = selecionados.includes(status)
                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => toggle(status)}
                                className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm font-medium transition ${
                                    ativo
                                        ? 'bg-orange-base/10 text-orange-base'
                                        : 'text-gray-text hover:bg-gray dark:text-dark-text dark:hover:bg-dark-surface-2'
                                }`}
                            >
                                {STATUS_LABEL[status]}
                                {ativo && <CheckIcon className="h-4 w-4 shrink-0" />}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default function PromocoesConteudo() {
    const { me } = useMe()
    const [selecionadas, setSelecionadas] = useState<number[]>([])
    const [inicio, setInicio] = useState(() => getRangeDias(14, 30).inicio)
    const [fim, setFim] = useState(() => getRangeDias(14, 30).fim)
    const [idPromocaoSelecionada, setIdPromocaoSelecionada] = useState<number | null>(null)
    const [statusFiltro, setStatusFiltro] = useState<StatusPromocao[]>([])

    const branchesDisponiveis = comFiltroEcommerce(me?.branches ?? [])
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useApi<PromocaoRow[]>(
        '/promocoes',
        { inicio, fim, filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const promocoes = useMemo(() => [...(data ?? [])].sort((a, b) => b.DTINIPROMOCAO.localeCompare(a.DTINIPROMOCAO)), [data])

    const { data: detalhe, loading: loadingDetalhe } = useApi<PromocaoDetalhe>(
        '/promocoes/detalhe',
        { idpromocao: String(idPromocaoSelecionada ?? '') },
        habilitado && idPromocaoSelecionada !== null
    )

    const ativas = promocoes.filter((p) => p.STATUS === 'ativa')
    const futuras = promocoes.filter((p) => p.STATUS === 'futura')
    const encerradas = promocoes.filter((p) => p.STATUS === 'encerrada')
    const produtosEmPromocoesAtivas = ativas.reduce((acc, p) => acc + p.QTD_PRODUTOS, 0)

    const rankingProdutos = useMemo(
        () => [...promocoes].sort((a, b) => b.QTD_PRODUTOS - a.QTD_PRODUTOS),
        [promocoes]
    )

    const promocoesFiltradas = useMemo(
        () => (statusFiltro.length === 0 ? promocoes : promocoes.filter((p) => statusFiltro.includes(p.STATUS))),
        [promocoes, statusFiltro]
    )

    const produtosDetalhe = detalhe?.produtos ?? []
    const rankingVendaProdutos = useMemo(
        () => [...produtosDetalhe].sort((a, b) => b.VENDA - a.VENDA),
        [produtosDetalhe]
    )
    const totalVenda = produtosDetalhe.reduce((acc, p) => acc + p.VENDA, 0)
    const totalLucro = produtosDetalhe.reduce((acc, p) => acc + p.LUCRO, 0)
    const totalQtdVendida = produtosDetalhe.reduce((acc, p) => acc + p.QTD_VENDIDA, 0)

    return (
        <>
            <FiltersMenu>
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                        Lojas
                    </span>
                    <FilialMultiFilter branches={branchesDisponiveis} selected={filiaisAtivas} onChange={setSelecionadas} />
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                        Vigência
                    </span>
                    <DateRangeFilter inicio={inicio} fim={fim} onChangeInicio={setInicio} onChangeFim={setFim} />
                </div>
            </FiltersMenu>

            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Promoções ativas" loading={loading} valor={formatNumber(ativas.length)} corValor="text-green-base" />
                <StatCard label="Produtos em promoções ativas" loading={loading} valor={formatNumber(produtosEmPromocoesAtivas)} />
                <StatCard
                    label="Futuras / encerradas no período"
                    loading={loading}
                    valor={`${formatNumber(futuras.length)} / ${formatNumber(encerradas.length)}`}
                />
            </div>

            <div className="mb-8">
                <RankingBars
                    titulo="Promoções com mais produtos"
                    loading={loading}
                    formatValor={formatNumber}
                    itens={rankingProdutos.map((p) => ({
                        label: p.DESCRPROMOCAO,
                        valor: p.QTD_PRODUTOS,
                        sublabel: `${formatDataHora(p.DTINIPROMOCAO)} a ${formatDataHora(p.DTFIMPROMOCAO)} · ${STATUS_LABEL[p.STATUS]}`,
                    }))}
                />
            </div>

            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-text dark:text-dark-text">Lista de promoções</h3>
                <StatusFilterButton selecionados={statusFiltro} onChange={setStatusFiltro} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[700px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Promoção</th>
                            <th className="px-4 py-3">Vigência</th>
                            <th className="px-4 py-3 text-right">Lojas</th>
                            <th className="px-4 py-3 text-right">Produtos</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center">
                                    <Spinner className="mx-auto h-5 w-5" />
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            promocoesFiltradas.map((p) => (
                                <tr
                                    key={p.IDPROMOCAO}
                                    onClick={() => setIdPromocaoSelecionada(p.IDPROMOCAO)}
                                    className="cursor-pointer border-b border-gray-base/10 text-gray-text transition last:border-0 hover:bg-gray-base/10 dark:border-dark-border/60 dark:text-dark-text dark:hover:bg-dark-border/30"
                                >
                                    <td className="px-4 py-2.5 font-medium">{p.DESCRPROMOCAO}</td>
                                    <td className="px-4 py-2.5 text-xs text-gray-dark dark:text-dark-text-muted">
                                        {formatDataHora(p.DTINIPROMOCAO)} a {formatDataHora(p.DTFIMPROMOCAO)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">{formatNumber(p.QTD_LOJAS)}</td>
                                    <td className="px-4 py-2.5 text-right">{formatNumber(p.QTD_PRODUTOS)}</td>
                                    <td className="px-4 py-2.5">
                                        <StatusBadge status={p.STATUS} />
                                    </td>
                                </tr>
                            ))}
                        {!loading && promocoesFiltradas.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    {promocoes.length === 0
                                        ? 'Nenhuma promoção no período selecionado.'
                                        : 'Nenhuma promoção com o status selecionado.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {idPromocaoSelecionada !== null && (
                <Modal
                    titulo={
                        <span className="flex items-center gap-2">
                            <TagIcon className="h-5 w-5 shrink-0 text-orange-base" />
                            {detalhe?.DESCRPROMOCAO ?? 'Promoção'}
                        </span>
                    }
                    subtitulo={
                        detalhe
                            ? `${formatDataHora(detalhe.DTINIPROMOCAO)} a ${formatDataHora(detalhe.DTFIMPROMOCAO)} · ${detalhe.lojas
                                  .map((l) => l.NOME_EMPRESA)
                                  .join(', ')}`
                            : undefined
                    }
                    onClose={() => setIdPromocaoSelecionada(null)}
                    largura="xl"
                >
                    {loadingDetalhe && (
                        <div className="flex justify-center py-10">
                            <Spinner className="h-6 w-6" />
                        </div>
                    )}

                    {!loadingDetalhe && detalhe && (
                        <>
                            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
                                <StatCard label="Venda gerada no período" valor={formatCurrency(totalVenda)} />
                                <StatCard label="Lucro gerado no período" valor={formatCurrency(totalLucro)} />
                                <StatCard label="Unidades vendidas" valor={formatNumber(totalQtdVendida)} />
                                <StatCard
                                    label="Impacto vs. período anterior"
                                    valor={detalhe.analitico.liftVendaPct === null ? '—' : formatPercent(detalhe.analitico.liftVendaPct)}
                                    corValor={
                                        detalhe.analitico.liftVendaPct === null
                                            ? undefined
                                            : detalhe.analitico.liftVendaPct >= 0
                                              ? 'text-green-base'
                                              : 'text-red-base'
                                    }
                                    rodape={
                                        detalhe.analitico.mediaDiariaAntes !== null
                                            ? `${formatCurrency(detalhe.analitico.mediaDiariaDurante)} / dia vs. ${formatCurrency(detalhe.analitico.mediaDiariaAntes)} / dia antes`
                                            : 'Promoção ainda não começou'
                                    }
                                />
                            </div>

                            <div className="mb-6">
                                <RankingBars
                                    titulo="Produtos mais vendidos na promoção"
                                    loading={false}
                                    formatValor={formatCurrency}
                                    itens={rankingVendaProdutos.map((p) => ({
                                        label: p.DESCRICAOPRODUTO,
                                        valor: p.VENDA,
                                        sublabel: `${formatNumber(p.QTD_VENDIDA)} un.`,
                                    }))}
                                />
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-base/30 dark:border-dark-border">
                                <table className="w-full min-w-[600px] text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                                            <th className="px-4 py-2.5">Produto</th>
                                            <th className="px-4 py-2.5 text-right">Preço promo</th>
                                            <th className="px-4 py-2.5 text-right">Desconto</th>
                                            <th className="px-4 py-2.5 text-right">Venda</th>
                                            <th className="px-4 py-2.5 text-right">Qtd</th>
                                            <th className="px-4 py-2.5 text-right">Qtd/dia antes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detalhe.produtos.map((p) => (
                                            <tr
                                                key={p.IDSUBPRODUTO}
                                                className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                            >
                                                <td className="px-4 py-2">{p.DESCRICAOPRODUTO}</td>
                                                <td className="px-4 py-2 text-right">{formatCurrency(p.VALPRECO)}</td>
                                                <td className="px-4 py-2 text-right">
                                                    {p.PERDESCONTO > 0 ? `${p.PERDESCONTO.toFixed(1)}%` : '—'}
                                                </td>
                                                <td className="px-4 py-2 text-right">{formatCurrency(p.VENDA)}</td>
                                                <td className="px-4 py-2 text-right">{formatNumber(p.QTD_VENDIDA)}</td>
                                                <td className="px-4 py-2 text-right text-xs text-gray-dark dark:text-dark-text-muted">
                                                    {p.QTD_MEDIA_DIARIA_ANTES.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                                                </td>
                                            </tr>
                                        ))}
                                        {detalhe.produtos.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-6 text-center text-gray-dark dark:text-dark-text-muted">
                                                    Nenhum produto nessa promoção.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </Modal>
            )}
        </>
    )
}
