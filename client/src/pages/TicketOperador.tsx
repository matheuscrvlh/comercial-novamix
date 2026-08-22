import { useState } from 'react'
import PageShell from '../components/PageShell'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import Spinner from '../components/Spinner'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { formatNumber, formatPercent } from '../lib/format'
import { getPresetRange } from '../lib/date'
import type { TicketOperadorRow } from '../types/comercial'

export default function TicketOperador() {
    const { me, loading: loadingMe, error: meError } = useMe()

    const [inicio, setInicio] = useState(() => getPresetRange('hoje').inicio)
    const [fim, setFim] = useState(() => getPresetRange('hoje').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = me?.branches ?? []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useApi<TicketOperadorRow[]>(
        '/comercial/ticket-operador',
        { inicio, fim, filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const linhas = data ?? []

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Ticket por Operador"
            subtitulo="Cupons com lucro positivo x negativo, por operador de caixa."
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
            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[800px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Operador</th>
                            <th className="px-4 py-3 text-right">Tickets Positivos</th>
                            <th className="px-4 py-3 text-right">Tickets Negativos</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-right">% Positivo</th>
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
                            linhas.map((row) => {
                                const percPositivo = row.TOTAL_TICKETS > 0 ? row.TICKETS_POSITIVOS / row.TOTAL_TICKETS : 0
                                return (
                                    <tr
                                        key={row.IDUSUARIO}
                                        className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                    >
                                        <td className="px-4 py-2.5 font-medium">{row.NOME_OPERADOR}</td>
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
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhum ticket no período selecionado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </PageShell>
    )
}
