import { authenticate } from '../middlewares/auth.middlewares'
import { getValidade } from '../controllers/validade.controller'

export function validadeRoutes(fastify) {
    fastify.get('/validade', { preHandler: [authenticate] }, getValidade)
}
