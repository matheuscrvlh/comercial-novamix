import { authenticate } from '../middlewares/auth.middlewares'
import {
    getMe,
    getVendaBruta,
    getLucroBruto,
    getLucroLiquido,
    getCancelamentos,
    getDevolucoes,
    getNumeroCupons,
    getTicketMedio,
    getValorEstoque,
    getLiquidezCorrente,
    getDespesas,
    getResultadoDre,
    getResultadoDreMensal,
    getBalanco,
    getContasPagarDetalhe,
    getContasReceberDetalhe,
    getConciliacaoBanco,
    getConciliacaoCartao,
    getConciliacaoContabil,
} from '../controllers/financeiro.controller'

export function financeiroRoutes(fastify) {
    fastify.get('/financeiro/me', { preHandler: [authenticate] }, getMe)
    fastify.get('/financeiro/venda-bruta', { preHandler: [authenticate] }, getVendaBruta)
    fastify.get('/financeiro/lucro-bruto', { preHandler: [authenticate] }, getLucroBruto)
    fastify.get('/financeiro/lucro-liquido', { preHandler: [authenticate] }, getLucroLiquido)
    fastify.get('/financeiro/cancelamentos', { preHandler: [authenticate] }, getCancelamentos)
    fastify.get('/financeiro/devolucoes', { preHandler: [authenticate] }, getDevolucoes)
    fastify.get('/financeiro/cupons', { preHandler: [authenticate] }, getNumeroCupons)
    fastify.get('/financeiro/ticket-medio', { preHandler: [authenticate] }, getTicketMedio)
    fastify.get('/financeiro/valor-estoque', { preHandler: [authenticate] }, getValorEstoque)
    fastify.get('/financeiro/liquidez-corrente', { preHandler: [authenticate] }, getLiquidezCorrente)
    fastify.get('/financeiro/despesas', { preHandler: [authenticate] }, getDespesas)
    fastify.get('/financeiro/resultado-dre', { preHandler: [authenticate] }, getResultadoDre)
    fastify.get('/financeiro/resultado-dre-mensal', { preHandler: [authenticate] }, getResultadoDreMensal)
    fastify.get('/financeiro/balanco', { preHandler: [authenticate] }, getBalanco)
    fastify.get('/financeiro/contas-pagar-detalhe', { preHandler: [authenticate] }, getContasPagarDetalhe)
    fastify.get('/financeiro/contas-receber-detalhe', { preHandler: [authenticate] }, getContasReceberDetalhe)
    fastify.get('/financeiro/conciliacao-banco', { preHandler: [authenticate] }, getConciliacaoBanco)
    fastify.get('/financeiro/conciliacao-cartao', { preHandler: [authenticate] }, getConciliacaoCartao)
    fastify.get('/financeiro/conciliacao-contabil', { preHandler: [authenticate] }, getConciliacaoContabil)
}
