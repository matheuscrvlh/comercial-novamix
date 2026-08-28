import { authenticate } from '../middlewares/auth.middlewares'
import { getCotacoes } from '../controllers/cotacoes.controller'

export function cotacoesRoutes(fastify) {
    fastify.get('/cotacoes', { preHandler: [authenticate] }, getCotacoes)
}
