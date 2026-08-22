export interface MeInfo {
    permission: string
    branches: number[]
    isAdmin: boolean
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
