import { supabasePool } from '../database/supabase.database'

export interface Inadimplencia {
    id: number
    fornecedor_id: number | null
    vendedor_id: number | null
    fornecedor_nome: string
    vendedor_nome: string | null
    idempresa: number | null
    titulo: string | null
    data_movimento: string | null
    data_vencimento: string | null
    saldo_devido: number
    status: string
    observacao: string | null
    updated_at: string
}

export interface ListarInadimplenciasFiltros {
    fornecedorId?: number
    status?: string
    busca?: string
}

export async function listarInadimplencias(filtros: ListarInadimplenciasFiltros): Promise<Inadimplencia[]> {
    const condicoes: string[] = []
    const params: unknown[] = []

    if (filtros.fornecedorId) {
        params.push(filtros.fornecedorId)
        condicoes.push(`I.fornecedor_id = $${params.length}`)
    }

    if (filtros.status) {
        params.push(filtros.status)
        condicoes.push(`I.status = $${params.length}`)
    }

    if (filtros.busca && filtros.busca.trim().length > 0) {
        params.push(`%${filtros.busca.trim()}%`)
        condicoes.push(`(I.fornecedor_nome ILIKE $${params.length} OR I.titulo ILIKE $${params.length})`)
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : ''

    const { rows } = await supabasePool.query(
        `SELECT
            I.*,
            V.nome AS vendedor_nome
         FROM comercial.inadimplencias I
         LEFT JOIN comercial.vendedores V ON V.id = I.vendedor_id
         ${where}
         ORDER BY I.data_vencimento DESC NULLS LAST, I.id DESC`,
        params
    )
    return rows
}

export interface ResumoFornecedor {
    fornecedor_id: number | null
    fornecedor_nome: string
    qtd_titulos: number
    total_devido: number
}

export async function resumoPorFornecedor(): Promise<ResumoFornecedor[]> {
    const { rows } = await supabasePool.query(
        `SELECT
            fornecedor_id,
            fornecedor_nome,
            COUNT(*)::int AS qtd_titulos,
            SUM(saldo_devido) AS total_devido
         FROM comercial.inadimplencias
         WHERE status != 'ok'
         GROUP BY fornecedor_id, fornecedor_nome
         ORDER BY total_devido DESC`
    )
    return rows
}

export interface InadimplenciaInput {
    fornecedor_id: number | null
    vendedor_id?: number | null
    fornecedor_nome: string
    idempresa?: number | null
    titulo?: string | null
    data_movimento?: string | null
    data_vencimento?: string | null
    saldo_devido: number
    status?: string
    observacao?: string | null
}

export async function criarInadimplencia(input: InadimplenciaInput): Promise<Inadimplencia> {
    const { rows } = await supabasePool.query(
        `INSERT INTO comercial.inadimplencias
            (fornecedor_id, vendedor_id, fornecedor_nome, idempresa, titulo, data_movimento, data_vencimento, saldo_devido, status, observacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'pendente'), $10)
         RETURNING *`,
        [
            input.fornecedor_id,
            input.vendedor_id ?? null,
            input.fornecedor_nome,
            input.idempresa ?? null,
            input.titulo ?? null,
            input.data_movimento ?? null,
            input.data_vencimento ?? null,
            input.saldo_devido,
            input.status ?? null,
            input.observacao ?? null,
        ]
    )
    return rows[0]
}

export async function atualizarInadimplencia(id: number, input: InadimplenciaInput): Promise<Inadimplencia> {
    const { rows } = await supabasePool.query(
        `UPDATE comercial.inadimplencias SET
            fornecedor_id = $2,
            vendedor_id = $3,
            fornecedor_nome = $4,
            idempresa = $5,
            titulo = $6,
            data_movimento = $7,
            data_vencimento = $8,
            saldo_devido = $9,
            status = COALESCE($10, status),
            observacao = $11,
            updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
            id,
            input.fornecedor_id,
            input.vendedor_id ?? null,
            input.fornecedor_nome,
            input.idempresa ?? null,
            input.titulo ?? null,
            input.data_movimento ?? null,
            input.data_vencimento ?? null,
            input.saldo_devido,
            input.status ?? null,
            input.observacao ?? null,
        ]
    )
    return rows[0]
}

export async function removerInadimplencia(id: number) {
    await supabasePool.query('DELETE FROM comercial.inadimplencias WHERE id = $1', [id])
}
