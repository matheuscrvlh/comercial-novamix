import { connCiss } from '../database/ciss.database'
import { supabasePool } from '../database/supabase.database'
import { loadQueryComercial } from './query.service'

export interface FornecedorCiss {
    IDCLIFOR: number
    NOME: string
    NOMEFANTASIA: string | null
    CNPJCPF: string | null
    EMAIL: string | null
    FONE1: string | null
    FONE2: string | null
    FONECELULAR: string | null
    NOMECONTATO1: string | null
    NOMECONTATO2: string | null
    ENDERECO: string | null
    BAIRRO: string | null
    UFCLIFOR: string | null
    FLAGINATIVO: 'T' | 'F'
}

export interface Vendedor {
    id: number
    fornecedor_id: number
    nome: string
    cargo: string | null
    telefone: string | null
    whatsapp: string | null
    email: string | null
    observacoes: string | null
    ativo: boolean
}

export interface Fornecedor extends FornecedorCiss {
    id: number
    idclifor: number
    vendedores: Vendedor[]
}

export async function buscarFornecedoresCiss(busca: string): Promise<FornecedorCiss[]> {
    const sql = loadQueryComercial('fornecedores_busca_ciss.sql')
    const termo = `%${busca}%`

    const conn = await connCiss()
    try {
        return await conn.query(sql, [termo, termo, termo])
    } finally {
        await conn.close()
    }
}

async function buscarFornecedoresCissPorIds(ids: number[]): Promise<Map<number, FornecedorCiss>> {
    const mapa = new Map<number, FornecedorCiss>()
    if (ids.length === 0) return mapa

    const sql = loadQueryComercial('fornecedores_por_idclifor.sql').replace('{{IDS}}', ids.join(','))

    const conn = await connCiss()
    try {
        const rows: FornecedorCiss[] = await conn.query(sql)
        rows.forEach((row) => mapa.set(row.IDCLIFOR, row))
        return mapa
    } finally {
        await conn.close()
    }
}

async function listarVendedoresPorFornecedor(fornecedorIds: number[]): Promise<Map<number, Vendedor[]>> {
    const mapa = new Map<number, Vendedor[]>()
    if (fornecedorIds.length === 0) return mapa

    const { rows } = await supabasePool.query(
        `SELECT * FROM comercial.vendedores WHERE fornecedor_id = ANY($1) ORDER BY ativo DESC, nome`,
        [fornecedorIds]
    )

    for (const row of rows as Vendedor[]) {
        const lista = mapa.get(row.fornecedor_id) ?? []
        lista.push(row)
        mapa.set(row.fornecedor_id, lista)
    }
    return mapa
}

export async function listarFornecedores(busca?: string): Promise<Fornecedor[]> {
    const { rows: registros } = await supabasePool.query<{ id: number; idclifor: number }>(
        'SELECT id, idclifor FROM comercial.fornecedores ORDER BY id DESC'
    )

    if (registros.length === 0) return []

    const idsClifor = registros.map((r) => r.idclifor)
    const [cissMap, vendedoresMap] = await Promise.all([
        buscarFornecedoresCissPorIds(idsClifor),
        listarVendedoresPorFornecedor(registros.map((r) => r.id)),
    ])

    let fornecedores: Fornecedor[] = registros
        .map((registro) => {
            const ciss = cissMap.get(registro.idclifor)
            if (!ciss) return null
            return {
                ...ciss,
                id: registro.id,
                idclifor: registro.idclifor,
                vendedores: vendedoresMap.get(registro.id) ?? [],
            }
        })
        .filter((f): f is Fornecedor => f !== null)

    if (busca && busca.trim().length > 0) {
        const termo = busca.trim().toUpperCase()
        fornecedores = fornecedores.filter(
            (f) =>
                f.NOME.toUpperCase().includes(termo) ||
                (f.NOMEFANTASIA ?? '').toUpperCase().includes(termo) ||
                (f.CNPJCPF ?? '').includes(termo) ||
                f.vendedores.some((v) => v.nome.toUpperCase().includes(termo))
        )
    }

    return fornecedores.sort((a, b) => a.NOME.localeCompare(b.NOME))
}

export async function buscarFornecedorPorId(id: number): Promise<Fornecedor | null> {
    const fornecedores = await listarFornecedores()
    return fornecedores.find((f) => f.id === id) ?? null
}

export async function criarFornecedor(idclifor: number): Promise<{ id: number }> {
    const { rows } = await supabasePool.query<{ id: number }>(
        `INSERT INTO comercial.fornecedores (idclifor)
         VALUES ($1)
         ON CONFLICT (idclifor) DO UPDATE SET idclifor = excluded.idclifor
         RETURNING id`,
        [idclifor]
    )
    return rows[0]
}

export async function removerFornecedor(id: number) {
    await supabasePool.query('DELETE FROM comercial.fornecedores WHERE id = $1', [id])
}

export interface VendedorInput {
    nome: string
    cargo?: string | null
    telefone?: string | null
    whatsapp?: string | null
    email?: string | null
    observacoes?: string | null
    ativo?: boolean
}

export async function criarVendedor(fornecedorId: number, input: VendedorInput): Promise<Vendedor> {
    const { rows } = await supabasePool.query(
        `INSERT INTO comercial.vendedores (fornecedor_id, nome, cargo, telefone, whatsapp, email, observacoes, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true))
         RETURNING *`,
        [
            fornecedorId,
            input.nome,
            input.cargo ?? null,
            input.telefone ?? null,
            input.whatsapp ?? null,
            input.email ?? null,
            input.observacoes ?? null,
            input.ativo ?? true,
        ]
    )
    return rows[0]
}

export async function atualizarVendedor(id: number, input: VendedorInput): Promise<Vendedor> {
    const { rows } = await supabasePool.query(
        `UPDATE comercial.vendedores SET
            nome = $2,
            cargo = $3,
            telefone = $4,
            whatsapp = $5,
            email = $6,
            observacoes = $7,
            ativo = COALESCE($8, ativo),
            updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
            id,
            input.nome,
            input.cargo ?? null,
            input.telefone ?? null,
            input.whatsapp ?? null,
            input.email ?? null,
            input.observacoes ?? null,
            input.ativo,
        ]
    )
    return rows[0]
}

export async function removerVendedor(id: number) {
    await supabasePool.query('DELETE FROM comercial.vendedores WHERE id = $1', [id])
}
