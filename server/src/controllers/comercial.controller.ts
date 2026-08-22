import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from '../services/query.service'
import { listMetas } from '../services/metas.service'

const ADMIN_ACCESS = 'admin'

interface PeriodoQuery {
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
    const { filiais } = req.query as PeriodoQuery

    if (!filiais) return filiaisLiberadas

    const solicitadas = filiais
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))

    const selecionadas = filiaisLiberadas.filter((id) => solicitadas.includes(id))

    return selecionadas.length > 0 ? selecionadas : filiaisLiberadas
}

function resolvePeriodo(req: FastifyRequest, res: FastifyReply) {
    const { inicio, fim } = req.query as PeriodoQuery

    if (!inicio || !fim) {
        res.code(400).send({ error: 'Informe os parametros inicio e fim (YYYY-MM-DD).' })
        return null
    }

    return { inicio, fim }
}

function resolveMesano(req: FastifyRequest, res: FastifyReply) {
    const { mesano } = req.query as PeriodoQuery

    if (!mesano || !/^\d{6}$/.test(mesano)) {
        res.code(400).send({ error: 'Informe o parametro mesano (AAAAMM).' })
        return null
    }

    return mesano
}

export async function getMe(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    const branches = await checkBranch(req, res)
    if (!branches) return

    res.send({ permission, branches, isAdmin: permission === ADMIN_ACCESS })
}

interface SecaoLinha {
    IDSECAO: number
    DESCRSECAO: string
    VENDA_ATUAL: number
    LUCRO_ATUAL: number
    COMPRA_ATUAL: number
    VALOR_ESTOQUE: number
    META_VENDA: number
    META_MARGEM_PCT: number
    META_COMPRA: number
    META_REDUCAO_ESTOQUE_PCT: number
}

export async function getVendaMetaSecao(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const mesano = resolveMesano(req, res)
    if (!mesano) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = filiais.join(',')

    const vendaSql = loadQueryComercial('venda_secao.sql').replaceAll('{{FILIAIS}}', filiaisStr)
    const estoqueSql = loadQueryComercial('estoque_secao.sql').replaceAll('{{FILIAIS}}', filiaisStr)

    const conn = await connCiss()
    let venda: any[] = []
    let estoque: any[] = []
    try {
        ;[venda, estoque] = await Promise.all([
            conn.query(vendaSql, [periodo.inicio, periodo.fim]),
            conn.query(estoqueSql),
        ])
    } finally {
        await conn.close()
    }

    const metas = await listMetas(mesano, 100)
    const metasPorSecao = new Map(metas.map((m) => [m.idsecao, m]))
    const estoquePorSecao = new Map(estoque.map((e: any) => [e.IDSECAO, e.VALOR_ESTOQUE]))

    const linhas: SecaoLinha[] = venda.map((v: any) => {
        const meta = metasPorSecao.get(v.IDSECAO)
        return {
            IDSECAO: v.IDSECAO,
            DESCRSECAO: v.DESCRSECAO,
            VENDA_ATUAL: Number(v.VENDA_ATUAL) || 0,
            LUCRO_ATUAL: Number(v.LUCRO_ATUAL) || 0,
            COMPRA_ATUAL: Number(v.COMPRA_ATUAL) || 0,
            VALOR_ESTOQUE: Number(estoquePorSecao.get(v.IDSECAO)) || 0,
            META_VENDA: meta?.meta_venda ?? 0,
            META_MARGEM_PCT: meta?.meta_margem_pct ?? 0,
            META_COMPRA: meta?.meta_compra ?? 0,
            META_REDUCAO_ESTOQUE_PCT: meta?.meta_reducao_estoque_pct ?? 0,
        }
    })

    res.send(linhas)
}

export async function getSecoes(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    const sql = loadQueryComercial('secoes.sql')

    const conn = await connCiss()
    try {
        const data = await conn.query(sql)
        res.send(data)
    } finally {
        await conn.close()
    }
}

export async function getTicketOperador(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const sql = loadQueryComercial('ticket_operador.sql').replaceAll('{{FILIAIS}}', filiais.join(','))

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, [periodo.inicio, periodo.fim])
        res.send(data)
    } finally {
        await conn.close()
    }
}

export async function getFabricantes(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    const sql = loadQueryComercial('fabricantes.sql')

    const conn = await connCiss()
    try {
        const data = await conn.query(sql)
        res.send(data)
    } finally {
        await conn.close()
    }
}

function deslocarAno(data: string, anos: number) {
    const [ano, mes, dia] = data.split('-').map(Number)
    const d = new Date(Date.UTC(ano - anos, mes - 1, dia))
    return d.toISOString().slice(0, 10)
}

interface ComparativoQuery extends PeriodoQuery {
    fabricante?: string
}

export async function getComparativoFabricante(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const { fabricante } = req.query as ComparativoQuery
    if (!fabricante || fabricante.trim().length === 0) {
        res.code(400).send({ error: 'Informe o parametro fabricante.' })
        return
    }

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = filiais.join(',')

    const vendaSql = loadQueryComercial('venda_produto_fabricante.sql').replaceAll('{{FILIAIS}}', filiaisStr)
    const estoqueSql = loadQueryComercial('estoque_produto_fabricante.sql').replaceAll('{{FILIAIS}}', filiaisStr)

    const periodoAnterior = { inicio: deslocarAno(periodo.inicio, 1), fim: deslocarAno(periodo.fim, 1) }
    const periodo2AnosAtras = { inicio: deslocarAno(periodo.inicio, 2), fim: deslocarAno(periodo.fim, 2) }

    const conn = await connCiss()
    try {
        const [atual, anterior, doisAnos, estoque] = await Promise.all([
            conn.query(vendaSql, [periodo.inicio, periodo.fim, fabricante]),
            conn.query(vendaSql, [periodoAnterior.inicio, periodoAnterior.fim, fabricante]),
            conn.query(vendaSql, [periodo2AnosAtras.inicio, periodo2AnosAtras.fim, fabricante]),
            conn.query(estoqueSql, [fabricante]),
        ])

        const anteriorPorProduto = new Map(anterior.map((r: any) => [r.IDSUBPRODUTO, r]))
        const doisAnosPorProduto = new Map(doisAnos.map((r: any) => [r.IDSUBPRODUTO, r]))
        const estoquePorProduto = new Map(estoque.map((r: any) => [r.IDSUBPRODUTO, r.VALOR_ESTOQUE]))

        const linhas = atual.map((row: any) => {
            const ant: any = anteriorPorProduto.get(row.IDSUBPRODUTO)
            const dois: any = doisAnosPorProduto.get(row.IDSUBPRODUTO)
            return {
                IDSUBPRODUTO: row.IDSUBPRODUTO,
                DESCRICAOPRODUTO: row.DESCRICAOPRODUTO,
                VENDA_ATUAL: Number(row.VENDA) || 0,
                LUCRO_ATUAL: Number(row.LUCRO) || 0,
                VENDA_ANO_ANTERIOR: Number(ant?.VENDA) || 0,
                LUCRO_ANO_ANTERIOR: Number(ant?.LUCRO) || 0,
                VENDA_2_ANOS_ANTES: Number(dois?.VENDA) || 0,
                LUCRO_2_ANOS_ANTES: Number(dois?.LUCRO) || 0,
                VALOR_ESTOQUE: Number(estoquePorProduto.get(row.IDSUBPRODUTO)) || 0,
            }
        })

        res.send(linhas)
    } finally {
        await conn.close()
    }
}

export async function getOperacional(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = filiais.join(',')

    const perdasSql = loadQueryComercial('perdas_fornecedor.sql').replaceAll('{{FILIAIS}}', filiaisStr)
    const avariaSql = loadQueryComercial('avaria_estoque.sql').replaceAll('{{FILIAIS}}', filiaisStr)
    const pedidosPendentesSql = loadQueryComercial('pedidos_pendentes.sql').replaceAll('{{FILIAIS}}', filiaisStr)

    const conn = await connCiss()
    try {
        const [perdas, avaria, pedidosPendentes] = await Promise.all([
            conn.query(perdasSql, [periodo.inicio, periodo.fim]),
            conn.query(avariaSql, [periodo.inicio, periodo.fim]),
            conn.query(pedidosPendentesSql),
        ])
        res.send({ perdas, avaria, pedidosPendentes })
    } finally {
        await conn.close()
    }
}

interface BuscaQuery {
    busca?: string
}

export async function getTributacao(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    if (permission !== ADMIN_ACCESS) {
        res.code(403).send({ error: 'Acesso restrito a administradores.' })
        return
    }

    const { busca } = req.query as BuscaQuery

    if (!busca || busca.trim().length < 3) {
        res.code(400).send({ error: 'Informe ao menos 3 caracteres para buscar.' })
        return
    }

    const sql = loadQueryComercial('tributacao_busca.sql')

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, [`%${busca.trim()}%`])
        res.send(data)
    } finally {
        await conn.close()
    }
}

export async function getVendaSecaoLoja(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const sql = loadQueryComercial('venda_secao_loja.sql').replaceAll('{{FILIAIS}}', filiais.join(','))

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, [periodo.inicio, periodo.fim])
        res.send(data)
    } finally {
        await conn.close()
    }
}
