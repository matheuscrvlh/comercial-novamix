import { useState } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DataTable from '../components/DataTable'
import BarList from '../components/BarList'
import { useMe } from '../hooks/useMe'
import { useFinanceiro } from '../hooks/useFinanceiro'
import { formatCurrency, formatPercent, formatNumber, formatDate } from '../lib/format'
import type {
    ConciliacaoBancoResponse,
    ConciliacaoCartaoResponse,
    ConciliacaoContabilResponse,
} from '../types/financeiro'

type Aba = 'visao' | 'banco' | 'cartao' | 'contabil' | 'acao'

const ABAS: { id: Aba; label: string }[] = [
    { id: 'visao', label: 'Visão Geral' },
    { id: 'banco', label: 'Conciliação Bancária' },
    { id: 'cartao', label: 'Conciliação de Cartão' },
    { id: 'contabil', label: 'Conciliação Contábil' },
    { id: 'acao', label: 'Plano de Ação' },
]

type StatusFrente = 'ok' | 'pend' | 'atraso' | 'erro'

const BADGE_LABEL: Record<StatusFrente, string> = {
    ok: 'Conciliado',
    pend: 'Pendente',
    atraso: 'Em atraso',
    erro: 'Não bate',
}

const BADGE_CLASS: Record<StatusFrente, string> = {
    ok: 'bg-green-base/15 text-green-base',
    pend: 'bg-orange-base/15 text-orange-base',
    atraso: 'bg-orange-base/15 text-orange-base',
    erro: 'bg-red-base/15 text-red-base',
}

function Badge({ status }: { status: StatusFrente }) {
    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${BADGE_CLASS[status]}`}>
            {BADGE_LABEL[status]}
        </span>
    )
}

function Kpi({
    titulo,
    valor,
    sub,
    loading,
    negativo,
}: {
    titulo: string
    valor: string
    sub?: string
    loading?: boolean
    negativo?: boolean
}) {
    return (
        <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
            <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                {titulo}
            </span>
            <div
                className={`mt-2 text-xl font-semibold ${negativo ? 'text-red-base' : 'text-gray-text dark:text-dark-text'}`}
            >
                {loading ? <Spinner className='h-5 w-5' /> : valor}
            </div>
            {sub && <span className='text-xs text-gray-dark dark:text-dark-text-muted'>{sub}</span>}
        </div>
    )
}

const ROTINA = [
    ['Diária', 'Extrato bancário não conciliado do dia', "SELECT COUNT(*), SUM(VALORCREDITO), SUM(VALORDEBITO) FROM DBA.EXTRATO_BANCARIO WHERE FLAGCONCILIADO='F' AND DTMOVIMENTO >= CURRENT DATE - 7 DAYS"],
    ['Semanal', 'Repasses de cartão vencidos há mais de 30 dias', "SELECT VARCHAR_FORMAT(DTMOVIMENTO,'YYYY-MM'), COUNT(*), SUM(VALLIQUIDOESPERADO) FROM DBA.CLW_RETORNO_CONTAS_RECEBER WHERE DTPAGAMENTOEFETIVADO IS NULL AND DTMOVIMENTO < CURRENT DATE - 30 DAYS GROUP BY 1"],
    ['Mensal, no fechamento', 'Lotes sem contrapartida no razão', "SELECT IDPLANILHA, SUM(CASE WHEN TIPONATUREZALCTO='D' THEN VALLANCAMENTO ELSE -VALLANCAMENTO END) FROM DBA.CONTABIL_MOVIMENTO WHERE DTMOVIMENTO BETWEEN inicio AND fim GROUP BY IDPLANILHA HAVING ABS(SUM(...)) > 0.005"],
    ['Mensal, no fechamento', 'Saldo líquido intercompany (contas 115 x 212)', "SELECT SUM(VALSALDOATUAL) FROM saldos WHERE CLASSIFICACAO LIKE '115%' OR CLASSIFICACAO LIKE '212%' -- deve dar perto de zero"],
    ['Mensal', 'Contas a classificar com saldo', "SELECT CLASSIFICACAO, DESCRCTACONTABIL, saldo FROM plano WHERE DESCRCTACONTABIL LIKE '%CLASSIFICAR%' AND saldo <> 0"],
]

export default function Conciliacoes() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const habilitado = me !== null && me.isAdmin

    const [aba, setAba] = useState<Aba>('visao')
    const [escopoInicio, setEscopoInicio] = useState('2025-01-01')
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = me ? me.branches : []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const banco = useFinanceiro<ConciliacaoBancoResponse>(
        '/financeiro/conciliacao-banco',
        { escopoInicio },
        habilitado
    )
    const cartao = useFinanceiro<ConciliacaoCartaoResponse>(
        '/financeiro/conciliacao-cartao',
        { escopoInicio },
        habilitado
    )
    const contabil = useFinanceiro<ConciliacaoContabilResponse>(
        '/financeiro/conciliacao-contabil',
        { escopoInicio, filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const loadingGeral = banco.loading || cartao.loading || contabil.loading

    // ---- Bancária ----
    const bResumo = banco.data?.resumo
    const bNaoConciliado = bResumo?.NAO_CONCILIADO ?? 0
    const bTotal = bResumo?.TOTAL ?? 0
    const bTaxa = bTotal > 0 ? (bTotal - bNaoConciliado) / bTotal : 0
    const bCred = bResumo?.CRED_NAO_CONCILIADO ?? 0
    const bDeb = bResumo?.DEB_NAO_CONCILIADO ?? 0
    const bPorConta = banco.data?.porConta ?? []
    const bPorMes = banco.data?.porMes ?? []

    // ---- Cartão ----
    const cResumo = cartao.data?.resumo
    const cReg = cResumo?.REG ?? 0
    const cCorretos = cResumo?.CORRETOS ?? 0
    const cTaxaCorreta = cReg > 0 ? cCorretos / cReg : 0
    const cEsperado = cResumo?.ESPERADO ?? 0
    const cPago = cResumo?.PAGO ?? 0
    const cDivergencia = cEsperado - cPago
    const cAging = cartao.data?.aging ?? []
    const cPendenteTotal = cAging.reduce((soma, row) => soma + Number(row.VALOR), 0)
    const cPendenteRegistros = cAging.reduce((soma, row) => soma + Number(row.REG), 0)
    const cVencido30 = cAging.filter((row) => row.DIAS > 30).reduce((soma, row) => soma + Number(row.VALOR), 0)
    const cVencido90 = cAging.filter((row) => row.DIAS > 90).reduce((soma, row) => soma + Number(row.VALOR), 0)

    // ---- Contábil ----
    const lotes = contabil.data?.lotes ?? []
    const lotesTotal = lotes.reduce((soma, row) => soma + Math.abs(Number(row.DIFERENCA)), 0)
    const intercompany = contabil.data?.intercompany
    const intercompanyLiquido = Math.abs((intercompany?.SALDO_EMITIDO ?? 0) - (intercompany?.SALDO_RECEBIDO ?? 0))
    const classificar = contabil.data?.classificar ?? []
    const classificarTotal = classificar.reduce((soma, row) => soma + Math.abs(Number(row.SALDO)), 0)

    // ---- Visão geral: frentes ----
    type Frente = { nome: string; base: string; reg: number; valor: number; status: StatusFrente; obs: string }
    const frentes: Frente[] = [
        {
            nome: 'Conciliação bancária',
            base: 'EXTRATO_BANCARIO',
            reg: bNaoConciliado,
            valor: bCred,
            status: bNaoConciliado > 0 ? 'atraso' : 'ok',
            obs: `${formatNumber(bNaoConciliado)} lançamentos sem conciliar desde ${formatDate(escopoInicio)}. Taxa de conciliação: ${formatPercent(bTaxa)}.`,
        },
        {
            nome: 'Conciliação de cartão — processo',
            base: 'CLW_RETORNO_CONTAS_RECEBER',
            reg: cReg,
            valor: Math.abs(cDivergencia),
            status: cTaxaCorreta >= 0.99 ? 'ok' : 'atraso',
            obs: `${formatPercent(cTaxaCorreta)} dos registros classificados como VALORES_CORRETOS. Divergência esperado x pago: ${formatCurrency(cDivergencia)}.`,
        },
        {
            nome: 'Repasse de cartão pendente',
            base: 'CLW_RETORNO_CONTAS_RECEBER',
            reg: cPendenteRegistros,
            valor: cPendenteTotal,
            status: cPendenteTotal > 0 ? 'pend' : 'ok',
            obs: `Vendas conciliadas ainda sem repasse efetivado. Vencido (+30 dias): ${formatCurrency(cVencido30)}.`,
        },
        {
            nome: 'Lotes sem contrapartida',
            base: 'CONTABIL_MOVIMENTO',
            reg: lotes.length,
            valor: lotesTotal,
            status: lotes.length > 0 ? 'erro' : 'ok',
            obs: `${lotes.length} lotes em que débito e crédito não fecham, no escopo desde ${formatDate(escopoInicio)}.`,
        },
        {
            nome: 'Intercompany (numerário entre lojas)',
            base: 'CONTABIL_SALDO — classificação 115 x 212',
            reg: 2,
            valor: intercompanyLiquido,
            status: intercompanyLiquido > 1000 ? 'erro' : 'ok',
            obs: `Saldo emitido ${formatCurrency(intercompany?.SALDO_EMITIDO ?? 0)} x recebido ${formatCurrency(intercompany?.SALDO_RECEBIDO ?? 0)} — deveria fechar em zero.`,
        },
        {
            nome: 'Contas a classificar',
            base: 'CONTABIL_SALDO',
            reg: classificar.length,
            valor: classificarTotal,
            status: classificar.length > 0 ? 'pend' : 'ok',
            obs: 'Saldo em conta de classificação/diferenças significa lançamento sem destino definido.',
        },
    ]

    const totalAberto = frentes.reduce((soma, f) => soma + f.valor, 0)
    const emErro = frentes.filter((f) => f.status === 'erro').reduce((soma, f) => soma + f.valor, 0)
    const emAtraso = frentes.filter((f) => f.status === 'atraso').reduce((soma, f) => soma + f.valor, 0)
    const emPendente = frentes.filter((f) => f.status === 'pend').reduce((soma, f) => soma + f.valor, 0)

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={habilitado}
            titulo='Conciliações'
            subtitulo='Bancária, cartão e contábil — dados ao vivo do ERP CISS.'
            filtros={
                <FiltersMenu>
                    <div className='flex flex-col gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                            Escopo — desde
                        </span>
                        <input
                            type='date'
                            value={escopoInicio}
                            onChange={(event) => setEscopoInicio(event.target.value)}
                            className='rounded-lg border border-gray-base/30 bg-white px-4 py-2 text-sm font-medium text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
                        />
                    </div>
                    <div className='flex flex-col gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                            Filiais (aba contábil)
                        </span>
                        <FilialMultiFilter branches={branchesDisponiveis} selected={filiaisAtivas} onChange={setSelecionadas} />
                    </div>
                </FiltersMenu>
            }
        >
            {(banco.erro || cartao.erro || contabil.erro) && (
                <div className='mb-6 rounded-lg px-4 py-3 text-sm font-medium bg-red-light/10 text-red-base'>
                    {banco.erro || cartao.erro || contabil.erro}
                </div>
            )}

            <div className='flex flex-wrap gap-2 border-b border-gray-base/30 dark:border-dark-border mb-6'>
                {ABAS.map((item) => (
                    <button
                        key={item.id}
                        type='button'
                        onClick={() => setAba(item.id)}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                            aba === item.id
                                ? 'border-orange-base text-orange-base'
                                : 'border-transparent text-gray-dark hover:text-gray-text dark:text-dark-text-muted dark:hover:text-dark-text'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {aba === 'visao' && (
                <div className='flex flex-col gap-6'>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                        <Kpi
                            titulo='Total em conciliação aberta'
                            valor={formatCurrency(totalAberto)}
                            sub='soma de todas as frentes'
                            loading={loadingGeral}
                            negativo
                        />
                        <Kpi
                            titulo='Não bate (erro apurado)'
                            valor={formatCurrency(emErro)}
                            sub={`${frentes.filter((f) => f.status === 'erro').length} frentes com divergência`}
                            loading={loadingGeral}
                            negativo={emErro > 0}
                        />
                        <Kpi titulo='Em atraso' valor={formatCurrency(emAtraso)} loading={loadingGeral} />
                        <Kpi titulo='Pendente no prazo' valor={formatCurrency(emPendente)} loading={loadingGeral} />
                    </div>

                    <DataTable
                        titulo='Todas as frentes de conciliação'
                        loading={loadingGeral}
                        rows={frentes.slice().sort((a, b) => b.valor - a.valor)}
                        columns={[
                            {
                                key: 'nome',
                                label: 'Frente',
                                render: (row) => row.nome,
                            },
                            { key: 'base', label: 'Fonte', render: (row) => row.base },
                            { key: 'reg', label: 'Registros', align: 'right', render: (row) => formatNumber(row.reg) },
                            {
                                key: 'valor',
                                label: 'Valor em aberto',
                                align: 'right',
                                render: (row) => formatCurrency(row.valor),
                                destaque: (row) => row.status === 'erro',
                            },
                            { key: 'obs', label: 'Observação', render: (row) => row.obs },
                        ]}
                    />
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 -mt-4'>
                        {frentes.map((f) => (
                            <div key={f.nome} className='flex items-center gap-2 text-xs'>
                                <Badge status={f.status} />
                                <span className='text-gray-dark dark:text-dark-text-muted truncate'>{f.nome}</span>
                            </div>
                        ))}
                    </div>

                    <BarList
                        titulo='Valor em aberto por frente'
                        items={frentes.map((f) => ({ label: f.nome, valor: f.valor }))}
                        formatValor={formatCurrency}
                        loading={loadingGeral}
                        cor='#c53434'
                    />
                </div>
            )}

            {aba === 'banco' && (
                <div className='flex flex-col gap-6'>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                        <Kpi
                            titulo='Lançamentos não conciliados'
                            valor={formatNumber(bNaoConciliado)}
                            sub={`${formatPercent(1 - bTaxa)} do extrato desde ${formatDate(escopoInicio)}`}
                            loading={banco.loading}
                        />
                        <Kpi titulo='Créditos não conciliados' valor={formatCurrency(bCred)} loading={banco.loading} negativo />
                        <Kpi titulo='Débitos não conciliados' valor={formatCurrency(bDeb)} loading={banco.loading} negativo />
                        <Kpi titulo='Taxa de conciliação' valor={formatPercent(bTaxa)} loading={banco.loading} />
                    </div>

                    <DataTable
                        titulo={`Não conciliado por mês — desde ${formatDate(escopoInicio)}`}
                        loading={banco.loading}
                        rows={bPorMes}
                        columns={[
                            { key: 'mes', label: 'Mês', render: (row) => row.MES },
                            { key: 'reg', label: 'Registros', align: 'right', render: (row) => formatNumber(row.REG) },
                            { key: 'cred', label: 'Créditos', align: 'right', render: (row) => formatCurrency(Number(row.CRED)) },
                            { key: 'deb', label: 'Débitos', align: 'right', render: (row) => formatCurrency(Number(row.DEB)) },
                        ]}
                    />

                    <DataTable
                        titulo='Não conciliado por conta bancária'
                        loading={banco.loading}
                        rows={bPorConta}
                        rodape='Linhas "sem vínculo" são contas bancárias sem conta contábil vinculada no plano de contas — não têm como conciliar automaticamente até o cadastro ser corrigido.'
                        columns={[
                            { key: 'cta', label: 'Conta contábil', render: (row) => row.CLASSIFICACAO },
                            { key: 'nome', label: 'Conta bancária', render: (row) => row.NOME },
                            { key: 'reg', label: 'Registros', align: 'right', render: (row) => formatNumber(row.REG) },
                            { key: 'cred', label: 'Créditos', align: 'right', render: (row) => formatCurrency(Number(row.CRED)) },
                            { key: 'deb', label: 'Débitos', align: 'right', render: (row) => formatCurrency(Number(row.DEB)) },
                            {
                                key: 'flag',
                                label: '',
                                render: (row) => (row.CLASSIFICACAO === 'sem vinculo' ? 'sem vínculo contábil' : ''),
                                destaque: (row) => row.CLASSIFICACAO === 'sem vinculo',
                            },
                        ]}
                    />
                </div>
            )}

            {aba === 'cartao' && (
                <div className='flex flex-col gap-6'>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                        <Kpi
                            titulo='Registros conciliados'
                            valor={formatPercent(cTaxaCorreta)}
                            sub={`${formatNumber(cReg)} registros classificados`}
                            loading={cartao.loading}
                        />
                        <Kpi
                            titulo='Divergência esperado x pago'
                            valor={formatCurrency(cDivergencia)}
                            sub={cEsperado > 0 ? formatPercent(Math.abs(cDivergencia) / cEsperado) + ' sobre o esperado' : ''}
                            loading={cartao.loading}
                        />
                        <Kpi titulo='Repasses pendentes' valor={formatCurrency(cPendenteTotal)} loading={cartao.loading} negativo />
                        <Kpi
                            titulo='Vencido (+30 dias)'
                            valor={formatCurrency(cVencido30)}
                            sub={`+90 dias: ${formatCurrency(cVencido90)}`}
                            loading={cartao.loading}
                            negativo
                        />
                    </div>

                    <DataTable
                        titulo='Repasses pendentes — por mês da venda'
                        loading={cartao.loading}
                        rows={cAging.slice().reverse()}
                        columns={[
                            { key: 'mes', label: 'Mês da venda', render: (row) => row.MES },
                            { key: 'reg', label: 'Registros', align: 'right', render: (row) => formatNumber(row.REG) },
                            { key: 'valor', label: 'Valor esperado', align: 'right', render: (row) => formatCurrency(Number(row.VALOR)) },
                            { key: 'dias', label: 'Dias em aberto (médio)', align: 'right', render: (row) => formatNumber(row.DIAS) },
                            {
                                key: 'status',
                                label: 'Status',
                                render: (row) => (row.DIAS > 90 ? 'Vencido +90d' : row.DIAS > 30 ? 'Vencido +30d' : 'No prazo'),
                                destaque: (row) => row.DIAS > 30,
                            },
                        ]}
                    />
                </div>
            )}

            {aba === 'contabil' && (
                <div className='flex flex-col gap-6'>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                        <Kpi
                            titulo='Lotes sem contrapartida'
                            valor={formatNumber(lotes.length)}
                            sub={formatCurrency(lotesTotal)}
                            loading={contabil.loading}
                            negativo={lotes.length > 0}
                        />
                        <Kpi
                            titulo='Intercompany — saldo líquido'
                            valor={formatCurrency(intercompanyLiquido)}
                            sub='deveria fechar em zero'
                            loading={contabil.loading}
                            negativo={intercompanyLiquido > 1000}
                        />
                        <Kpi
                            titulo='Contas a classificar em aberto'
                            valor={formatNumber(classificar.length)}
                            sub={formatCurrency(classificarTotal)}
                            loading={contabil.loading}
                        />
                    </div>

                    <DataTable
                        titulo={`Lotes com débito ≠ crédito — desde ${formatDate(escopoInicio)}`}
                        loading={contabil.loading}
                        rows={lotes}
                        rodape='Cada lote/documento contábil deve fechar com débito = crédito. Diferença ≠ 0 indica lançamento com só uma perna gravada.'
                        columns={[
                            { key: 'lote', label: 'Lote', render: (row) => formatNumber(row.IDPLANILHA) },
                            { key: 'dt', label: 'Data', render: (row) => formatDate(row.DTMOVIMENTO) },
                            {
                                key: 'empresa',
                                label: 'Empresa',
                                render: (row) => (row.N_EMPRESAS > 1 ? `${row.N_EMPRESAS} empresas` : `Empresa ${row.IDEMPRESA_REF}`),
                            },
                            {
                                key: 'diferenca',
                                label: 'Diferença',
                                align: 'right',
                                render: (row) => formatCurrency(Number(row.DIFERENCA)),
                                destaque: () => true,
                            },
                        ]}
                    />

                    <DataTable
                        titulo='Intercompany — numerário entre lojas (contas 115 x 212)'
                        loading={contabil.loading}
                        rows={[
                            { linha: 'Numerário emitido para lojas (115%)', valor: intercompany?.SALDO_EMITIDO ?? 0 },
                            { linha: 'Numerário recebido das lojas (212%)', valor: intercompany?.SALDO_RECEBIDO ?? 0 },
                            { linha: 'Saldo líquido (deveria ser zero)', valor: intercompanyLiquido, destaque: true },
                        ]}
                        columns={[
                            { key: 'linha', label: 'Linha', render: (row) => String(row.linha) },
                            {
                                key: 'valor',
                                label: 'Valor',
                                align: 'right',
                                render: (row) => formatCurrency(Number(row.valor)),
                                destaque: (row) => Boolean(row.destaque),
                            },
                        ]}
                    />

                    <DataTable
                        titulo='Contas a classificar / diferenças com saldo'
                        loading={contabil.loading}
                        rows={classificar}
                        rodape='Saldo em conta de classificação ou diferenças significa que o lançamento entrou, mas ninguém disse a que se refere.'
                        columns={[
                            { key: 'cta', label: 'Conta', render: (row) => row.CLASSIFICACAO },
                            { key: 'nome', label: 'Descrição', render: (row) => row.DESCRCTACONTABIL },
                            { key: 'empresa', label: 'Empresa', render: (row) => `Empresa ${row.IDEMPRESA}` },
                            { key: 'saldo', label: 'Saldo', align: 'right', render: (row) => formatCurrency(Number(row.SALDO)) },
                            { key: 'dt', label: 'Última movimentação', render: (row) => formatDate(row.DTMOVIMENTO) },
                        ]}
                    />
                </div>
            )}

            {aba === 'acao' && (
                <div className='flex flex-col gap-6'>
                    <div className='rounded-lg border border-orange-base/30 bg-orange-base/5 px-4 py-3 text-sm text-gray-text dark:text-dark-text'>
                        Sequência sugerida: feche primeiro o razão (lotes sem contrapartida e intercompany) antes de sair
                        conciliando o resto — não adianta conciliar banco/cartão de um período cujo saldo contábil ainda vai
                        mudar.
                    </div>

                    <DataTable
                        titulo='Checklist por frente'
                        rows={[
                            {
                                acao: 'Reprocessar lotes sem contrapartida',
                                onde: 'Aba Conciliação Contábil',
                                prioridade: lotes.length > 0 ? 'P1' : 'OK',
                                porque: `${lotes.length} lote(s) com débito ≠ crédito, somando ${formatCurrency(lotesTotal)}. Comece pelos maiores — geralmente concentram a maior parte do valor.`,
                            },
                            {
                                acao: 'Zerar/explicar o intercompany (115 x 212)',
                                onde: 'Aba Conciliação Contábil',
                                prioridade: intercompanyLiquido > 1000 ? 'P1' : 'OK',
                                porque: `Saldo líquido de ${formatCurrency(intercompanyLiquido)} entre numerário emitido e recebido entre lojas — deveria fechar em zero a cada fechamento.`,
                            },
                            {
                                acao: 'Cobrar repasses de cartão vencidos',
                                onde: 'Aba Conciliação de Cartão',
                                prioridade: cVencido30 > 0 ? 'P1' : 'OK',
                                porque: `${formatCurrency(cVencido30)} vencidos há mais de 30 dias (${formatCurrency(cVencido90)} há mais de 90). Abrir chamado por adquirente/lote.`,
                            },
                            {
                                acao: 'Vincular contas bancárias sem conta contábil',
                                onde: 'Aba Conciliação Bancária',
                                prioridade: bPorConta.some((c) => c.CLASSIFICACAO === 'sem vinculo') ? 'P1' : 'OK',
                                porque: 'Conta bancária sem vínculo no plano de contas não concilia sozinha — é cadastro, não rotina.',
                            },
                            {
                                acao: 'Retomar a rotina de conciliação bancária',
                                onde: 'Aba Conciliação Bancária',
                                prioridade: bNaoConciliado > 0 ? 'P2' : 'OK',
                                porque: `${formatNumber(bNaoConciliado)} lançamentos em aberto desde ${formatDate(escopoInicio)}. Olhe a tabela "por mês" para achar onde a rotina parou.`,
                            },
                            {
                                acao: 'Zerar contas a classificar',
                                onde: 'Aba Conciliação Contábil',
                                prioridade: classificar.length > 0 ? 'P3' : 'OK',
                                porque: 'Saldo pequeno, mas é sintoma de rotina de fechamento inacabada.',
                            },
                        ]}
                        columns={[
                            { key: 'acao', label: 'Ação', render: (row) => String(row.acao) },
                            { key: 'onde', label: 'Onde', render: (row) => String(row.onde) },
                            {
                                key: 'prioridade',
                                label: 'Prioridade',
                                render: (row) => String(row.prioridade),
                                destaque: (row) => row.prioridade === 'P1',
                            },
                            { key: 'porque', label: 'Por quê', render: (row) => String(row.porque) },
                        ]}
                    />

                    <DataTable
                        titulo='Rotina de acompanhamento sugerida'
                        rodape='Consultas de referência para rodar direto no DBeaver quando quiser conferir algo pontualmente, fora do painel.'
                        rows={ROTINA.map(([freq, oque, sql]) => ({ freq, oque, sql }))}
                        columns={[
                            { key: 'freq', label: 'Frequência', render: (row) => String(row.freq) },
                            { key: 'oque', label: 'O que verificar', render: (row) => String(row.oque) },
                            {
                                key: 'sql',
                                label: 'Consulta',
                                render: (row) => String(row.sql),
                            },
                        ]}
                    />
                </div>
            )}
        </PageShell>
    )
}
