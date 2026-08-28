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

export interface VendaDiariaRow {
    DIA: number
    DATA: string
    VENDA_ATUAL: number
    VENDA_ANO_ANTERIOR: number
    LUCRO_ATUAL: number
    LUCRO_ANO_ANTERIOR: number
    COMPRA_ATUAL: number
    COMPRA_ANO_ANTERIOR: number
}

export interface Secao {
    IDSECAO: number
    DESCRSECAO: string
}

export interface HierarquiaMercadologicaRow {
    IDDIVISAO: number | null
    DESCRDIVISAO: string | null
    IDSECAO: number | null
    DESCRSECAO: string | null
    IDGRUPO: number | null
    DESCRGRUPO: string | null
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
    META_AVARIA: number
    AVARIA_ATUAL: number
    PERC_COMPRA_VENDA: number | null
    COMPRA_ANUAL: number
    VENDA_ANO_ANTERIOR: number
    VARIACAO_ANO_PCT: number | null
    PROJECAO_VENDA: number
    VENDA_DIA: number
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
    meta_avaria: number
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
    IDCODBARPROD: number | null
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
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    QTDATUALESTOQUE: number
    VALATUALESTOQUE: number
}

export interface EstoqueParadoRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    QTDATUALESTOQUE: number
    VALATUALESTOQUE: number
    DTULTIMAVENDA: string | null
}

export interface EstoqueResumoData {
    transferencias: TransferenciaLojaRow[]
    negativo: EstoqueNegativoRow[]
    parado: EstoqueParadoRow[]
}

export interface EstoqueCoberturaRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    DESCRSECAO: string
    QTDATUALESTOQUE: number
    VALATUALESTOQUE: number
    QTD_VENDIDA_90D: number
    DIAS_COBERTURA: number
}

export interface ProdutoInativarRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    DESCRDIVISAO: string | null
    DESCRSECAO: string | null
    QTDATUALESTOQUE: number
    VALATUALESTOQUE: number
    DTULTIMAVENDA: string | null
    DTULTIMACOMPRA: string | null
}

export interface GestaoEstoqueListasData {
    comprarUrgente: EstoqueCoberturaRow[]
    excessoEstoque: EstoqueCoberturaRow[]
    inativar: ProdutoInativarRow[]
}

export interface Fabricante {
    FABRICANTE: string
}

export interface CatalogoProdutoRow {
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
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
    IDCODBARPROD: number | null
    VENDA: number
    LUCRO: number
    MARGEM: number
    META_MARGEM_PCT: number | null
    FLAGS: FlagMargem[]
}

export interface TicketOperadorRow {
    IDUSUARIO: number
    NOME_OPERADOR: string
    IDEMPRESA: number
    TICKETS_POSITIVOS: number
    TICKETS_NEGATIVOS: number
    TOTAL_TICKETS: number
}

export type StatusPromocao = 'ativa' | 'futura' | 'encerrada'

export interface PromocaoRow {
    IDPROMOCAO: number
    DESCRPROMOCAO: string
    DTINIPROMOCAO: string
    DTFIMPROMOCAO: string
    QTD_PRODUTOS: number
    QTD_LOJAS: number
    STATUS: StatusPromocao
}

export interface PromocaoLoja {
    IDEMPRESA: number
    NOME_EMPRESA: string
}

export interface PromocaoProdutoRow {
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    VALPRECO: number
    VALDESCONTO: number
    PERDESCONTO: number
    VENDA: number
    LUCRO: number
    QTD_VENDIDA: number
    VENDA_MEDIA_DIARIA_ANTES: number
    QTD_MEDIA_DIARIA_ANTES: number
}

export interface PromocaoAnalitico {
    mediaDiariaDurante: number | null
    mediaDiariaAntes: number | null
    liftVendaPct: number | null
    diasComparados: number
}

export interface PromocaoDetalhe {
    IDPROMOCAO: number
    DESCRPROMOCAO: string
    DTINIPROMOCAO: string
    DTFIMPROMOCAO: string
    lojas: PromocaoLoja[]
    produtos: PromocaoProdutoRow[]
    analitico: PromocaoAnalitico
}

export interface ComparativoFabricanteRow {
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    VENDA_ATUAL: number
    LUCRO_ATUAL: number
    VENDA_ANO_ANTERIOR: number
    LUCRO_ANO_ANTERIOR: number
    VENDA_2_ANOS_ANTES: number
    LUCRO_2_ANOS_ANTES: number
    VALOR_ESTOQUE: number
}

export interface Vendedor {
    id: number
    fornecedor_id: number
    nome: string
    cargo: string | null
    telefone: string | null
    whatsapp: string | null
    email: string | null
    observacoes: string | null
    ativo: boolean
}

export interface Fornecedor {
    id: number
    idclifor: number
    NOME: string
    NOMEFANTASIA: string | null
    CNPJCPF: string | null
    EMAIL: string | null
    FONE1: string | null
    FONE2: string | null
    FONECELULAR: string | null
    NOMECONTATO1: string | null
    NOMECONTATO2: string | null
    ENDERECO: string | null
    BAIRRO: string | null
    UFCLIFOR: string | null
    FLAGINATIVO: 'T' | 'F'
    vendedores: Vendedor[]
}

export interface FornecedorCissRow {
    IDCLIFOR: number
    NOME: string
    NOMEFANTASIA: string | null
    CNPJCPF: string | null
    EMAIL: string | null
    FONE1: string | null
    FONE2: string | null
    FONECELULAR: string | null
    NOMECONTATO1: string | null
    NOMECONTATO2: string | null
    ENDERECO: string | null
    BAIRRO: string | null
    UFCLIFOR: string | null
    FLAGINATIVO: 'T' | 'F'
}

export type StatusInadimplencia = 'pendente' | 'cobrado' | 'ok' | 'nao_cobrar'

export interface Inadimplencia {
    id: number
    fornecedor_id: number | null
    vendedor_id: number | null
    fornecedor_nome: string
    vendedor_nome: string | null
    idempresa: number | null
    titulo: string | null
    data_movimento: string | null
    data_vencimento: string | null
    saldo_devido: number
    status: StatusInadimplencia
    observacao: string | null
    updated_at: string
}

export interface InadimplenciaInput {
    fornecedor_id: number | null
    vendedor_id?: number | null
    fornecedor_nome: string
    idempresa?: number | null
    titulo?: string | null
    data_movimento?: string | null
    data_vencimento?: string | null
    saldo_devido: number
    status?: StatusInadimplencia
    observacao?: string | null
}

export interface ResumoFornecedorInadimplencia {
    fornecedor_id: number | null
    fornecedor_nome: string
    qtd_titulos: number
    total_devido: number
}

export interface ProdutoCadastro {
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    SUBDESCRICAO: string | null
    FABRICANTE: string | null
    REFERENCIA: string | null
    IDCODBARPROD: number | null
    EMBALAGEMSAIDA: string | null
    MODELO: string | null
    PESOLIQUIDO: number | null
    PESOBRUTO: number | null
    NCM: string | null
    CLASSFISCAL: string | null
    DTCADASTRO: string | null
    FLAGINATIVO: 'T' | 'F'
    FLAGINATIVOCOMPRA: 'T' | 'F'
    DESCRDIVISAO: string | null
    DESCRSECAO: string | null
    DESCRGRUPO: string | null
    DESCRSUBGRUPO: string | null
}

export interface ProdutoTributacaoRow {
    IDEMPRESA: number
    UFORIGEM: string
    PERICMSAI: number
    PERICMSUBST: number
    DESCRSITTRIBUTARIA: string | null
}

export interface ProdutoEstoquePrecoRow {
    IDEMPRESA: number
    QTDATUALESTOQUE: number | null
    VALATUALESTOQUE: number | null
    VALPRECOVENDA: number | null
    DTULTIMAVENDA: string | null
}

export interface ProdutoVendaMargemRow {
    IDEMPRESA: number
    VENDA: number
    LUCRO: number
    QTD_VENDIDA: number
}

export interface ValidadeRow {
    IDEMPRESA: number
    IDPLANILHA: number
    NOME_EMPRESA: string
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    DTLANCAMENTO: string | null
    DTVALIDADE: string
    QTDPRODUTO: number
    OBSERVACAO: string | null
    PRECOSUGERIDO: number
    VALOR_ESTIMADO: number
    STATUS_TIPO_ID: number | null
    STATUS_NOME: string | null
    STATUS_COR: string | null
}

export interface ValidadeStatusTipo {
    id: number
    nome: string
    cor: string
    ativo: boolean
}

export interface CotacaoConcorrenteRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    CONCORRENTE_NOME: string
    PRECO_CONCORRENTE: number
    PRECO_NOSSO: number | null
    DATA_COTACAO: string
}

export interface ProdutoUltimoCustoRow {
    IDEMPRESA: number
    DTULTIMACOMPRA: string
    VALCUSTOULTIMO: number
}

export interface ProdutoValidadeProximaRow {
    IDEMPRESA: number
    DTVALIDADE: string
    QTDPRODUTO: number
}

export interface ProdutoDetalhe {
    cadastro: ProdutoCadastro
    tributacao: ProdutoTributacaoRow[]
    estoquePreco: ProdutoEstoquePrecoRow[]
    vendaMargem: ProdutoVendaMargemRow[]
    vendaMargemAnoAnterior: ProdutoVendaMargemRow[]
    ultimoCusto: ProdutoUltimoCustoRow[]
    validadeProxima: ProdutoValidadeProximaRow[]
}
