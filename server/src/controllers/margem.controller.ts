import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from '../services/query.service'
import { listMetas } from '../services/metas.service'
import { comFiltroEcommerce, condicaoEcommerce, resolveFiliaisFisicas } from '../utils/filiais'

const ADMIN_ACCESS = 'admin'

const LIMITE_MARGEM_ALTA = 0.4
const LIMITE_MARGEM_BAIXA = -0.15
const MARGEM_ABAIXO_META_PP = 0.1

interface MargemQuery {
    inicio?: string
    fim?: string
    filiais?: string
    mesano?: string
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

    const { filiais } = req.query as MargemQuery

    if (!filiais) return liberadasComEcommerce

    const solicitadas = filiais
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))

    const selecionadas = liberadasComEcommerce.filter((id) => solicitadas.includes(id))

    return selecionadas.length > 0 ? selecionadas : liberadasComEcommerce
}

export type FlagMargem = 'ACIMA_40' | 'ABAIXO_MENOS15' | 'MUITO_ABAIXO_META' | 'ZERO'

export interface ProdutoMargem {
    IDSECAO: number
    IDSUBPRODUTO: number
    DESCRICAOPRODUTO: string
    IDCODBARPROD: number | null
    VENDA: number
    LUCRO: number
    MARGEM: number
    META_MARGEM_PCT: number | null
    FLAGS: FlagMargem[]
}

export async function buscarExcecoesMargem(
    virtuais: number[],
    inicio: string,
    fim: string,
    mesano: string
): Promise<ProdutoMargem[]> {
    const sql = loadQueryComercial('venda_margem_produto.sql')
        .replaceAll('{{FILIAIS}}', resolveFiliaisFisicas(virtuais).join(','))
        .replaceAll('{{ECOMMERCE}}', condicaoEcommerce(virtuais))

    const conn = await connCiss()
    let produtos: any[] = []
    try {
        produtos = await conn.query(sql, [inicio, fim])
    } finally {
        await conn.close()
    }

    const metas = await listMetas(mesano, 100)
    const metaPorSecao = new Map(metas.map((m) => [m.idsecao, m.meta_margem_pct]))

    const excecoes: ProdutoMargem[] = []

    for (const p of produtos) {
        const venda = Number(p.VENDA) || 0
        const lucro = Number(p.LUCRO) || 0
        const margem = venda !== 0 ? lucro / venda : 0
        const metaMargemPct = metaPorSecao.get(p.IDSECAO) ?? null
        const metaMargem = metaMargemPct !== null && metaMargemPct > 0 ? metaMargemPct / 100 : null

        const flags: FlagMargem[] = []
        if (margem === 0) flags.push('ZERO')
        if (margem > LIMITE_MARGEM_ALTA) flags.push('ACIMA_40')
        if (margem < LIMITE_MARGEM_BAIXA) flags.push('ABAIXO_MENOS15')
        if (metaMargem !== null && margem < metaMargem - MARGEM_ABAIXO_META_PP) flags.push('MUITO_ABAIXO_META')

        if (flags.length > 0) {
            excecoes.push({
                IDSECAO: p.IDSECAO,
                IDSUBPRODUTO: p.IDSUBPRODUTO,
                DESCRICAOPRODUTO: p.DESCRICAOPRODUTO,
                IDCODBARPROD: p.IDCODBARPROD,
                VENDA: venda,
                LUCRO: lucro,
                MARGEM: margem,
                META_MARGEM_PCT: metaMargemPct,
                FLAGS: flags,
            })
        }
    }

    excecoes.sort((a, b) => a.LUCRO - b.LUCRO)

    return excecoes
}

export async function getMargemExcecoes(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { inicio, fim, mesano } = req.query as MargemQuery

    if (!inicio || !fim) {
        res.code(400).send({ error: 'Informe os parametros inicio e fim (YYYY-MM-DD).' })
        return
    }

    if (!mesano || !/^\d{6}$/.test(mesano)) {
        res.code(400).send({ error: 'Informe o parametro mesano (AAAAMM).' })
        return
    }

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const excecoes = await buscarExcecoesMargem(virtuais, inicio, fim, mesano)

    res.send(excecoes.slice(0, 200))
}
