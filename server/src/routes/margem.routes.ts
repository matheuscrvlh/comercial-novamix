import { authenticate } from '../middlewares/auth.middlewares'
import { getMargemExcecoes } from '../controllers/margem.controller'

export function margemRoutes(fastify) {
    fastify.get('/margem/excecoes', { preHandler: [authenticate] }, getMargemExcecoes)
}
