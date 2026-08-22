import { appDb } from '../database/app.database'

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

export function listMetas(mesano: string, idempresa: number): MetaSecao[] {
    return appDb
        .prepare('SELECT * FROM metas_secao WHERE mesano = ? AND idempresa = ? ORDER BY idsecao')
        .all(mesano, idempresa) as MetaSecao[]
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

export function upsertMeta(input: UpsertMetaInput) {
    appDb
        .prepare(
            `INSERT INTO metas_secao (idempresa, idsecao, mesano, meta_venda, meta_margem_pct, meta_compra, meta_reducao_estoque_pct, updated_at)
             VALUES (@idempresa, @idsecao, @mesano, @meta_venda, @meta_margem_pct, @meta_compra, @meta_reducao_estoque_pct, datetime('now'))
             ON CONFLICT(idempresa, idsecao, mesano) DO UPDATE SET
                meta_venda = excluded.meta_venda,
                meta_margem_pct = excluded.meta_margem_pct,
                meta_compra = excluded.meta_compra,
                meta_reducao_estoque_pct = excluded.meta_reducao_estoque_pct,
                updated_at = datetime('now')`
        )
        .run(input)
}

export function deleteMeta(id: number) {
    appDb.prepare('DELETE FROM metas_secao WHERE id = ?').run(id)
}
