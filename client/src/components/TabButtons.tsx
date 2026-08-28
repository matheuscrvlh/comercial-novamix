type Aba = { id: string; label: string }

type TabButtonsProps = {
    abas: readonly Aba[]
    ativa: string
    onChange: (id: string) => void
    className?: string
}

export default function TabButtons({ abas, ativa, onChange, className }: TabButtonsProps) {
    return (
        <div className={`mb-6 flex flex-wrap gap-2 ${className ?? ''}`}>
            {abas.map((aba) => (
                <button
                    key={aba.id}
                    type="button"
                    onClick={() => onChange(aba.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        aba.id === ativa
                            ? 'bg-orange-base text-white'
                            : 'border border-gray-base/30 text-gray-text hover:bg-gray-base/10 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border/30'
                    }`}
                >
                    {aba.label}
                </button>
            ))}
        </div>
    )
}
