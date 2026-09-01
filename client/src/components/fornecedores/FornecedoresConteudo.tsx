import { useEffect, useState, type FormEvent } from 'react'
import Spinner from '../Spinner'
import Modal from '../Modal'
import { Plus, Trash2, Pencil, ChevronDown } from 'lucide-react'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api'
import type { Fornecedor, FornecedorCissRow, Vendedor } from '../../types/comercial'

const inputClass =
    'w-full rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'
const botaoPrimario =
    'rounded-lg bg-orange-base px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-light disabled:opacity-50'
const botaoSecundario =
    'rounded-lg border border-gray-base/30 px-4 py-2 text-sm font-semibold text-gray-text transition hover:bg-gray-base/10 dark:border-dark-border dark:text-gray-text dark:hover:bg-dark-border/30'

export default function FornecedoresConteudo() {
    const { me } = useMe()
    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')
    const [mostrarNovo, setMostrarNovo] = useState(false)
    const [expandidos, setExpandidos] = useState<Set<number>>(new Set())

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro, recarregar } = useFornecedores(busca, habilitado)
    const fornecedores = data ?? []

    function buscar(e: FormEvent) {
        e.preventDefault()
        setBusca(campo)
    }

    function alternarExpandido(id: number) {
        setExpandidos((atual) => {
            const novo = new Set(atual)
            if (novo.has(id)) {
                novo.delete(id)
            } else {
                novo.add(id)
            }
            return novo
        })
    }

    return (
        <>
            <form onSubmit={buscar} className="mb-8 flex flex-wrap items-end gap-3">
                <div className="flex w-full flex-col gap-2 sm:w-72">
                    <span className={labelClass}>Buscar fornecedor</span>
                    <input
                        type="text"
                        value={campo}
                        onChange={(e) => setCampo(e.target.value)}
                        placeholder="Nome, CNPJ ou vendedor"
                        className={inputClass}
                    />
                </div>
                <div className="flex w-full gap-3 sm:w-auto">
                    <button type="submit" className={`${botaoPrimario} flex-1 sm:flex-none`}>
                        Buscar
                    </button>
                    <button
                        type="button"
                        onClick={() => setMostrarNovo(true)}
                        className={`${botaoPrimario} flex flex-1 items-center justify-center gap-1.5 sm:flex-none`}
                    >
                        <Plus className="h-4 w-4" />
                        Novo fornecedor
                    </button>
                </div>
            </form>

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

            {!loading && fornecedores.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                    {fornecedores.map((f) => (
                        <FornecedorLinha
                            key={f.id}
                            fornecedor={f}
                            expandido={expandidos.has(f.id)}
                            onToggle={() => alternarExpandido(f.id)}
                            onAlterado={recarregar}
                            onRemovido={recarregar}
                        />
                    ))}
                </div>
            )}

            {mostrarNovo && (
                <NovoFornecedorModal
                    onClose={() => setMostrarNovo(false)}
                    onCriado={() => {
                        setMostrarNovo(false)
                        recarregar()
                    }}
                />
            )}
        </>
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

function FornecedorLinha({
    fornecedor,
    expandido,
    onToggle,
    onAlterado,
    onRemovido,
}: {
    fornecedor: Fornecedor
    expandido: boolean
    onToggle: () => void
    onAlterado: () => void
    onRemovido: () => void
}) {
    const [mostrarForm, setMostrarForm] = useState(false)
    const [vendedorEditando, setVendedorEditando] = useState<Vendedor | null>(null)
    const [removendoFornecedor, setRemovendoFornecedor] = useState(false)

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
        <div className="border-b border-gray-base/30 last:border-0 dark:border-dark-border">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-base/5 dark:hover:bg-dark-border/20"
            >
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-text dark:text-dark-text">{f.NOME}</span>
                        {f.NOMEFANTASIA && (
                            <span className="text-xs text-gray-dark dark:text-dark-text-muted">({f.NOMEFANTASIA})</span>
                        )}
                        {f.FLAGINATIVO === 'T' && (
                            <span className="shrink-0 rounded-full bg-red-base/10 px-2 py-0.5 text-xs font-medium text-red-base">
                                Inativo no CISS
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-dark dark:text-dark-text-muted">
                        {f.vendedores.length === 0
                            ? 'Nenhum vendedor cadastrado'
                            : `${f.vendedores.length} vendedor${f.vendedores.length > 1 ? 'es' : ''}`}
                    </span>
                </div>
                <ChevronDown
                    className={`h-5 w-5 shrink-0 text-gray-dark transition-transform dark:text-dark-text-muted ${expandido ? 'rotate-180' : ''}`}
                />
            </button>

            {expandido && (
                <div className="border-t border-gray-base/20 bg-gray-base/5 px-4 py-4 dark:border-dark-border/60 dark:bg-dark-bg/30">
                    <div className="mb-5 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <Campo label="CNPJ/CPF" valor={f.CNPJCPF ?? '—'} />
                        <Campo label="Telefone" valor={f.FONE1 || f.FONE2 || '—'} />
                        <Campo label="Celular" valor={f.FONECELULAR || '—'} />
                        <Campo label="E-mail" valor={f.EMAIL || '—'} />
                        <Campo label="Contato (CISS)" valor={f.NOMECONTATO1 || f.NOMECONTATO2 || '—'} />
                        <Campo label="Endereço" valor={f.ENDERECO ? `${f.ENDERECO}, ${f.BAIRRO ?? ''} - ${f.UFCLIFOR ?? ''}` : '—'} />
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
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar
                        </button>
                    </div>

                    {f.vendedores.length === 0 && (
                        <p className="mb-4 text-sm text-gray-dark dark:text-dark-text-muted">Nenhum vendedor cadastrado ainda.</p>
                    )}

                    <ul className="mb-5 flex flex-col gap-2">
                        {f.vendedores.map((v) => (
                            <li
                                key={v.id}
                                className="flex items-start justify-between gap-3 rounded-lg border border-gray-base/30 bg-white px-3 py-2 dark:border-dark-border dark:bg-dark-surface"
                            >
                                <div className="min-w-0 text-sm">
                                    <p className="font-medium text-gray-text dark:text-dark-text">
                                        {v.nome}
                                        {v.cargo && (
                                            <span className="ml-2 text-xs font-normal text-gray-dark dark:text-dark-text-muted">
                                                {v.cargo}
                                            </span>
                                        )}
                                        {!v.ativo && (
                                            <span className="ml-2 rounded-full bg-red-base/10 px-2 py-0.5 text-xs font-medium text-red-base">
                                                Inativo
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-dark dark:text-dark-text-muted">
                                        {[v.telefone, v.whatsapp && `WhatsApp: ${v.whatsapp}`, v.email].filter(Boolean).join(' · ') ||
                                            'Sem contato informado'}
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
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => excluirVendedor(v.id)}
                                        className="rounded-lg p-1.5 text-red-base transition hover:bg-red-base/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="flex justify-end border-t border-gray-base/20 pt-3 dark:border-dark-border/60">
                        <button
                            type="button"
                            onClick={excluirFornecedor}
                            disabled={removendoFornecedor}
                            className="text-sm font-medium text-red-base transition hover:underline disabled:opacity-50"
                        >
                            Remover fornecedor do catálogo
                        </button>
                    </div>
                </div>
            )}

            {mostrarForm && (
                <VendedorFormModal
                    fornecedorId={f.id}
                    vendedor={vendedorEditando}
                    onClose={() => setMostrarForm(false)}
                    onSalvo={() => {
                        setMostrarForm(false)
                        onAlterado()
                    }}
                />
            )}
        </div>
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
