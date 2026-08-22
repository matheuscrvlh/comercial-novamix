import { Pool, types } from 'pg'

const OID_INT8 = 20
const OID_NUMERIC = 1700

types.setTypeParser(OID_INT8, (value) => parseInt(value, 10))
types.setTypeParser(OID_NUMERIC, (value) => parseFloat(value))

export const supabasePool = new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL,
})

await supabasePool.query(`
    CREATE TABLE IF NOT EXISTS comercial.metas_secao (
        id BIGSERIAL PRIMARY KEY,
        idempresa INTEGER NOT NULL,
        idsecao INTEGER NOT NULL,
        mesano TEXT NOT NULL,
        meta_venda NUMERIC NOT NULL DEFAULT 0,
        meta_margem_pct NUMERIC NOT NULL DEFAULT 0,
        meta_compra NUMERIC NOT NULL DEFAULT 0,
        meta_reducao_estoque_pct NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (idempresa, idsecao, mesano)
    )
`)
