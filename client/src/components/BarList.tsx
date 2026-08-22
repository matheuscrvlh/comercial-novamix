import Spinner from './Spinner'

type BarListItem = {
    label: string
    valor: number
    sublabel?: string
    /** Teto ideal (mesma unidade de `valor`). Quando informado, desenha um marcador
     * na barra e destaca em vermelho a parte que está acima do ideal. */
    limite?: number
}

type BarListProps = {
    titulo: string
    items: BarListItem[]
    formatValor: (value: number) => string
    loading?: boolean
    erro?: string | null
    cor?: string
}

export default function BarList({ titulo, items, formatValor, loading, erro, cor = '#0d366b' }: BarListProps) {
    const maior = Math.max(...items.map((item) => Math.abs(item.valor)), ...items.map((item) => item.limite ?? 0), 1)

    return (
        <div className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'>
            <span className='text-sm font-medium text-gray-text dark:text-dark-text'>{titulo}</span>

            {erro && (
                <div className='mt-3 rounded-lg px-4 py-3 text-sm font-medium bg-red-light/10 text-red-base'>
                    {erro}
                </div>
            )}

            {!erro && loading && (
                <div className='mt-4 flex items-center justify-center py-6'>
                    <Spinner className='h-5 w-5' />
                </div>
            )}

            {!erro && !loading && items.length === 0 && (
                <div className='mt-3 text-sm text-gray-dark dark:text-dark-text-muted'>Sem dados no período.</div>
            )}

            {!erro && !loading && items.length > 0 && (
                <ul className='mt-4 flex flex-col gap-3'>
                    {items.map((item) => {
                        const largura = Math.max((Math.abs(item.valor) / maior) * 100, 2)
                        const acimaDoIdeal = item.limite !== undefined && item.valor > item.limite
                        const limitePercent = item.limite !== undefined ? Math.min((item.limite / maior) * 100, 100) : null
                        return (
                            <li key={item.label}>
                                <div className='mb-1 flex items-baseline justify-between gap-2 text-xs'>
                                    <span className='truncate font-medium text-gray-text dark:text-dark-text'>
                                        {item.label}
                                        {item.sublabel && (
                                            <span className='ml-2 font-normal text-gray-dark dark:text-dark-text-muted'>
                                                {item.sublabel}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={`shrink-0 font-semibold tabular-nums ${acimaDoIdeal ? 'text-red-base' : 'text-gray-text dark:text-dark-text'}`}
                                    >
                                        {formatValor(item.valor)}
                                    </span>
                                </div>
                                <div className='relative h-2 w-full overflow-hidden rounded-full bg-gray dark:bg-dark-surface-2'>
                                    <div
                                        className='h-full rounded-full transition-all duration-300'
                                        style={{ width: `${largura}%`, backgroundColor: acimaDoIdeal ? '#c53434' : cor }}
                                    />
                                    {limitePercent !== null && (
                                        <div
                                            className='absolute top-0 h-full w-0.5 bg-gray-text/70 dark:bg-dark-text/70'
                                            style={{ left: `${limitePercent}%` }}
                                            title={`Ideal: ${formatValor(item.limite as number)}`}
                                        />
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
