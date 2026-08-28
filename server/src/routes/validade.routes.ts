import { authenticate } from '../middlewares/auth.middlewares'
import {
    getValidade,
    getStatusTipos,
    postStatusTipo,
    putStatusTipo,
    deleteStatusTipo,
    putStatusAtribuicao,
} from '../controllers/validade.controller'

export function validadeRoutes(fastify) {
    fastify.get('/validade', { preHandler: [authenticate] }, getValidade)
    fastify.get('/validade/status-tipos', { preHandler: [authenticate] }, getStatusTipos)
    fastify.post('/validade/status-tipos', { preHandler: [authenticate] }, postStatusTipo)
    fastify.put('/validade/status-tipos/:id', { preHandler: [authenticate] }, putStatusTipo)
    fastify.delete('/validade/status-tipos/:id', { preHandler: [authenticate] }, deleteStatusTipo)
    fastify.put('/validade/status', { preHandler: [authenticate] }, putStatusAtribuicao)
}
