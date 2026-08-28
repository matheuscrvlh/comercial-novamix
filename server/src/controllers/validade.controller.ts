import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { listarValidade } from '../services/validade.service'
import {
    listarStatusTipos,
    criarStatusTipo,
    atualizarStatusTipo,
    removerStatusTipo,
    listarAtribuicoes,
    definirStatus,
} from '../services/validadeStatus.service'
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
    vencimentoInicio?: string
    vencimentoFim?: string
    lancamentoInicio?: string
    lancamentoFim?: string
    busca?: string
}

function resolveFiliaisFisicas(req: FastifyRequest, filiaisLiberadas: number[]) {
    const { filiais } = req.query as ListaQuery
    if (!filiais) return filiaisLiberadas

    const solicitadas = filiais
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))
    const selecionadas = filiaisLiberadas.filter((id) => solicitadas.includes(id))
    return selecionadas.length > 0 ? selecionadas : filiaisLiberadas
}

export async function getValidade(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { vencimentoInicio, vencimentoFim, lancamentoInicio, lancamentoFim, busca, divisoes, secoes, grupos } = req.query as ListaQuery
    const filiaisFisicas = resolveFiliaisFisicas(req, filiaisLiberadas)

    const [linhas, tipos, atribuicoes] = await Promise.all([
        listarValidade({
            filiaisFisicas,
            vencimentoInicio,
            vencimentoFim,
            lancamentoInicio,
            lancamentoFim,
            busca,
            divisoes: idsValidos(divisoes),
            secoes: idsValidos(secoes),
            grupos: idsValidos(grupos),
        }),
        listarStatusTipos(),
        listarAtribuicoes(filiaisFisicas),
    ])

    const tiposPorId = new Map(tipos.map((t) => [t.id, t]))
    const atribuicaoPorChave = new Map(
        atribuicoes.map((a) => [`${a.idempresa}|${a.idplanilha}|${a.idsubproduto}|${a.dtvalidade}`, a.status_tipo_id])
    )

    const resultado = linhas.map((linha) => {
        const chave = `${linha.IDEMPRESA}|${linha.IDPLANILHA}|${linha.IDSUBPRODUTO}|${linha.DTVALIDADE.slice(0, 10)}`
        const statusTipoId = atribuicaoPorChave.get(chave) ?? null
        const tipo = statusTipoId !== null ? tiposPorId.get(statusTipoId) : undefined
        return {
            ...linha,
            STATUS_TIPO_ID: statusTipoId,
            STATUS_NOME: tipo?.nome ?? null,
            STATUS_COR: tipo?.cor ?? null,
        }
    })

    res.send(resultado)
}

export async function getStatusTipos(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    res.send(await listarStatusTipos())
}

interface StatusTipoBody {
    nome?: string
    cor?: string
    ativo?: boolean
}

/** Postgres 23505 = unique_violation - aqui so pode ser o nome do status repetido. */
function ehNomeDuplicado(err: unknown): boolean {
    return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505'
}

export async function postStatusTipo(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { nome, cor } = req.body as StatusTipoBody
    if (!nome || nome.trim().length === 0) {
        res.code(400).send({ error: 'Informe o nome do status.' })
        return
    }

    try {
        res.send(await criarStatusTipo(nome.trim(), cor ?? 'gray'))
    } catch (err) {
        if (ehNomeDuplicado(err)) {
            res.code(409).send({ error: 'Já existe um status com esse nome.' })
            return
        }
        throw err
    }
}

interface StatusTipoParams {
    id: string
}

export async function putStatusTipo(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { id } = req.params as StatusTipoParams
    const { nome, cor, ativo } = req.body as StatusTipoBody
    if (!nome || nome.trim().length === 0) {
        res.code(400).send({ error: 'Informe o nome do status.' })
        return
    }

    try {
        res.send(await atualizarStatusTipo(parseInt(id, 10), nome.trim(), cor ?? 'gray', ativo ?? true))
    } catch (err) {
        if (ehNomeDuplicado(err)) {
            res.code(409).send({ error: 'Já existe um status com esse nome.' })
            return
        }
        throw err
    }
}

export async function deleteStatusTipo(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { id } = req.params as StatusTipoParams
    await removerStatusTipo(parseInt(id, 10))
    res.send({ ok: true })
}

interface AtribuicaoBody {
    idempresa: number
    idplanilha: number
    idsubproduto: number
    dtvalidade: string
    status_tipo_id: number | null
}

export async function putStatusAtribuicao(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const body = req.body as AtribuicaoBody
    if (!body.idempresa || !body.idplanilha || !body.idsubproduto || !body.dtvalidade) {
        res.code(400).send({ error: 'Informe idempresa, idplanilha, idsubproduto e dtvalidade.' })
        return
    }

    if (!filiaisLiberadas.includes(body.idempresa)) {
        res.code(403).send({ error: 'Sem acesso a essa filial.' })
        return
    }

    await definirStatus(body)
    res.send({ ok: true })
}
