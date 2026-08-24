import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkPermission } from '../middlewares/auth.middlewares'
import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from '../services/query.service'

const ADMIN_ACCESS = 'admin'

interface CatalogoQuery {
    busca?: string
    idsecao?: string
    status?: 'ativo' | 'inativo' | 'todos'
}

export async function getCatalogo(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    if (permission !== ADMIN_ACCESS) {
        res.code(403).send({ error: 'Acesso restrito a administradores.' })
        return
    }

    const { busca, idsecao, status } = req.query as CatalogoQuery

    const buscaLimpa = busca?.trim() ?? ''
    const idsecaoNum = idsecao ? parseInt(idsecao, 10) : null

    if (buscaLimpa.length < 3 && !idsecaoNum) {
        res.code(400).send({ error: 'Informe ao menos 3 caracteres de busca ou selecione uma seção.' })
        return
    }

    const condicoes: string[] = []
    const params: unknown[] = []

    if (buscaLimpa.length >= 3) {
        condicoes.push('UPPER(PV.DESCRICAOPRODUTO) LIKE UPPER(?)')
        params.push(`%${buscaLimpa}%`)
    }

    if (idsecaoNum) {
        condicoes.push('PV.IDSECAO = ?')
        params.push(idsecaoNum)
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
