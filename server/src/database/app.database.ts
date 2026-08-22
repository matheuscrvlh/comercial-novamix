import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '../../data')
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
}

export const appDb = new Database(path.join(dataDir, 'app.db'))
appDb.pragma('journal_mode = WAL')

appDb.exec(`
    CREATE TABLE IF NOT EXISTS metas_secao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idempresa INTEGER NOT NULL,
        idsecao INTEGER NOT NULL,
        mesano TEXT NOT NULL,
        meta_venda REAL NOT NULL DEFAULT 0,
        meta_margem_pct REAL NOT NULL DEFAULT 0,
        meta_compra REAL NOT NULL DEFAULT 0,
        meta_reducao_estoque_pct REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(idempresa, idsecao, mesano)
    )
`)
