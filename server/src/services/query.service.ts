import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function loadQueryFinanceiro(filename: string) {
    const filePath = path.join(__dirname, '../queries/financeiro', filename)
    return fs.readFileSync(filePath, 'utf8')
}
