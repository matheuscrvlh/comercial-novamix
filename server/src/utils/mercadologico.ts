function idsValidos(valor: string | undefined): number[] {
    if (!valor) return []
    return valor
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))
}

export interface FiltroMercadologicoQuery {
    divisoes?: string
    secoes?: string
    grupos?: string
}

/**
 * Fragmento de WHERE (em cima do alias PV de DBA.PRODUTOS_VIEW) que restringe
 * a Divisao/Secao/Grupo selecionados no filtro. Cada nivel e independente e
 * opcional - se nada for selecionado em nenhum, retorna string vazia (sem
 * restricao), igual ao comportamento do FilialMultiFilter.
 */
export function condicaoMercadologica(query: FiltroMercadologicoQuery): string {
    const divisoes = idsValidos(query.divisoes)
    const secoes = idsValidos(query.secoes)
    const grupos = idsValidos(query.grupos)

    const partes: string[] = []
    if (divisoes.length > 0) partes.push(`PV.IDDIVISAO IN (${divisoes.join(',')})`)
    if (secoes.length > 0) partes.push(`PV.IDSECAO IN (${secoes.join(',')})`)
    if (grupos.length > 0) partes.push(`PV.IDGRUPO IN (${grupos.join(',')})`)

    return partes.length > 0 ? `AND ${partes.join(' AND ')}` : ''
}
