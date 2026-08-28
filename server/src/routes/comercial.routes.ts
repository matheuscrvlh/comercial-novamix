import { authenticate } from '../middlewares/auth.middlewares'
import {
    getMe,
    getVendaMetaSecao,
    getVendaSecaoLoja,
    getSecoes,
    getOperacional,
    getTributacao,
    getFabricantes,
    getComparativoFabricante,
    getTicketOperador,
    getGestaoEstoqueListas,
    getVendaDiaria,
} from '../controllers/comercial.controller'

export function comercialRoutes(fastify) {
    fastify.get('/comercial/me', { preHandler: [authenticate] }, getMe)
    fastify.get('/comercial/secoes', { preHandler: [authenticate] }, getSecoes)
    fastify.get('/comercial/fabricantes', { preHandler: [authenticate] }, getFabricantes)
    fastify.get('/comercial/venda-meta-secao', { preHandler: [authenticate] }, getVendaMetaSecao)
    fastify.get('/comercial/venda-secao-loja', { preHandler: [authenticate] }, getVendaSecaoLoja)
    fastify.get('/comercial/operacional', { preHandler: [authenticate] }, getOperacional)
    fastify.get('/comercial/tributacao', { preHandler: [authenticate] }, getTributacao)
    fastify.get('/comercial/comparativo-fabricante', { preHandler: [authenticate] }, getComparativoFabricante)
    fastify.get('/comercial/ticket-operador', { preHandler: [authenticate] }, getTicketOperador)
    fastify.get('/comercial/estoque-listas', { preHandler: [authenticate] }, getGestaoEstoqueListas)
    fastify.get('/comercial/venda-diaria', { preHandler: [authenticate] }, getVendaDiaria)
}
