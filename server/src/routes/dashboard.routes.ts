import { authenticate } from '../middlewares/auth.middlewares'
import { getDashboardResumo } from '../controllers/dashboard.controller'

export function dashboardRoutes(fastify) {
    fastify.get('/dashboard/resumo', { preHandler: [authenticate] }, getDashboardResumo)
}
