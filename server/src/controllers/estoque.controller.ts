import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from '../services/query.service'
import { comFiltroEcommerce, resolveFiliaisFisicas } from '../utils/filiais'
import { condicaoMercadologica, type FiltroMercadologicoQuery } from '../utils/mercadologico'

const ADMIN_ACCESS = 'admin'

interface ResumoQuery extends FiltroMercadologicoQuery {
    inicio?: string
    fim?: string
    filiais?: string
    dias?: string
}

async function resolveFiliais(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return null

    if (permission !== ADMIN_ACCESS) {
        res.code(403).send({ error: 'Acesso restrito a administradores.' })
        return null
    }

    const branches = await checkBranch(req, res)
    if (!branches) return null

    return branches
}

function resolveFiliaisSelecionadas(req: FastifyRequest, filiaisLiberadas: number[]) {
    const liberadasComEcommerce = comFiltroEcommerce(filiaisLiberadas)

    const { filiais } = req.query as ResumoQuery

    if (!filiais) return liberadasComEcommerce

    const solicitadas = filiais
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))

    const selecionadas = liberadasComEcommerce.filter((id) => solicitadas.includes(id))

    return selecionadas.length > 0 ? selecionadas : liberadasComEcommerce
}

export async function getEstoqueResumo(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { inicio, fim, dias } = req.query as ResumoQuery

    if (!inicio || !fim) {
        res.code(400).send({ error: 'Informe os parametros inicio e fim (YYYY-MM-DD).' })
        return
    }

    const diasParado = dias ? parseInt(dias, 10) : 60

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = resolveFiliaisFisicas(virtuais).join(',')
    const mercadologico = condicaoMercadologica(req.query as FiltroMercadologicoQuery)

    const transferenciasSql = loadQueryComercial('transferencias_loja.sql').replaceAll('{{FILIAIS}}', filiaisStr)
    const negativoSql = loadQueryComercial('estoque_negativo.sql')
        .replaceAll('{{FILIAIS}}', filiaisStr)
        .replace('{{MERCADOLOGICO}}', mercadologico)
    const paradoSql = loadQueryComercial('estoque_parado.sql')
        .replaceAll('{{FILIAIS}}', filiaisStr)
        .replace('{{MERCADOLOGICO}}', mercadologico)

    const conn = await connCiss()
    try {
        const [transferencias, negativo, parado] = await Promise.all([
            conn.query(transferenciasSql, [inicio, fim, inicio, fim]),
            conn.query(negativoSql),
            conn.query(paradoSql, [diasParado]),
        ])
        res.send({ transferencias, negativo, parado })
    } finally {
        await conn.close()
    }
}
