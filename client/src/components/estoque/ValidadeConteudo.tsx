import { useState, type FocusEvent, type FormEvent } from 'react'
import FiltersMenu from '../FiltersMenu'
import FilialMultiFilter from '../FilialMultiFilter'
import DateRangeFilter from '../DateRangeFilter'
import Spinner from '../Spinner'
import ProdutoCodigos from '../ProdutoCodigos'
import { MobileCard, CardField } from '../MobileCard'
import ValidadeStatusModal from './ValidadeStatusModal'
import { Settings, ChevronDown, Check } from 'lucide-react'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { apiPut } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/format'
import { DATE_PRESETS_FUTURO, getPresetRange, getPresetRangeFuturo } from '../../lib/date'
import { nomeFilial } from '../../constants/filiais'
import { classeBadgeStatus } from '../../lib/statusColors'
import type { ValidadeRow, ValidadeStatusTipo } from '../../types/comercial'

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

function chaveValidade(r: ValidadeRow) {
    return `${r.IDEMPRESA}|${r.IDPLANILHA}|${r.IDSUBPRODUTO}|${r.DTVALIDADE}`
}

type StatusPickerProps = {
    tipos: ValidadeStatusTipo[]
    statusAtual: { id: number | null; nome: string | null; cor: string | null }
    onChange: (id: number | null) => void
}

/**
 * Dropdown compacto por linha - clica no badge atual, escolhe um status
 * cadastrado ou "Sem status". Atualiza otimisticamente (ver onChange no pai).
 */
function StatusPicker({ tipos, statusAtual, onChange }: StatusPickerProps) {
    const [open, setOpen] = useState(false)

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
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition hover:opacity-80 ${
                    statusAtual.id !== null
                        ? classeBadgeStatus(statusAtual.cor)
                        : 'bg-gray-base/10 text-gray-dark dark:text-dark-text-muted'
                }`}
            >
                {statusAtual.nome ?? 'Sem status'}
                <ChevronDown className="h-3 w-3" />
            </button>

            {open && (
                <div className="absolute left-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-gray-base/30 bg-white shadow-lg dark:border-dark-border dark:bg-dark-surface">
                    <button
                        type="button"
                        onClick={() => {
                            onChange(null)
                            setOpen(false)
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-gray-text transition hover:bg-gray dark:text-dark-text dark:hover:bg-dark-surface-2"
                    >
                        Sem status
                        {statusAtual.id === null && <Check className="h-3.5 w-3.5" />}
                    </button>
                    {tipos.map((tipo) => (
                        <button
                            key={tipo.id}
                            type="button"
                            onClick={() => {
                                onChange(tipo.id)
                                setOpen(false)
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-gray-text transition hover:bg-gray dark:text-dark-text dark:hover:bg-dark-surface-2"
                        >
                            <span className={`rounded-full px-2 py-0.5 ${classeBadgeStatus(tipo.cor)}`}>{tipo.nome}</span>
                            {statusAtual.id === tipo.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function ValidadeConteudo() {
    const { me } = useMe()
    const [selecionadas, setSelecionadas] = useState<number[]>([])
    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')
    const [vencimentoInicio, setVencimentoInicio] = useState(() => getPresetRangeFuturo('mes').inicio)
    const [vencimentoFim, setVencimentoFim] = useState(() => getPresetRangeFuturo('mes').fim)
    const [lancamentoInicio, setLancamentoInicio] = useState(() => getPresetRange('mes').inicio)
    const [lancamentoFim, setLancamentoFim] = useState(() => getPresetRange('mes').fim)
    const [gerenciarAberto, setGerenciarAberto] = useState(false)
    const [statusRefreshKey, setStatusRefreshKey] = useState(0)
    const [overrides, setOverrides] = useState<Record<string, { id: number | null; nome: string | null; cor: string | null }>>({})

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
    if (busca) params.busca = busca

    const { data, loading, erro } = useApi<ValidadeRow[]>('/validade', params, habilitado)
    const registros = data ?? []

    const {
        data: tiposData,
        loading: loadingTipos,
        erro: erroTipos,
    } = useApi<ValidadeStatusTipo[]>('/validade/status-tipos', { _r: String(statusRefreshKey) }, habilitado)
    const tipos = tiposData ?? []

    function buscar(e: FormEvent) {
        e.preventDefault()
        setBusca(campo)
    }

    async function alterarStatus(row: ValidadeRow, novoId: number | null) {
        const chave = chaveValidade(row)
        const tipo = novoId !== null ? tipos.find((t) => t.id === novoId) : undefined
        setOverrides((prev) => ({ ...prev, [chave]: { id: novoId, nome: tipo?.nome ?? null, cor: tipo?.cor ?? null } }))

        try {
            await apiPut('/validade/status', {
                idempresa: row.IDEMPRESA,
                idplanilha: row.IDPLANILHA,
                idsubproduto: row.IDSUBPRODUTO,
                dtvalidade: row.DTVALIDADE,
                status_tipo_id: novoId,
            })
        } catch {
            setOverrides((prev) => {
                const next = { ...prev }
                delete next[chave]
                return next
            })
        }
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
            {erroTipos && <p className="mb-4 text-sm text-red-base">{erroTipos}</p>}

            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-text dark:text-dark-text">Controle de validade</h3>
                <button
                    type="button"
                    onClick={() => setGerenciarAberto(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-base/30 bg-white px-3 py-1.5 text-xs font-medium text-gray-text transition hover:border-orange-base dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                >
                    <Settings className="h-3.5 w-3.5" />
                    Gerenciar status
                </button>
            </div>

            {(loading || loadingTipos) && (
                <div className="flex justify-center py-10 lg:hidden">
                    <Spinner className="h-5 w-5" />
                </div>
            )}

            {!loading && !loadingTipos && registros.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-dark dark:text-dark-text-muted lg:hidden">
                    Nenhum registro de validade encontrado.
                </p>
            )}

            {!loading && !loadingTipos && registros.length > 0 && (
                <div className="flex flex-col gap-3 lg:hidden">
                    {registros.map((r, i) => {
                        const dias = diasRestantes(r.DTVALIDADE)
                        const chave = chaveValidade(r)
                        const statusAtual = overrides[chave] ?? { id: r.STATUS_TIPO_ID, nome: r.STATUS_NOME, cor: r.STATUS_COR }
                        return (
                            <MobileCard key={i}>
                                <p className="text-xs text-gray-dark dark:text-dark-text-muted">{nomeFilial(r.IDEMPRESA)}</p>
                                <p className="font-medium text-gray-text dark:text-dark-text">{r.DESCRICAOPRODUTO}</p>
                                <ProdutoCodigos idsubproduto={r.IDSUBPRODUTO} idcodbarprod={r.IDCODBARPROD} />
                                <div className="mt-2 flex flex-col divide-y divide-gray-base/10 dark:divide-dark-border/60">
                                    <CardField label="Qtd" value={r.QTDPRODUTO} />
                                    <CardField label="Valor estimado" value={formatCurrency(r.VALOR_ESTIMADO)} />
                                    <CardField
                                        label="Lançamento"
                                        value={r.DTLANCAMENTO ? formatDate(r.DTLANCAMENTO) : '—'}
                                        valueClassName="font-normal text-gray-dark dark:text-dark-text-muted"
                                    />
                                    <CardField
                                        label="Validade"
                                        value={
                                            <>
                                                <span className={dias < 0 ? 'text-red-base' : dias <= 15 ? 'text-orange-base' : ''}>
                                                    {formatDate(r.DTVALIDADE)}
                                                </span>
                                                <span className="ml-2 text-xs font-normal text-gray-dark dark:text-dark-text-muted">
                                                    {dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d`}
                                                </span>
                                            </>
                                        }
                                    />
                                    <CardField
                                        label="Status"
                                        value={<StatusPicker tipos={tipos} statusAtual={statusAtual} onChange={(id) => alterarStatus(r, id)} />}
                                    />
                                    <CardField
                                        label="Observação"
                                        value={r.OBSERVACAO ?? '—'}
                                        valueClassName="font-normal text-gray-dark dark:text-dark-text-muted"
                                    />
                                </div>
                            </MobileCard>
                        )
                    })}
                </div>
            )}

            <div className="hidden overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm lg:block dark:border-dark-border dark:bg-dark-surface">
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
                        {(loading || loadingTipos) && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center">
                                    <Spinner className="mx-auto h-5 w-5" />
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            !loadingTipos &&
                            registros.map((r, i) => {
                                const dias = diasRestantes(r.DTVALIDADE)
                                const chave = chaveValidade(r)
                                const statusAtual = overrides[chave] ?? { id: r.STATUS_TIPO_ID, nome: r.STATUS_NOME, cor: r.STATUS_COR }
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
                                            <StatusPicker tipos={tipos} statusAtual={statusAtual} onChange={(id) => alterarStatus(r, id)} />
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-gray-dark dark:text-dark-text-muted">
                                            {r.OBSERVACAO ?? '—'}
                                        </td>
                                    </tr>
                                )
                            })}
                        {!loading && !loadingTipos && registros.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhum registro de validade encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {gerenciarAberto && (
                <ValidadeStatusModal
                    tipos={tipos}
                    onClose={() => setGerenciarAberto(false)}
                    onChanged={() => {
                        setOverrides({})
                        setStatusRefreshKey((k) => k + 1)
                    }}
                />
            )}
        </>
    )
}
