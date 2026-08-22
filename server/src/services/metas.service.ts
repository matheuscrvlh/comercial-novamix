import { supabasePool } from '../database/supabase.database'

export interface MetaSecao {
    id: number
    idempresa: number
    idsecao: number
    mesano: string
    meta_venda: number
    meta_margem_pct: number
    meta_compra: number
    meta_reducao_estoque_pct: number
}

export async function listMetas(mesano: string, idempresa: number): Promise<MetaSecao[]> {
    const { rows } = await supabasePool.query(
        'SELECT * FROM comercial.metas_secao WHERE mesano = $1 AND idempresa = $2 ORDER BY idsecao',
        [mesano, idempresa]
    )
    return rows
}

export interface UpsertMetaInput {
    idempresa: number
    idsecao: number
    mesano: string
    meta_venda: number
    meta_margem_pct: number
    meta_compra: number
    meta_reducao_estoque_pct: number
}

export async function upsertMeta(input: UpsertMetaInput) {
    await supabasePool.query(
        `INSERT INTO comercial.metas_secao (idempresa, idsecao, mesano, meta_venda, meta_margem_pct, meta_compra, meta_reducao_estoque_pct, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())
         ON CONFLICT (idempresa, idsecao, mesano) DO UPDATE SET
            meta_venda = excluded.meta_venda,
            meta_margem_pct = excluded.meta_margem_pct,
            meta_compra = excluded.meta_compra,
            meta_reducao_estoque_pct = excluded.meta_reducao_estoque_pct,
            updated_at = now()`,
        [
            input.idempresa,
            input.idsecao,
            input.mesano,
            input.meta_venda,
            input.meta_margem_pct,
            input.meta_compra,
            input.meta_reducao_estoque_pct,
        ]
    )
}

export async function deleteMeta(id: number) {
    await supabasePool.query('DELETE FROM comercial.metas_secao WHERE id = $1', [id])
}
