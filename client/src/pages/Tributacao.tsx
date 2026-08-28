import { useState } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import ProdutoCodigos from '../components/ProdutoCodigos'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { formatPercent } from '../lib/format'
import type { TributacaoRow } from '../types/comercial'

export default function Tributacao() {
    const { me, loading: loadingMe, error: meError } = useMe()

    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')

    const habilitado = me !== null && me.isAdmin && busca.trim().length >= 3

    const { data, loading, erro } = useApi<TributacaoRow[]>('/comercial/tributacao', { busca }, habilitado)

    const linhas = data ?? []

    function buscar(e: React.FormEvent) {
        e.preventDefault()
        setBusca(campo)
    }

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Tributação de Produtos"
            subtitulo="Consulta de ICMS por produto (situação tributária, alíquota, substituição). Busque por nome, código interno ou código de barras."
            filtros={
                <form onSubmit={buscar} className="mb-8 flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Buscar produto
                        </span>
                        <input
                            type="text"
                            value={campo}
                            onChange={(e) => setCampo(e.target.value)}
                            placeholder="Nome, código interno ou de barras"
                            className="w-80 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-lg bg-orange-base px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-light"
                    >
                        Buscar
                    </button>
                </form>
            }
        >
            {campo.trim().length > 0 && campo.trim().length < 3 && (
                <p className="mb-4 text-sm text-gray-dark dark:text-dark-text-muted">Digite ao menos 3 caracteres.</p>
            )}

            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[900px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Produto</th>
                            <th className="px-4 py-3">Fabricante</th>
                            <th className="px-4 py-3">NCM</th>
                            <th className="px-4 py-3">UF Origem</th>
                            <th className="px-4 py-3 text-right">ICMS Saída</th>
                            <th className="px-4 py-3 text-right">ICMS Subst.</th>
                            <th className="px-4 py-3">Situação Tributária</th>
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
                            linhas.map((row) => (
                                <tr
                                    key={row.IDSUBPRODUTO}
                                    className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                >
                                    <td className="px-4 py-2.5 font-medium">
                                        {row.DESCRICAOPRODUTO}
                                        <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">
                                        {row.FABRICANTE ?? '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">{row.NCM ?? '—'}</td>
                                    <td className="px-4 py-2.5">{row.UFORIGEM}</td>
                                    <td className="px-4 py-2.5 text-right">{formatPercent(row.PERICMSAI / 100)}</td>
                                    <td className="px-4 py-2.5 text-right">{formatPercent(row.PERICMSUBST / 100)}</td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">
                                        {row.DESCRSITTRIBUTARIA?.trim() || '—'}
                                    </td>
                                </tr>
                            ))}

                        {!loading && busca.trim().length >= 3 && linhas.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhum produto encontrado para "{busca}".
                                </td>
                            </tr>
                        )}

                        {!loading && busca.trim().length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Digite o nome de um produto e clique em Buscar.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </PageShell>
    )
}
