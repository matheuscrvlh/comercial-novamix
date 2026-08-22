import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { connCiss } from '../database/ciss.database'
import { loadQueryFinanceiro } from '../services/query.service'

const ADMIN_ACCESS = 'admin'

interface PeriodoQuery {
    inicio?: string
    fim?: string
    filiais?: string
}

interface ResolveFiliaisOpts {
    adminOnly?: boolean
}

async function resolveFiliais(req: FastifyRequest, res: FastifyReply, opts: ResolveFiliaisOpts = {}) {
    const permission = await checkPermission(req, res)
    if (!permission) return null

    if (opts.adminOnly && permission !== ADMIN_ACCESS) {
        res.code(403).send({ error: 'Acesso restrito a administradores.' })
        return null
    }

    const branches = await checkBranch(req, res)
    if (!branches) return null

    return branches
}

/**
 * O usuário pode filtrar por um subconjunto das próprias filiais liberadas
 * (?filiais=1,3). Nunca confiamos nesse parâmetro sozinho — ele só pode
 * restringir, nunca ampliar, o que já veio verificado do JWT.
 */
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
        res.code(400).send({ error: 'Informe os parâmetros inicio e fim (YYYY-MM-DD).' })
        return null
    }

    return { inicio, fim }
}

async function executarRelatorio(req: FastifyRequest, res: FastifyReply, arquivo: string) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const sql = loadQueryFinanceiro(arquivo).replaceAll('{{FILIAIS}}', filiais.join(','))

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, [periodo.inicio, periodo.fim])
        res.send(data)
    } finally {
        await conn.close()
    }
}

/**
 * Métricas de posição (estoque, contas a receber/pagar em aberto, liquidez corrente)
 * são saldo "agora", não soma de um período — por isso não recebem inicio/fim.
 * São restritas a administradores.
 */
async function executarRelatorioAtual(req: FastifyRequest, res: FastifyReply, arquivo: string) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const sql = loadQueryFinanceiro(arquivo).replaceAll('{{FILIAIS}}', filiais.join(','))

    const conn = await connCiss()
    try {
        const data = await conn.query(sql)
        res.send(data)
    } finally {
        await conn.close()
    }
}

export async function getMe(req: FastifyRequest, res: FastifyReply) {
    const permission = await checkPermission(req, res)
    if (!permission) return

    const branches = await checkBranch(req, res)
    if (!branches) return

    res.send({ permission, branches, isAdmin: permission === ADMIN_ACCESS })
}

export async function getVendaBruta(req: FastifyRequest, res: FastifyReply) {
    await executarRelatorio(req, res, 'valor_venda_bruta.sql')
}

export async function getLucroBruto(req: FastifyRequest, res: FastifyReply) {
    await executarRelatorio(req, res, 'valor_lucro_bruto.sql')
}

export async function getLucroLiquido(req: FastifyRequest, res: FastifyReply) {
    await executarRelatorio(req, res, 'valor_lucro_liquido.sql')
}

export async function getCancelamentos(req: FastifyRequest, res: FastifyReply) {
    await executarRelatorio(req, res, 'valor_cancelamentos.sql')
}

export async function getDevolucoes(req: FastifyRequest, res: FastifyReply) {
    await executarRelatorio(req, res, 'valor_devolucoes.sql')
}

export async function getNumeroCupons(req: FastifyRequest, res: FastifyReply) {
    await executarRelatorio(req, res, 'valor_numero_cupons.sql')
}

export async function getTicketMedio(req: FastifyRequest, res: FastifyReply) {
    await executarRelatorio(req, res, 'valor_ticket_medio.sql')
}

export async function getValorEstoque(req: FastifyRequest, res: FastifyReply) {
    await executarRelatorioAtual(req, res, 'valor_estoque.sql')
}

export async function getLiquidezCorrente(req: FastifyRequest, res: FastifyReply) {
    await executarRelatorioAtual(req, res, 'liquidez_corrente.sql')
}

interface DataBaseQuery {
    dataBase?: string
    filiais?: string
}

function resolveDataBase(req: FastifyRequest, res: FastifyReply) {
    const { dataBase } = req.query as DataBaseQuery

    if (!dataBase) return new Date().toISOString().slice(0, 10)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataBase)) {
        res.code(400).send({ error: 'Parametro dataBase invalido (YYYY-MM-DD).' })
        return null
    }

    return dataBase
}

function anoAtras(dataBase: string) {
    const data = new Date(`${dataBase}T00:00:00Z`)
    data.setUTCFullYear(data.getUTCFullYear() - 1)
    data.setUTCDate(data.getUTCDate() + 1)
    return data.toISOString().slice(0, 10)
}

/**
 * Paginas de Despesas, Resultado, Balanco e detalhe de Contas a Pagar/Receber expoem
 * dado contabil/posicao sensivel (fornecedores, clientes, DRE) - mesmo nivel de acesso
 * que as metricas "atuais" (estoque, liquidez) que ja eram restritas a admin.
 */
export async function getDespesas(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas).join(',')
    const params = [periodo.inicio, periodo.fim]

    const porNaturezaSql = loadQueryFinanceiro('despesa_por_natureza.sql').replaceAll('{{FILIAIS}}', filiais)
    const porLojaSql = loadQueryFinanceiro('despesa_por_loja.sql').replaceAll('{{FILIAIS}}', filiais)
    const porNaturezaLojaSql = loadQueryFinanceiro('despesa_por_natureza_loja.sql').replaceAll('{{FILIAIS}}', filiais)
    const evolucaoMensalSql = loadQueryFinanceiro('despesa_evolucao_mensal.sql').replaceAll('{{FILIAIS}}', filiais)
    const receitaLiquidaSql = loadQueryFinanceiro('receita_liquida_contabil.sql').replaceAll('{{FILIAIS}}', filiais)

    const conn = await connCiss()
    try {
        const [porNatureza, porLoja, porNaturezaLoja, evolucaoMensal, receitaLiquida] = await Promise.all([
            conn.query(porNaturezaSql, params),
            conn.query(porLojaSql, params),
            conn.query(porNaturezaLojaSql, params),
            conn.query(evolucaoMensalSql, params),
            conn.query(receitaLiquidaSql, params),
        ])
        res.send({ porNatureza, porLoja, porNaturezaLoja, evolucaoMensal, receitaLiquida })
    } finally {
        await conn.close()
    }
}

export async function getResultadoDre(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas).join(',')
    const sql = loadQueryFinanceiro('resultado_dre.sql').replaceAll('{{FILIAIS}}', filiais)

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, [periodo.inicio, periodo.fim])
        res.send(data)
    } finally {
        await conn.close()
    }
}

export async function getResultadoDreMensal(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas).join(',')
    const sql = loadQueryFinanceiro('resultado_dre_mensal.sql').replaceAll('{{FILIAIS}}', filiais)

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, [periodo.inicio, periodo.fim])
        res.send(data)
    } finally {
        await conn.close()
    }
}

export async function getBalanco(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const dataBase = resolveDataBase(req, res)
    if (!dataBase) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas).join(',')
    const sql = loadQueryFinanceiro('balanco_detalhe.sql').replaceAll('{{FILIAIS}}', filiais)

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, [dataBase])
        res.send({ dataBase, linhas: data })
    } finally {
        await conn.close()
    }
}

export async function getContasPagarDetalhe(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas).join(',')

    const situacaoSql = loadQueryFinanceiro('contas_pagar_situacao.sql').replaceAll('{{FILIAIS}}', filiais)
    const fornecedoresSql = loadQueryFinanceiro('contas_pagar_fornecedores.sql').replaceAll('{{FILIAIS}}', filiais)
    const porLojaSql = loadQueryFinanceiro('contas_pagar_por_loja.sql').replaceAll('{{FILIAIS}}', filiais)

    const conn = await connCiss()
    try {
        const [situacao, fornecedores, porLoja] = await Promise.all([
            conn.query(situacaoSql),
            conn.query(fornecedoresSql),
            conn.query(porLojaSql),
        ])
        res.send({ situacao, fornecedores, porLoja })
    } finally {
        await conn.close()
    }
}

export async function getContasReceberDetalhe(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const dataBase = resolveDataBase(req, res)
    if (!dataBase) return

    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas).join(',')

    const situacaoSql = loadQueryFinanceiro('contas_receber_situacao.sql').replaceAll('{{FILIAIS}}', filiais)
    const clientesSql = loadQueryFinanceiro('contas_receber_clientes.sql').replaceAll('{{FILIAIS}}', filiais)
    const formaPagamentoSql = loadQueryFinanceiro('contas_receber_forma_pagamento.sql').replaceAll(
        '{{FILIAIS}}',
        filiais
    )
    const recorrenciaSql = loadQueryFinanceiro('contas_receber_recorrencia.sql').replaceAll('{{FILIAIS}}', filiais)

    const conn = await connCiss()
    try {
        const [situacao, clientes, formaPagamento, recorrencia] = await Promise.all([
            conn.query(situacaoSql),
            conn.query(clientesSql),
            conn.query(formaPagamentoSql),
            conn.query(recorrenciaSql, [anoAtras(dataBase), dataBase]),
        ])
        res.send({ situacao, clientes, formaPagamento, recorrencia })
    } finally {
        await conn.close()
    }
}

interface EscopoQuery {
    escopoInicio?: string
}

function resolveEscopoInicio(req: FastifyRequest) {
    const { escopoInicio } = req.query as EscopoQuery
    return escopoInicio && /^\d{4}-\d{2}-\d{2}$/.test(escopoInicio) ? escopoInicio : '2025-01-01'
}

/**
 * Conciliacoes puxa direto do CISS (EXTRATO_BANCARIO, CLW_RETORNO_CONTAS_RECEBER,
 * CONTABIL_MOVIMENTO, CONTABIL_SALDO) - nao ha filtro de filial para banco/cartao porque
 * essas tabelas nao carregam IDEMPRESA (conta bancaria nao e de uma loja especifica).
 */
export async function getConciliacaoBanco(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const escopoInicio = resolveEscopoInicio(req)

    const resumoSql = loadQueryFinanceiro('conciliacao_banco_resumo.sql')
    const porMesSql = loadQueryFinanceiro('conciliacao_banco_por_mes.sql')
    const porContaSql = loadQueryFinanceiro('conciliacao_banco_por_conta.sql')

    const conn = await connCiss()
    try {
        const [resumo, porMes, porConta] = await Promise.all([
            conn.query(resumoSql, [escopoInicio]),
            conn.query(porMesSql, [escopoInicio]),
            conn.query(porContaSql, [escopoInicio]),
        ])
        res.send({ resumo: resumo[0], porMes, porConta })
    } finally {
        await conn.close()
    }
}

export async function getConciliacaoCartao(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const escopoInicio = resolveEscopoInicio(req)

    const resumoSql = loadQueryFinanceiro('conciliacao_cartao_resumo.sql')
    const agingSql = loadQueryFinanceiro('conciliacao_cartao_aging.sql')

    const conn = await connCiss()
    try {
        const [resumo, aging] = await Promise.all([conn.query(resumoSql, [escopoInicio]), conn.query(agingSql)])
        res.send({ resumo: resumo[0], aging })
    } finally {
        await conn.close()
    }
}

export async function getConciliacaoContabil(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res, { adminOnly: true })
    if (!filiaisLiberadas) return

    const dataBase = resolveDataBase(req, res)
    if (!dataBase) return

    const escopoInicio = resolveEscopoInicio(req)
    const filiais = resolveFiliaisSelecionadas(req, filiaisLiberadas).join(',')

    const lotesSql = loadQueryFinanceiro('conciliacao_contabil_lotes.sql').replaceAll('{{FILIAIS}}', filiais)
    const intercompanySql = loadQueryFinanceiro('conciliacao_contabil_intercompany.sql').replaceAll(
        '{{FILIAIS}}',
        filiais
    )
    const classificarSql = loadQueryFinanceiro('conciliacao_contabil_classificar.sql').replaceAll(
        '{{FILIAIS}}',
        filiais
    )

    const conn = await connCiss()
    try {
        const [lotes, intercompany, classificar] = await Promise.all([
            conn.query(lotesSql, [escopoInicio, dataBase]),
            conn.query(intercompanySql, [dataBase]),
            conn.query(classificarSql, [dataBase]),
        ])
        res.send({ lotes, intercompany: intercompany[0], classificar })
    } finally {
        await conn.close()
    }
}
