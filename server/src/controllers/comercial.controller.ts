import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkBranch, checkPermission } from '../middlewares/auth.middlewares'
import { connCiss } from '../database/ciss.database'
import { loadQueryComercial } from '../services/query.service'
import { listMetasComFallback } from '../services/metas.service'
import { comFiltroEcommerce, condicaoEcommerce, condicaoEcommerceOperador, resolveFiliaisFisicas } from '../utils/filiais'
import { DIVISOES_EXCLUIDAS_INATIVACAO } from '../constants/categoriasExcecaoInativacao'

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

/**
 * Retorna a lista de filiais "virtuais" selecionadas (pode incluir 99 = E-commerce,
 * que nao existe fisicamente no banco - ver server/src/utils/filiais.ts).
 */
function resolveFiliaisSelecionadas(req: FastifyRequest, filiaisLiberadas: number[]) {
    const liberadasComEcommerce = comFiltroEcommerce(filiaisLiberadas)

    const { filiais } = req.query as PeriodoQuery

    if (!filiais) return liberadasComEcommerce

    const solicitadas = filiais
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))

    const selecionadas = liberadasComEcommerce.filter((id) => solicitadas.includes(id))

    return selecionadas.length > 0 ? selecionadas : liberadasComEcommerce
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
    META_AVARIA: number
    AVARIA_ATUAL: number
    PERC_COMPRA_VENDA: number | null
    COMPRA_ANUAL: number
    VENDA_ANO_ANTERIOR: number
    VARIACAO_ANO_PCT: number | null
    PROJECAO_VENDA: number
    VENDA_DIA: number
}

/**
 * Data de hoje no calendario local do servidor (nao UTC) - toISOString() usa UTC,
 * entao a noite (BRT = UTC-3) ele "pula" pro dia seguinte antes da hora e zera
 * tudo que depende de "hoje" (ex: Venda Dia), porque o CISS ainda nao tem
 * movimento nenhum lancado nessa data que ainda nao comecou aqui.
 */
function hojeISO() {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
}

function inicioAnoISO(dataISO: string) {
    return `${dataISO.slice(0, 4)}-01-01`
}

function diasEntre(inicioISO: string, fimISO: string) {
    const inicio = new Date(`${inicioISO}T00:00:00Z`)
    const fim = new Date(`${fimISO}T00:00:00Z`)
    return Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1)
}

function diasNoMes(dataISO: string) {
    const [ano, mes] = dataISO.split('-').map(Number)
    return new Date(ano, mes, 0).getDate()
}

export async function getVendaMetaSecao(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const mesano = resolveMesano(req, res)
    if (!mesano) return

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = resolveFiliaisFisicas(virtuais).join(',')
    const ecommerce = condicaoEcommerce(virtuais)

    const vendaSql = loadQueryComercial('venda_secao.sql')
        .replaceAll('{{FILIAIS}}', filiaisStr)
        .replaceAll('{{ECOMMERCE}}', ecommerce)
    const estoqueSql = loadQueryComercial('estoque_secao.sql').replaceAll('{{FILIAIS}}', filiaisStr)
    const avariaSql = loadQueryComercial('avaria_secao.sql').replaceAll('{{FILIAIS}}', filiaisStr)

    const hoje = hojeISO()
    const periodoAnoAnterior = { inicio: deslocarAno(periodo.inicio, 1), fim: deslocarAno(periodo.fim, 1) }
    const periodoAnual = { inicio: inicioAnoISO(periodo.fim), fim: periodo.fim }

    const conn = await connCiss()
    let venda: any[] = []
    let estoque: any[] = []
    let avaria: any[] = []
    let vendaAnoAnterior: any[] = []
    let compraAnual: any[] = []
    let vendaDia: any[] = []
    try {
        ;[venda, estoque, avaria, vendaAnoAnterior, compraAnual, vendaDia] = await Promise.all([
            conn.query(vendaSql, [periodo.inicio, periodo.fim]),
            conn.query(estoqueSql),
            conn.query(avariaSql, [periodo.inicio, periodo.fim]),
            conn.query(vendaSql, [periodoAnoAnterior.inicio, periodoAnoAnterior.fim]),
            conn.query(vendaSql, [periodoAnual.inicio, periodoAnual.fim]),
            conn.query(vendaSql, [hoje, hoje]),
        ])
    } finally {
        await conn.close()
    }

    const metas = await listMetasComFallback(mesano, virtuais)
    const metasPorSecao = new Map(metas.map((m) => [m.idsecao, m]))
    const estoquePorSecao = new Map(estoque.map((e: any) => [e.IDSECAO, e.VALOR_ESTOQUE]))
    const avariaPorSecao = new Map(avaria.map((a: any) => [a.IDSECAO, a.VALOR]))
    const vendaAnoAnteriorPorSecao = new Map(vendaAnoAnterior.map((v: any) => [v.IDSECAO, v.VENDA_ATUAL]))
    const compraAnualPorSecao = new Map(compraAnual.map((v: any) => [v.IDSECAO, v.COMPRA_ATUAL]))
    const vendaDiaPorSecao = new Map(vendaDia.map((v: any) => [v.IDSECAO, v.VENDA_ATUAL]))

    const diasDecorridos = diasEntre(periodo.inicio, periodo.fim)
    const totalDiasMes = diasNoMes(periodo.fim)

    const linhas: SecaoLinha[] = venda.map((v: any) => {
        const meta = metasPorSecao.get(v.IDSECAO)
        const vendaAtual = Number(v.VENDA_ATUAL) || 0
        const compraAtual = Number(v.COMPRA_ATUAL) || 0
        const vendaAnoAnteriorValor = Number(vendaAnoAnteriorPorSecao.get(v.IDSECAO)) || 0

        return {
            IDSECAO: v.IDSECAO,
            DESCRSECAO: v.DESCRSECAO,
            VENDA_ATUAL: vendaAtual,
            LUCRO_ATUAL: Number(v.LUCRO_ATUAL) || 0,
            COMPRA_ATUAL: compraAtual,
            VALOR_ESTOQUE: Number(estoquePorSecao.get(v.IDSECAO)) || 0,
            META_VENDA: meta?.meta_venda ?? 0,
            META_MARGEM_PCT: meta?.meta_margem_pct ?? 0,
            META_COMPRA: meta?.meta_compra ?? 0,
            META_REDUCAO_ESTOQUE_PCT: meta?.meta_reducao_estoque_pct ?? 0,
            META_AVARIA: meta?.meta_avaria ?? 0,
            AVARIA_ATUAL: Number(avariaPorSecao.get(v.IDSECAO)) || 0,
            PERC_COMPRA_VENDA: vendaAtual > 0 ? compraAtual / vendaAtual : null,
            COMPRA_ANUAL: Number(compraAnualPorSecao.get(v.IDSECAO)) || 0,
            VENDA_ANO_ANTERIOR: vendaAnoAnteriorValor,
            VARIACAO_ANO_PCT: vendaAnoAnteriorValor > 0 ? (vendaAtual - vendaAnoAnteriorValor) / vendaAnoAnteriorValor : null,
            PROJECAO_VENDA: (vendaAtual / diasDecorridos) * totalDiasMes,
            VENDA_DIA: Number(vendaDiaPorSecao.get(v.IDSECAO)) || 0,
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

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const sql = loadQueryComercial('ticket_operador.sql')
        .replaceAll('{{FILIAIS}}', resolveFiliaisFisicas(virtuais).join(','))
        .replaceAll('{{ECOMMERCE}}', condicaoEcommerceOperador(virtuais))

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

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = resolveFiliaisFisicas(virtuais).join(',')
    const ecommerce = condicaoEcommerce(virtuais)

    const vendaSql = loadQueryComercial('venda_produto_fabricante.sql')
        .replaceAll('{{FILIAIS}}', filiaisStr)
        .replaceAll('{{ECOMMERCE}}', ecommerce)
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
                IDCODBARPROD: row.IDCODBARPROD,
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

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = resolveFiliaisFisicas(virtuais).join(',')

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
    const termo = busca.trim()

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, [`%${termo}%`, `${termo}%`, `${termo}%`])
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

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const sql = loadQueryComercial('venda_secao_loja.sql').replaceAll('{{FILIAIS}}', resolveFiliaisFisicas(virtuais).join(','))

    const conn = await connCiss()
    try {
        const data = await conn.query(sql, [periodo.inicio, periodo.fim])
        res.send(data)
    } finally {
        await conn.close()
    }
}

function gerarDias(inicioISO: string, fimISO: string): string[] {
    const dias: string[] = []
    let atual = new Date(`${inicioISO}T00:00:00Z`)
    const fim = new Date(`${fimISO}T00:00:00Z`)
    while (atual.getTime() <= fim.getTime()) {
        dias.push(atual.toISOString().slice(0, 10))
        atual = new Date(atual.getTime() + 86400000)
    }
    return dias
}

/**
 * Venda dia a dia do periodo selecionado, com a mesma janela do ano anterior
 * alinhada por posicao (dia 1, dia 2, ...) para comparacao no grafico de tendencia.
 */
export async function getVendaDiaria(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const periodo = resolvePeriodo(req, res)
    if (!periodo) return

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = resolveFiliaisFisicas(virtuais).join(',')
    const ecommerce = condicaoEcommerce(virtuais)

    const sql = loadQueryComercial('venda_diaria.sql').replaceAll('{{FILIAIS}}', filiaisStr).replaceAll('{{ECOMMERCE}}', ecommerce)

    const periodoAnoAnterior = { inicio: deslocarAno(periodo.inicio, 1), fim: deslocarAno(periodo.fim, 1) }
    const diasAtual = gerarDias(periodo.inicio, periodo.fim)
    const diasAnterior = gerarDias(periodoAnoAnterior.inicio, periodoAnoAnterior.fim)

    const conn = await connCiss()
    let atual: any[] = []
    let anterior: any[] = []
    try {
        ;[atual, anterior] = await Promise.all([
            conn.query(sql, [periodo.inicio, periodo.fim]),
            conn.query(sql, [periodoAnoAnterior.inicio, periodoAnoAnterior.fim]),
        ])
    } finally {
        await conn.close()
    }

    const atualPorDia = new Map(atual.map((r: any) => [r.DTMOVIMENTO, r]))
    const anteriorPorDia = new Map(anterior.map((r: any) => [r.DTMOVIMENTO, r]))

    const linhas = diasAtual.map((dia, i) => {
        const a = atualPorDia.get(dia)
        const b = anteriorPorDia.get(diasAnterior[i])
        return {
            DIA: i + 1,
            DATA: dia,
            VENDA_ATUAL: Number(a?.VENDA) || 0,
            VENDA_ANO_ANTERIOR: Number(b?.VENDA) || 0,
            LUCRO_ATUAL: Number(a?.LUCRO) || 0,
            LUCRO_ANO_ANTERIOR: Number(b?.LUCRO) || 0,
            COMPRA_ATUAL: Number(a?.COMPRA) || 0,
            COMPRA_ANO_ANTERIOR: Number(b?.COMPRA) || 0,
        }
    })

    res.send(linhas)
}

function subtrairDias(dataISO: string, dias: number) {
    const [ano, mes, dia] = dataISO.split('-').map(Number)
    const d = new Date(Date.UTC(ano, mes - 1, dia))
    d.setUTCDate(d.getUTCDate() - dias)
    return d.toISOString().slice(0, 10)
}

function condicaoExclusaoCategorias() {
    if (DIVISOES_EXCLUIDAS_INATIVACAO.length === 0) return ''
    const lista = DIVISOES_EXCLUIDAS_INATIVACAO.map((d) => `'${d.toUpperCase().replace(/'/g, "''")}'`).join(',')
    return `AND UPPER(D.DESCRDIVISAO) NOT IN (${lista})`
}

/**
 * Listas de apoio a compra/inativacao pra Gestao Comercial:
 * - cobertura baixa: estoque acaba em menos de 15 dias no ritmo de venda atual (comprar)
 * - cobertura alta: estoque cobre mais de 60 dias de venda (excesso)
 * - inativar: sem venda e sem compra ha 90+ dias, exceto categorias em
 *   DIVISOES_EXCLUIDAS_INATIVACAO (sazonais / nao-alimentos)
 */
interface EstoqueListasQuery {
    filiais?: string
    diasComprar?: string
    diasExcesso?: string
    diasInativar?: string
}

export async function getGestaoEstoqueListas(req: FastifyRequest, res: FastifyReply) {
    const filiaisLiberadas = await resolveFiliais(req, res)
    if (!filiaisLiberadas) return

    const virtuais = resolveFiliaisSelecionadas(req, filiaisLiberadas)
    const filiaisStr = resolveFiliaisFisicas(virtuais).join(',')

    const { diasComprar, diasExcesso, diasInativar } = req.query as EstoqueListasQuery
    const limiteComprar = Number(diasComprar) || 15
    const limiteExcesso = Number(diasExcesso) || 60
    const limiteInativar = Number(diasInativar) || 90

    const hoje = hojeISO()
    const noventaDiasAtras = subtrairDias(hoje, 90)

    const coberturaSql = loadQueryComercial('estoque_cobertura.sql').replaceAll('{{FILIAIS}}', filiaisStr)
    const inativarSql = loadQueryComercial('produtos_inativar.sql')
        .replaceAll('{{FILIAIS}}', filiaisStr)
        .replace('{{EXCLUSAO_CATEGORIAS}}', condicaoExclusaoCategorias())

    const conn = await connCiss()
    try {
        const [coberturaBruta, inativarBruto] = await Promise.all([
            conn.query(coberturaSql, [noventaDiasAtras, hoje]),
            conn.query(inativarSql, [limiteInativar, limiteInativar]),
        ])

        const cobertura = coberturaBruta
            .map((r: any) => ({
                IDEMPRESA: r.IDEMPRESA,
                NOME_EMPRESA: r.NOME_EMPRESA,
                IDSUBPRODUTO: r.IDSUBPRODUTO,
                DESCRICAOPRODUTO: r.DESCRICAOPRODUTO,
                IDCODBARPROD: r.IDCODBARPROD,
                DESCRSECAO: r.DESCRSECAO,
                QTDATUALESTOQUE: Number(r.QTDATUALESTOQUE) || 0,
                VALATUALESTOQUE: Number(r.VALATUALESTOQUE) || 0,
                QTD_VENDIDA_90D: Number(r.QTD_VENDIDA_90D) || 0,
                DIAS_COBERTURA: Number(r.DIAS_COBERTURA),
            }))
            .filter((r) => Number.isFinite(r.DIAS_COBERTURA))

        const inativar = inativarBruto.map((r: any) => ({
            IDEMPRESA: r.IDEMPRESA,
            NOME_EMPRESA: r.NOME_EMPRESA,
            IDSUBPRODUTO: r.IDSUBPRODUTO,
            DESCRICAOPRODUTO: r.DESCRICAOPRODUTO,
            IDCODBARPROD: r.IDCODBARPROD,
            DESCRDIVISAO: r.DESCRDIVISAO,
            DESCRSECAO: r.DESCRSECAO,
            QTDATUALESTOQUE: Number(r.QTDATUALESTOQUE) || 0,
            VALATUALESTOQUE: Number(r.VALATUALESTOQUE) || 0,
            DTULTIMAVENDA: r.DTULTIMAVENDA,
            DTULTIMACOMPRA: r.DTULTIMACOMPRA,
        }))

        const comprarUrgente = cobertura
            .filter((r) => r.DIAS_COBERTURA < limiteComprar)
            .sort((a, b) => a.DIAS_COBERTURA - b.DIAS_COBERTURA)
            .slice(0, 100)

        const excessoEstoque = cobertura
            .filter((r) => r.DIAS_COBERTURA > limiteExcesso)
            .sort((a, b) => b.DIAS_COBERTURA - a.DIAS_COBERTURA)
            .slice(0, 100)

        res.send({ comprarUrgente, excessoEstoque, inativar })
    } finally {
        await conn.close()
    }
}
