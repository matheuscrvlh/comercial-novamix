export function formatCurrency(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

export function formatRatio(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPercent(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return value.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function formatDate(value: string) {
    const [ano, mes, dia] = value.split('-')
    return `${dia}/${mes}/${ano}`
}
