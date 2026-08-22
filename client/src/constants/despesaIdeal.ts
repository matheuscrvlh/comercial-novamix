/**
 * Teto ideal de cada natureza de despesa, como percentual da receita líquida do período.
 * Calculado a partir do realizado dos últimos 12 meses fechados (ago/2025-jul/2026) + margem
 * de segurança. Ajuste aqui quando o financeiro definir metas próprias — é o único lugar
 * que precisa mudar.
 */
export const PERCENTUAL_IDEAL_DESPESA: Record<string, number> = {
    Pessoal: 0.14,
    Ocupacao: 0.08,
    'Vendas e logistica': 0.07,
    Administrativas: 0.06,
    Marketing: 0.04,
    Financeiras: 0.025,
    Tributarias: 0.01,
    Depreciacao: 0.01,
}

export function idealDespesaPara(natureza: string) {
    return PERCENTUAL_IDEAL_DESPESA[natureza] ?? null
}
