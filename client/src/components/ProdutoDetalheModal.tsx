import type { ReactNode } from 'react'
import Modal from './Modal'
import Spinner from './Spinner'
import { useApi } from '../hooks/useApi'
import { nomeFilial } from '../constants/filiais'
import type { ProdutoDetalhe } from '../types/comercial'

type ProdutoDetalheModalProps = {
    idsubproduto: number
    onClose: () => void
}

function formatarMoeda(valor: number | null | undefined) {
    if (valor == null) return '—'
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(valor: string | null) {
    if (!valor) return '—'
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return '—'
    return data.toLocaleDateString('pt-BR')
}

function formatarPercentual(valor: number | null | undefined) {
    if (valor == null) return '—'
    return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

const thClass = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'
const tdClass = 'px-3 py-2 text-gray-text dark:text-dark-text'

export default function ProdutoDetalheModal({ idsubproduto, onClose }: ProdutoDetalheModalProps) {
    const { data, loading, erro } = useApi<ProdutoDetalhe>(`/catalogo/produto/${idsubproduto}`, {}, true)

    return (
        <Modal
            titulo={data ? `${data.cadastro.IDSUBPRODUTO} - ${data.cadastro.DESCRICAOPRODUTO}` : 'Detalhes do produto'}
            subtitulo="Informações completas vindas do CISS."
            onClose={onClose}
            largura="xl"
        >
            {loading && (
                <div className="flex justify-center py-10">
                    <Spinner className="h-6 w-6" />
                </div>
            )}

            {erro && <p className="text-sm text-red-base">{erro}</p>}

            {!loading && data && (
                <div className="flex flex-col gap-6">
                    <section>
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Cadastro
                        </h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                            <Campo label="Fabricante" valor={data.cadastro.FABRICANTE ?? '—'} />
                            <Campo label="Referência" valor={data.cadastro.REFERENCIA ?? '—'} />
                            <Campo
                                label="Código de barras"
                                valor={data.cadastro.IDCODBARPROD != null ? String(data.cadastro.IDCODBARPROD) : '—'}
                            />
                            <Campo label="Unidade" valor={data.cadastro.EMBALAGEMSAIDA ?? '—'} />
                            <Campo label="Modelo" valor={data.cadastro.MODELO ?? '—'} />
                            <Campo
                                label="Peso líquido / bruto"
                                valor={`${data.cadastro.PESOLIQUIDO ?? '—'} / ${data.cadastro.PESOBRUTO ?? '—'}`}
                            />
                            <Campo label="NCM" valor={data.cadastro.NCM ?? '—'} />
                            <Campo label="Classificação fiscal" valor={data.cadastro.CLASSFISCAL ?? '—'} />
                            <Campo label="Cadastrado em" valor={formatarData(data.cadastro.DTCADASTRO)} />
                            <Campo label="Divisão" valor={data.cadastro.DESCRDIVISAO ?? '—'} />
                            <Campo label="Seção" valor={data.cadastro.DESCRSECAO ?? '—'} />
                            <Campo label="Grupo" valor={data.cadastro.DESCRGRUPO ?? '—'} />
                            <Campo label="Subgrupo" valor={data.cadastro.DESCRSUBGRUPO ?? '—'} />
                            <Campo
                                label="Status"
                                valor={
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            data.cadastro.FLAGINATIVO === 'F'
                                                ? 'bg-green-base/10 text-green-base'
                                                : 'bg-red-base/10 text-red-base'
                                        }`}
                                    >
                                        {data.cadastro.FLAGINATIVO === 'F' ? 'Ativo' : 'Inativo'}
                                    </span>
                                }
                            />
                            <Campo
                                label="Compra"
                                valor={
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            data.cadastro.FLAGINATIVOCOMPRA === 'F'
                                                ? 'bg-green-base/10 text-green-base'
                                                : 'bg-red-base/10 text-red-base'
                                        }`}
                                    >
                                        {data.cadastro.FLAGINATIVOCOMPRA === 'F' ? 'Liberada' : 'Bloqueada'}
                                    </span>
                                }
                            />
                        </div>
                    </section>

                    <section>
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Estoque e preço por filial
                        </h3>
                        <TabelaFilial>
                            <thead>
                                <tr className="border-b border-gray-base/30 dark:border-dark-border">
                                    <th className={thClass}>Filial</th>
                                    <th className={`${thClass} text-right`}>Estoque</th>
                                    <th className={`${thClass} text-right`}>Valor em estoque</th>
                                    <th className={`${thClass} text-right`}>Preço de venda</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.estoquePreco.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-4 text-center text-gray-dark dark:text-dark-text-muted">
                                            Sem dados de estoque/preço.
                                        </td>
                                    </tr>
                                )}
                                {data.estoquePreco.map((row) => (
                                    <tr key={row.IDEMPRESA} className="border-b border-gray-base/10 last:border-0 dark:border-dark-border/60">
                                        <td className={tdClass}>{nomeFilial(row.IDEMPRESA)}</td>
                                        <td className={`${tdClass} text-right`}>{row.QTDATUALESTOQUE ?? '—'}</td>
                                        <td className={`${tdClass} text-right`}>{formatarMoeda(row.VALATUALESTOQUE)}</td>
                                        <td className={`${tdClass} text-right`}>{formatarMoeda(row.VALPRECOVENDA)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </TabelaFilial>
                    </section>

                    <section>
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Tributação por filial
                        </h3>
                        <TabelaFilial>
                            <thead>
                                <tr className="border-b border-gray-base/30 dark:border-dark-border">
                                    <th className={thClass}>Filial</th>
                                    <th className={thClass}>UF origem</th>
                                    <th className={`${thClass} text-right`}>% ICMS</th>
                                    <th className={`${thClass} text-right`}>% ICMS Subst.</th>
                                    <th className={thClass}>Situação tributária</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.tributacao.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-4 text-center text-gray-dark dark:text-dark-text-muted">
                                            Sem dados de tributação.
                                        </td>
                                    </tr>
                                )}
                                {data.tributacao.map((row) => (
                                    <tr key={row.IDEMPRESA} className="border-b border-gray-base/10 last:border-0 dark:border-dark-border/60">
                                        <td className={tdClass}>{nomeFilial(row.IDEMPRESA)}</td>
                                        <td className={tdClass}>{row.UFORIGEM}</td>
                                        <td className={`${tdClass} text-right`}>{formatarPercentual(row.PERICMSAI)}</td>
                                        <td className={`${tdClass} text-right`}>{formatarPercentual(row.PERICMSUBST)}</td>
                                        <td className={tdClass}>{row.DESCRSITTRIBUTARIA ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </TabelaFilial>
                    </section>

                    <section>
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Venda e margem (últimos 90 dias)
                        </h3>
                        <TabelaFilial>
                            <thead>
                                <tr className="border-b border-gray-base/30 dark:border-dark-border">
                                    <th className={thClass}>Filial</th>
                                    <th className={`${thClass} text-right`}>Venda</th>
                                    <th className={`${thClass} text-right`}>Lucro</th>
                                    <th className={`${thClass} text-right`}>Margem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.vendaMargem.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-4 text-center text-gray-dark dark:text-dark-text-muted">
                                            Sem vendas no período.
                                        </td>
                                    </tr>
                                )}
                                {data.vendaMargem.map((row) => (
                                    <tr key={row.IDEMPRESA} className="border-b border-gray-base/10 last:border-0 dark:border-dark-border/60">
                                        <td className={tdClass}>{nomeFilial(row.IDEMPRESA)}</td>
                                        <td className={`${tdClass} text-right`}>{formatarMoeda(row.VENDA)}</td>
                                        <td className={`${tdClass} text-right`}>{formatarMoeda(row.LUCRO)}</td>
                                        <td className={`${tdClass} text-right`}>
                                            {row.VENDA > 0 ? formatarPercentual((row.LUCRO / row.VENDA) * 100) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </TabelaFilial>
                    </section>
                </div>
            )}
        </Modal>
    )
}

function Campo({ label, valor }: { label: string; valor: ReactNode }) {
    return (
        <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                {label}
            </span>
            <span className="text-gray-text dark:text-dark-text">{valor}</span>
        </div>
    )
}

function TabelaFilial({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-base/30 dark:border-dark-border">
            <table className="w-full min-w-[500px] text-sm">{children}</table>
        </div>
    )
}
