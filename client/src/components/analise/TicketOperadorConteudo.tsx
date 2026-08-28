import { useState } from 'react'
import FiltersMenu from '../FiltersMenu'
import FilialMultiFilter from '../FilialMultiFilter'
import DateRangeFilter from '../DateRangeFilter'
import Spinner from '../Spinner'
import DonutStat from '../charts/DonutStat'
import GroupedBars from '../charts/GroupedBars'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { formatNumber, formatPercent } from '../../lib/format'
import { getPresetRange } from '../../lib/date'
import { CHART_CRITICAL, CHART_GOOD } from '../../lib/chartColors'
import { comFiltroEcommerce, FILIAL_ECOMMERCE, nomeFilial } from '../../constants/filiais'
import type { TicketOperadorRow } from '../../types/comercial'

export default function TicketOperadorConteudo() {
    const { me } = useMe()

    const [inicio, setInicio] = useState(() => getPresetRange('hoje').inicio)
    const [fim, setFim] = useState(() => getPresetRange('hoje').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = comFiltroEcommerce(me?.branches ?? [])
    // Ecommerce ("Tray") nao tem operador de caixa de verdade - some do filtro por
    // padrao pra nao poluir o ranking, mas continua selecionavel manualmente.
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis.filter((id) => id !== FILIAL_ECOMMERCE)

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useApi<TicketOperadorRow[]>(
        '/comercial/ticket-operador',
        { inicio, fim, filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const linhas = data ?? []

    const mapaLojas = new Map<number, { positivos: number; total: number }>()
    linhas.forEach((l) => {
        const atual = mapaLojas.get(l.IDEMPRESA) ?? { positivos: 0, total: 0 }
        atual.positivos += l.TICKETS_POSITIVOS
        atual.total += l.TOTAL_TICKETS
        mapaLojas.set(l.IDEMPRESA, atual)
    })
    const porLoja = [...mapaLojas.entries()]
        .map(([idempresa, v]) => ({
            idempresa,
            label: nomeFilial(idempresa),
            pct: v.total > 0 ? v.positivos / v.total : 0,
            sublabel: `${formatNumber(v.total)} tickets`,
        }))
        .sort((a, b) => b.pct - a.pct)

    const rankingOperadores = [...linhas]
        .sort((a, b) => b.TOTAL_TICKETS - a.TOTAL_TICKETS)
        .map((l) => ({
            label: l.NOME_OPERADOR,
            valorA: l.TICKETS_POSITIVOS,
            valorB: l.TICKETS_NEGATIVOS,
            sublabel: nomeFilial(l.IDEMPRESA),
        }))

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

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-base/30 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <h3 className="mb-4 text-sm font-semibold text-gray-text dark:text-dark-text">% positivo por loja</h3>
                    {loading && (
                        <div className="flex justify-center py-6">
                            <Spinner className="h-5 w-5" />
                        </div>
                    )}
                    {!loading && porLoja.length === 0 && (
                        <p className="text-sm text-gray-dark dark:text-dark-text-muted">Nenhum registro no período.</p>
                    )}
                    {!loading && porLoja.length > 0 && (
                        <div className="flex flex-wrap justify-around gap-4">
                            {porLoja.map((l) => (
                                <DonutStat key={l.idempresa} label={l.label} pct={l.pct} sublabel={l.sublabel} />
                            ))}
                        </div>
                    )}
                </div>
                <GroupedBars
                    titulo="Ranking por operador"
                    legendaA="Positivos"
                    legendaB="Negativos"
                    itens={rankingOperadores}
                    loading={loading}
                    limite={8}
                    corA={CHART_GOOD}
                    corB={CHART_CRITICAL}
                />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[800px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Operador</th>
                            <th className="px-4 py-3">Loja</th>
                            <th className="px-4 py-3 text-right">Tickets Positivos</th>
                            <th className="px-4 py-3 text-right">Tickets Negativos</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-right">% Positivo</th>
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
                            linhas.map((row, i) => {
                                const percPositivo = row.TOTAL_TICKETS > 0 ? row.TICKETS_POSITIVOS / row.TOTAL_TICKETS : 0
                                return (
                                    <tr
                                        key={`${row.IDUSUARIO}-${row.IDEMPRESA}-${i}`}
                                        className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                    >
                                        <td className="px-4 py-2.5 font-medium">{row.NOME_OPERADOR}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-dark dark:text-dark-text-muted">
                                            {nomeFilial(row.IDEMPRESA)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-green-base">
                                            {formatNumber(row.TICKETS_POSITIVOS)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-red-base">
                                            {formatNumber(row.TICKETS_NEGATIVOS)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">{formatNumber(row.TOTAL_TICKETS)}</td>
                                        <td
                                            className={`px-4 py-2.5 text-right font-medium ${
                                                percPositivo >= 0.5 ? 'text-green-base' : 'text-red-base'
                                            }`}
                                        >
                                            {formatPercent(percPositivo)}
                                        </td>
                                    </tr>
                                )
                            })}

                        {!loading && linhas.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhum ticket no período selecionado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    )
}
