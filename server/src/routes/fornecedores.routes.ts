import { authenticate } from '../middlewares/auth.middlewares'
import {
    getBuscaCiss,
    getFornecedores,
    getFornecedor,
    postFornecedor,
    deleteFornecedor,
    postVendedor,
    putVendedor,
    deleteVendedor,
} from '../controllers/fornecedores.controller'

export function fornecedoresRoutes(fastify) {
    fastify.get('/fornecedores/busca-ciss', { preHandler: [authenticate] }, getBuscaCiss)
    fastify.get('/fornecedores', { preHandler: [authenticate] }, getFornecedores)
    fastify.get('/fornecedores/:id', { preHandler: [authenticate] }, getFornecedor)
    fastify.post('/fornecedores', { preHandler: [authenticate] }, postFornecedor)
    fastify.delete('/fornecedores/:id', { preHandler: [authenticate] }, deleteFornecedor)

    fastify.post('/fornecedores/:id/vendedores', { preHandler: [authenticate] }, postVendedor)
    fastify.put('/vendedores/:vendedorId', { preHandler: [authenticate] }, putVendedor)
    fastify.delete('/vendedores/:vendedorId', { preHandler: [authenticate] }, deleteVendedor)
}
