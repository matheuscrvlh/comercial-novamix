import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkPermission } from '../middlewares/auth.middlewares'
import {
    listarInadimplencias,
    resumoPorFornecedor,
    criarInadimplencia,
    atualizarInadimplencia,
    removerInadimplencia,
    type InadimplenciaInput,
} from '../services/inadimplencias.service'

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

interface ListaQuery {
    fornecedorId?: string
    status?: string
    busca?: string
}

export async function getInadimplencias(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { fornecedorId, status, busca } = req.query as ListaQuery
    res.send(
        await listarInadimplencias({
            fornecedorId: fornecedorId ? parseInt(fornecedorId, 10) : undefined,
            status,
            busca,
        })
    )
}

export async function getResumo(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return
    res.send(await resumoPorFornecedor())
}

export async function postInadimplencia(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const body = req.body as InadimplenciaInput
    if (!body.fornecedor_nome || body.saldo_devido == null) {
        res.code(400).send({ error: 'Informe o fornecedor e o saldo devido.' })
        return
    }

    res.send(await criarInadimplencia(body))
}

interface InadimplenciaParams {
    id: string
}

export async function putInadimplencia(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { id } = req.params as InadimplenciaParams
    const body = req.body as InadimplenciaInput

    if (!body.fornecedor_nome || body.saldo_devido == null) {
        res.code(400).send({ error: 'Informe o fornecedor e o saldo devido.' })
        return
    }

    res.send(await atualizarInadimplencia(parseInt(id, 10), body))
}

export async function deleteInadimplencia(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { id } = req.params as InadimplenciaParams
    await removerInadimplencia(parseInt(id, 10))
    res.send({ ok: true })
}
