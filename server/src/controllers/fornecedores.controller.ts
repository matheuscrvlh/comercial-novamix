import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkPermission } from '../middlewares/auth.middlewares'
import {
    buscarFornecedoresCiss,
    listarFornecedores,
    buscarFornecedorPorId,
    criarFornecedor,
    removerFornecedor,
    criarVendedor,
    atualizarVendedor,
    removerVendedor,
    type VendedorInput,
} from '../services/fornecedores.service'

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

interface BuscaCissQuery {
    busca?: string
}

export async function getBuscaCiss(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { busca } = req.query as BuscaCissQuery
    if (!busca || busca.trim().length < 3) {
        res.code(400).send({ error: 'Informe ao menos 3 caracteres para buscar.' })
        return
    }

    res.send(await buscarFornecedoresCiss(busca.trim()))
}

interface ListaQuery {
    busca?: string
}

export async function getFornecedores(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { busca } = req.query as ListaQuery
    res.send(await listarFornecedores(busca))
}

interface FornecedorParams {
    id: string
}

export async function getFornecedor(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { id } = req.params as FornecedorParams
    const fornecedor = await buscarFornecedorPorId(parseInt(id, 10))

    if (!fornecedor) {
        res.code(404).send({ error: 'Fornecedor não encontrado.' })
        return
    }

    res.send(fornecedor)
}

interface CriarFornecedorBody {
    idclifor: number
}

export async function postFornecedor(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { idclifor } = req.body as CriarFornecedorBody
    if (!idclifor) {
        res.code(400).send({ error: 'Informe o fornecedor do CISS a vincular.' })
        return
    }

    const criado = await criarFornecedor(idclifor)
    res.send(criado)
}

export async function deleteFornecedor(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { id } = req.params as FornecedorParams
    await removerFornecedor(parseInt(id, 10))
    res.send({ ok: true })
}

export async function postVendedor(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { id } = req.params as FornecedorParams
    const body = req.body as VendedorInput

    if (!body.nome || body.nome.trim().length === 0) {
        res.code(400).send({ error: 'Informe o nome do vendedor/contato.' })
        return
    }

    const vendedor = await criarVendedor(parseInt(id, 10), body)
    res.send(vendedor)
}

interface VendedorParams {
    vendedorId: string
}

export async function putVendedor(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { vendedorId } = req.params as VendedorParams
    const body = req.body as VendedorInput

    if (!body.nome || body.nome.trim().length === 0) {
        res.code(400).send({ error: 'Informe o nome do vendedor/contato.' })
        return
    }

    const vendedor = await atualizarVendedor(parseInt(vendedorId, 10), body)
    res.send(vendedor)
}

export async function deleteVendedor(req: FastifyRequest, res: FastifyReply) {
    if (!(await requireAdmin(req, res))) return

    const { vendedorId } = req.params as VendedorParams
    await removerVendedor(parseInt(vendedorId, 10))
    res.send({ ok: true })
}
