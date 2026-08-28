import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from './query.service'

export interface ValidadeRow {
    IDEMPRESA: number
    NOME_EMPRESA: string
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    DTLANCAMENTO: string | null
    DTVALIDADE: string
    QTDPRODUTO: number
    STATUS: string
    OBSERVACAO: string | null
    PRECOSUGERIDO: number
    VALOR_ESTIMADO: number
}

export interface ListarValidadeFiltros {
    filiaisFisicas: number[]
    status?: string
    vencimentoInicio?: string
    vencimentoFim?: string
    lancamentoInicio?: string
    lancamentoFim?: string
    busca?: string
}

export async function listarValidade(filtros: ListarValidadeFiltros): Promise<ValidadeRow[]> {
    const condicoes: string[] = []
    const params: unknown[] = []

    if (filtros.status) {
        condicoes.push('NV.STATUS = ?')
        params.push(filtros.status)
    }

    if (filtros.vencimentoInicio && filtros.vencimentoFim) {
        condicoes.push('NV.DTVALIDADE BETWEEN ? AND ?')
        params.push(filtros.vencimentoInicio, filtros.vencimentoFim)
    }

    if (filtros.lancamentoInicio && filtros.lancamentoFim) {
        condicoes.push('NES.DTMOVIMENTO BETWEEN ? AND ?')
        params.push(filtros.lancamentoInicio, filtros.lancamentoFim)
    }

    if (filtros.busca && filtros.busca.trim().length >= 3) {
        condicoes.push('UPPER(PV.DESCRICAOPRODUTO) LIKE UPPER(?)')
        params.push(`%${filtros.busca.trim()}%`)
    }

    const filtrosSql = condicoes.length > 0 ? `AND ${condicoes.join(' AND ')}` : ''

    const sql = loadQueryComercial('validade_busca.sql')
        .replaceAll('{{FILIAIS}}', filtros.filiaisFisicas.join(','))
        .replace('{{FILTROS}}', filtrosSql)

    const conn = await connCiss()
    try {
        const linhas: any[] = await conn.query(sql, params)
        return linhas.map((r) => ({
            IDEMPRESA: r.IDEMPRESA,
            NOME_EMPRESA: r.NOME_EMPRESA,
            IDSUBPRODUTO: r.IDSUBPRODUTO,
            DESCRICAOPRODUTO: r.DESCRICAOPRODUTO,
            IDCODBARPROD: r.IDCODBARPROD,
            DTLANCAMENTO: r.DTLANCAMENTO,
            DTVALIDADE: r.DTVALIDADE,
            QTDPRODUTO: Number(r.QTDPRODUTO) || 0,
            STATUS: r.STATUS,
            OBSERVACAO: r.OBSERVACAO,
            PRECOSUGERIDO: Number(r.PRECOSUGERIDO) || 0,
            VALOR_ESTIMADO: Number(r.VALOR_ESTIMADO) || 0,
        }))
    } finally {
        await conn.close()
    }
}
