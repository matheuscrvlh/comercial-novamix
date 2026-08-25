import { useEffect, useMemo, useState, type FormEvent } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import { PlusIcon, TrashIcon, PencilIcon } from '../components/icons'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { FILIAIS, nomeFilial } from '../constants/filiais'
import type { Fornecedor, Inadimplencia, InadimplenciaInput, ResumoFornecedorInadimplencia, StatusInadimplencia } from '../types/comercial'

const inputClass =
    'w-full rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'
const botaoPrimario =
    'rounded-lg bg-orange-base px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-light disabled:opacity-50'
const botaoSecundario =
    'rounded-lg border border-gray-base/30 px-4 py-2 text-sm font-semibold text-gray-text transition hover:bg-gray-base/10 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border/30'

const STATUS_LABEL: Record<StatusInadimplencia, string> = {
    pendente: 'Pendente',
    cobrado: 'Cobrado',
    ok: 'Ok',
    nao_cobrar: 'Não cobrar',
}

const STATUS_CLASS: Record<StatusInadimplencia, string> = {
    pendente: 'bg-orange-base/10 text-orange-base',
    cobrado: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    ok: 'bg-green-base/10 text-green-base',
    nao_cobrar: 'bg-gray-base/20 text-gray-dark dark:text-dark-text-muted',
}

function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(valor: string | null) {
    if (!valor) return '—'
    const [ano, mes, dia] = valor.slice(0, 10).split('-')
    if (!ano || !mes || !dia) return '—'
    return `${dia}/${mes}/${ano}`
}

export default function Inadimplencias() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const habilitado = me !== null && me.isAdmin

    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')
    const [status, setStatus] = useState('')
    const [fornecedorId, setFornecedorId] = useState('')
    const [mostrarForm, setMostrarForm] = useState(false)
    const [editando, setEditando] = useState<Inadimplencia | null>(null)

    const { data: fornecedores } = useApi<Fornecedor[]>('/fornecedores', {}, habilitado)
    const { data, loading, erro, recarregar } = useInadimplencias({ busca, status, fornecedorId }, habilitado)
    const { data: resumo } = useResumo(habilitado)

    const linhas = data ?? []
    const totalDevido = useMemo(
        () => (resumo ?? []).reduce((acc, r) => acc + Number(r.total_devido), 0),
        [resumo]
    )

    function buscar(e: FormEvent) {
        e.preventDefault()
        setBusca(campo)
    }

    async function excluir(id: number) {
        if (!confirm('Remover este lançamento de inadimplência?')) return
        await apiDelete(`/inadimplencias/${id}`)
        recarregar()
    }

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Inadimplências"
            subtitulo="Títulos em aberto com fornecedores, vinculados ao cadastro de fornecedores e vendedores."
            filtros={
                <form onSubmit={buscar} className="mb-6 flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-2">
                        <span className={labelClass}>Buscar</span>
                        <input
                            type="text"
                            value={campo}
                            onChange={(e) => setCampo(e.target.value)}
                            placeholder="Fornecedor ou título"
                            className={`${inputClass} w-64`}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className={labelClass}>Fornecedor</span>
                        <select
                            value={fornecedorId}
                            onChange={(e) => setFornecedorId(e.target.value)}
                            className={`${inputClass} w-56`}
                        >
                            <option value="">Todos</option>
                            {(fornecedores ?? []).map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.NOME}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className={labelClass}>Status</span>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} w-40`}>
                            <option value="">Todos</option>
                            {Object.entries(STATUS_LABEL).map(([valor, label]) => (
                                <option key={valor} value={valor}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className={botaoPrimario}>
                        Buscar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEditando(null)
                            setMostrarForm(true)
                        }}
                        className={`${botaoPrimario} flex items-center gap-1.5`}
                    >
                        <PlusIcon className="h-4 w-4" />
                        Novo lançamento
                    </button>
                </form>
            }
        >
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-base/30 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    <span className={labelClass}>Total em aberto</span>
                    <p className="mt-1 text-2xl font-semibold text-gray-text dark:text-dark-text">{formatarMoeda(totalDevido)}</p>
                </div>
                <div className="rounded-xl border border-gray-base/30 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface sm:col-span-2">
                    <span className={labelClass}>Maiores devedores</span>
                    <ul className="mt-1 flex flex-col gap-1 text-sm">
                        {(resumo ?? []).slice(0, 3).map((r) => (
                            <li key={`${r.fornecedor_id}-${r.fornecedor_nome}`} className="flex justify-between gap-3">
                                <span className="truncate text-gray-text dark:text-dark-text">{r.fornecedor_nome}</span>
                                <span className="shrink-0 font-medium text-gray-dark dark:text-dark-text-muted">
                                    {formatarMoeda(Number(r.total_devido))}
                                </span>
                            </li>
                        ))}
                        {(resumo ?? []).length === 0 && (
                            <li className="text-gray-dark dark:text-dark-text-muted">Nenhum título em aberto.</li>
                        )}
                    </ul>
                </div>
            </div>

            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[1100px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Loja</th>
                            <th className="px-4 py-3">Título</th>
                            <th className="px-4 py-3">Movimento</th>
                            <th className="px-4 py-3">Vencimento</th>
                            <th className="px-4 py-3">Fornecedor</th>
                            <th className="px-4 py-3">Vendedor</th>
                            <th className="px-4 py-3 text-right">Saldo devido</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3"></th>
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

                        {!loading && linhas.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhum lançamento encontrado.
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            linhas.map((l) => (
                                <tr
                                    key={l.id}
                                    className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                >
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">
                                        {l.idempresa ? nomeFilial(l.idempresa) : '—'}
                                    </td>
                                    <td className="px-4 py-2.5">{l.titulo ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">{formatarData(l.data_movimento)}</td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">{formatarData(l.data_vencimento)}</td>
                                    <td className="px-4 py-2.5 font-medium">{l.fornecedor_nome}</td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">{l.vendedor_nome ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-right">{formatarMoeda(Number(l.saldo_devido))}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[l.status]}`}>
                                            {STATUS_LABEL[l.status]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditando(l)
                                                    setMostrarForm(true)
                                                }}
                                                className="rounded-lg p-1.5 text-gray-dark transition hover:bg-gray-base/10 dark:text-dark-text-muted dark:hover:bg-dark-border/30"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => excluir(l.id)}
                                                className="rounded-lg p-1.5 text-red-base transition hover:bg-red-base/10"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {mostrarForm && (
                <InadimplenciaFormModal
                    fornecedores={fornecedores ?? []}
                    inadimplencia={editando}
                    onClose={() => setMostrarForm(false)}
                    onSalvo={() => {
                        setMostrarForm(false)
                        recarregar()
                    }}
                />
            )}
        </PageShell>
    )
}

function useInadimplencias(
    filtros: { busca: string; status: string; fornecedorId: string },
    habilitado: boolean
) {
    const [data, setData] = useState<Inadimplencia[] | null>(null)
    const [loading, setLoading] = useState(habilitado)
    const [erro, setErro] = useState<string | null>(null)
    const [chave, setChave] = useState(0)

    useEffect(() => {
        if (!habilitado) return

        let cancelado = false
        setLoading(true)

        const params: Record<string, string> = {}
        if (filtros.busca) params.busca = filtros.busca
        if (filtros.status) params.status = filtros.status
        if (filtros.fornecedorId) params.fornecedorId = filtros.fornecedorId

        apiGet<Inadimplencia[]>('/inadimplencias', params)
            .then((resultado) => {
                if (cancelado) return
                setData(resultado)
                setErro(null)
            })
            .catch((e) => {
                if (cancelado) return
                setErro(e instanceof Error ? e.message : 'Erro ao buscar inadimplências.')
            })
            .finally(() => {
                if (!cancelado) setLoading(false)
            })

        return () => {
            cancelado = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtros.busca, filtros.status, filtros.fornecedorId, habilitado, chave])

    return { data, loading, erro, recarregar: () => setChave((v) => v + 1) }
}

function useResumo(habilitado: boolean) {
    const [data, setData] = useState<ResumoFornecedorInadimplencia[] | null>(null)

    useEffect(() => {
        if (!habilitado) return
        let cancelado = false
        apiGet<ResumoFornecedorInadimplencia[]>('/inadimplencias/resumo', {}).then((resultado) => {
            if (!cancelado) setData(resultado)
        })
        return () => {
            cancelado = true
        }
    }, [habilitado])

    return { data }
}

function InadimplenciaFormModal({
    fornecedores,
    inadimplencia,
    onClose,
    onSalvo,
}: {
    fornecedores: Fornecedor[]
    inadimplencia: Inadimplencia | null
    onClose: () => void
    onSalvo: () => void
}) {
    const [fornecedorId, setFornecedorId] = useState(inadimplencia?.fornecedor_id ? String(inadimplencia.fornecedor_id) : '')
    const [vendedorId, setVendedorId] = useState(inadimplencia?.vendedor_id ? String(inadimplencia.vendedor_id) : '')
    const [fornecedorNome, setFornecedorNome] = useState(inadimplencia?.fornecedor_nome ?? '')
    const [idempresa, setIdempresa] = useState(inadimplencia?.idempresa ? String(inadimplencia.idempresa) : '')
    const [titulo, setTitulo] = useState(inadimplencia?.titulo ?? '')
    const [dataMovimento, setDataMovimento] = useState(inadimplencia?.data_movimento?.slice(0, 10) ?? '')
    const [dataVencimento, setDataVencimento] = useState(inadimplencia?.data_vencimento?.slice(0, 10) ?? '')
    const [saldoDevido, setSaldoDevido] = useState(inadimplencia ? String(inadimplencia.saldo_devido) : '')
    const [status, setStatus] = useState<StatusInadimplencia>(inadimplencia?.status ?? 'pendente')
    const [observacao, setObservacao] = useState(inadimplencia?.observacao ?? '')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    const fornecedorSelecionado = fornecedores.find((f) => String(f.id) === fornecedorId)

    function selecionarFornecedor(id: string) {
        setFornecedorId(id)
        setVendedorId('')
        const f = fornecedores.find((f) => String(f.id) === id)
        if (f) setFornecedorNome(f.NOME)
    }

    async function salvar(e: FormEvent) {
        e.preventDefault()

        if (fornecedorNome.trim().length === 0 || saldoDevido.trim().length === 0) {
            setErro('Informe o fornecedor e o saldo devido.')
            return
        }

        const corpo: InadimplenciaInput = {
            fornecedor_id: fornecedorId ? Number(fornecedorId) : null,
            vendedor_id: vendedorId ? Number(vendedorId) : null,
            fornecedor_nome: fornecedorNome.trim(),
            idempresa: idempresa ? Number(idempresa) : null,
            titulo: titulo.trim() || null,
            data_movimento: dataMovimento || null,
            data_vencimento: dataVencimento || null,
            saldo_devido: Number(saldoDevido),
            status,
            observacao: observacao.trim() || null,
        }

        setSalvando(true)
        setErro(null)
        try {
            if (inadimplencia) {
                await apiPut(`/inadimplencias/${inadimplencia.id}`, corpo)
            } else {
                await apiPost('/inadimplencias', corpo)
            }
            onSalvo()
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Erro ao salvar lançamento.')
        } finally {
            setSalvando(false)
        }
    }

    return (
        <Modal titulo={inadimplencia ? 'Editar lançamento' : 'Novo lançamento de inadimplência'} onClose={onClose} largura="lg">
            <form onSubmit={salvar} className="flex flex-col gap-3">
                {erro && <p className="text-sm text-red-base">{erro}</p>}

                <label className="flex flex-col gap-1">
                    <span className={labelClass}>Fornecedor cadastrado</span>
                    <select value={fornecedorId} onChange={(e) => selecionarFornecedor(e.target.value)} className={inputClass}>
                        <option value="">Sem vínculo (digitar nome abaixo)</option>
                        {fornecedores.map((f) => (
                            <option key={f.id} value={f.id}>
                                {f.NOME}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1">
                    <span className={labelClass}>Nome do fornecedor*</span>
                    <input value={fornecedorNome} onChange={(e) => setFornecedorNome(e.target.value)} className={inputClass} />
                </label>

                {fornecedorSelecionado && fornecedorSelecionado.vendedores.length > 0 && (
                    <label className="flex flex-col gap-1">
                        <span className={labelClass}>Vendedor / contato</span>
                        <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className={inputClass}>
                            <option value="">Não informado</option>
                            {fornecedorSelecionado.vendedores.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.nome}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                        <span className={labelClass}>Loja</span>
                        <select value={idempresa} onChange={(e) => setIdempresa(e.target.value)} className={inputClass}>
                            <option value="">—</option>
                            {Object.entries(FILIAIS).map(([id, nome]) => (
                                <option key={id} value={id}>
                                    {nome}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className={labelClass}>Título</span>
                        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputClass} />
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                        <span className={labelClass}>Data movimento</span>
                        <input type="date" value={dataMovimento} onChange={(e) => setDataMovimento(e.target.value)} className={inputClass} />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className={labelClass}>Data vencimento</span>
                        <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} className={inputClass} />
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                        <span className={labelClass}>Saldo devido*</span>
                        <input
                            type="number"
                            step="0.01"
                            value={saldoDevido}
                            onChange={(e) => setSaldoDevido(e.target.value)}
                            className={inputClass}
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className={labelClass}>Status</span>
                        <select value={status} onChange={(e) => setStatus(e.target.value as StatusInadimplencia)} className={inputClass}>
                            {Object.entries(STATUS_LABEL).map(([valor, label]) => (
                                <option key={valor} value={valor}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <label className="flex flex-col gap-1">
                    <span className={labelClass}>Observação</span>
                    <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} className={inputClass} />
                </label>

                <div className="mt-2 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className={botaoSecundario}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={salvando} className={botaoPrimario}>
                        {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
