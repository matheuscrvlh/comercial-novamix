/**
 * Nomes de DESCRDIVISAO (DBA.DIVISAO no CISS) a excluir da lista de "candidatos a
 * inativar" em Gestao Comercial - produtos sazonais e nao-alimentos naturalmente
 * ficam longos periodos sem venda/compra sem que isso signifique produto morto.
 *
 * Preencher com os nomes exatos como aparecem no CISS (SELECT DISTINCT DESCRDIVISAO
 * FROM DBA.DIVISAO). Vazio por enquanto - nenhuma categoria e excluida ate confirmar
 * os nomes certos com o comercial.
 */
export const DIVISOES_EXCLUIDAS_INATIVACAO: string[] = []
