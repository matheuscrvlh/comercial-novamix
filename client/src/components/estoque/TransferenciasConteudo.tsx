import { useState } from 'react'
import FiltersMenu from '../FiltersMenu'
import FilialMultiFilter from '../FilialMultiFilter'
import MercadologicoFilter, { type MercadologicoSelecao } from '../MercadologicoFilter'
import DateRangeFilter from '../DateRangeFilter'
import Spinner from '../Spinner'
import ProdutoCodigos from '../ProdutoCodigos'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { formatCurrency, formatDate } from '../../lib/format'
import { getPresetRange } from '../../lib/date'
import { comFiltroEcommerce } from '../../constants/filiais'
import type { EstoqueResumoData } from '../../types/comercial'

export default function TransferenciasConteudo() {
    const { me } = useMe()

    const [inicio, setInicio] = useState(() => getPresetRange('mes').inicio)
    const [fim, setFim] = useState(() => getPresetRange('mes').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])
    const [mercadologico, setMercadologico] = useState<MercadologicoSelecao>({ divisoes: [], secoes: [], grupos: [] })

    const branchesDisponiveis = comFiltroEcommerce(me?.branches ?? [])
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useApi<EstoqueResumoData>(
        '/estoque/resumo',
        {
            inicio,
            fim,
            filiais: filiaisAtivas.join(','),
            divisoes: mercadologico.divisoes.join(','),
            secoes: mercadologico.secoes.join(','),
            grupos: mercadologico.grupos.join(','),
        },
        habilitado
    )

    const transferencias = data?.transferencias ?? []
    const negativo = data?.negativo ?? []
    const parado = data?.parado ?? []

    return (
        <>
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
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                        Divisão / Seção / Grupo
                    </span>
                    <MercadologicoFilter selecao={mercadologico} onChange={setMercadologico} />
                </div>
            </FiltersMenu>

            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            <h2 className="mb-3 text-lg font-semibold text-gray-text dark:text-dark-text">Transferências entre lojas</h2>
            <div className="mb-8 overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Loja</th>
                            <th className="px-4 py-3 text-right">Enviado</th>
                            <th className="px-4 py-3 text-right">Recebido</th>
                            <th className="px-4 py-3 text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center">
                                    <Spinner className="mx-auto h-5 w-5" />
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            transferencias.map((row) => {
                                const saldo = row.VALOR_RECEBIDO - row.VALOR_ENVIADO
                                return (
                                    <tr
                                        key={row.IDEMPRESA}
                                        className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                    >
                                        <td className="px-4 py-2.5 font-medium">{row.NOME_EMPRESA}</td>
                                        <td className="px-4 py-2.5 text-right">{formatCurrency(row.VALOR_ENVIADO)}</td>
                                        <td className="px-4 py-2.5 text-right">{formatCurrency(row.VALOR_RECEBIDO)}</td>
                                        <td
                                            className={`px-4 py-2.5 text-right font-medium ${saldo >= 0 ? 'text-green-base' : 'text-red-base'}`}
                                        >
                                            {formatCurrency(saldo)}
                                        </td>
                                    </tr>
                                )
                            })}
                        {!loading && transferencias.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhuma transferência no período.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-text dark:text-dark-text">Estoque negativo</h2>
                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                        <table className="w-full min-w-[500px] text-sm">
                            <thead className="sticky top-0 bg-white dark:bg-dark-surface">
                                <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                                    <th className="px-4 py-3">Loja</th>
                                    <th className="px-4 py-3">Produto</th>
                                    <th className="px-4 py-3 text-right">Qtd</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center">
                                            <Spinner className="mx-auto h-5 w-5" />
                                        </td>
                                    </tr>
                                )}
                                {!loading &&
                                    negativo.map((row, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                        >
                                            <td className="px-4 py-2 text-xs text-gray-dark dark:text-dark-text-muted">
                                                {row.NOME_EMPRESA}
                                            </td>
                                            <td className="px-4 py-2">
                                                {row.DESCRICAOPRODUTO}
                                                <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium text-red-base">
                                                {row.QTDATUALESTOQUE}
                                            </td>
                                        </tr>
                                    ))}
                                {!loading && negativo.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                            Nenhum produto com estoque negativo.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-text dark:text-dark-text">
                        Produtos parados (60+ dias sem venda)
                    </h2>
                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                        <table className="w-full min-w-[500px] text-sm">
                            <thead className="sticky top-0 bg-white dark:bg-dark-surface">
                                <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                                    <th className="px-4 py-3">Loja</th>
                                    <th className="px-4 py-3">Produto</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3">Última venda</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center">
                                            <Spinner className="mx-auto h-5 w-5" />
                                        </td>
                                    </tr>
                                )}
                                {!loading &&
                                    parado.map((row, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                        >
                                            <td className="px-4 py-2 text-xs text-gray-dark dark:text-dark-text-muted">
                                                {row.NOME_EMPRESA}
                                            </td>
                                            <td className="px-4 py-2">
                                                {row.DESCRICAOPRODUTO}
                                                <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                                            </td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(row.VALATUALESTOQUE)}</td>
                                            <td className="px-4 py-2 text-xs text-gray-dark dark:text-dark-text-muted">
                                                {row.DTULTIMAVENDA ? formatDate(row.DTULTIMAVENDA) : 'Nunca'}
                                            </td>
                                        </tr>
                                    ))}
                                {!loading && parado.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                            Nenhum produto parado encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    )
}
