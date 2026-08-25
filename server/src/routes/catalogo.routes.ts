import { authenticate } from '../middlewares/auth.middlewares'
import { getCatalogo, getResumoMercadologico, getProdutoDetalhe } from '../controllers/catalogo.controller'

export function catalogoRoutes(fastify) {
    fastify.get('/catalogo/busca', { preHandler: [authenticate] }, getCatalogo)
    fastify.get('/catalogo/resumo', { preHandler: [authenticate] }, getResumoMercadologico)
    fastify.get('/catalogo/produto/:idsubproduto', { preHandler: [authenticate] }, getProdutoDetalhe)
}
