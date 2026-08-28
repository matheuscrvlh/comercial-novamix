import { useState, type FormEvent } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import ResumoSecaoTree from '../components/ResumoSecaoTree'
import ProdutoDetalheModal from '../components/ProdutoDetalheModal'
import ProdutoCodigos from '../components/ProdutoCodigos'
import { Info } from 'lucide-react'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import type { CatalogoProdutoRow, ResumoMercadologicoRow } from '../types/comercial'

type Status = 'todos' | 'ativo' | 'inativo'

interface Opcao {
    id: string
    label: string
}

function opcoesNivel(
    rows: ResumoMercadologicoRow[],
    idField: 'IDDIVISAO' | 'IDSECAO' | 'IDGRUPO' | 'IDSUBGRUPO',
    descField: 'DESCRDIVISAO' | 'DESCRSECAO' | 'DESCRGRUPO' | 'DESCRSUBGRUPO',
    filtrosSuperiores: (row: ResumoMercadologicoRow) => boolean
): Opcao[] {
    const mapa = new Map<string, string>()
    for (const row of rows) {
        if (!filtrosSuperiores(row)) continue
        const idVal = row[idField]
        if (idVal == null) continue
        mapa.set(String(idVal), row[descField] ?? '')
    }
    return Array.from(mapa.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
}

export default function CatalogoProdutos() {
    const { me, loading: loadingMe, error: meError } = useMe()

    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')
    const [iddivisao, setIddivisao] = useState('')
    const [idsecao, setIdsecao] = useState('')
    const [idgrupo, setIdgrupo] = useState('')
    const [idsubgrupo, setIdsubgrupo] = useState('')
    const [status, setStatus] = useState<Status>('ativo')
    const [produtoSelecionado, setProdutoSelecionado] = useState<number | null>(null)

    const habilitado = me !== null && me.isAdmin

    const { data: resumo, loading: loadingResumo } = useApi<ResumoMercadologicoRow[]>(
        '/catalogo/resumo',
        {},
        habilitado
    )
    const linhasResumo = resumo ?? []

    // Cada nível de filtro só mostra opções compatíveis com os níveis já selecionados,
    // e cascateia: trocar um nível mais alto limpa os níveis abaixo dele.
    const opcoesDivisao = opcoesNivel(linhasResumo, 'IDDIVISAO', 'DESCRDIVISAO', () => true)
    const opcoesSecao = opcoesNivel(
        linhasResumo,
        'IDSECAO',
        'DESCRSECAO',
        (row) => !iddivisao || String(row.IDDIVISAO ?? '') === iddivisao
    )
    const opcoesGrupo = opcoesNivel(
        linhasResumo,
        'IDGRUPO',
        'DESCRGRUPO',
        (row) =>
            (!iddivisao || String(row.IDDIVISAO ?? '') === iddivisao) &&
            (!idsecao || String(row.IDSECAO ?? '') === idsecao)
    )
    const opcoesSubgrupo = opcoesNivel(
        linhasResumo,
        'IDSUBGRUPO',
        'DESCRSUBGRUPO',
        (row) =>
            (!iddivisao || String(row.IDDIVISAO ?? '') === iddivisao) &&
            (!idsecao || String(row.IDSECAO ?? '') === idsecao) &&
            (!idgrupo || String(row.IDGRUPO ?? '') === idgrupo)
    )

    const podeBuscar =
        busca.trim().length >= 3 || iddivisao !== '' || idsecao !== '' || idgrupo !== '' || idsubgrupo !== ''

    const { data, loading, erro } = useApi<CatalogoProdutoRow[]>(
        '/catalogo/busca',
        { busca, iddivisao, idsecao, idgrupo, idsubgrupo, status },
        habilitado && podeBuscar
    )

    const linhas = data ?? []

    function buscar(e: FormEvent) {
        e.preventDefault()
        setBusca(campo)
    }

    function selecionarDivisao(valor: string) {
        setIddivisao(valor)
        setIdsecao('')
        setIdgrupo('')
        setIdsubgrupo('')
        setBusca(campo)
    }

    function selecionarSecao(valor: string) {
        setIdsecao(valor)
        setIdgrupo('')
        setIdsubgrupo('')
        setBusca(campo)
    }

    function selecionarGrupo(valor: string) {
        setIdgrupo(valor)
        setIdsubgrupo('')
        setBusca(campo)
    }

    function selecionarSubgrupo(valor: string) {
        setIdsubgrupo(valor)
        setBusca(campo)
    }

    function selecionarStatus(valor: Status) {
        setStatus(valor)
        setBusca(campo)
    }

    function limparFiltros() {
        setCampo('')
        setBusca('')
        setIddivisao('')
        setIdsecao('')
        setIdgrupo('')
        setIdsubgrupo('')
        setStatus('ativo')
    }

    const temFiltroAtivo =
        campo !== '' || busca !== '' || iddivisao !== '' || idsecao !== '' || idgrupo !== '' || idsubgrupo !== '' || status !== 'ativo'

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Catálogo de Produtos"
            subtitulo="Hierarquia mercadológica (divisão, seção, grupo, subgrupo) e status de cada produto. Busque por nome, código interno ou código de barras."
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
                            className="w-72 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Divisão
                        </span>
                        <select
                            value={iddivisao}
                            onChange={(e) => selecionarDivisao(e.target.value)}
                            className="w-56 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        >
                            <option value="">Todas</option>
                            {opcoesDivisao.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Seção
                        </span>
                        <select
                            value={idsecao}
                            onChange={(e) => selecionarSecao(e.target.value)}
                            className="w-56 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        >
                            <option value="">Todas</option>
                            {opcoesSecao.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Grupo
                        </span>
                        <select
                            value={idgrupo}
                            onChange={(e) => selecionarGrupo(e.target.value)}
                            className="w-56 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        >
                            <option value="">Todos</option>
                            {opcoesGrupo.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Subgrupo
                        </span>
                        <select
                            value={idsubgrupo}
                            onChange={(e) => selecionarSubgrupo(e.target.value)}
                            className="w-56 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        >
                            <option value="">Todos</option>
                            {opcoesSubgrupo.map((sg) => (
                                <option key={sg.id} value={sg.id}>
                                    {sg.label}
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
                            onChange={(e) => selecionarStatus(e.target.value as Status)}
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
                    {temFiltroAtivo && (
                        <button
                            type="button"
                            onClick={limparFiltros}
                            className="rounded-lg border border-gray-base/30 px-4 py-2 text-sm font-semibold text-gray-text transition hover:bg-gray-base/10 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border/30"
                        >
                            Limpar filtros
                        </button>
                    )}
                </form>
            }
        >
            <h2 className="mb-3 text-lg font-semibold text-gray-text dark:text-dark-text">Resumo por seção</h2>
            <ResumoSecaoTree rows={resumo ?? []} loading={loadingResumo} />

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
                            <th className="px-4 py-3"></th>
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
                                    <td className="px-4 py-2.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setProdutoSelecionado(row.IDSUBPRODUTO)}
                                            title="Ver tudo sobre o produto"
                                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-dark transition hover:bg-orange-base/10 hover:text-orange-base dark:text-dark-text-muted"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                        {!loading && podeBuscar && linhas.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhum produto encontrado.
                                </td>
                            </tr>
                        )}

                        {!loading && !podeBuscar && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Digite ao menos 3 caracteres ou selecione um filtro de hierarquia para buscar.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {produtoSelecionado !== null && (
                <ProdutoDetalheModal idsubproduto={produtoSelecionado} onClose={() => setProdutoSelecionado(null)} />
            )}
        </PageShell>
    )
}
