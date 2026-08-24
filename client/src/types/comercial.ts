export interface MeInfo {
    permission: string
    branches: number[]
    isAdmin: boolean
}

export interface DashboardResumo {
    vendaHoje: number
    lucroHoje: number
    compraHoje: number
    margemHoje: number
    estoqueNegativoCount: number
    margemExcecoesCount: number
    pedidosPendentesValor: number
    pedidosPendentesCount: number
    perdasValor: number
}

export interface Secao {
    IDSECAO: number
    DESCRSECAO: string
}

export interface VendaMetaSecaoRow {
    IDSECAO: number
    DESCRSECAO: string
    VENDA_ATUAL: number
    LUCRO_ATUAL: number
    COMPRA_ATUAL: number
    VALOR_ESTOQUE: number
    META_VENDA: number
    META_MARGEM_PCT: number
    META_COMPRA: number
    META_REDUCAO_ESTOQUE_PCT: number
}

export interface MetaSecao {
    id: number
    idempresa: number
    idsecao: number
    mesano: string
    meta_venda: number
    meta_margem_pct: number
    meta_compra: number
    meta_reducao_estoque_pct: number
}

export interface PerdaFornecedorRow {
    FORNECEDOR: string
    QUANTIDADE: number
    VALOR: number
}

export interface AvariaFabricanteRow {
    FABRICANTE: string
    QUANTIDADE: number
    VALOR: number
}

export interface PedidoPendenteRow {
    FORNECEDOR: string
    QTD_PEDIDOS: number
    VALOR_PENDENTE: number
}

export interface OperacionalData {
    perdas: PerdaFornecedorRow[]
    avaria: AvariaFabricanteRow[]
    pedidosPendentes: PedidoPendenteRow[]
}

export interface TributacaoRow {
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    FABRICANTE: string | null
    NCM: string | null
    IDEMPRESA: number
    UFORIGEM: string
    PERICMSAI: number
    PERICMSUBST: number
    DESCRSITTRIBUTARIA: string | null
}

export interface TransferenciaLojaRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    VALOR_ENVIADO: number
    VALOR_RECEBIDO: number
}

export interface EstoqueNegativoRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    DESCRICAOPRODUTO: string
    QTDATUALESTOQUE: number
    VALATUALESTOQUE: number
}

export interface EstoqueParadoRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    DESCRICAOPRODUTO: string
    QTDATUALESTOQUE: number
    VALATUALESTOQUE: number
    DTULTIMAVENDA: string | null
}

export interface EstoqueResumoData {
    transferencias: TransferenciaLojaRow[]
    negativo: EstoqueNegativoRow[]
    parado: EstoqueParadoRow[]
}

export interface Fabricante {
    FABRICANTE: string
}

export interface CatalogoProdutoRow {
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    FABRICANTE: string | null
    DESCRDIVISAO: string | null
    DESCRSECAO: string | null
    DESCRGRUPO: string | null
    DESCRSUBGRUPO: string | null
    FLAGINATIVO: 'T' | 'F'
}

export interface ResumoMercadologicoRow {
    IDDIVISAO: number | null
    DESCRDIVISAO: string | null
    IDSECAO: number | null
    DESCRSECAO: string | null
    IDGRUPO: number | null
    DESCRGRUPO: string | null
    IDSUBGRUPO: number | null
    DESCRSUBGRUPO: string | null
    ATIVOS: number
    INATIVOS: number
    TOTAL: number
}

export type FlagMargem = 'ACIMA_40' | 'ABAIXO_MENOS15' | 'MUITO_ABAIXO_META' | 'ZERO'

export interface ProdutoMargemRow {
    IDSECAO: number
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    VENDA: number
    LUCRO: number
    MARGEM: number
    META_MARGEM_PCT: number | null
    FLAGS: FlagMargem[]
}

export interface TicketOperadorRow {
    IDUSUARIO: number
    NOME_OPERADOR: string
    TICKETS_POSITIVOS: number
    TICKETS_NEGATIVOS: number
    TOTAL_TICKETS: number
}

export interface ComparativoFabricanteRow {
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    VENDA_ATUAL: number
    LUCRO_ATUAL: number
    VENDA_ANO_ANTERIOR: number
    LUCRO_ANO_ANTERIOR: number
    VENDA_2_ANOS_ANTES: number
    LUCRO_2_ANOS_ANTES: number
    VALOR_ESTOQUE: number
}
