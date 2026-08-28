import { useMemo, useState, type FocusEvent } from 'react'
import { CheckIcon, ChevronDownIcon } from './icons'
import { useApi } from '../hooks/useApi'
import type { HierarquiaMercadologicaRow } from '../types/comercial'

export interface MercadologicoSelecao {
    divisoes: number[]
    secoes: number[]
    grupos: number[]
}

type MercadologicoFilterProps = {
    selecao: MercadologicoSelecao
    onChange: (value: MercadologicoSelecao) => void
}

interface Opcao {
    id: number
    label: string
}

function opcoesUnicas(rows: HierarquiaMercadologicaRow[], idKey: 'IDDIVISAO' | 'IDSECAO' | 'IDGRUPO', labelKey: 'DESCRDIVISAO' | 'DESCRSECAO' | 'DESCRGRUPO'): Opcao[] {
    const mapa = new Map<number, string>()
    for (const row of rows) {
        const id = row[idKey]
        const label = row[labelKey]
        if (id === null || label === null) continue
        if (!mapa.has(id)) mapa.set(id, label)
    }
    return Array.from(mapa.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Dropdown multi-select generico usado pelos 3 niveis (Divisao/Secao/Grupo) -
 * mesmo visual do FilialMultiFilter, mas sem a nocao de "todas selecionadas
 * = nenhum filtro aplicado" (aqui nada selecionado ja significa "sem
 * restricao", entao "Todas" e so um atalho pra limpar).
 */
function DropdownMultiSelect({
    rotuloVazio,
    opcoes,
    selecionados,
    onChange,
}: {
    rotuloVazio: string
    opcoes: Opcao[]
    selecionados: number[]
    onChange: (value: number[]) => void
}) {
    const [open, setOpen] = useState(false)

    function toggle(id: number) {
        if (selecionados.includes(id)) {
            onChange(selecionados.filter((sid) => sid !== id))
            return
        }
        onChange([...selecionados, id])
    }

    function fecharSeForaDoContainer(event: FocusEvent<HTMLDivElement>) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false)
        }
    }

    const rotulo =
        selecionados.length === 0
            ? rotuloVazio
            : selecionados.length === 1
              ? (opcoes.find((o) => o.id === selecionados[0])?.label ?? rotuloVazio)
              : `${selecionados.length} selecionados`

    return (
        <div className="relative" onBlur={fecharSeForaDoContainer}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-base/30 bg-white px-4 py-2 text-sm font-medium text-gray-text transition hover:border-orange-base dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
            >
                <span className="truncate">{rotulo}</span>
                <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-10 mt-2 max-h-72 w-full min-w-56 overflow-y-auto rounded-lg border border-gray-base/30 bg-white shadow-lg dark:border-dark-border dark:bg-dark-surface">
                    {selecionados.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-gray-text transition hover:bg-gray dark:text-dark-text dark:hover:bg-dark-surface-2"
                        >
                            Limpar seleção
                        </button>
                    )}
                    {opcoes.length === 0 && (
                        <p className="px-4 py-2 text-sm text-gray-dark dark:text-dark-text-muted">Nenhuma opção</p>
                    )}
                    {opcoes.map((opcao) => {
                        const ativo = selecionados.includes(opcao.id)
                        return (
                            <button
                                key={opcao.id}
                                type="button"
                                onClick={() => toggle(opcao.id)}
                                className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm font-medium transition ${
                                    ativo
                                        ? 'bg-orange-base/10 text-orange-base'
                                        : 'text-gray-text hover:bg-gray dark:text-dark-text dark:hover:bg-dark-surface-2'
                                }`}
                            >
                                <span className="truncate">{opcao.label}</span>
                                {ativo && <CheckIcon className="h-4 w-4 shrink-0" />}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default function MercadologicoFilter({ selecao, onChange }: MercadologicoFilterProps) {
    const { data } = useApi<HierarquiaMercadologicaRow[]>('/comercial/hierarquia', {}, true)
    const linhas = useMemo(() => data ?? [], [data])

    const divisoesOpcoes = useMemo(() => opcoesUnicas(linhas, 'IDDIVISAO', 'DESCRDIVISAO'), [linhas])

    const secoesOpcoes = useMemo(() => {
        const base = selecao.divisoes.length > 0 ? linhas.filter((r) => r.IDDIVISAO !== null && selecao.divisoes.includes(r.IDDIVISAO)) : linhas
        return opcoesUnicas(base, 'IDSECAO', 'DESCRSECAO')
    }, [linhas, selecao.divisoes])

    const gruposOpcoes = useMemo(() => {
        let base = linhas
        if (selecao.secoes.length > 0) base = base.filter((r) => r.IDSECAO !== null && selecao.secoes.includes(r.IDSECAO))
        else if (selecao.divisoes.length > 0) base = base.filter((r) => r.IDDIVISAO !== null && selecao.divisoes.includes(r.IDDIVISAO))
        return opcoesUnicas(base, 'IDGRUPO', 'DESCRGRUPO')
    }, [linhas, selecao.divisoes, selecao.secoes])

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                    Divisão
                </span>
                <DropdownMultiSelect
                    rotuloVazio="Todas as divisões"
                    opcoes={divisoesOpcoes}
                    selecionados={selecao.divisoes}
                    onChange={(divisoes) => onChange({ ...selecao, divisoes })}
                />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                    Seção
                </span>
                <DropdownMultiSelect
                    rotuloVazio="Todas as seções"
                    opcoes={secoesOpcoes}
                    selecionados={selecao.secoes}
                    onChange={(secoes) => onChange({ ...selecao, secoes })}
                />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                    Grupo
                </span>
                <DropdownMultiSelect
                    rotuloVazio="Todos os grupos"
                    opcoes={gruposOpcoes}
                    selecionados={selecao.grupos}
                    onChange={(grupos) => onChange({ ...selecao, grupos })}
                />
            </div>
        </div>
    )
}
