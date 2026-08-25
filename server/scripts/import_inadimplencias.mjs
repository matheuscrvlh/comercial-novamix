import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ibmdb from 'ibm_db';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const forcar = process.argv.includes('--force');

function paraDataISO(valor) {
    if (!valor) return null;
    const [dia, mes, ano] = valor.split('/');
    if (!dia || !mes || !ano) return null;
    return `${ano}-${mes}-${dia}`;
}

function inferirStatus(observacao) {
    const texto = (observacao ?? '').trim().toUpperCase();
    if (texto === '') return 'pendente';
    if (texto.includes('NÃO COBRAR') || texto.includes('NAO COBRAR')) return 'nao_cobrar';
    if (texto.includes('PENDENTE')) return 'pendente';
    if (texto.includes('COBRADO')) return 'cobrado';
    if (texto.includes('OK')) return 'ok';
    return 'pendente';
}

const seedPath = path.join(__dirname, 'inadimplencias_seed.json');
const linhas = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DATABASE_URL });

const { rows: existentes } = await pool.query('SELECT COUNT(*)::int AS qtd FROM comercial.inadimplencias');
if (existentes[0].qtd > 0 && !forcar) {
    console.log(`comercial.inadimplencias já tem ${existentes[0].qtd} registro(s). Rode com --force para reimportar do zero.`);
    await pool.end();
    process.exit(0);
}
if (existentes[0].qtd > 0 && forcar) {
    await pool.query('DELETE FROM comercial.inadimplencias');
}

function normalizarNome(nome) {
    return nome.trim().toUpperCase().replace(/\s+/g, ' ');
}

const nomesUnicos = [...new Set(linhas.map((l) => normalizarNome(l.fornecedor)))];

const cissConn = await ibmdb.open(process.env.CISS_DATABASE_URL);
const todosFornecedoresCiss = await cissConn.query(
    `SELECT IDCLIFOR, NOME, FLAGINATIVO FROM DBA.CLIENTE_FORNECEDOR WHERE TIPOCADASTRO IN ('F', 'A')`
);
await cissConn.close();

const candidatosPorNome = new Map();
for (const row of todosFornecedoresCiss) {
    const chave = normalizarNome(row.NOME);
    const lista = candidatosPorNome.get(chave) ?? [];
    lista.push(row);
    candidatosPorNome.set(chave, lista);
}

const idcliforPorNome = new Map();
const naoEncontrados = [];

for (const nome of nomesUnicos) {
    const candidatos = candidatosPorNome.get(nome) ?? [];

    if (candidatos.length === 0) {
        naoEncontrados.push(nome);
        continue;
    }

    const ativo = candidatos.find((c) => c.FLAGINATIVO === 'F') ?? candidatos[0];
    idcliforPorNome.set(nome, ativo.IDCLIFOR);
}

if (naoEncontrados.length > 0) {
    console.log('Fornecedores não encontrados no CISS (ficarão sem vínculo, só com o nome da planilha):');
    naoEncontrados.forEach((n) => console.log(`  - ${n}`));
}

const fornecedorIdPorNome = new Map();
for (const [nome, idclifor] of idcliforPorNome) {
    const { rows } = await pool.query(
        `INSERT INTO comercial.fornecedores (idclifor)
         VALUES ($1)
         ON CONFLICT (idclifor) DO UPDATE SET idclifor = excluded.idclifor
         RETURNING id`,
        [idclifor]
    );
    fornecedorIdPorNome.set(nome, rows[0].id);
}

let inseridos = 0;
for (const linha of linhas) {
    const nomeChave = normalizarNome(linha.fornecedor);
    const fornecedorId = fornecedorIdPorNome.get(nomeChave) ?? null;

    await pool.query(
        `INSERT INTO comercial.inadimplencias
            (fornecedor_id, fornecedor_nome, idempresa, titulo, data_movimento, data_vencimento, saldo_devido, status, observacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            fornecedorId,
            linha.fornecedor.trim(),
            linha.loja ? parseInt(linha.loja, 10) : null,
            linha.titulo != null ? String(linha.titulo) : null,
            paraDataISO(linha.data_movimento),
            paraDataISO(linha.data_vencimento),
            Number(linha.saldo_devido) || 0,
            inferirStatus(linha.observacao),
            linha.observacao ?? null,
        ]
    );
    inseridos++;
}

console.log(`Importados ${inseridos} lançamentos de inadimplência.`);
console.log(`Fornecedores vinculados ao CISS: ${fornecedorIdPorNome.size} de ${nomesUnicos.length}.`);

await pool.end();
