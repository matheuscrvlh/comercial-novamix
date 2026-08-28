import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from '../services/query.service'
import { buscarExcecoesMargem } from './margem.controller'
import { comFiltroEcommerce, condicaoEcommerce, resolveFiliaisFisicas } from '../utils/filiais'
import { condicaoMercadologica, type FiltroMercadologicoQuery } from '../utils/mercadologico'

interface ResumoQuery extends FiltroMercadologicoQuery {
    inicio?: string
    fim?: string
    filiais?: string
    mesano?: string
}

/**
 * O dashboard eh visivel para qualquer acesso liberado no modulo 'comercial'
 * (read ou admin) - diferente das telas de detalhe, que exigem admin.
 */
async function resolveFiliais(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return null

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

export async function getDashboardResumo(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const { inicio, fim, mesano } = req.query as ResumoQuery

    if (!inicio || !fim) {
        res.code(400).send({ error: 'Informe os parametros inicio e fim (YYYY-MM-DD).' })
        return
    }

    if (!mesano || !/^\d{6}$/.test(mesano)) {
        res.code(400).send({ error: 'Informe o parametro mesano (AAAAMM).' })
        return
    }

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = resolveFiliaisFisicas(virtuais).join(',')
    const mercadologico = condicaoMercadologica(req.query as FiltroMercadologicoQuery)

    const vendaTotalSql = loadQueryComercial('venda_total.sql')
        .replaceAll('{{FILIAIS}}', filiaisStr)
        .replaceAll('{{ECOMMERCE}}', condicaoEcommerce(virtuais))
        .replace('{{MERCADOLOGICO}}', mercadologico)
    const estoqueNegativoSql = loadQueryComercial('estoque_negativo.sql')
        .replaceAll('{{FILIAIS}}', filiaisStr)
        .replace('{{MERCADOLOGICO}}', mercadologico)
    const pedidosPendentesSql = loadQueryComercial('pedidos_pendentes.sql')
        .replaceAll('{{FILIAIS}}', filiaisStr)
        .replace('{{MERCADOLOGICO}}', mercadologico)
    const perdasSql = loadQueryComercial('perdas_fornecedor.sql')
        .replaceAll('{{FILIAIS}}', filiaisStr)
        .replace('{{MERCADOLOGICO}}', mercadologico)

    const conn = await connCiss()
    let vendaTotal: any[] = []
    let estoqueNegativo: any[] = []
    let pedidosPendentes: any[] = []
    let perdas: any[] = []
    try {
        ;[vendaTotal, estoqueNegativo, pedidosPendentes, perdas] = await Promise.all([
            conn.query(vendaTotalSql, [inicio, fim]),
            conn.query(estoqueNegativoSql),
            conn.query(pedidosPendentesSql),
            conn.query(perdasSql, [inicio, fim]),
        ])
    } finally {
        await conn.close()
    }

    const excecoesMargem = await buscarExcecoesMargem(virtuais, inicio, fim, mesano)

    const vendaHoje = Number(vendaTotal[0]?.VENDA_TOTAL) || 0
    const lucroHoje = Number(vendaTotal[0]?.LUCRO_TOTAL) || 0
    const compraHoje = Number(vendaTotal[0]?.COMPRA_TOTAL) || 0

    const pedidosPendentesValor = pedidosPendentes.reduce((acc: number, p: any) => acc + (Number(p.VALOR_PENDENTE) || 0), 0)
    const perdasValor = perdas.reduce((acc: number, p: any) => acc + (Number(p.VALOR) || 0), 0)

    res.send({
        vendaHoje,
        lucroHoje,
        compraHoje,
        margemHoje: vendaHoje !== 0 ? lucroHoje / vendaHoje : 0,
        estoqueNegativoCount: estoqueNegativo.length,
        margemExcecoesCount: excecoesMargem.length,
        pedidosPendentesValor,
        pedidosPendentesCount: pedidosPendentes.length,
        perdasValor,
    })
}
