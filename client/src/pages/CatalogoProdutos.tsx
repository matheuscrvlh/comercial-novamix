import { useState, type FormEvent } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { formatNumber } from '../lib/format'
import type { CatalogoProdutoRow, ResumoMercadologicoRow, Secao } from '../types/comercial'

type Status = 'todos' | 'ativo' | 'inativo'

export default function CatalogoProdutos() {
    const { me, loading: loadingMe, error: meError } = useMe()

    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')
    const [idsecao, setIdsecao] = useState('')
    const [status, setStatus] = useState<Status>('ativo')

    const habilitado = me !== null && me.isAdmin

    const { data: secoes } = useApi<Secao[]>('/comercial/secoes', {}, habilitado)
    const { data: resumo, loading: loadingResumo } = useApi<ResumoMercadologicoRow[]>(
        '/catalogo/resumo',
        {},
        habilitado
    )

    const podeBuscar = busca.trim().length >= 3 || idsecao !== ''

    const { data, loading, erro } = useApi<CatalogoProdutoRow[]>(
        '/catalogo/busca',
        { busca, idsecao, status },
        habilitado && podeBuscar
    )

    const linhas = data ?? []

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
            titulo="Catálogo de Produtos"
            subtitulo="Hierarquia mercadológica (divisão, seção, grupo, subgrupo) e status de cada produto."
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
                            placeholder="Ex: chocolate tablete talento"
                            className="w-72 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Seção
                        </span>
                        <select
                            value={idsecao}
                            onChange={(e) => setIdsecao(e.target.value)}
                            className="w-56 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        >
                            <option value="">Todas</option>
                            {(secoes ?? []).map((s) => (
                                <option key={s.IDSECAO} value={s.IDSECAO}>
                                    {s.DESCRSECAO}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Status
                        </span>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Status)}
                            className="w-36 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        >
                            <option value="ativo">Ativos</option>
                            <option value="inativo">Inativos</option>
                            <option value="todos">Todos</option>
                        </select>
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
            <h2 className="mb-3 text-lg font-semibold text-gray-text dark:text-dark-text">Resumo por seção</h2>
            <div className="mb-8 max-h-72 overflow-y-auto overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[500px] text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-dark-surface">
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Seção</th>
                            <th className="px-4 py-3 text-right">Ativos</th>
                            <th className="px-4 py-3 text-right">Inativos</th>
                            <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingResumo && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center">
                                    <Spinner className="mx-auto h-5 w-5" />
                                </td>
                            </tr>
                        )}
                        {!loadingResumo &&
                            (resumo ?? []).map((row) => (
                                <tr
                                    key={row.IDSECAO}
                                    className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                >
                                    <td className="px-4 py-2 font-medium">{row.DESCRSECAO}</td>
                                    <td className="px-4 py-2 text-right text-green-base">{formatNumber(row.ATIVOS)}</td>
                                    <td className="px-4 py-2 text-right text-red-base">{formatNumber(row.INATIVOS)}</td>
                                    <td className="px-4 py-2 text-right">{formatNumber(row.TOTAL)}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {erro && <p className="mb-4 text-sm text-red-base">{erro}</p>}

            <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[1000px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Produto</th>
                            <th className="px-4 py-3">Fabricante</th>
                            <th className="px-4 py-3">Divisão</th>
                            <th className="px-4 py-3">Seção</th>
                            <th className="px-4 py-3">Grupo</th>
                            <th className="px-4 py-3">Subgrupo</th>
                            <th className="px-4 py-3">Status</th>
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
                                    <td className="px-4 py-2.5 font-medium">{row.DESCRICAOPRODUTO}</td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">
                                        {row.FABRICANTE ?? '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">
                                        {row.DESCRDIVISAO ?? '—'}
                                    </td>
                                    <td className="px-4 py-2.5">{row.DESCRSECAO ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">
                                        {row.DESCRGRUPO ?? '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-dark dark:text-dark-text-muted">
                                        {row.DESCRSUBGRUPO ?? '—'}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                row.FLAGINATIVO === 'F'
                                                    ? 'bg-green-base/10 text-green-base'
                                                    : 'bg-red-base/10 text-red-base'
                                            }`}
                                        >
                                            {row.FLAGINATIVO === 'F' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                        {!loading && podeBuscar && linhas.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhum produto encontrado.
                                </td>
                            </tr>
                        )}

                        {!loading && !podeBuscar && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Digite ao menos 3 caracteres ou selecione uma seção para buscar.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </PageShell>
    )
}
