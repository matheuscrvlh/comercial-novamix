import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from '../services/query.service'
import { comFiltroEcommerce, resolveFiliaisFisicas } from '../utils/filiais'

interface PromocoesQuery {
    inicio?: string
    fim?: string
    filiais?: string
}

async function resolveFiliais(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return null

    const branches = await checkBranch(req, res)
    if (!branches) return null

    return branches
}

function resolveFiliaisSelecionadas(req: FastifyRequest, filiaisLiberadas: number[]) {
    const liberadasComEcommerce = comFiltroEcommerce(filiaisLiberadas)

    const { filiais } = req.query as PromocoesQuery

    if (!filiais) return liberadasComEcommerce

    const solicitadas = filiais
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))

    const selecionadas = liberadasComEcommerce.filter((id) => solicitadas.includes(id))

    return selecionadas.length > 0 ? selecionadas : liberadasComEcommerce
}

function hojeISO() {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}

function diasEntreISO(inicioISO: string, fimISO: string) {
    const inicio = new Date(`${inicioISO}T00:00:00Z`)
    const fim = new Date(`${fimISO}T00:00:00Z`)
    return Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1)
}

function deslocarDiasISO(dataISO: string, dias: number) {
    const d = new Date(`${dataISO}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + dias)
    return d.toISOString().slice(0, 10)
}

type StatusPromocao = 'ativa' | 'futura' | 'encerrada'

function statusPromocao(dtIni: string, dtFim: string, hoje: string): StatusPromocao {
    const dtIniISO = String(dtIni).slice(0, 10)
    const dtFimISO = String(dtFim).slice(0, 10)
    if (hoje < dtIniISO) return 'futura'
    if (hoje > dtFimISO) return 'encerrada'
    return 'ativa'
}

export async function getPromocoes(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { inicio, fim } = req.query as PromocoesQuery
    if (!inicio || !fim) {
        res.code(400).send({ error: 'Informe os parametros inicio e fim (YYYY-MM-DD).' })
        return
    }

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = resolveFiliaisFisicas(virtuais).join(',')

    const sql = loadQueryComercial('promocoes_ativas.sql').replaceAll('{{FILIAIS}}', filiaisStr)

    const conn = await connCiss()
    let linhas: any[] = []
    try {
        linhas = await conn.query(sql, [inicio, fim])
    } finally {
        await conn.close()
    }

    const hoje = hojeISO()
    const resultado = linhas.map((row: any) => ({
        IDPROMOCAO: row.IDPROMOCAO,
        DESCRPROMOCAO: row.DESCRPROMOCAO,
        DTINIPROMOCAO: row.DTINIPROMOCAO,
        DTFIMPROMOCAO: row.DTFIMPROMOCAO,
        QTD_PRODUTOS: Number(row.QTD_PRODUTOS) || 0,
        QTD_LOJAS: Number(row.QTD_LOJAS) || 0,
        STATUS: statusPromocao(row.DTINIPROMOCAO, row.DTFIMPROMOCAO, hoje),
    }))

    res.send(resultado)
}

interface DetalheQuery {
    idpromocao?: string
}

export async function getPromocaoDetalhe(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { idpromocao } = req.query as DetalheQuery
    const idPromocaoNum = idpromocao ? parseInt(idpromocao, 10) : NaN
    if (Number.isNaN(idPromocaoNum)) {
        res.code(400).send({ error: 'Informe o parametro idpromocao.' })
        return
    }

    const headerSql = loadQueryComercial('promocao_header.sql')
    const lojasSql = loadQueryComercial('promocao_lojas.sql')
    const produtosSql = loadQueryComercial('promocao_produtos.sql')

    const conn = await connCiss()
    try {
        const [headerRows, lojasBrutas, produtos] = await Promise.all([
            conn.query(headerSql, [idPromocaoNum]),
            conn.query(lojasSql, [idPromocaoNum]),
            conn.query(produtosSql, [idPromocaoNum]),
        ])

        const header = headerRows[0]
        if (!header) {
            res.code(404).send({ error: 'Promocao nao encontrada.' })
            return
        }

        const filiaisFisicasLiberadas = resolveFiliaisFisicas(comFiltroEcommerce(filiaisLiberadas))
        const lojas = lojasBrutas.filter((l: any) => filiaisFisicasLiberadas.includes(l.IDEMPRESA))

        if (lojas.length === 0) {
            res.code(403).send({ error: 'Sem acesso as lojas dessa promocao.' })
            return
        }

        const filiaisStr = lojas.map((l: any) => l.IDEMPRESA).join(',')
        const dtIni = String(header.DTINIPROMOCAO).slice(0, 10)
        const dtFim = String(header.DTFIMPROMOCAO).slice(0, 10)

        const hoje = hojeISO()
        const diasPromo = diasEntreISO(dtIni, dtFim)
        const dtFimEfetivo = dtFim < hoje ? dtFim : hoje
        const diasDecorridos = dtIni <= hoje ? diasEntreISO(dtIni, dtFimEfetivo) : 0

        const baselineFim = deslocarDiasISO(dtIni, -1)
        const baselineInicio = deslocarDiasISO(dtIni, -diasPromo)

        const desempenhoSql = loadQueryComercial('promocao_desempenho.sql').replaceAll('{{FILIAIS}}', filiaisStr)
        const [desempenho, desempenhoAntes] = await Promise.all([
            conn.query(desempenhoSql, [dtIni, dtFimEfetivo, idPromocaoNum]),
            diasDecorridos > 0 ? conn.query(desempenhoSql, [baselineInicio, baselineFim, idPromocaoNum]) : Promise.resolve([]),
        ])
        const desempenhoPorProduto = new Map(desempenho.map((d: any) => [d.IDSUBPRODUTO, d]))
        const desempenhoAntesPorProduto = new Map(desempenhoAntes.map((d: any) => [d.IDSUBPRODUTO, d]))

        const produtosComDesempenho = produtos.map((p: any) => {
            const d: any = desempenhoPorProduto.get(p.IDSUBPRODUTO)
            const antes: any = desempenhoAntesPorProduto.get(p.IDSUBPRODUTO)
            return {
                IDSUBPRODUTO: p.IDSUBPRODUTO,
                DESCRICAOPRODUTO: p.DESCRICAOPRODUTO,
                IDCODBARPROD: p.IDCODBARPROD,
                VALPRECO: Number(p.VALPRECO) || 0,
                VALDESCONTO: Number(p.VALDESCONTO) || 0,
                PERDESCONTO: Number(p.PERDESCONTO) || 0,
                VENDA: Number(d?.VENDA) || 0,
                LUCRO: Number(d?.LUCRO) || 0,
                QTD_VENDIDA: Number(d?.QTD_VENDIDA) || 0,
                VENDA_MEDIA_DIARIA_ANTES: diasPromo > 0 ? (Number(antes?.VENDA) || 0) / diasPromo : 0,
                QTD_MEDIA_DIARIA_ANTES: diasPromo > 0 ? (Number(antes?.QTD_VENDIDA) || 0) / diasPromo : 0,
            }
        })

        const totalVendaDurante = produtosComDesempenho.reduce((acc, p) => acc + p.VENDA, 0)
        const totalVendaAntes = desempenhoAntes.reduce((acc: number, d: any) => acc + (Number(d.VENDA) || 0), 0)
        const mediaDiariaDurante = diasDecorridos > 0 ? totalVendaDurante / diasDecorridos : null
        const mediaDiariaAntes = diasDecorridos > 0 ? totalVendaAntes / diasPromo : null
        const liftVendaPct =
            mediaDiariaDurante !== null && mediaDiariaAntes !== null && mediaDiariaAntes > 0
                ? (mediaDiariaDurante - mediaDiariaAntes) / mediaDiariaAntes
                : null

        res.send({
            IDPROMOCAO: header.IDPROMOCAO,
            DESCRPROMOCAO: header.DESCRPROMOCAO,
            DTINIPROMOCAO: header.DTINIPROMOCAO,
            DTFIMPROMOCAO: header.DTFIMPROMOCAO,
            lojas: lojas.map((l: any) => ({ IDEMPRESA: l.IDEMPRESA, NOME_EMPRESA: l.NOME_EMPRESA })),
            produtos: produtosComDesempenho,
            analitico: {
                mediaDiariaDurante,
                mediaDiariaAntes,
                liftVendaPct,
                diasComparados: diasDecorridos > 0 ? Math.min(diasDecorridos, diasPromo) : 0,
            },
        })
    } finally {
        await conn.close()
    }
}
