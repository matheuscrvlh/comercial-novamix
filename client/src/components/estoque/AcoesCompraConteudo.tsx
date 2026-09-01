import { useState } from 'react'
import FiltersMenu from '../FiltersMenu'
import FilialMultiFilter from '../FilialMultiFilter'
import MercadologicoFilter, { type MercadologicoSelecao } from '../MercadologicoFilter'
import Spinner from '../Spinner'
import TabButtons from '../TabButtons'
import ProdutoCodigos from '../ProdutoCodigos'
import { MobileCard, CardField } from '../MobileCard'
import { useMe } from '../../hooks/useMe'
import { useApi } from '../../hooks/useApi'
import { formatCurrency, formatDate, formatNumber } from '../../lib/format'
import { comFiltroEcommerce } from '../../constants/filiais'
import type { GestaoEstoqueListasData } from '../../types/comercial'

const ABAS = [
    { id: 'comprar', label: 'Comprar urgente' },
    { id: 'excesso', label: 'Excesso de estoque' },
    { id: 'inativar', label: 'Candidatos a inativar' },
] as const

type AbaId = (typeof ABAS)[number]['id']

const inputClass =
    'w-20 rounded-lg border border-gray-base/30 bg-white px-2 py-1.5 text-right text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'

export default function AcoesCompraConteudo() {
    const { me } = useMe()
    const [selecionadas, setSelecionadas] = useState<number[]>([])
    const [mercadologico, setMercadologico] = useState<MercadologicoSelecao>({ divisoes: [], secoes: [], grupos: [] })
    const [aba, setAba] = useState<AbaId>('comprar')
    const [diasComprar, setDiasComprar] = useState('15')
    const [diasExcesso, setDiasExcesso] = useState('60')
    const [diasInativar, setDiasInativar] = useState('90')

    const branchesDisponiveis = comFiltroEcommerce(me?.branches ?? [])
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const {
        data: estoqueListas,
        loading: loadingEstoqueListas,
        erro: erroEstoqueListas,
    } = useApi<GestaoEstoqueListasData>(
        '/comercial/estoque-listas',
        {
            filiais: filiaisAtivas.join(','),
            diasComprar,
            diasExcesso,
            diasInativar,
            divisoes: mercadologico.divisoes.join(','),
            secoes: mercadologico.secoes.join(','),
            grupos: mercadologico.grupos.join(','),
        },
        habilitado
    )

    const comprarUrgente = estoqueListas?.comprarUrgente ?? []
    const excessoEstoque = estoqueListas?.excessoEstoque ?? []
    const candidatosInativar = estoqueListas?.inativar ?? []

    const abasComContagem = ABAS.map((a) => ({
        ...a,
        label: `${a.label} (${a.id === 'comprar' ? comprarUrgente.length : a.id === 'excesso' ? excessoEstoque.length : candidatosInativar.length})`,
    }))

    return (
        <>
            <FiltersMenu>
                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Filiais</span>
                    <FilialMultiFilter branches={branchesDisponiveis} selected={filiaisAtivas} onChange={setSelecionadas} />
                </div>
                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Divisão / Seção / Grupo</span>
                    <MercadologicoFilter selecao={mercadologico} onChange={setMercadologico} />
                </div>
                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Comprar urgente: cobertura menor que (dias)</span>
                    <input type="number" min={1} value={diasComprar} onChange={(e) => setDiasComprar(e.target.value)} className={inputClass} />
                </div>
                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Excesso: cobertura maior que (dias)</span>
                    <input type="number" min={1} value={diasExcesso} onChange={(e) => setDiasExcesso(e.target.value)} className={inputClass} />
                </div>
                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Inativar: sem venda/compra há (dias)</span>
                    <input type="number" min={1} value={diasInativar} onChange={(e) => setDiasInativar(e.target.value)} className={inputClass} />
                </div>
            </FiltersMenu>

            {erroEstoqueListas && <p className="mb-4 text-sm text-red-base">{erroEstoqueListas}</p>}

            <TabButtons abas={abasComContagem} ativa={aba} onChange={(id) => setAba(id as AbaId)} />

            <div className="flex max-h-[500px] flex-col gap-3 overflow-y-auto lg:hidden">
                {loadingEstoqueListas && (
                    <div className="flex justify-center py-10">
                        <Spinner className="h-5 w-5" />
                    </div>
                )}

                {!loadingEstoqueListas && aba === 'comprar' && comprarUrgente.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-dark dark:text-dark-text-muted">Nenhum produto com estoque crítico.</p>
                )}
                {!loadingEstoqueListas &&
                    aba === 'comprar' &&
                    comprarUrgente.map((row, i) => (
                        <MobileCard key={i}>
                            <p className="truncate font-medium text-gray-text dark:text-dark-text">{row.DESCRICAOPRODUTO}</p>
                            <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                            <p className="text-xs text-gray-dark dark:text-dark-text-muted">
                                {row.NOME_EMPRESA} · {row.DESCRSECAO}
                            </p>
                            <div className="mt-2 flex flex-col divide-y divide-gray-base/10 dark:divide-dark-border/60">
                                <CardField label="Estoque" value={formatNumber(row.QTDATUALESTOQUE)} />
                                <CardField label="Dias" value={formatNumber(row.DIAS_COBERTURA)} valueClassName="text-red-base" />
                            </div>
                        </MobileCard>
                    ))}

                {!loadingEstoqueListas && aba === 'excesso' && excessoEstoque.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-dark dark:text-dark-text-muted">Nenhum produto com excesso de estoque.</p>
                )}
                {!loadingEstoqueListas &&
                    aba === 'excesso' &&
                    excessoEstoque.map((row, i) => (
                        <MobileCard key={i}>
                            <p className="truncate font-medium text-gray-text dark:text-dark-text">{row.DESCRICAOPRODUTO}</p>
                            <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                            <p className="text-xs text-gray-dark dark:text-dark-text-muted">
                                {row.NOME_EMPRESA} · {row.DESCRSECAO}
                            </p>
                            <div className="mt-2 flex flex-col divide-y divide-gray-base/10 dark:divide-dark-border/60">
                                <CardField label="Valor" value={formatCurrency(row.VALATUALESTOQUE)} />
                                <CardField label="Dias" value={formatNumber(row.DIAS_COBERTURA)} valueClassName="text-orange-base" />
                            </div>
                        </MobileCard>
                    ))}

                {!loadingEstoqueListas && aba === 'inativar' && candidatosInativar.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-dark dark:text-dark-text-muted">Nenhum candidato a inativação.</p>
                )}
                {!loadingEstoqueListas &&
                    aba === 'inativar' &&
                    candidatosInativar.map((row, i) => (
                        <MobileCard key={i}>
                            <p className="truncate font-medium text-gray-text dark:text-dark-text">{row.DESCRICAOPRODUTO}</p>
                            <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                            <p className="text-xs text-gray-dark dark:text-dark-text-muted">
                                {row.NOME_EMPRESA} · {row.DESCRSECAO ?? '—'}
                            </p>
                            <div className="mt-2 flex flex-col divide-y divide-gray-base/10 dark:divide-dark-border/60">
                                <CardField label="Valor" value={formatCurrency(row.VALATUALESTOQUE)} />
                                <CardField
                                    label="Última venda"
                                    value={row.DTULTIMAVENDA ? formatDate(row.DTULTIMAVENDA) : 'Nunca'}
                                    valueClassName="font-normal text-gray-dark dark:text-dark-text-muted"
                                />
                            </div>
                        </MobileCard>
                    ))}
            </div>

            <div className="hidden max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm lg:block dark:border-dark-border dark:bg-dark-surface">
                {aba === 'comprar' && (
                    <table className="w-full min-w-[500px] text-sm">
                        <thead className="sticky top-0 bg-white dark:bg-dark-surface">
                            <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                                <th className="px-4 py-3">Produto</th>
                                <th className="px-4 py-3 text-right">Estoque</th>
                                <th className="px-4 py-3 text-right">Dias</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingEstoqueListas && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center">
                                        <Spinner className="mx-auto h-5 w-5" />
                                    </td>
                                </tr>
                            )}
                            {!loadingEstoqueListas &&
                                comprarUrgente.map((row, i) => (
                                    <tr
                                        key={i}
                                        className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                    >
                                        <td className="px-4 py-2">
                                            <p className="truncate">{row.DESCRICAOPRODUTO}</p>
                                            <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                                            <p className="text-xs text-gray-dark dark:text-dark-text-muted">
                                                {row.NOME_EMPRESA} · {row.DESCRSECAO}
                                            </p>
                                        </td>
                                        <td className="px-4 py-2 text-right">{formatNumber(row.QTDATUALESTOQUE)}</td>
                                        <td className="px-4 py-2 text-right font-medium text-red-base">{formatNumber(row.DIAS_COBERTURA)}</td>
                                    </tr>
                                ))}
                            {!loadingEstoqueListas && comprarUrgente.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                        Nenhum produto com estoque crítico.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {aba === 'excesso' && (
                    <table className="w-full min-w-[500px] text-sm">
                        <thead className="sticky top-0 bg-white dark:bg-dark-surface">
                            <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                                <th className="px-4 py-3">Produto</th>
                                <th className="px-4 py-3 text-right">Valor</th>
                                <th className="px-4 py-3 text-right">Dias</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingEstoqueListas && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center">
                                        <Spinner className="mx-auto h-5 w-5" />
                                    </td>
                                </tr>
                            )}
                            {!loadingEstoqueListas &&
                                excessoEstoque.map((row, i) => (
                                    <tr
                                        key={i}
                                        className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                    >
                                        <td className="px-4 py-2">
                                            <p className="truncate">{row.DESCRICAOPRODUTO}</p>
                                            <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                                            <p className="text-xs text-gray-dark dark:text-dark-text-muted">
                                                {row.NOME_EMPRESA} · {row.DESCRSECAO}
                                            </p>
                                        </td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(row.VALATUALESTOQUE)}</td>
                                        <td className="px-4 py-2 text-right font-medium text-orange-base">
                                            {formatNumber(row.DIAS_COBERTURA)}
                                        </td>
                                    </tr>
                                ))}
                            {!loadingEstoqueListas && excessoEstoque.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                        Nenhum produto com excesso de estoque.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {aba === 'inativar' && (
                    <table className="w-full min-w-[500px] text-sm">
                        <thead className="sticky top-0 bg-white dark:bg-dark-surface">
                            <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                                <th className="px-4 py-3">Produto</th>
                                <th className="px-4 py-3 text-right">Valor</th>
                                <th className="px-4 py-3">Última venda</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingEstoqueListas && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center">
                                        <Spinner className="mx-auto h-5 w-5" />
                                    </td>
                                </tr>
                            )}
                            {!loadingEstoqueListas &&
                                candidatosInativar.map((row, i) => (
                                    <tr
                                        key={i}
                                        className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                    >
                                        <td className="px-4 py-2">
                                            <p className="truncate">{row.DESCRICAOPRODUTO}</p>
                                            <ProdutoCodigos idsubproduto={row.IDSUBPRODUTO} idcodbarprod={row.IDCODBARPROD} />
                                            <p className="text-xs text-gray-dark dark:text-dark-text-muted">
                                                {row.NOME_EMPRESA} · {row.DESCRSECAO ?? '—'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(row.VALATUALESTOQUE)}</td>
                                        <td className="px-4 py-2 text-xs text-gray-dark dark:text-dark-text-muted">
                                            {row.DTULTIMAVENDA ? formatDate(row.DTULTIMAVENDA) : 'Nunca'}
                                        </td>
                                    </tr>
                                ))}
                            {!loadingEstoqueListas && candidatosInativar.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                        Nenhum candidato a inativação.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    )
}
