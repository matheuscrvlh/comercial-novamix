import { useState, type FormEvent } from 'react'
import Modal from '../Modal'
import Spinner from '../Spinner'
import { Trash2, Pencil } from 'lucide-react'
import { apiPost, apiPut, apiDelete } from '../../lib/api'
import { CORES_STATUS, CORES_STATUS_OPCOES, classeBadgeStatus, type CorStatus } from '../../lib/statusColors'
import type { ValidadeStatusTipo } from '../../types/comercial'

const inputClass =
    'w-full rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'

type ValidadeStatusModalProps = {
    tipos: ValidadeStatusTipo[]
    onClose: () => void
    onChanged: () => void
}

export default function ValidadeStatusModal({ tipos, onClose, onChanged }: ValidadeStatusModalProps) {
    const [nome, setNome] = useState('')
    const [cor, setCor] = useState<CorStatus>('gray')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [editandoId, setEditandoId] = useState<number | null>(null)

    function iniciarEdicao(tipo: ValidadeStatusTipo) {
        setEditandoId(tipo.id)
        setNome(tipo.nome)
        setCor((tipo.cor in CORES_STATUS ? tipo.cor : 'gray') as CorStatus)
    }

    function cancelarEdicao() {
        setEditandoId(null)
        setNome('')
        setCor('gray')
    }

    async function salvar(e: FormEvent) {
        e.preventDefault()
        if (nome.trim().length === 0) return

        setSalvando(true)
        setErro(null)
        try {
            if (editandoId !== null) {
                await apiPut(`/validade/status-tipos/${editandoId}`, { nome: nome.trim(), cor, ativo: true })
            } else {
                await apiPost('/validade/status-tipos', { nome: nome.trim(), cor })
            }
            cancelarEdicao()
            onChanged()
        } catch (err) {
            setErro(err instanceof Error ? err.message : 'Erro ao salvar status.')
        } finally {
            setSalvando(false)
        }
    }

    async function excluir(id: number) {
        setSalvando(true)
        setErro(null)
        try {
            await apiDelete(`/validade/status-tipos/${id}`)
            if (editandoId === id) cancelarEdicao()
            onChanged()
        } catch (err) {
            setErro(err instanceof Error ? err.message : 'Erro ao excluir status.')
        } finally {
            setSalvando(false)
        }
    }

    return (
        <Modal titulo="Gerenciar status de validade" subtitulo="Crie os rótulos que quiser (ex.: Em promoção) e use na tabela." onClose={onClose}>
            {erro && <p className="mb-3 text-sm text-red-base">{erro}</p>}

            <div className="mb-4 flex flex-col gap-2">
                {tipos.length === 0 && (
                    <p className="text-sm text-gray-dark dark:text-dark-text-muted">Nenhum status cadastrado ainda.</p>
                )}
                {tipos.map((tipo) => (
                    <div
                        key={tipo.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-base/30 px-3 py-2 dark:border-dark-border"
                    >
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classeBadgeStatus(tipo.cor)}`}>{tipo.nome}</span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => iniciarEdicao(tipo)}
                                aria-label="Editar"
                                className="rounded-md p-1.5 text-gray-dark transition hover:bg-gray-base/10 dark:text-dark-text-muted dark:hover:bg-dark-border/30"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => excluir(tipo.id)}
                                disabled={salvando}
                                aria-label="Excluir"
                                className="rounded-md p-1.5 text-gray-dark transition hover:bg-red-base/10 hover:text-red-base dark:text-dark-text-muted"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={salvar} className="flex flex-col gap-3 border-t border-gray-base/30 pt-4 dark:border-dark-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                    {editandoId !== null ? 'Editar status' : 'Novo status'}
                </span>
                <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome do status (ex: Em promoção)"
                    className={inputClass}
                />
                <div className="flex flex-wrap gap-2">
                    {CORES_STATUS_OPCOES.map((opcaoCor) => (
                        <button
                            key={opcaoCor}
                            type="button"
                            onClick={() => setCor(opcaoCor)}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                                cor === opcaoCor
                                    ? 'border-orange-base bg-orange-base/10 text-orange-base'
                                    : 'border-gray-base/30 text-gray-text hover:bg-gray dark:border-dark-border dark:text-dark-text'
                            }`}
                        >
                            <span className={`h-3 w-3 rounded-full ${CORES_STATUS[opcaoCor].dot}`} />
                            {CORES_STATUS[opcaoCor].label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={salvando || nome.trim().length === 0}
                        className="rounded-lg bg-orange-base px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-base/90 disabled:opacity-50"
                    >
                        {salvando ? <Spinner className="h-4 w-4" /> : editandoId !== null ? 'Salvar alterações' : 'Adicionar status'}
                    </button>
                    {editandoId !== null && (
                        <button
                            type="button"
                            onClick={cancelarEdicao}
                            className="rounded-lg border border-gray-base/30 px-4 py-2 text-sm font-semibold text-gray-text transition hover:bg-gray-base/10 dark:border-dark-border dark:text-dark-text"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </form>
        </Modal>
    )
}
