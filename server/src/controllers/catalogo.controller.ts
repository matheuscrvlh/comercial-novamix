import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkPermission } from '../middlewares/auth.middlewares'
import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from '../services/query.service'

const ADMIN_ACCESS = 'admin'

interface CatalogoQuery {
    busca?: string
    iddivisao?: string
    idsecao?: string
    idgrupo?: string
    idsubgrupo?: string
    status?: 'ativo' | 'inativo' | 'todos'
}

export async function getCatalogo(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    if (permission !== ADMIN_ACCESS) {
        res.code(403).send({ error: 'Acesso restrito a administradores.' })
        return
    }

    const { busca, iddivisao, idsecao, idgrupo, idsubgrupo, status } = req.query as CatalogoQuery

    const buscaLimpa = busca?.trim() ?? ''
    const iddivisaoNum = iddivisao ? parseInt(iddivisao, 10) : null
    const idsecaoNum = idsecao ? parseInt(idsecao, 10) : null
    const idgrupoNum = idgrupo ? parseInt(idgrupo, 10) : null
    const idsubgrupoNum = idsubgrupo ? parseInt(idsubgrupo, 10) : null

    if (buscaLimpa.length < 3 && !iddivisaoNum && !idsecaoNum && !idgrupoNum && !idsubgrupoNum) {
        res.code(400).send({ error: 'Informe ao menos 3 caracteres de busca ou selecione um filtro de hierarquia.' })
        return
    }

    const condicoes: string[] = []
    const params: unknown[] = []

    if (buscaLimpa.length >= 3) {
        condicoes.push('(UPPER(PV.DESCRICAOPRODUTO) LIKE UPPER(?) OR CAST(PV.IDSUBPRODUTO AS VARCHAR(20)) LIKE ?)')
        params.push(`%${buscaLimpa}%`, `${buscaLimpa}%`)
    }

    if (iddivisaoNum) {
        condicoes.push('PV.IDDIVISAO = ?')
        params.push(iddivisaoNum)
    }

    if (idsecaoNum) {
        condicoes.push('PV.IDSECAO = ?')
        params.push(idsecaoNum)
    }

    if (idgrupoNum) {
        condicoes.push('PV.IDGRUPO = ?')
        params.push(idgrupoNum)
    }

    if (idsubgrupoNum) {
        condicoes.push('PV.IDSUBGRUPO = ?')
        params.push(idsubgrupoNum)
    }

    if (status === 'ativo') {
        condicoes.push("PV.FLAGINATIVO = 'F'")
    } else if (status === 'inativo') {
        condicoes.push("PV.FLAGINATIVO = 'T'")
    }

    const sql = loadQueryComercial('catalogo_busca.sql').replace('{{FILTROS}}', condicoes.join(' AND '))

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, params)
        res.send(data)
    } finally {
        await conn.close()
    }
}

export async function getResumoMercadologico(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    if (permission !== ADMIN_ACCESS) {
        res.code(403).send({ error: 'Acesso restrito a administradores.' })
        return
    }

    const sql = loadQueryComercial('resumo_mercadologico.sql')

    const conn = await connCiss()
    try {
        const data = await conn.query(sql)
        res.send(data)
    } finally {
        await conn.close()
    }
}

interface ProdutoDetalheParams {
    idsubproduto: string
}

function dataISO(data: Date) {
    return data.toISOString().slice(0, 10)
}

export async function getProdutoDetalhe(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    if (permission !== ADMIN_ACCESS) {
        res.code(403).send({ error: 'Acesso restrito a administradores.' })
        return
    }

    const { idsubproduto } = req.params as ProdutoDetalheParams
    const id = parseInt(idsubproduto, 10)

    if (!id) {
        res.code(400).send({ error: 'Produto inválido.' })
        return
    }

    const hoje = new Date()
    const noventaDiasAtras = new Date(hoje)
    noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90)

    const sqlCadastro = loadQueryComercial('produto_cadastro.sql')
    const sqlTributacao = loadQueryComercial('produto_tributacao.sql')
    const sqlEstoquePreco = loadQueryComercial('produto_estoque_preco.sql')
    const sqlVendaMargem = loadQueryComercial('produto_venda_margem.sql')

    const conn = await connCiss()
    try {
        const [cadastro, tributacao, estoquePreco, vendaMargem] = await Promise.all([
            conn.query(sqlCadastro, [id]),
            conn.query(sqlTributacao, [id]),
            conn.query(sqlEstoquePreco, [id, id]),
            conn.query(sqlVendaMargem, [id, dataISO(noventaDiasAtras), dataISO(hoje)]),
        ])

        if (cadastro.length === 0) {
            res.code(404).send({ error: 'Produto não encontrado.' })
            return
        }

        res.send({
            cadastro: cadastro[0],
            tributacao,
            estoquePreco,
            vendaMargem,
        })
    } finally {
        await conn.close()
    }
}
