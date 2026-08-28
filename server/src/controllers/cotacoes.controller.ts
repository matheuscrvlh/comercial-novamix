import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { listarCotacoes } from '../services/cotacoes.service'

const ADMIN_ACCESS = 'admin'

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

interface ListaQuery {
    filiais?: string
    concorrente?: string
    cotacaoInicio?: string
    cotacaoFim?: string
    busca?: string
}

export async function getCotacoes(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { filiais, concorrente, cotacaoInicio, cotacaoFim, busca } = req.query as ListaQuery

    let filiaisFisicas = filiaisLiberadas
    if (filiais) {
        const solicitadas = filiais
            .split(',')
            .map((id) => parseInt(id, 10))
            .filter((id) => !Number.isNaN(id))
        const selecionadas = filiaisLiberadas.filter((id) => solicitadas.includes(id))
        if (selecionadas.length > 0) filiaisFisicas = selecionadas
    }

    res.send(await listarCotacoes({ filiaisFisicas, concorrente, cotacaoInicio, cotacaoFim, busca }))
}
