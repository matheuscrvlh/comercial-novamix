type DreValores = {
    RECEITA_BRUTA: number
    DEDUCOES: number
    CMV: number
    DESPESAS_OPERACIONAIS: number
    RECEITAS_FINANCEIRAS: number
    DESPESAS_FINANCEIRAS: number
}

export function calcularCascata(row: DreValores) {
    const receitaBruta = Number(row.RECEITA_BRUTA)
    const deducoes = Number(row.DEDUCOES)
    const receitaLiquida = receitaBruta + deducoes
    const cmv = Number(row.CMV)
    const lucroBruto = receitaLiquida - cmv
    const despesasOperacionais = Number(row.DESPESAS_OPERACIONAIS)
    const receitasFinanceiras = Number(row.RECEITAS_FINANCEIRAS)
    const despesasFinanceiras = Number(row.DESPESAS_FINANCEIRAS)
    const resultadoLiquido = lucroBruto - despesasOperacionais + receitasFinanceiras - despesasFinanceiras

    return {
        receitaBruta,
        deducoes,
        receitaLiquida,
        cmv,
        lucroBruto,
        despesasOperacionais,
        receitasFinanceiras,
        despesasFinanceiras,
        resultadoLiquido,
        margemBruta: receitaLiquida !== 0 ? lucroBruto / receitaLiquida : 0,
    }
}
