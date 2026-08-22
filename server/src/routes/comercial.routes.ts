import { authenticate } from '../middlewares/auth.middlewares'
import {
    getMe,
    getVendaMetaSecao,
    getVendaSecaoLoja,
    getSecoes,
    getOperacional,
    getTributacao,
} from '../controllers/comercial.controller'

export function comercialRoutes(fastify) {
    fastify.get('/comercial/me', { preHandler: [authenticate] }, getMe)
    fastify.get('/comercial/secoes', { preHandler: [authenticate] }, getSecoes)
    fastify.get('/comercial/venda-meta-secao', { preHandler: [authenticate] }, getVendaMetaSecao)
    fastify.get('/comercial/venda-secao-loja', { preHandler: [authenticate] }, getVendaSecaoLoja)
    fastify.get('/comercial/operacional', { preHandler: [authenticate] }, getOperacional)
    fastify.get('/comercial/tributacao', { preHandler: [authenticate] }, getTributacao)
}
