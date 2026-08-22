import { authenticate } from '../middlewares/auth.middlewares'
import { getEstoqueResumo } from '../controllers/estoque.controller'

export function estoqueRoutes(fastify) {
    fastify.get('/estoque/resumo', { preHandler: [authenticate] }, getEstoqueResumo)
}
