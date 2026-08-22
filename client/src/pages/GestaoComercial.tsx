import { useState } from 'react'
import PageShell from '../components/PageShell'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import Spinner from '../components/Spinner'
import RankingList from '../components/RankingList'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { formatCurrency, formatPercent } from '../lib/format'
import { getPresetRange } from '../lib/date'
import type { OperacionalData, VendaMetaSecaoRow } from '../types/comercial'

function mesanoDe(data: string) {
    return data.replace(/-\d{2}$/, '').replace('-', '')
}

function pct(valor: number, meta: number) {
    if (meta <= 0) return null
    return valor / meta
}

export default function GestaoComercial() {
    const { me, loading: loadingMe, error: meError } = useMe()

    const [inicio, setInicio] = useState(() => getPresetRange('mes').inicio)
    const [fim, setFim] = useState(() => getPresetRange('mes').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = me?.branches ?? []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis
    const mesano = mesanoDe(fim)

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useApi<VendaMetaSecaoRow[]>(
        '/comercial/venda-meta-secao',
        { inicio, fim, filiais: filiaisAtivas.join(','), mesano },
        habilitado
    )

    const {
        data: operacional,
        loading: loadingOperacional,
        erro: erroOperacional,
    } = useApi<OperacionalData>('/comercial/operacional', { inicio, fim, filiais: filiaisAtivas.join(',') }, habilitado)

    const linhas = data ?? []

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Gestão Comercial"
            subtitulo="Venda, margem, compra e estoque por seção, comparados à meta do mês."
            filtros={
                <FiltersMenu>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Filiais
                        </span>
                        <FilialMultiFilter branches={branchesDisponiveis} selected={filiaisAtivas} onChange={setSelecionadas} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Período
                        </span>
                        <DateRangeFilter inicio={inicio} fim={fim} onChangeInicio={setInicio} onChangeFim={setFim} />
                    </div>
                </FiltersMenu>
            }
        >
            {erro && <p className="text-sm text-red-base mb-4">{erro}</p>}

            <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[900px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Seção</th>
                            <th className="px-4 py-3 text-right">Venda Atual</th>
                            <th className="px-4 py-3 text-right">Meta Venda</th>
                            <th className="px-4 py-3 text-right">% Meta</th>
                            <th className="px-4 py-3 text-right">Margem Atual</th>
                            <th className="px-4 py-3 text-right">Meta Margem</th>
                            <th className="px-4 py-3 text-right">Compra Atual</th>
                            <th className="px-4 py-3 text-right">Meta Compra</th>
                            <th className="px-4 py-3 text-right">Estoque Atual</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center">
                                    <Spinner className="mx-auto h-5 w-5" />
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            linhas.map((row) => {
                                const margemAtual = row.VENDA_ATUAL !== 0 ? row.LUCRO_ATUAL / row.VENDA_ATUAL : 0
                                const percMeta = pct(row.VENDA_ATUAL, row.META_VENDA)

                                return (
                                    <tr
                                        key={row.IDSECAO}
                                        className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                    >
                                        <td className="px-4 py-2.5 font-medium">{row.DESCRSECAO}</td>
                                        <td className="px-4 py-2.5 text-right">{formatCurrency(row.VENDA_ATUAL)}</td>
                                        <td className="px-4 py-2.5 text-right text-gray-dark dark:text-dark-text-muted">
                                            {row.META_VENDA > 0 ? formatCurrency(row.META_VENDA) : '—'}
                                        </td>
                                        <td
                                            className={`px-4 py-2.5 text-right font-medium ${
                                                percMeta === null
                                                    ? 'text-gray-dark dark:text-dark-text-muted'
                                                    : percMeta >= 1
                                                      ? 'text-green-base'
                                                      : 'text-red-base'
                                            }`}
                                        >
                                            {percMeta === null ? '—' : formatPercent(percMeta)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">{formatPercent(margemAtual)}</td>
                                        <td className="px-4 py-2.5 text-right text-gray-dark dark:text-dark-text-muted">
                                            {row.META_MARGEM_PCT > 0 ? formatPercent(row.META_MARGEM_PCT / 100) : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">{formatCurrency(row.COMPRA_ATUAL)}</td>
                                        <td className="px-4 py-2.5 text-right text-gray-dark dark:text-dark-text-muted">
                                            {row.META_COMPRA > 0 ? formatCurrency(row.META_COMPRA) : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">{formatCurrency(row.VALOR_ESTOQUE)}</td>
                                    </tr>
                                )
                            })}

                        {!loading && linhas.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhum dado para o período selecionado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {erroOperacional && <p className="text-sm text-red-base mt-4">{erroOperacional}</p>}

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <RankingList
                    titulo="Perdas por fornecedor"
                    loading={loadingOperacional}
                    itens={(operacional?.perdas ?? []).map((p) => ({
                        label: p.FORNECEDOR,
                        quantidade: p.QUANTIDADE,
                        valor: p.VALOR,
                    }))}
                />
                <RankingList
                    titulo="Avaria de estoque por fabricante"
                    loading={loadingOperacional}
                    itens={(operacional?.avaria ?? []).map((a) => ({
                        label: a.FABRICANTE,
                        quantidade: a.QUANTIDADE,
                        valor: a.VALOR,
                    }))}
                />
                <RankingList
                    titulo="Pedidos de compra pendentes"
                    loading={loadingOperacional}
                    itens={(operacional?.pedidosPendentes ?? []).map((p) => ({
                        label: `${p.FORNECEDOR} (${p.QTD_PEDIDOS} pedido${p.QTD_PEDIDOS === 1 ? '' : 's'})`,
                        valor: p.VALOR_PENDENTE,
                    }))}
                />
            </div>
        </PageShell>
    )
}
