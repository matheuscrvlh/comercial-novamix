import { useState } from 'react'
import Spinner from './Spinner'
import { ChevronDownIcon } from './icons'
import { formatNumber } from '../lib/format'
import type { ResumoMercadologicoRow } from '../types/comercial'

interface TreeNode {
    id: string
    label: string
    ativos: number
    inativos: number
    total: number
    children: TreeNode[]
}

function acumula(node: TreeNode, row: ResumoMercadologicoRow) {
    node.ativos += row.ATIVOS
    node.inativos += row.INATIVOS
    node.total += row.TOTAL
}

function buildTree(rows: ResumoMercadologicoRow[]): TreeNode[] {
    const divisaoMap = new Map<string, TreeNode>()
    const secaoMap = new Map<string, TreeNode>()
    const grupoMap = new Map<string, TreeNode>()

    for (const row of rows) {
        const dId = String(row.IDDIVISAO ?? 'null')
        let divisao = divisaoMap.get(dId)
        if (!divisao) {
            divisao = { id: dId, label: row.DESCRDIVISAO ?? 'Sem divisão', ativos: 0, inativos: 0, total: 0, children: [] }
            divisaoMap.set(dId, divisao)
        }
        acumula(divisao, row)

        const sId = `${dId}/${row.IDSECAO ?? 'null'}`
        let secao = secaoMap.get(sId)
        if (!secao) {
            secao = { id: sId, label: row.DESCRSECAO ?? 'Sem seção', ativos: 0, inativos: 0, total: 0, children: [] }
            secaoMap.set(sId, secao)
            divisao.children.push(secao)
        }
        acumula(secao, row)

        const gId = `${sId}/${row.IDGRUPO ?? 'null'}`
        let grupo = grupoMap.get(gId)
        if (!grupo) {
            grupo = { id: gId, label: row.DESCRGRUPO ?? 'Sem grupo', ativos: 0, inativos: 0, total: 0, children: [] }
            grupoMap.set(gId, grupo)
            secao.children.push(grupo)
        }
        acumula(grupo, row)

        grupo.children.push({
            id: `${gId}/${row.IDSUBGRUPO ?? 'null'}`,
            label: row.DESCRSUBGRUPO ?? 'Sem subgrupo',
            ativos: row.ATIVOS,
            inativos: row.INATIVOS,
            total: row.TOTAL,
            children: [],
        })
    }

    return Array.from(divisaoMap.values()).sort((a, b) => b.total - a.total)
}

function ResumoRow({
    node,
    depth,
    expandedIds,
    onToggle,
}: {
    node: TreeNode
    depth: number
    expandedIds: Set<string>
    onToggle: (id: string) => void
}) {
    const temFilhos = node.children.length > 0
    const aberto = expandedIds.has(node.id)

    return (
        <>
            <tr className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text">
                <td className="py-2 pr-4 font-medium" style={{ paddingLeft: `${16 + depth * 20}px` }}>
                    <span className="flex items-center gap-2">
                        {temFilhos ? (
                            <button
                                type="button"
                                onClick={() => onToggle(node.id)}
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-dark transition hover:bg-gray-base/10 dark:text-dark-text-muted"
                                aria-label={aberto ? 'Recolher' : 'Expandir'}
                            >
                                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                            </button>
                        ) : (
                            <span className="h-5 w-5 shrink-0" />
                        )}
                        {node.label}
                    </span>
                </td>
                <td className="px-4 py-2 text-right text-green-base">{formatNumber(node.ativos)}</td>
                <td className="px-4 py-2 text-right text-red-base">{formatNumber(node.inativos)}</td>
                <td className="px-4 py-2 text-right">{formatNumber(node.total)}</td>
            </tr>
            {temFilhos &&
                aberto &&
                node.children.map((child) => (
                    <ResumoRow key={child.id} node={child} depth={depth + 1} expandedIds={expandedIds} onToggle={onToggle} />
                ))}
        </>
    )
}

export default function ResumoSecaoTree({ rows, loading }: { rows: ResumoMercadologicoRow[]; loading: boolean }) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    function toggle(id: string) {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const tree = buildTree(rows)

    return (
        <div className="mb-8 max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <table className="w-full min-w-[500px] text-sm">
                <thead className="sticky top-0 bg-white dark:bg-dark-surface">
                    <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                        <th className="px-4 py-3">Divisão / Seção / Grupo / Subgrupo</th>
                        <th className="px-4 py-3 text-right">Ativos</th>
                        <th className="px-4 py-3 text-right">Inativos</th>
                        <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && (
                        <tr>
                            <td colSpan={4} className="px-4 py-8 text-center">
                                <Spinner className="mx-auto h-5 w-5" />
                            </td>
                        </tr>
                    )}
                    {!loading &&
                        tree.map((node) => (
                            <ResumoRow key={node.id} node={node} depth={0} expandedIds={expandedIds} onToggle={toggle} />
                        ))}
                    {!loading && tree.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-dark dark:text-dark-text-muted">
                                Nenhum dado disponível.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
