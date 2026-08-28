import { useState, type FormEvent } from 'react'
import FiltersMenu from '../FiltersMenu'
import FilialMultiFilter from '../FilialMultiFilter'
import DateRangeFilter from '../DateRangeFilter'
import Spinner from '../Spinner'
import ProdutoCodigos from '../ProdutoCodigos'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { formatCurrency, formatDate } from '../../lib/format'
import { getRangeDias } from '../../lib/date'
import { nomeFilial } from '../../constants/filiais'
import type { CotacaoConcorrenteRow } from '../../types/comercial'

const inputClass =
    'w-full rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'
const botaoSecundario =
    'rounded-lg border border-gray-base/30 px-4 py-2 text-sm font-semibold text-gray-text transition hover:bg-gray-base/10 dark:border-dark-border dark:text-gray-text dark:hover:bg-dark-border/30'

export default function CotacaoConcorrenteConteudo() {
    const { me } = useMe()
    const [selecionadas, setSelecionadas] = useState<number[]>([])
    const [campo, setCampo] = useState('')
    const [busca, setBusca] = useState('')
    const [cotacaoInicio, setCotacaoInicio] = useState(() => getRangeDias(180, 0).inicio)
    const [cotacaoFim, setCotacaoFim] = useState(() => getRangeDias(180, 0).fim)

    const habilitado = me !== null && me.isAdmin
    const lojas = me?.branches ?? []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : lojas

    const params: Record<string, string> = { filiais: filiaisAtivas.join(','), cotacaoInicio, cotacaoFim }
    if (busca) params.busca = busca

    const { data, loading, erro } = useApi<CotacaoConcorrenteRow[]>('/cotacoes', params, habilitado)
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
                    <span className={labelClass}>Data da cotação</span>
                    <DateRangeFilter inicio={cotacaoInicio} fim={cotacaoFim} onChangeInicio={setCotacaoInicio} onChangeFim={setCotacaoFim} />
                </div>
                <form onSubmit={buscar} className="flex flex-col gap-2">
                    <span className={labelClass}>Buscar produto/concorrente</span>
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
                            <th className="px-4 py-3">Concorrente</th>
                            <th className="px-4 py-3 text-right">Preço concorrente</th>
                            <th className="px-4 py-3 text-right">Nosso preço</th>
                            <th className="px-4 py-3 text-right">Diferença</th>
                            <th className="px-4 py-3">Data</th>
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
                            registros.map((r, i) => {
                                const diferenca = r.PRECO_NOSSO !== null ? r.PRECO_NOSSO - r.PRECO_CONCORRENTE : null
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
                                        <td className="px-4 py-2.5">{r.CONCORRENTE_NOME}</td>
                                        <td className="px-4 py-2.5 text-right">{formatCurrency(r.PRECO_CONCORRENTE)}</td>
                                        <td className="px-4 py-2.5 text-right">{formatCurrency(r.PRECO_NOSSO)}</td>
                                        <td
                                            className={`px-4 py-2.5 text-right font-medium ${
                                                diferenca === null
                                                    ? 'text-gray-dark dark:text-dark-text-muted'
                                                    : diferenca > 0
                                                      ? 'text-red-base'
                                                      : 'text-green-base'
                                            }`}
                                        >
                                            {formatCurrency(diferenca)}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-gray-dark dark:text-dark-text-muted">
                                            {formatDate(r.DATA_COTACAO)}
                                        </td>
                                    </tr>
                                )
                            })}
                        {!loading && registros.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                    Nenhuma cotação encontrada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    )
}
