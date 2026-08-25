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

await supabasePool.query(`
    CREATE TABLE IF NOT EXISTS comercial.fornecedores (
        id BIGSERIAL PRIMARY KEY,
        idclifor INTEGER NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
`)

await supabasePool.query(`
    CREATE TABLE IF NOT EXISTS comercial.vendedores (
        id BIGSERIAL PRIMARY KEY,
        fornecedor_id BIGINT NOT NULL REFERENCES comercial.fornecedores(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        cargo TEXT,
        telefone TEXT,
        whatsapp TEXT,
        email TEXT,
        observacoes TEXT,
        ativo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
`)
await supabasePool.query(`CREATE INDEX IF NOT EXISTS idx_vendedores_fornecedor ON comercial.vendedores (fornecedor_id)`)

await supabasePool.query(`
    CREATE TABLE IF NOT EXISTS comercial.inadimplencias (
        id BIGSERIAL PRIMARY KEY,
        fornecedor_id BIGINT REFERENCES comercial.fornecedores(id) ON DELETE SET NULL,
        vendedor_id BIGINT REFERENCES comercial.vendedores(id) ON DELETE SET NULL,
        fornecedor_nome TEXT NOT NULL,
        idempresa INTEGER,
        titulo TEXT,
        data_movimento DATE,
        data_vencimento DATE,
        saldo_devido NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pendente',
        observacao TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
`)
await supabasePool.query(`CREATE INDEX IF NOT EXISTS idx_inadimplencias_fornecedor ON comercial.inadimplencias (fornecedor_id)`)
await supabasePool.query(`CREATE INDEX IF NOT EXISTS idx_inadimplencias_status ON comercial.inadimplencias (status)`)
await supabasePool.query(`CREATE INDEX IF NOT EXISTS idx_inadimplencias_vencimento ON comercial.inadimplencias (data_vencimento)`)
