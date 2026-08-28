import { authenticate } from '../middlewares/auth.middlewares'
import { getPromocoes, getPromocaoDetalhe } from '../controllers/promocoes.controller'

export function promocoesRoutes(fastify) {
    fastify.get('/promocoes', { preHandler: [authenticate] }, getPromocoes)
    fastify.get('/promocoes/detalhe', { preHandler: [authenticate] }, getPromocaoDetalhe)
}
