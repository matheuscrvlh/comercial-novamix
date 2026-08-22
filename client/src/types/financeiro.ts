export interface MeInfo {
    permission: string
    branches: number[]
    isAdmin: boolean
}

export interface BaseRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
}

export interface VendaBrutaRow extends BaseRow {
    VALOR_VENDA_BRUTA: number
}

export interface LucroBrutoRow extends BaseRow {
    LUCRO_BRUTO: number
}

export interface LucroLiquidoRow extends BaseRow {
    LUCRO_LIQUIDO: number
}

export interface CancelamentosRow extends BaseRow {
    VALOR_CANCELAMENTOS: number
}

export interface DevolucoesRow extends BaseRow {
    VALOR_DEVOLUCOES: number
}

export interface CuponsRow extends BaseRow {
    N_CUPONS: number
}

export interface TicketMedioRow extends BaseRow {
    TICKET_MEDIO: number
}

export interface EstoqueRow extends BaseRow {
    VALOR_ESTOQUE: number
}

export interface LiquidezCorrenteRow extends BaseRow {
    LIQUIDEZ_CORRENTE: number
}

export interface DespesaNaturezaRow {
    NATUREZA: string
    VALOR_DESPESA: number
}

export interface DespesaLojaRow extends BaseRow {
    VALOR_DESPESA: number
}

export interface DespesaNaturezaLojaRow {
    NATUREZA: string
    IDEMPRESA: number
    NOME_EMPRESA: string
    VALOR_DESPESA: number
}

export interface DespesaEvolucaoRow {
    MES: string
    NATUREZA: string
    VALOR_DESPESA: number
}

export interface ReceitaLiquidaRow extends BaseRow {
    RECEITA_LIQUIDA: number
}

export interface DespesasResponse {
    porNatureza: DespesaNaturezaRow[]
    porLoja: DespesaLojaRow[]
    porNaturezaLoja: DespesaNaturezaLojaRow[]
    evolucaoMensal: DespesaEvolucaoRow[]
    receitaLiquida: ReceitaLiquidaRow[]
}

export interface ResultadoDreRow extends BaseRow {
    RECEITA_BRUTA: number
    DEDUCOES: number
    CMV: number
    DESPESAS_OPERACIONAIS: number
    RECEITAS_FINANCEIRAS: number
    DESPESAS_FINANCEIRAS: number
}

export interface ResultadoDreMensalRow {
    MES: string
    RECEITA_BRUTA: number
    DEDUCOES: number
    CMV: number
    DESPESAS_OPERACIONAIS: number
    RECEITAS_FINANCEIRAS: number
    DESPESAS_FINANCEIRAS: number
}

export interface BalancoLinha {
    LINHA: string
    VALOR: number
}

export interface BalancoResponse {
    dataBase: string
    linhas: BalancoLinha[]
}

export interface ContasPagarSituacaoRow {
    ESTADO: string
    SITUACAO: string
    TITULOS: number
    VALOR: number
    SALDO: number
}

export interface ContasPagarFornecedorRow {
    FORNECEDOR: string
    TITULOS: number
    SALDO: number
    DIAS_ATRASO: number
}

export interface ContasPagarPorLojaRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    SITUACAO: string
    VALOR_SALDO: number
}

export interface ContasPagarDetalheResponse {
    situacao: ContasPagarSituacaoRow[]
    fornecedores: ContasPagarFornecedorRow[]
    porLoja: ContasPagarPorLojaRow[]
}

export interface ContasReceberSituacaoRow {
    ESTADO: string
    SITUACAO: string
    TITULOS: number
    VALOR: number
    SALDO: number
}

export interface ContasReceberClienteRow {
    CLIENTE: string
    TITULOS: number
    SALDO: number
    VENCIDO: number
    DIAS_ATRASO: number
}

export interface ContasReceberFormaPagamentoRow {
    FORMA_PAGAMENTO: string
    SALDO: number
}

export interface ContasReceberRecorrenciaRow {
    MES: string
    TIPO: string
    VALOR: number
    QTD_CLIENTES: number
}

export interface ContasReceberDetalheResponse {
    situacao: ContasReceberSituacaoRow[]
    clientes: ContasReceberClienteRow[]
    formaPagamento: ContasReceberFormaPagamentoRow[]
    recorrencia: ContasReceberRecorrenciaRow[]
}

export interface ConciliacaoBancoResumo {
    TOTAL: number
    CONCILIADO: number
    NAO_CONCILIADO: number
    CRED_NAO_CONCILIADO: number
    DEB_NAO_CONCILIADO: number
}

export interface ConciliacaoBancoMesRow {
    MES: string
    REG: number
    CRED: number
    DEB: number
}

export interface ConciliacaoBancoContaRow {
    IDCTABANCARIA: number
    CLASSIFICACAO: string
    NOME: string
    REG: number
    CRED: number
    DEB: number
}

export interface ConciliacaoBancoResponse {
    resumo: ConciliacaoBancoResumo
    porMes: ConciliacaoBancoMesRow[]
    porConta: ConciliacaoBancoContaRow[]
}

export interface ConciliacaoCartaoResumo {
    REG: number
    CORRETOS: number
    ESPERADO: number
    PAGO: number
}

export interface ConciliacaoCartaoAgingRow {
    MES: string
    REG: number
    VALOR: number
    DIAS: number
}

export interface ConciliacaoCartaoResponse {
    resumo: ConciliacaoCartaoResumo
    aging: ConciliacaoCartaoAgingRow[]
}

export interface ConciliacaoLoteRow {
    IDPLANILHA: number
    DTMOVIMENTO: string
    N_EMPRESAS: number
    IDEMPRESA_REF: number
    DIFERENCA: number
}

export interface ConciliacaoIntercompany {
    SALDO_EMITIDO: number
    SALDO_RECEBIDO: number
}

export interface ConciliacaoClassificarRow {
    CLASSIFICACAO: string
    DESCRCTACONTABIL: string
    IDEMPRESA: number
    SALDO: number
    DTMOVIMENTO: string
}

export interface ConciliacaoContabilResponse {
    lotes: ConciliacaoLoteRow[]
    intercompany: ConciliacaoIntercompany
    classificar: ConciliacaoClassificarRow[]
}
