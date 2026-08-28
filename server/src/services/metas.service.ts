import { supabasePool } from '../database/supabase.database'

export const IDEMPRESA_GERAL = 100

export interface MetaSecao {
    id: number
    idempresa: number
    idsecao: number
    mesano: string
    meta_venda: number
    meta_margem_pct: number
    meta_compra: number
    meta_reducao_estoque_pct: number
    meta_avaria: number
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
    meta_avaria: number
}

export async function upsertMeta(input: UpsertMetaInput) {
    await supabasePool.query(
        `INSERT INTO comercial.metas_secao (idempresa, idsecao, mesano, meta_venda, meta_margem_pct, meta_compra, meta_reducao_estoque_pct, meta_avaria, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
         ON CONFLICT (idempresa, idsecao, mesano) DO UPDATE SET
            meta_venda = excluded.meta_venda,
            meta_margem_pct = excluded.meta_margem_pct,
            meta_compra = excluded.meta_compra,
            meta_reducao_estoque_pct = excluded.meta_reducao_estoque_pct,
            meta_avaria = excluded.meta_avaria,
            updated_at = now()`,
        [
            input.idempresa,
            input.idsecao,
            input.mesano,
            input.meta_venda,
            input.meta_margem_pct,
            input.meta_compra,
            input.meta_reducao_estoque_pct,
            input.meta_avaria,
        ]
    )
}

export async function deleteMeta(id: number) {
    await supabasePool.query('DELETE FROM comercial.metas_secao WHERE id = $1', [id])
}

function somaCampo(lista: MetaSecao[], campo: 'meta_venda' | 'meta_compra' | 'meta_avaria') {
    return lista.reduce((acc, m) => acc + m[campo], 0)
}

function mediaCampo(lista: MetaSecao[], campo: 'meta_margem_pct' | 'meta_reducao_estoque_pct') {
    if (lista.length === 0) return 0
    return lista.reduce((acc, m) => acc + m[campo], 0) / lista.length
}

/**
 * Metas por secao considerando o recorte de lojas selecionado:
 * - se alguma das lojas selecionadas tem meta especifica (idempresa != GERAL) pra uma
 *   secao, soma (valores) / tira media (percentuais) so das lojas com meta especifica.
 * - secoes sem nenhuma meta especifica entre as lojas selecionadas caem pra meta Geral.
 * Preserva o comportamento antigo (so meta Geral) enquanto ninguem configurar metas por loja.
 */
export async function listMetasComFallback(mesano: string, idsEmpresasSelecionadas: number[]): Promise<MetaSecao[]> {
    const geral = await listMetas(mesano, IDEMPRESA_GERAL)
    if (idsEmpresasSelecionadas.length === 0) return geral

    const porLoja = await Promise.all(idsEmpresasSelecionadas.map((id) => listMetas(mesano, id)))
    const especificasPorSecao = new Map<number, MetaSecao[]>()
    porLoja.flat().forEach((m) => {
        const lista = especificasPorSecao.get(m.idsecao) ?? []
        lista.push(m)
        especificasPorSecao.set(m.idsecao, lista)
    })

    const idsecoes = new Set<number>([...geral.map((m) => m.idsecao), ...especificasPorSecao.keys()])
    const resultado: MetaSecao[] = []

    idsecoes.forEach((idsecao) => {
        const especificas = especificasPorSecao.get(idsecao)
        if (especificas && especificas.length > 0) {
            resultado.push({
                id: especificas[0].id,
                idempresa: especificas[0].idempresa,
                idsecao,
                mesano,
                meta_venda: somaCampo(especificas, 'meta_venda'),
                meta_compra: somaCampo(especificas, 'meta_compra'),
                meta_avaria: somaCampo(especificas, 'meta_avaria'),
                meta_margem_pct: mediaCampo(especificas, 'meta_margem_pct'),
                meta_reducao_estoque_pct: mediaCampo(especificas, 'meta_reducao_estoque_pct'),
            })
            return
        }

        const g = geral.find((m) => m.idsecao === idsecao)
        if (g) resultado.push(g)
    })

    return resultado
}
