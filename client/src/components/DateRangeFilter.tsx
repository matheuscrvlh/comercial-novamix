import { DATE_PRESETS, getPresetRange, type DatePreset } from '../lib/date'

type PresetDef = { id: string; label: string }

type DateRangeFilterProps = {
    inicio: string
    fim: string
    onChangeInicio: (value: string) => void
    onChangeFim: (value: string) => void
    /** Lista de presets a mostrar; default = hoje/ontem/essa semana/esse mês (pra trás). */
    presets?: PresetDef[]
    /** Resolve um preset id em {inicio, fim}; default = getPresetRange (pra trás). */
    resolverPreset?: (id: string) => { inicio: string; fim: string }
}

export default function DateRangeFilter({
    inicio,
    fim,
    onChangeInicio,
    onChangeFim,
    presets,
    resolverPreset,
}: DateRangeFilterProps) {
    const listaPresets = presets ?? DATE_PRESETS
    const resolver = resolverPreset ?? ((id: string) => getPresetRange(id as DatePreset))

    const inputClass =
        'rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:bg-dark-surface dark:border-dark-border dark:text-dark-text'
    const baseButtonClass = 'px-4 py-2 rounded-lg text-sm font-medium transition border'
    const activeButtonClass = 'bg-orange-base text-white border-orange-base'
    const inactiveButtonClass =
        'bg-white text-gray-text border-gray-base/30 hover:border-orange-base dark:bg-dark-surface dark:text-dark-text dark:border-dark-border'

    function aplicarPreset(id: string) {
        const { inicio: novoInicio, fim: novoFim } = resolver(id)
        onChangeInicio(novoInicio)
        onChangeFim(novoFim)
    }

    return (
        <div className='flex flex-wrap items-center gap-4'>
            <div className='flex flex-wrap gap-2'>
                {listaPresets.map(({ id, label }) => {
                    const presetRange = resolver(id)
                    const ativo = inicio === presetRange.inicio && fim === presetRange.fim

                    return (
                        <button
                            key={id}
                            type='button'
                            className={`${baseButtonClass} ${ativo ? activeButtonClass : inactiveButtonClass}`}
                            onClick={() => aplicarPreset(id)}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>

            <div className='flex flex-wrap items-center gap-2'>
                <input
                    type='date'
                    value={inicio}
                    onChange={(e) => onChangeInicio(e.target.value)}
                    className={inputClass}
                />
                <span className='text-sm text-gray-dark dark:text-dark-text-muted'>até</span>
                <input
                    type='date'
                    value={fim}
                    onChange={(e) => onChangeFim(e.target.value)}
                    className={inputClass}
                />
            </div>
        </div>
    )
}
