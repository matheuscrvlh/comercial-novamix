import { useState, type FormEvent } from 'react'
import FiltersMenu from '../FiltersMenu'
import FilialMultiFilter from '../FilialMultiFilter'
import DateRangeFilter from '../DateRangeFilter'
import Spinner from '../Spinner'
import ProdutoCodigos from '../ProdutoCodigos'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { formatCurrency, formatDate } from '../../lib/format'
import { DATE_PRESETS_FUTURO, getPresetRange, getPresetRangeFuturo } from '../../lib/date'
import { nomeFilial } from '../../constants/filiais'
import type { ValidadeRow } from '../../types/comercial'

const inputClass =
    'w-full rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'
const botaoSecundario =
    'rounded-lg border border-gray-base/30 px-4 py-2 text-sm font-semibold text-gray-text transition hover:bg-gray-base/10 dark:border-dark-border dark:text-gray-text dark:hover:bg-dark-border/30'

function diasRestantes(dataValidade: string) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const validade = new Date(`${dataValidade}T00:00:00`)
    return Math.round((validade.getTime() - hoje.getTime()) / 86400000)
}

export default function ValidadeConteudo() {
    const { me } = useMe()
    const [selecionadas, setSelecionadas] = useState<number[]>([])
    const [status, setStatus] = useState('')
    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')
    const [vencimentoInicio, setVencimentoInicio] = useState(() => getPresetRangeFuturo('mes').inicio)
    const [vencimentoFim, setVencimentoFim] = useState(() => getPresetRangeFuturo('mes').fim)
    const [lancamentoInicio, setLancamentoInicio] = useState(() => getPresetRange('mes').inicio)
    const [lancamentoFim, setLancamentoFim] = useState(() => getPresetRange('mes').fim)

    const habilitado = me !== null && me.isAdmin
    const lojas = me?.branches ?? []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : lojas

    const params: Record<string, string> = {
        filiais: filiaisAtivas.join(','),
        vencimentoInicio,
        vencimentoFim,
        lancamentoInicio,
        lancamentoFim,
    }
    if (status) params.status = status
    if (busca) params.busca = busca

    const { data, loading, erro } = useApi<ValidadeRow[]>('/validade', params, habilitado)
    const registros = data ?? []

    function buscar(e: FormEvent) {
        e.preventDefault()
        setBusca(campo)
    }

    return (
        <>
            <FiltersMenu>
                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Lojas</span>
                    <FilialMultiFilter branches={lojas} selected={filiaisAtivas} onChange={setSelecionadas} />
                </div>
                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Vencimento</span>
                    <DateRangeFilter
                        inicio={vencimentoInicio}
                        fim={vencimentoFim}
                        onChangeInicio={setVencimentoInicio}
                        onChangeFim={setVencimentoFim}
                        presets={DATE_PRESETS_FUTURO}
                        resolverPreset={(id) => getPresetRangeFuturo(id as (typeof DATE_PRESETS_FUTURO)[number]['id'])}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Lançamento</span>
                    <DateRangeFilter
                        inicio={lancamentoInicio}
                        fim={lancamentoFim}
                        onChangeInicio={setLancamentoInicio}
                        onChangeFim={setLancamentoFim}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Status (CISS)</span>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                        <option value="">Todos</option>
                        <option value="C">C</option>
                        <option value="S">S</option>
                    </select>
                </div>
                <form onSubmit={buscar} className="flex flex-col gap-2">
                    <span className={labelClass}>Buscar produto</span>
                    <div className="flex gap-2">
                        <input
                            value={campo}
                            onChange={(e) => setCampo(e.target.value)}
                            placeholder="Ao menos 3 caracteres"
                            className={inputClass}
                        />
                        <button type="submit" className={botaoSecundario}>
                            Buscar
                        </button>
                    </div>
                </form>
            </FiltersMenu>

            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[900px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Loja</th>
                            <th className="px-4 py-3">Produto</th>
                            <th className="px-4 py-3 text-right">Qtd</th>
                            <th className="px-4 py-3 text-right">Valor estimado</th>
                            <th className="px-4 py-3">Lançamento</th>
                            <th className="px-4 py-3">Validade</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Observação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center">
                                    <Spinner className="mx-auto h-5 w-5" />
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            registros.map((r, i) => {
                                const dias = diasRestantes(r.DTVALIDADE)
                                return (
                                    <tr
                                        key={i}
                                        className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                    >
                                        <td className="px-4 py-2.5 text-xs text-gray-dark dark:text-dark-text-muted">
                                            {nomeFilial(r.IDEMPRESA)}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {r.DESCRICAOPRODUTO}
                                            <ProdutoCodigos idsubproduto={r.IDSUBPRODUTO} idcodbarprod={r.IDCODBARPROD} />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">{r.QTDPRODUTO}</td>
                                        <td className="px-4 py-2.5 text-right">{formatCurrency(r.VALOR_ESTIMADO)}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-dark dark:text-dark-text-muted">
                                            {r.DTLANCAMENTO ? formatDate(r.DTLANCAMENTO) : '—'}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span
                                                className={dias < 0 ? 'font-medium text-red-base' : dias <= 15 ? 'font-medium text-orange-base' : ''}
                                            >
                                                {formatDate(r.DTVALIDADE)}
                                            </span>
                                            <span className="ml-2 text-xs text-gray-dark dark:text-dark-text-muted">
                                                {dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="rounded-full bg-gray-base/20 px-2 py-0.5 text-xs font-medium text-gray-dark dark:text-dark-text-muted">
                                                {r.STATUS}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-gray-dark dark:text-dark-text-muted">
                                            {r.OBSERVACAO ?? '—'}
                                        </td>
                                    </tr>
                                )
                            })}
                        {!loading && registros.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhum registro de validade encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    )
}
