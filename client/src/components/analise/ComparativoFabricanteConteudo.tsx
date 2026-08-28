import { useState } from 'react'
import FiltersMenu from '../FiltersMenu'
import FilialMultiFilter from '../FilialMultiFilter'
import DateRangeFilter from '../DateRangeFilter'
import Spinner from '../Spinner'
import ProdutoCodigos from '../ProdutoCodigos'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { formatCurrency, formatPercent } from '../../lib/format'
import { getPresetRange } from '../../lib/date'
import { comFiltroEcommerce } from '../../constants/filiais'
import type { ComparativoFabricanteRow, Fabricante } from '../../types/comercial'

function variacao(atual: number, anterior: number) {
    if (anterior === 0) return null
    return (atual - anterior) / Math.abs(anterior)
}

export default function ComparativoFabricanteConteudo() {
    const { me } = useMe()

    const [inicio, setInicio] = useState(() => getPresetRange('mes').inicio)
    const [fim, setFim] = useState(() => getPresetRange('mes').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])
    const [fabricante, setFabricante] = useState('')

    const branchesDisponiveis = comFiltroEcommerce(me?.branches ?? [])
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const { data: fabricantes, loading: loadingFabricantes } = useApi<Fabricante[]>('/comercial/fabricantes', {}, habilitado)

    const { data, loading, erro } = useApi<ComparativoFabricanteRow[]>(
        '/comercial/comparativo-fabricante',
        { inicio, fim, filiais: filiaisAtivas.join(','), fabricante },
        habilitado && fabricante.trim().length > 0
    )

    const linhas = data ?? []

    return (
        <>
            <FiltersMenu>
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                        Fabricante
                    </span>
                    <select
                        value={fabricante}
                        onChange={(e) => setFabricante(e.target.value)}
                        disabled={loadingFabricantes}
                        className="w-64 max-w-full rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                    >
                        <option value="">Selecione...</option>
                        {(fabricantes ?? []).map((f) => (
                            <option key={f.FABRICANTE} value={f.FABRICANTE}>
                                {f.FABRICANTE}
                            </option>
                        ))}
                    </select>
                </div>
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

            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            {!fabricante && (
                <p className="text-sm text-gray-dark dark:text-dark-text-muted">
                    Selecione um fabricante nos filtros para ver o comparativo.
                </p>
            )}

            {fabricante && (
                <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <table className="w-full min-w-[1000px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                                <th className="px-4 py-3">Produto</th>
                                <th className="px-4 py-3 text-right">Venda Atual</th>
                                <th className="px-4 py-3 text-right">Venda Ano Anterior</th>
                                <th className="px-4 py-3 text-right">Var.</th>
                                <th className="px-4 py-3 text-right">Venda 2 Anos Antes</th>
                                <th className="px-4 py-3 text-right">Lucro Atual</th>
                                <th className="px-4 py-3 text-right">Estoque Atual</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center">
                                        <Spinner className="mx-auto h-5 w-5" />
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                linhas.map((row) => {
                                    const var1 = variacao(row.VENDA_ATUAL, row.VENDA_ANO_ANTERIOR)
                                    return (
                                        <tr
                                            key={row.IDSUBPRODUTO}
                                            className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                        >
                                            <td className="px-4 py-2.5 font-medium">
                                                {row.DESCRICAOPRODUTO}
                                                <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                                            </td>
                                            <td className="px-4 py-2.5 text-right">{formatCurrency(row.VENDA_ATUAL)}</td>
                                            <td className="px-4 py-2.5 text-right text-gray-dark dark:text-dark-text-muted">
                                                {formatCurrency(row.VENDA_ANO_ANTERIOR)}
                                            </td>
                                            <td
                                                className={`px-4 py-2.5 text-right font-medium ${
                                                    var1 === null
                                                        ? 'text-gray-dark dark:text-dark-text-muted'
                                                        : var1 >= 0
                                                          ? 'text-green-base'
                                                          : 'text-red-base'
                                                }`}
                                            >
                                                {var1 === null ? '—' : formatPercent(var1)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-gray-dark dark:text-dark-text-muted">
                                                {formatCurrency(row.VENDA_2_ANOS_ANTES)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">{formatCurrency(row.LUCRO_ATUAL)}</td>
                                            <td className="px-4 py-2.5 text-right">{formatCurrency(row.VALOR_ESTOQUE)}</td>
                                        </tr>
                                    )
                                })}

                            {!loading && linhas.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                        Nenhum produto encontrado para esse fabricante no período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    )
}
