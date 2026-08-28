type ProdutoCodigosProps = {
    idsubproduto: number
    idcodbarprod: number | null
}

export default function ProdutoCodigos({ idsubproduto, idcodbarprod }: ProdutoCodigosProps) {
    return (
        <div className="text-xs font-normal text-gray-dark dark:text-dark-text-muted">
            Cód. {idsubproduto} · Barras: {idcodbarprod ?? '—'}
        </div>
    )
}
