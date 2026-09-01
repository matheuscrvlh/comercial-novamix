import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageShell from '../components/PageShell'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DateRangeFilter from '../components/DateRangeFilter'
import Spinner from '../components/Spinner'
import RankingList from '../components/RankingList'
import TabButtons from '../components/TabButtons'
import PromocoesConteudo from '../components/comercial/PromocoesConteudo'
import { MobileCard, CardField } from '../components/MobileCard'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { formatCurrency, formatPercent } from '../lib/format'
import { getPresetRange } from '../lib/date'
import { comFiltroEcommerce } from '../constants/filiais'
import type { OperacionalData, VendaMetaSecaoRow } from '../types/comercial'

function mesanoDe(data: string) {
    return data.replace(/-\d{2}$/, '').replace('-', '')
}

function pct(valor: number, meta: number) {
    if (meta <= 0) return null
    return valor / meta
}

type CelulaValorMetaProps = {
    valor: number
    meta: number
    formatValor: (n: number) => string
    percentual?: number | null
    menorEhMelhor?: boolean
}

/**
 * Junta valor atual + meta + % na mesma celula (valor em cima, meta e % embaixo,
 * cor indica se bateu a meta) em vez de 2-3 colunas separadas pra cada metrica -
 * mesma informacao, tabela bem mais enxuta.
 */
function CelulaValorMeta({ valor, meta, formatValor, percentual, menorEhMelhor = false }: CelulaValorMetaProps) {
    const temMeta = meta > 0
    const bateuMeta = temMeta && (menorEhMelhor ? valor <= meta : valor >= meta)
    const corValor = !temMeta
        ? 'text-gray-text dark:text-dark-text'
        : bateuMeta
          ? 'text-green-base'
          : 'text-red-base'

    return (
        <td className="px-4 py-2.5 text-right">
            <div className={`font-medium ${corValor}`}>{formatValor(valor)}</div>
            {temMeta && (
                <div className="text-xs text-gray-dark dark:text-dark-text-muted">
                    Meta {formatValor(meta)}
                    {percentual !== null && percentual !== undefined && ` · ${formatPercent(percentual)}`}
                </div>
            )}
        </td>
    )
}

function CardValorMeta({ label, valor, meta, formatValor, percentual, menorEhMelhor = false }: CelulaValorMetaProps & { label: string }) {
    const temMeta = meta > 0
    const bateuMeta = temMeta && (menorEhMelhor ? valor <= meta : valor >= meta)
    const corValor = !temMeta ? 'text-gray-text dark:text-dark-text' : bateuMeta ? 'text-green-base' : 'text-red-base'

    return (
        <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-xs text-gray-dark dark:text-dark-text-muted">{label}</span>
            <span className="text-right">
                <span className={`text-sm font-medium ${corValor}`}>{formatValor(valor)}</span>
                {temMeta && (
                    <span className="block text-xs text-gray-dark dark:text-dark-text-muted">
                        Meta {formatValor(meta)}
                        {percentual !== null && percentual !== undefined && ` · ${formatPercent(percentual)}`}
                    </span>
                )}
            </span>
        </div>
    )
}

const ABAS = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'promocoes', label: 'Promoções' },
] as const

type AbaId = (typeof ABAS)[number]['id']

export default function GestaoComercial() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [searchParams] = useSearchParams()

    const abaInicial = searchParams.get('aba') === 'promocoes' ? 'promocoes' : 'visao-geral'
    const [aba, setAba] = useState<AbaId>(abaInicial)
    const [inicio, setInicio] = useState(() => getPresetRange('mes').inicio)
    const [fim, setFim] = useState(() => getPresetRange('mes').fim)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = comFiltroEcommerce(me?.branches ?? [])
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis
    const mesano = mesanoDe(fim)

    const habilitado = me !== null && me.isAdmin && aba === 'visao-geral'

    const { data, loading, erro } = useApi<VendaMetaSecaoRow[]>(
        '/comercial/venda-meta-secao',
        { inicio, fim, filiais: filiaisAtivas.join(','), mesano },
        habilitado
    )

    const {
        data: operacional,
        loading: loadingOperacional,
        erro: erroOperacional,
    } = useApi<OperacionalData>('/comercial/operacional', { inicio, fim, filiais: filiaisAtivas.join(',') }, habilitado)

    const linhas = data ?? []

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Gestão Comercial"
            subtitulo="Venda, margem, compra e estoque por seção, comparados à meta do mês."
            filtros={
                aba === 'visao-geral' ? (
                    <FiltersMenu>
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                                Filiais
                            </span>
                            <FilialMultiFilter branches={branchesDisponiveis} selected={filiaisAtivas} onChange={setSelecionadas} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                                Período
                            </span>
                            <DateRangeFilter inicio={inicio} fim={fim} onChangeInicio={setInicio} onChangeFim={setFim} />
                        </div>
                    </FiltersMenu>
                ) : undefined
            }
        >
            <TabButtons abas={ABAS} ativa={aba} onChange={(id) => setAba(id as AbaId)} />

            {aba === 'promocoes' && <PromocoesConteudo />}

            {aba === 'visao-geral' && (
                <>
                    {erro && <p className="text-sm text-red-base mb-4">{erro}</p>}

                    {loading && (
                        <div className="flex justify-center py-10 lg:hidden">
                            <Spinner className="h-5 w-5" />
                        </div>
                    )}

                    {!loading && linhas.length === 0 && (
                        <p className="py-6 text-center text-sm text-gray-dark dark:text-dark-text-muted lg:hidden">
                            Nenhum dado para o período selecionado.
                        </p>
                    )}

                    {!loading && linhas.length > 0 && (
                        <div className="flex flex-col gap-3 lg:hidden">
                            {linhas.map((row) => {
                                const margemAtual = row.VENDA_ATUAL !== 0 ? row.LUCRO_ATUAL / row.VENDA_ATUAL : 0
                                const percMeta = pct(row.VENDA_ATUAL, row.META_VENDA)

                                return (
                                    <MobileCard key={row.IDSECAO}>
                                        <p className="font-medium text-gray-text dark:text-dark-text">{row.DESCRSECAO}</p>
                                        <div className="mt-2 flex flex-col divide-y divide-gray-base/10 dark:divide-dark-border/60">
                                            <CardField label="Venda Dia" value={formatCurrency(row.VENDA_DIA)} />
                                            <CardValorMeta
                                                label="Venda (vs. Meta)"
                                                valor={row.VENDA_ATUAL}
                                                meta={row.META_VENDA}
                                                formatValor={formatCurrency}
                                                percentual={percMeta}
                                            />
                                            <CardField
                                                label="Ano Anterior"
                                                value={
                                                    <>
                                                        {formatCurrency(row.VENDA_ANO_ANTERIOR)}
                                                        <span
                                                            className={`block text-xs font-normal ${
                                                                row.VARIACAO_ANO_PCT === null
                                                                    ? 'text-gray-dark dark:text-dark-text-muted'
                                                                    : row.VARIACAO_ANO_PCT >= 0
                                                                      ? 'text-green-base'
                                                                      : 'text-red-base'
                                                            }`}
                                                        >
                                                            {row.VARIACAO_ANO_PCT === null ? '—' : formatPercent(row.VARIACAO_ANO_PCT)}
                                                        </span>
                                                    </>
                                                }
                                            />
                                            <CardField label="Projeção Fim de Mês" value={formatCurrency(row.PROJECAO_VENDA)} />
                                            <CardValorMeta
                                                label="Margem (vs. Meta)"
                                                valor={margemAtual}
                                                meta={row.META_MARGEM_PCT / 100}
                                                formatValor={formatPercent}
                                            />
                                            <CardValorMeta
                                                label="Compra (vs. Meta)"
                                                valor={row.COMPRA_ATUAL}
                                                meta={row.META_COMPRA}
                                                formatValor={formatCurrency}
                                                percentual={row.PERC_COMPRA_VENDA}
                                            />
                                            <CardField label="Compra Anual" value={formatCurrency(row.COMPRA_ANUAL)} />
                                            <CardValorMeta
                                                label="Avaria (vs. Meta)"
                                                valor={row.AVARIA_ATUAL}
                                                meta={row.META_AVARIA}
                                                formatValor={formatCurrency}
                                                menorEhMelhor
                                            />
                                            <CardField label="Estoque Atual" value={formatCurrency(row.VALOR_ESTOQUE)} />
                                        </div>
                                    </MobileCard>
                                )
                            })}
                        </div>
                    )}

                    <div className="hidden overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm lg:block dark:border-dark-border dark:bg-dark-surface">
                        <table className="w-full min-w-[1250px] text-sm">
                            <thead>
                                <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                                    <th className="px-4 py-3">Seção</th>
                                    <th className="px-4 py-3 text-right">Venda Dia</th>
                                    <th className="px-4 py-3 text-right">Venda (vs. Meta)</th>
                                    <th className="px-4 py-3 text-right">Ano Anterior</th>
                                    <th className="px-4 py-3 text-right">Projeção Fim de Mês</th>
                                    <th className="px-4 py-3 text-right">Margem (vs. Meta)</th>
                                    <th className="px-4 py-3 text-right">Compra (vs. Meta)</th>
                                    <th className="px-4 py-3 text-right">Compra Anual</th>
                                    <th className="px-4 py-3 text-right">Avaria (vs. Meta)</th>
                                    <th className="px-4 py-3 text-right">Estoque Atual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center">
                                            <Spinner className="mx-auto h-5 w-5" />
                                        </td>
                                    </tr>
                                )}

                                {!loading &&
                                    linhas.map((row) => {
                                        const margemAtual = row.VENDA_ATUAL !== 0 ? row.LUCRO_ATUAL / row.VENDA_ATUAL : 0
                                        const percMeta = pct(row.VENDA_ATUAL, row.META_VENDA)

                                        return (
                                            <tr
                                                key={row.IDSECAO}
                                                className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                            >
                                                <td className="px-4 py-2.5 font-medium">{row.DESCRSECAO}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-dark dark:text-dark-text-muted">
                                                    {formatCurrency(row.VENDA_DIA)}
                                                </td>
                                                <CelulaValorMeta
                                                    valor={row.VENDA_ATUAL}
                                                    meta={row.META_VENDA}
                                                    formatValor={formatCurrency}
                                                    percentual={percMeta}
                                                />
                                                <td className="px-4 py-2.5 text-right">
                                                    <div className="text-gray-dark dark:text-dark-text-muted">
                                                        {formatCurrency(row.VENDA_ANO_ANTERIOR)}
                                                    </div>
                                                    <div
                                                        className={`text-xs font-medium ${
                                                            row.VARIACAO_ANO_PCT === null
                                                                ? 'text-gray-dark dark:text-dark-text-muted'
                                                                : row.VARIACAO_ANO_PCT >= 0
                                                                  ? 'text-green-base'
                                                                  : 'text-red-base'
                                                        }`}
                                                    >
                                                        {row.VARIACAO_ANO_PCT === null ? '—' : formatPercent(row.VARIACAO_ANO_PCT)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-right">{formatCurrency(row.PROJECAO_VENDA)}</td>
                                                <CelulaValorMeta
                                                    valor={margemAtual}
                                                    meta={row.META_MARGEM_PCT / 100}
                                                    formatValor={formatPercent}
                                                />
                                                <CelulaValorMeta
                                                    valor={row.COMPRA_ATUAL}
                                                    meta={row.META_COMPRA}
                                                    formatValor={formatCurrency}
                                                    percentual={row.PERC_COMPRA_VENDA}
                                                />
                                                <td className="px-4 py-2.5 text-right text-gray-dark dark:text-dark-text-muted">
                                                    {formatCurrency(row.COMPRA_ANUAL)}
                                                </td>
                                                <CelulaValorMeta
                                                    valor={row.AVARIA_ATUAL}
                                                    meta={row.META_AVARIA}
                                                    formatValor={formatCurrency}
                                                    menorEhMelhor
                                                />
                                                <td className="px-4 py-2.5 text-right">{formatCurrency(row.VALOR_ESTOQUE)}</td>
                                            </tr>
                                        )
                                    })}

                                {!loading && linhas.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                            Nenhum dado para o período selecionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {erroOperacional && <p className="text-sm text-red-base mt-4">{erroOperacional}</p>}

                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <RankingList
                            titulo="Perdas por fornecedor"
                            loading={loadingOperacional}
                            itens={(operacional?.perdas ?? []).map((p) => ({
                                label: p.FORNECEDOR,
                                quantidade: p.QUANTIDADE,
                                valor: p.VALOR,
                            }))}
                        />
                        <RankingList
                            titulo="Avaria de estoque por fabricante"
                            loading={loadingOperacional}
                            itens={(operacional?.avaria ?? []).map((a) => ({
                                label: a.FABRICANTE,
                                quantidade: a.QUANTIDADE,
                                valor: a.VALOR,
                            }))}
                        />
                        <RankingList
                            titulo="Pedidos de compra pendentes"
                            loading={loadingOperacional}
                            itens={(operacional?.pedidosPendentes ?? []).map((p) => ({
                                label: `${p.FORNECEDOR} (${p.QTD_PEDIDOS} pedido${p.QTD_PEDIDOS === 1 ? '' : 's'})`,
                                valor: p.VALOR_PENDENTE,
                            }))}
                        />
                    </div>
                </>
            )}
        </PageShell>
    )
}
