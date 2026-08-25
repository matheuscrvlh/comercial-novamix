import { authenticate } from '../middlewares/auth.middlewares'
import {
    getInadimplencias,
    getResumo,
    postInadimplencia,
    putInadimplencia,
    deleteInadimplencia,
} from '../controllers/inadimplencias.controller'

export function inadimplenciasRoutes(fastify) {
    fastify.get('/inadimplencias', { preHandler: [authenticate] }, getInadimplencias)
    fastify.get('/inadimplencias/resumo', { preHandler: [authenticate] }, getResumo)
    fastify.post('/inadimplencias', { preHandler: [authenticate] }, postInadimplencia)
    fastify.put('/inadimplencias/:id', { preHandler: [authenticate] }, putInadimplencia)
    fastify.delete('/inadimplencias/:id', { preHandler: [authenticate] }, deleteInadimplencia)
}
