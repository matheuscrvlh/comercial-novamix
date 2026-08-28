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
        condicoes.push(
            '(UPPER(PV.DESCRICAOPRODUTO) LIKE UPPER(?) OR CAST(PV.IDSUBPRODUTO AS VARCHAR(20)) LIKE ? OR CAST(PV.IDCODBARPROD AS VARCHAR(20)) LIKE ?)'
        )
        params.push(`%${buscaLimpa}%`, `${buscaLimpa}%`, `${buscaLimpa}%`)
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

/** Data local (nao UTC) - ver comentario de hojeISO() em comercial.controller.ts. */
function dataISO(data: Date) {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}

function deslocarAno(dataISOStr: string, anos: number) {
    const [ano, mes, dia] = dataISOStr.split('-').map(Number)
    const d = new Date(Date.UTC(ano - anos, mes - 1, dia))
    return d.toISOString().slice(0, 10)
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
    const fimISO = dataISO(hoje)
    const inicioISO = dataISO(noventaDiasAtras)
    const fimAnoAnteriorISO = deslocarAno(fimISO, 1)
    const inicioAnoAnteriorISO = deslocarAno(inicioISO, 1)

    const sqlCadastro = loadQueryComercial('produto_cadastro.sql')
    const sqlTributacao = loadQueryComercial('produto_tributacao.sql')
    const sqlEstoquePreco = loadQueryComercial('produto_estoque_preco.sql')
    const sqlVendaMargem = loadQueryComercial('produto_venda_margem.sql')
    const sqlUltimoCusto = loadQueryComercial('produto_ultimo_custo.sql')
    const sqlValidadeProxima = loadQueryComercial('produto_validade_proxima.sql')

    const conn = await connCiss()
    try {
        const [cadastro, tributacao, estoquePreco, vendaMargem, vendaMargemAnoAnterior, ultimoCusto, validadeProxima] = await Promise.all([
            conn.query(sqlCadastro, [id]),
            conn.query(sqlTributacao, [id]),
            conn.query(sqlEstoquePreco, [id, id]),
            conn.query(sqlVendaMargem, [id, inicioISO, fimISO]),
            conn.query(sqlVendaMargem, [id, inicioAnoAnteriorISO, fimAnoAnteriorISO]),
            conn.query(sqlUltimoCusto, [id, id]),
            conn.query(sqlValidadeProxima, [id]),
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
            vendaMargemAnoAnterior,
            ultimoCusto,
            validadeProxima,
        })
    } finally {
        await conn.close()
    }
}
