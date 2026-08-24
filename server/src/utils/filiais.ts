export const FILIAL_ECOMMERCE = 99
export const FILIAL_ORIGEM_ECOMMERCE = 1
export const VENDEDORES_ECOMMERCE = [3529, 3490, 3491, 3530, 8904, 134277]

/**
 * Usuario de sistema (NOTAS.IDUSUARIO) usado pela integracao Tray para registrar
 * as notas de venda do e-commerce. Diferente de VENDEDORES_ECOMMERCE (que marca
 * o item da venda): esse eh quem "processou" a nota, usado no relatorio de
 * ticket por operador de caixa - la a separacao certa eh por operador, nao por
 * IDVENDEDOR do item (uma nota pode ter itens com vendedor e-commerce mas ter
 * sido processada por um operador humano de verdade, ex: retirada em loja).
 */
export const USUARIOS_ECOMMERCE = [445]

/**
 * Vendas do vendedor Tray (e-commerce) ficam fisicamente no estoque do Prado
 * (IDEMPRESA=1), identificadas por IDVENDEDOR. Quem tem acesso ao Prado também
 * enxerga essas linhas, então liberamos o filtro de e-commerce automaticamente.
 */
export function comFiltroEcommerce(branches: number[]): number[] {
    if (branches.includes(FILIAL_ORIGEM_ECOMMERCE) && !branches.includes(FILIAL_ECOMMERCE)) {
        return [...branches, FILIAL_ECOMMERCE]
    }
    return branches
}

/**
 * Converte uma lista de filiais "virtuais" (pode incluir 99 = E-commerce) na lista
 * de filiais físicas que existem de fato no banco (99 não existe fisicamente,
 * suas vendas estão dentro da filial 1).
 */
export function resolveFiliaisFisicas(virtuais: number[]): number[] {
    const fisicas = new Set(virtuais.filter((id) => id !== FILIAL_ECOMMERCE))
    if (virtuais.includes(FILIAL_ECOMMERCE)) {
        fisicas.add(FILIAL_ORIGEM_ECOMMERCE)
    }
    return [...fisicas]
}

/**
 * Fragmento de WHERE (em cima do alias EA de DBA.ESTOQUE_ANALITICO) que separa
 * venda real do Prado de venda de e-commerce, conforme o que foi selecionado:
 * - Prado e E-commerce selecionados: conta tudo (sem restrição de vendedor)
 * - só E-commerce selecionado: conta só os vendedores de e-commerce
 * - só Prado selecionado (sem e-commerce): exclui os vendedores de e-commerce
 * - nenhum dos dois selecionado: sem restrição (outras filiais não têm esse problema)
 */
export function condicaoEcommerce(virtuais: number[]): string {
    const temPrado = virtuais.includes(FILIAL_ORIGEM_ECOMMERCE)
    const temEcommerce = virtuais.includes(FILIAL_ECOMMERCE)
    const vendedores = VENDEDORES_ECOMMERCE.join(',')

    if (temEcommerce && !temPrado) {
        return `EA.IDVENDEDOR IN (${vendedores})`
    }

    if (temPrado && !temEcommerce) {
        return `(EA.IDVENDEDOR IS NULL OR EA.IDVENDEDOR NOT IN (${vendedores}))`
    }

    return '1 = 1'
}

/**
 * Igual condicaoEcommerce, mas pro relatorio de ticket por operador (agrupado
 * por NOTAS.IDUSUARIO): usa quem processou a nota (USUARIOS_ECOMMERCE), nao o
 * IDVENDEDOR do item.
 */
export function condicaoEcommerceOperador(virtuais: number[]): string {
    const temPrado = virtuais.includes(FILIAL_ORIGEM_ECOMMERCE)
    const temEcommerce = virtuais.includes(FILIAL_ECOMMERCE)
    const usuarios = USUARIOS_ECOMMERCE.join(',')

    if (temEcommerce && !temPrado) {
        return `N.IDUSUARIO IN (${usuarios})`
    }

    if (temPrado && !temEcommerce) {
        return `(N.IDUSUARIO IS NULL OR N.IDUSUARIO NOT IN (${usuarios}))`
    }

    return '1 = 1'
}
