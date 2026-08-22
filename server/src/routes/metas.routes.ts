import { authenticate } from '../middlewares/auth.middlewares'
import { getMetas, salvarMeta, deletarMeta } from '../controllers/metas.controller'

export function metasRoutes(fastify) {
    fastify.get('/metas/secao', { preHandler: [authenticate] }, getMetas)
    fastify.post('/metas/secao', { preHandler: [authenticate] }, salvarMeta)
    fastify.delete('/metas/secao/:id', { preHandler: [authenticate] }, deletarMeta)
}
