import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from './query.service'

export interface CotacaoConcorrenteRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    CONCORRENTE_NOME: string
    PRECO_CONCORRENTE: number
    PRECO_NOSSO: number | null
    DATA_COTACAO: string
}

export interface ListarCotacoesFiltros {
    filiaisFisicas: number[]
    concorrente?: string
    cotacaoInicio?: string
    cotacaoFim?: string
    busca?: string
}

export async function listarCotacoes(filtros: ListarCotacoesFiltros): Promise<CotacaoConcorrenteRow[]> {
    const condicoes: string[] = []
    const params: unknown[] = []

    if (filtros.concorrente && filtros.concorrente.trim().length > 0) {
        condicoes.push('UPPER(C.DESCRICAOCONCORRENTE) = UPPER(?)')
        params.push(filtros.concorrente.trim())
    }

    if (filtros.cotacaoInicio && filtros.cotacaoFim) {
        condicoes.push('CC.DTMOVIMENTO BETWEEN ? AND ?')
        params.push(filtros.cotacaoInicio, filtros.cotacaoFim)
    }

    if (filtros.busca && filtros.busca.trim().length >= 3) {
        condicoes.push('(UPPER(PV.DESCRICAOPRODUTO) LIKE UPPER(?) OR UPPER(C.DESCRICAOCONCORRENTE) LIKE UPPER(?))')
        params.push(`%${filtros.busca.trim()}%`, `%${filtros.busca.trim()}%`)
    }

    const filtrosSql = condicoes.length > 0 ? `AND ${condicoes.join(' AND ')}` : ''

    const sql = loadQueryComercial('cotacao_concorrente_busca.sql')
        .replaceAll('{{FILIAIS}}', filtros.filiaisFisicas.join(','))
        .replace('{{FILTROS}}', filtrosSql)

    const conn = await connCiss()
    try {
        return await conn.query(sql, params)
    } finally {
        await conn.close()
    }
}
