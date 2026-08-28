import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { listarValidade } from '../services/validade.service'
import type { FiltroMercadologicoQuery } from '../utils/mercadologico'

function idsValidos(valor: string | undefined): number[] {
    if (!valor) return []
    return valor
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))
}

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

interface ListaQuery extends FiltroMercadologicoQuery {
    filiais?: string
    status?: string
    vencimentoInicio?: string
    vencimentoFim?: string
    lancamentoInicio?: string
    lancamentoFim?: string
    busca?: string
}

export async function getValidade(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { filiais, status, vencimentoInicio, vencimentoFim, lancamentoInicio, lancamentoFim, busca, divisoes, secoes, grupos } =
        req.query as ListaQuery

    let filiaisFisicas = filiaisLiberadas
    if (filiais) {
        const solicitadas = filiais
            .split(',')
            .map((id) => parseInt(id, 10))
            .filter((id) => !Number.isNaN(id))
        const selecionadas = filiaisLiberadas.filter((id) => solicitadas.includes(id))
        if (selecionadas.length > 0) filiaisFisicas = selecionadas
    }

    res.send(
        await listarValidade({
            filiaisFisicas,
            status,
            vencimentoInicio,
            vencimentoFim,
            lancamentoInicio,
            lancamentoFim,
            busca,
            divisoes: idsValidos(divisoes),
            secoes: idsValidos(secoes),
            grupos: idsValidos(grupos),
        })
    )
}
