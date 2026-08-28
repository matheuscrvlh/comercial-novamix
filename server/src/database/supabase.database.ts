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
        meta_avaria NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (idempresa, idsecao, mesano)
    )
`)
await supabasePool.query(`ALTER TABLE comercial.metas_secao ADD COLUMN IF NOT EXISTS meta_avaria NUMERIC NOT NULL DEFAULT 0`)

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

// Cotação com concorrente vem direto do CISS (DBA.COTACAO_CONCORRENCIA_PROD) - ver
// server/src/services/cotacoes.service.ts. Não precisa de tabela própria aqui.

// Controle de validade em si vem do CISS (DBA.NOTAS_VALIDADE), mas o "status" que o
// CISS guarda la (C/S) nao tem uso pratico pro time - por isso o status exibido na
// tela e' inteiramente nosso: o usuario cadastra os proprios rotulos (ex: "Em
// promoção", "Baixa programada") e atribui um a cada lote (idempresa+idplanilha+
// idsubproduto+dtvalidade), guardado aqui e mesclado com os dados do CISS na hora
// de montar a resposta - ver server/src/services/validadeStatus.service.ts.
await supabasePool.query(`
    CREATE TABLE IF NOT EXISTS comercial.validade_status_tipos (
        id BIGSERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        cor TEXT NOT NULL DEFAULT 'gray',
        ativo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
`)
await supabasePool.query(`
    INSERT INTO comercial.validade_status_tipos (nome, cor)
    VALUES ('Em promoção', 'orange')
    ON CONFLICT (nome) DO NOTHING
`)

await supabasePool.query(`
    CREATE TABLE IF NOT EXISTS comercial.validade_status (
        id BIGSERIAL PRIMARY KEY,
        idempresa INTEGER NOT NULL,
        idplanilha INTEGER NOT NULL,
        idsubproduto INTEGER NOT NULL,
        dtvalidade DATE NOT NULL,
        status_tipo_id BIGINT NOT NULL REFERENCES comercial.validade_status_tipos(id) ON DELETE CASCADE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (idempresa, idplanilha, idsubproduto, dtvalidade)
    )
`)
await supabasePool.query(`CREATE INDEX IF NOT EXISTS idx_validade_status_tipo ON comercial.validade_status (status_tipo_id)`)
