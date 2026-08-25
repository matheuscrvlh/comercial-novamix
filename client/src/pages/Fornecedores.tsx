import { useEffect, useState, type FormEvent } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import { PlusIcon, TrashIcon, PencilIcon } from '../components/icons'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import type { Fornecedor, FornecedorCissRow, Vendedor } from '../types/comercial'

const inputClass =
    'w-full rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'
const botaoPrimario =
    'rounded-lg bg-orange-base px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-light disabled:opacity-50'
const botaoSecundario =
    'rounded-lg border border-gray-base/30 px-4 py-2 text-sm font-semibold text-gray-text transition hover:bg-gray-base/10 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border/30'

export default function Fornecedores() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')
    const [mostrarNovo, setMostrarNovo] = useState(false)
    const [fornecedorAberto, setFornecedorAberto] = useState<number | null>(null)

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro, recarregar } = useFornecedores(busca, habilitado)
    const fornecedores = data ?? []

    function buscar(e: FormEvent) {
        e.preventDefault()
        setBusca(campo)
    }

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Fornecedores"
            subtitulo="Fornecedores vinculados ao CISS e os vendedores/contatos de cada um, para sempre ter o contato à mão."
            filtros={
                <form onSubmit={buscar} className="mb-8 flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-2">
                        <span className={labelClass}>Buscar fornecedor</span>
                        <input
                            type="text"
                            value={campo}
                            onChange={(e) => setCampo(e.target.value)}
                            placeholder="Nome, CNPJ ou vendedor"
                            className={`${inputClass} w-72`}
                        />
                    </div>
                    <button type="submit" className={botaoPrimario}>
                        Buscar
                    </button>
                    <button type="button" onClick={() => setMostrarNovo(true)} className={`${botaoPrimario} flex items-center gap-1.5`}>
                        <PlusIcon className="h-4 w-4" />
                        Novo fornecedor
                    </button>
                </form>
            }
        >
            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            {loading && (
                <div className="flex justify-center py-10">
                    <Spinner className="h-6 w-6" />
                </div>
            )}

            {!loading && fornecedores.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-dark dark:text-dark-text-muted">
                    Nenhum fornecedor cadastrado ainda.
                </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fornecedores.map((f) => (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => setFornecedorAberto(f.id)}
                        className="flex flex-col gap-1 rounded-xl border border-gray-base/30 bg-white p-4 text-left shadow-sm transition hover:border-orange-base dark:border-dark-border dark:bg-dark-surface"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-text dark:text-dark-text">{f.NOME}</span>
                            {f.FLAGINATIVO === 'T' && (
                                <span className="shrink-0 rounded-full bg-red-base/10 px-2 py-0.5 text-xs font-medium text-red-base">
                                    Inativo no CISS
                                </span>
                            )}
                        </div>
                        {f.NOMEFANTASIA && <span className="text-xs text-gray-dark dark:text-dark-text-muted">{f.NOMEFANTASIA}</span>}
                        <span className="mt-2 text-xs text-gray-dark dark:text-dark-text-muted">
                            {f.vendedores.length === 0
                                ? 'Nenhum vendedor cadastrado'
                                : `${f.vendedores.length} vendedor${f.vendedores.length > 1 ? 'es' : ''}`}
                        </span>
                    </button>
                ))}
            </div>

            {mostrarNovo && (
                <NovoFornecedorModal
                    onClose={() => setMostrarNovo(false)}
                    onCriado={() => {
                        setMostrarNovo(false)
                        recarregar()
                    }}
                />
            )}

            {fornecedorAberto !== null && (
                <FornecedorDetalheModal
                    fornecedor={fornecedores.find((f) => f.id === fornecedorAberto) ?? null}
                    onClose={() => setFornecedorAberto(null)}
                    onAlterado={recarregar}
                    onRemovido={() => {
                        setFornecedorAberto(null)
                        recarregar()
                    }}
                />
            )}
        </PageShell>
    )
}

function useFornecedores(busca: string, habilitado: boolean) {
    const [data, setData] = useState<Fornecedor[] | null>(null)
    const [loading, setLoading] = useState(habilitado)
    const [erro, setErro] = useState<string | null>(null)
    const [chave, setChave] = useState(0)

    useEffect(() => {
        if (!habilitado) return

        let cancelado = false
        setLoading(true)

        apiGet<Fornecedor[]>('/fornecedores', busca ? { busca } : {})
            .then((resultado) => {
                if (cancelado) return
                setData(resultado)
                setErro(null)
            })
            .catch((e) => {
                if (cancelado) return
                setErro(e instanceof Error ? e.message : 'Erro ao buscar fornecedores.')
            })
            .finally(() => {
                if (!cancelado) setLoading(false)
            })

        return () => {
            cancelado = true
        }
    }, [busca, habilitado, chave])

    return { data, loading, erro, recarregar: () => setChave((v) => v + 1) }
}

function NovoFornecedorModal({ onClose, onCriado }: { onClose: () => void; onCriado: () => void }) {
    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')
    const [vinculando, setVinculando] = useState<number | null>(null)
    const [erro, setErro] = useState<string | null>(null)

    const podeBuscar = busca.trim().length >= 3
    const { data, loading } = useApi<FornecedorCissRow[]>('/fornecedores/busca-ciss', { busca }, podeBuscar)
    const resultados = data ?? []

    function buscar(e: FormEvent) {
        e.preventDefault()
        setBusca(campo)
    }

    async function vincular(idclifor: number) {
        setVinculando(idclifor)
        setErro(null)
        try {
            await apiPost('/fornecedores', { idclifor })
            onCriado()
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Erro ao vincular fornecedor.')
        } finally {
            setVinculando(null)
        }
    }

    return (
        <Modal titulo="Vincular fornecedor do CISS" onClose={onClose} largura="lg">
            <form onSubmit={buscar} className="mb-4 flex items-end gap-3">
                <div className="flex flex-1 flex-col gap-2">
                    <span className={labelClass}>Nome, nome fantasia ou CNPJ</span>
                    <input
                        type="text"
                        autoFocus
                        value={campo}
                        onChange={(e) => setCampo(e.target.value)}
                        placeholder="Ao menos 3 caracteres"
                        className={inputClass}
                    />
                </div>
                <button type="submit" className={botaoPrimario}>
                    Buscar
                </button>
            </form>

            {erro && <p className="mb-3 text-sm text-red-base">{erro}</p>}

            {loading && (
                <div className="flex justify-center py-6">
                    <Spinner className="h-5 w-5" />
                </div>
            )}

            {!loading && podeBuscar && resultados.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-dark dark:text-dark-text-muted">Nenhum fornecedor encontrado no CISS.</p>
            )}

            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {resultados.map((r) => (
                    <li
                        key={r.IDCLIFOR}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-base/30 px-3 py-2 dark:border-dark-border"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-text dark:text-dark-text">{r.NOME}</p>
                            <p className="truncate text-xs text-gray-dark dark:text-dark-text-muted">{r.CNPJCPF ?? 'Sem CNPJ/CPF'}</p>
                        </div>
                        <button
                            type="button"
                            disabled={vinculando === r.IDCLIFOR}
                            onClick={() => vincular(r.IDCLIFOR)}
                            className={`${botaoPrimario} shrink-0`}
                        >
                            {vinculando === r.IDCLIFOR ? 'Vinculando...' : 'Vincular'}
                        </button>
                    </li>
                ))}
            </ul>
        </Modal>
    )
}

function FornecedorDetalheModal({
    fornecedor,
    onClose,
    onAlterado,
    onRemovido,
}: {
    fornecedor: Fornecedor | null
    onClose: () => void
    onAlterado: () => void
    onRemovido: () => void
}) {
    const [mostrarForm, setMostrarForm] = useState(false)
    const [vendedorEditando, setVendedorEditando] = useState<Vendedor | null>(null)
    const [removendoFornecedor, setRemovendoFornecedor] = useState(false)

    if (!fornecedor) return null
    const f = fornecedor

    async function excluirVendedor(id: number) {
        if (!confirm('Remover este vendedor/contato?')) return
        await apiDelete(`/vendedores/${id}`)
        onAlterado()
    }

    async function excluirFornecedor() {
        if (!confirm(`Remover "${f.NOME}" do catálogo de fornecedores? Os vendedores cadastrados também serão removidos.`)) return
        setRemovendoFornecedor(true)
        try {
            await apiDelete(`/fornecedores/${f.id}`)
            onRemovido()
        } finally {
            setRemovendoFornecedor(false)
        }
    }

    return (
        <Modal titulo={fornecedor.NOME} subtitulo={fornecedor.NOMEFANTASIA ?? undefined} onClose={onClose} largura="lg">
            <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <Campo label="CNPJ/CPF" valor={fornecedor.CNPJCPF ?? '—'} />
                <Campo label="Telefone" valor={fornecedor.FONE1 || fornecedor.FONE2 || '—'} />
                <Campo label="Celular" valor={fornecedor.FONECELULAR || '—'} />
                <Campo label="E-mail" valor={fornecedor.EMAIL || '—'} />
                <Campo label="Contato (CISS)" valor={fornecedor.NOMECONTATO1 || fornecedor.NOMECONTATO2 || '—'} />
                <Campo label="Endereço" valor={fornecedor.ENDERECO ? `${fornecedor.ENDERECO}, ${fornecedor.BAIRRO ?? ''} - ${fornecedor.UFCLIFOR ?? ''}` : '—'} />
            </div>

            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                    Vendedores / contatos
                </h3>
                <button
                    type="button"
                    onClick={() => {
                        setVendedorEditando(null)
                        setMostrarForm(true)
                    }}
                    className={`${botaoPrimario} flex items-center gap-1.5 px-3! py-1.5! text-xs`}
                >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Adicionar
                </button>
            </div>

            {fornecedor.vendedores.length === 0 && (
                <p className="mb-4 text-sm text-gray-dark dark:text-dark-text-muted">Nenhum vendedor cadastrado ainda.</p>
            )}

            <ul className="mb-5 flex flex-col gap-2">
                {fornecedor.vendedores.map((v) => (
                    <li
                        key={v.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-gray-base/30 px-3 py-2 dark:border-dark-border"
                    >
                        <div className="min-w-0 text-sm">
                            <p className="font-medium text-gray-text dark:text-dark-text">
                                {v.nome}
                                {v.cargo && <span className="ml-2 text-xs font-normal text-gray-dark dark:text-dark-text-muted">{v.cargo}</span>}
                                {!v.ativo && (
                                    <span className="ml-2 rounded-full bg-red-base/10 px-2 py-0.5 text-xs font-medium text-red-base">
                                        Inativo
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-gray-dark dark:text-dark-text-muted">
                                {[v.telefone, v.whatsapp && `WhatsApp: ${v.whatsapp}`, v.email].filter(Boolean).join(' · ') || 'Sem contato informado'}
                            </p>
                            {v.observacoes && <p className="mt-1 text-xs text-gray-dark dark:text-dark-text-muted">{v.observacoes}</p>}
                        </div>
                        <div className="flex shrink-0 gap-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setVendedorEditando(v)
                                    setMostrarForm(true)
                                }}
                                className="rounded-lg p-1.5 text-gray-dark transition hover:bg-gray-base/10 dark:text-dark-text-muted dark:hover:bg-dark-border/30"
                            >
                                <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => excluirVendedor(v.id)}
                                className="rounded-lg p-1.5 text-red-base transition hover:bg-red-base/10"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            <div className="flex justify-between border-t border-gray-base/30 pt-4 dark:border-dark-border">
                <button
                    type="button"
                    onClick={excluirFornecedor}
                    disabled={removendoFornecedor}
                    className="text-sm font-medium text-red-base transition hover:underline disabled:opacity-50"
                >
                    Remover fornecedor do catálogo
                </button>
                <button type="button" onClick={onClose} className={botaoSecundario}>
                    Fechar
                </button>
            </div>

            {mostrarForm && (
                <VendedorFormModal
                    fornecedorId={fornecedor.id}
                    vendedor={vendedorEditando}
                    onClose={() => setMostrarForm(false)}
                    onSalvo={() => {
                        setMostrarForm(false)
                        onAlterado()
                    }}
                />
            )}
        </Modal>
    )
}

function VendedorFormModal({
    fornecedorId,
    vendedor,
    onClose,
    onSalvo,
}: {
    fornecedorId: number
    vendedor: Vendedor | null
    onClose: () => void
    onSalvo: () => void
}) {
    const [nome, setNome] = useState(vendedor?.nome ?? '')
    const [cargo, setCargo] = useState(vendedor?.cargo ?? '')
    const [telefone, setTelefone] = useState(vendedor?.telefone ?? '')
    const [whatsapp, setWhatsapp] = useState(vendedor?.whatsapp ?? '')
    const [email, setEmail] = useState(vendedor?.email ?? '')
    const [observacoes, setObservacoes] = useState(vendedor?.observacoes ?? '')
    const [ativo, setAtivo] = useState(vendedor?.ativo ?? true)
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    async function salvar(e: FormEvent) {
        e.preventDefault()
        if (nome.trim().length === 0) {
            setErro('Informe o nome do vendedor.')
            return
        }

        setSalvando(true)
        setErro(null)
        const corpo = {
            nome: nome.trim(),
            cargo: cargo.trim() || null,
            telefone: telefone.trim() || null,
            whatsapp: whatsapp.trim() || null,
            email: email.trim() || null,
            observacoes: observacoes.trim() || null,
            ativo,
        }

        try {
            if (vendedor) {
                await apiPut(`/vendedores/${vendedor.id}`, corpo)
            } else {
                await apiPost(`/fornecedores/${fornecedorId}/vendedores`, corpo)
            }
            onSalvo()
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Erro ao salvar vendedor.')
        } finally {
            setSalvando(false)
        }
    }

    return (
        <Modal titulo={vendedor ? 'Editar vendedor' : 'Novo vendedor / contato'} onClose={onClose}>
            <form onSubmit={salvar} className="flex flex-col gap-3">
                {erro && <p className="text-sm text-red-base">{erro}</p>}

                <label className="flex flex-col gap-1">
                    <span className={labelClass}>Nome*</span>
                    <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
                </label>

                <label className="flex flex-col gap-1">
                    <span className={labelClass}>Cargo</span>
                    <input value={cargo} onChange={(e) => setCargo(e.target.value)} className={inputClass} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                        <span className={labelClass}>Telefone</span>
                        <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className={inputClass} />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className={labelClass}>WhatsApp</span>
                        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} />
                    </label>
                </div>

                <label className="flex flex-col gap-1">
                    <span className={labelClass}>E-mail</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </label>

                <label className="flex flex-col gap-1">
                    <span className={labelClass}>Observações</span>
                    <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} className={inputClass} />
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-text dark:text-dark-text">
                    <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                    Vendedor ativo
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

function Campo({ label, valor }: { label: string; valor: string }) {
    return (
        <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">{label}</span>
            <span className="text-gray-text dark:text-dark-text">{valor}</span>
        </div>
    )
}
