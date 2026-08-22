import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkPermission } from '../middlewares/auth.middlewares'
import { listMetas, upsertMeta, deleteMeta } from '../services/metas.service'

const ADMIN_ACCESS = 'admin'

async function requireAdmin(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return false

    if (permission !== ADMIN_ACCESS) {
        res.code(403).send({ error: 'Acesso restrito a administradores.' })
        return false
    }

    return true
}

interface MetasQuery {
    mesano?: string
    idempresa?: string
}

export async function getMetas(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { mesano, idempresa } = req.query as MetasQuery

    if (!mesano || !/^\d{6}$/.test(mesano)) {
        res.code(400).send({ error: 'Informe o parametro mesano (AAAAMM).' })
        return
    }

    const idEmpresa = idempresa ? parseInt(idempresa, 10) : 100

    res.send(await listMetas(mesano, idEmpresa))
}

interface SalvarMetaBody {
    idempresa: number
    idsecao: number
    mesano: string
    meta_venda: number
    meta_margem_pct: number
    meta_compra: number
    meta_reducao_estoque_pct: number
}

export async function salvarMeta(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const body = req.body as SalvarMetaBody

    if (!body.mesano || !/^\d{6}$/.test(body.mesano) || !body.idsecao || !body.idempresa) {
        res.code(400).send({ error: 'Dados invalidos para salvar meta.' })
        return
    }

    await upsertMeta({
        idempresa: body.idempresa,
        idsecao: body.idsecao,
        mesano: body.mesano,
        meta_venda: Number(body.meta_venda) || 0,
        meta_margem_pct: Number(body.meta_margem_pct) || 0,
        meta_compra: Number(body.meta_compra) || 0,
        meta_reducao_estoque_pct: Number(body.meta_reducao_estoque_pct) || 0,
    })

    res.send({ ok: true })
}

interface DeletarMetaParams {
    id: string
}

export async function deletarMeta(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { id } = req.params as DeletarMetaParams
    await deleteMeta(parseInt(id, 10))

    res.send({ ok: true })
}
