import { useState } from 'react'
import FiltersMenu from '../FiltersMenu'
import FilialMultiFilter from '../FilialMultiFilter'
import DateRangeFilter from '../DateRangeFilter'
import Spinner from '../Spinner'
import ProdutoCodigos from '../ProdutoCodigos'
import { MobileCard, CardField } from '../MobileCard'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { formatCurrency, formatPercent } from '../../lib/format'
import { getPresetRange } from '../../lib/date'
import { comFiltroEcommerce } from '../../constants/filiais'
import type { FlagMargem, ProdutoMargemRow } from '../../types/comercial'

function mesanoDe(data: string) {
    return data.replace(/-\d{2}$/, '').replace('-', '')
}

const FLAG_LABEL: Record<FlagMargem, string> = {
    ACIMA_40: 'Acima de 40%',
    ABAIXO_MENOS15: 'Abaixo de -15%',
    MUITO_ABAIXO_META: 'Muito abaixo da meta',
    ZERO: 'Margem 0%',
}

const FLAG_CLASS: Record<FlagMargem, string> = {
    ACIMA_40: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    ABAIXO_MENOS15: 'bg-red-base/10 text-red-base',
    MUITO_ABAIXO_META: 'bg-orange-base/10 text-orange-base',
    ZERO: 'bg-gray-dark/10 text-gray-dark dark:text-dark-text-muted',
}

export default function AnaliseMargemConteudo() {
    const { me } = useMe()

    const [inicio, setInicio] = useState(() => getPresetRange('hoje').inicio)
    const [fim, setFim] = useState(() => getPresetRange('hoje').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = comFiltroEcommerce(me?.branches ?? [])
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis
    const mesano = mesanoDe(fim)

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useApi<ProdutoMargemRow[]>(
        '/margem/excecoes',
        { inicio, fim, filiais: filiaisAtivas.join(','), mesano },
        habilitado
    )

    const linhas = data ?? []

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
            </FiltersMenu>

            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            {loading && (
                <div className="flex justify-center py-10 lg:hidden">
                    <Spinner className="h-5 w-5" />
                </div>
            )}

            {!loading && linhas.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-dark dark:text-dark-text-muted lg:hidden">
                    Nenhuma exceção de margem no período selecionado.
                </p>
            )}

            {!loading && linhas.length > 0 && (
                <div className="flex flex-col gap-3 lg:hidden">
                    {linhas.map((row) => (
                        <MobileCard key={row.IDSUBPRODUTO}>
                            <p className="font-medium text-gray-text dark:text-dark-text">{row.DESCRICAOPRODUTO}</p>
                            <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                            <div className="mt-2 flex flex-col divide-y divide-gray-base/10 dark:divide-dark-border/60">
                                <CardField label="Venda" value={formatCurrency(row.VENDA)} />
                                <CardField
                                    label="Lucro"
                                    value={formatCurrency(row.LUCRO)}
                                    valueClassName={row.LUCRO < 0 ? 'text-red-base' : ''}
                                />
                                <CardField label="Margem" value={formatPercent(row.MARGEM)} />
                                <CardField
                                    label="Meta Margem"
                                    value={row.META_MARGEM_PCT !== null ? formatPercent(row.META_MARGEM_PCT / 100) : '—'}
                                    valueClassName="font-normal text-gray-dark dark:text-dark-text-muted"
                                />
                            </div>
                            {row.FLAGS.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {row.FLAGS.map((flag) => (
                                        <span key={flag} className={`rounded-full px-2 py-0.5 text-xs font-medium ${FLAG_CLASS[flag]}`}>
                                            {FLAG_LABEL[flag]}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </MobileCard>
                    ))}
                </div>
            )}

            <div className="hidden overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm lg:block dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[900px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Produto</th>
                            <th className="px-4 py-3 text-right">Venda</th>
                            <th className="px-4 py-3 text-right">Lucro</th>
                            <th className="px-4 py-3 text-right">Margem</th>
                            <th className="px-4 py-3 text-right">Meta Margem</th>
                            <th className="px-4 py-3">Alerta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center">
                                    <Spinner className="mx-auto h-5 w-5" />
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            linhas.map((row) => (
                                <tr
                                    key={row.IDSUBPRODUTO}
                                    className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                >
                                    <td className="px-4 py-2.5 font-medium">
                                        {row.DESCRICAOPRODUTO}
                                        <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                                    </td>
                                    <td className="px-4 py-2.5 text-right">{formatCurrency(row.VENDA)}</td>
                                    <td
                                        className={`px-4 py-2.5 text-right ${row.LUCRO < 0 ? 'text-red-base' : 'text-gray-text dark:text-dark-text'}`}
                                    >
                                        {formatCurrency(row.LUCRO)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-medium">{formatPercent(row.MARGEM)}</td>
                                    <td className="px-4 py-2.5 text-right text-gray-dark dark:text-dark-text-muted">
                                        {row.META_MARGEM_PCT !== null ? formatPercent(row.META_MARGEM_PCT / 100) : '—'}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                            {row.FLAGS.map((flag) => (
                                                <span
                                                    key={flag}
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${FLAG_CLASS[flag]}`}
                                                >
                                                    {FLAG_LABEL[flag]}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                        {!loading && linhas.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhuma exceção de margem no período selecionado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    )
}
