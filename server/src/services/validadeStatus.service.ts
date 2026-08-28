import { supabasePool } from '../database/supabase.database'

export interface ValidadeStatusTipo {
    id: number
    nome: string
    cor: string
    ativo: boolean
}

export async function listarStatusTipos(): Promise<ValidadeStatusTipo[]> {
    const { rows } = await supabasePool.query(
        `SELECT id, nome, cor, ativo FROM comercial.validade_status_tipos ORDER BY nome`
    )
    return rows
}

export async function criarStatusTipo(nome: string, cor: string): Promise<ValidadeStatusTipo> {
    const { rows } = await supabasePool.query(
        `INSERT INTO comercial.validade_status_tipos (nome, cor) VALUES ($1, $2) RETURNING id, nome, cor, ativo`,
        [nome, cor]
    )
    return rows[0]
}

export async function atualizarStatusTipo(id: number, nome: string, cor: string, ativo: boolean): Promise<ValidadeStatusTipo> {
    const { rows } = await supabasePool.query(
        `UPDATE comercial.validade_status_tipos SET nome = $2, cor = $3, ativo = $4, updated_at = now()
         WHERE id = $1
         RETURNING id, nome, cor, ativo`,
        [id, nome, cor, ativo]
    )
    return rows[0]
}

export async function removerStatusTipo(id: number) {
    await supabasePool.query('DELETE FROM comercial.validade_status_tipos WHERE id = $1', [id])
}

export interface ValidadeStatusAtribuicao {
    idempresa: number
    idplanilha: number
    idsubproduto: number
    dtvalidade: string
    status_tipo_id: number
}

/**
 * NOTAS_VALIDADE fica no CISS (DB2) e os status ficam aqui no Supabase - bancos
 * diferentes, entao nao da pra fazer um JOIN de verdade. Busca tudo e o controller
 * mescla em memoria pela chave composta (idempresa+idplanilha+idsubproduto+dtvalidade).
 */
export async function listarAtribuicoes(idsEmpresa: number[]): Promise<ValidadeStatusAtribuicao[]> {
    const { rows } = await supabasePool.query(
        `SELECT idempresa, idplanilha, idsubproduto, dtvalidade::text AS dtvalidade, status_tipo_id
         FROM comercial.validade_status
         WHERE idempresa = ANY($1)`,
        [idsEmpresa]
    )
    return rows
}

export interface DefinirStatusInput {
    idempresa: number
    idplanilha: number
    idsubproduto: number
    dtvalidade: string
    status_tipo_id: number | null
}

export async function definirStatus(input: DefinirStatusInput) {
    if (input.status_tipo_id === null) {
        await supabasePool.query(
            `DELETE FROM comercial.validade_status
             WHERE idempresa = $1 AND idplanilha = $2 AND idsubproduto = $3 AND dtvalidade = $4`,
            [input.idempresa, input.idplanilha, input.idsubproduto, input.dtvalidade]
        )
        return
    }

    await supabasePool.query(
        `INSERT INTO comercial.validade_status (idempresa, idplanilha, idsubproduto, dtvalidade, status_tipo_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (idempresa, idplanilha, idsubproduto, dtvalidade)
         DO UPDATE SET status_tipo_id = EXCLUDED.status_tipo_id, updated_at = now()`,
        [input.idempresa, input.idplanilha, input.idsubproduto, input.dtvalidade, input.status_tipo_id]
    )
}
