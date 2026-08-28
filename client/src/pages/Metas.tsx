import { useEffect, useState } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import { useMe } from '../hooks/useMe'
import { useApi } from '../hooks/useApi'
import { apiPost } from '../lib/api'
import { comFiltroEcommerce, nomeFilial } from '../constants/filiais'
import type { Secao, MetaSecao } from '../types/comercial'

const IDEMPRESA_GERAL = 100

function mesAtual() {
    const hoje = new Date()
    return `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

function mesanoParaInput(mesano: string) {
    return `${mesano.slice(0, 4)}-${mesano.slice(4, 6)}`
}

function inputParaMesano(valor: string) {
    return valor.replace('-', '')
}

type FormState = Record<
    number,
    {
        meta_venda: string
        meta_margem_pct: string
        meta_compra: string
        meta_reducao_estoque_pct: string
        meta_avaria: string
    }
>

export default function Metas() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [mesano, setMesano] = useState(mesAtual())
    const [idempresa, setIdempresa] = useState(IDEMPRESA_GERAL)
    const [salvandoId, setSalvandoId] = useState<number | null>(null)
    const [form, setForm] = useState<FormState>({})

    const habilitado = me !== null && me.isAdmin
    const lojasDisponiveis = comFiltroEcommerce(me?.branches ?? [])

    const { data: secoes, loading: loadingSecoes } = useApi<Secao[]>('/comercial/secoes', {}, habilitado)
    const {
        data: metas,
        loading: loadingMetas,
        erro: metasErro,
    } = useApi<MetaSecao[]>('/metas/secao', { mesano, idempresa: String(idempresa) }, habilitado)

    useEffect(() => {
        if (!secoes) return
        const metasPorSecao = new Map((metas ?? []).map((m) => [m.idsecao, m]))

        const novoForm: FormState = {}
        secoes.forEach((secao) => {
            const meta = metasPorSecao.get(secao.IDSECAO)
            novoForm[secao.IDSECAO] = {
                meta_venda: String(meta?.meta_venda ?? 0),
                meta_margem_pct: String(meta?.meta_margem_pct ?? 0),
                meta_compra: String(meta?.meta_compra ?? 0),
                meta_reducao_estoque_pct: String(meta?.meta_reducao_estoque_pct ?? 0),
                meta_avaria: String(meta?.meta_avaria ?? 0),
            }
        })
        setForm(novoForm)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secoes, metas])

    function atualizarCampo(idsecao: number, campo: keyof FormState[number], valor: string) {
        setForm((atual) => ({
            ...atual,
            [idsecao]: { ...atual[idsecao], [campo]: valor },
        }))
    }

    async function salvar(idsecao: number) {
        const valores = form[idsecao]
        if (!valores) return

        setSalvandoId(idsecao)
        try {
            await apiPost('/metas/secao', {
                idempresa,
                idsecao,
                mesano,
                meta_venda: Number(valores.meta_venda) || 0,
                meta_margem_pct: Number(valores.meta_margem_pct) || 0,
                meta_compra: Number(valores.meta_compra) || 0,
                meta_reducao_estoque_pct: Number(valores.meta_reducao_estoque_pct) || 0,
                meta_avaria: Number(valores.meta_avaria) || 0,
            })
        } finally {
            setSalvandoId(null)
        }
    }

    const inputClass =
        'w-24 rounded-lg border border-gray-base/30 bg-white px-2 py-1.5 text-right text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'

    const carregando = loadingSecoes || loadingMetas

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Configurações"
            subtitulo="Metas mensais de venda, margem, compra, avaria e redução de estoque por seção, por loja."
            filtros={
                <div className="mb-8 flex flex-wrap gap-4">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Loja
                        </span>
                        <select
                            value={idempresa}
                            onChange={(e) => setIdempresa(Number(e.target.value))}
                            className="w-56 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        >
                            <option value={IDEMPRESA_GERAL}>Geral (todas as lojas)</option>
                            {lojasDisponiveis.map((id) => (
                                <option key={id} value={id}>
                                    {nomeFilial(id)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted">
                            Mês de referência
                        </span>
                        <input
                            type="month"
                            value={mesanoParaInput(mesano)}
                            onChange={(e) => setMesano(inputParaMesano(e.target.value))}
                            className="w-48 rounded-lg border border-gray-base/30 bg-white px-3 py-2 text-sm text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        />
                    </div>
                </div>
            }
        >
            {metasErro && <p className="text-sm text-red-base mb-4">{metasErro}</p>}

            <div className="overflow-x-auto rounded-xl border border-gray-base/30 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
                <table className="w-full min-w-[1050px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-base/30 text-left text-xs font-semibold uppercase tracking-wide text-gray-dark dark:border-dark-border dark:text-dark-text-muted">
                            <th className="px-4 py-3">Seção</th>
                            <th className="px-4 py-3 text-right">Meta Venda (R$)</th>
                            <th className="px-4 py-3 text-right">Meta Margem (%)</th>
                            <th className="px-4 py-3 text-right">Meta Compra (R$)</th>
                            <th className="px-4 py-3 text-right">Meta Avaria (R$)</th>
                            <th className="px-4 py-3 text-right">Meta Redução Estoque (%)</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {carregando && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center">
                                    <Spinner className="mx-auto h-5 w-5" />
                                </td>
                            </tr>
                        )}

                        {!carregando &&
                            (secoes ?? []).map((secao) => {
                                const valores = form[secao.IDSECAO]
                                if (!valores) return null

                                return (
                                    <tr
                                        key={secao.IDSECAO}
                                        className="border-b border-gray-base/10 text-gray-text last:border-0 dark:border-dark-border/60 dark:text-dark-text"
                                    >
                                        <td className="px-4 py-2.5 font-medium">{secao.DESCRSECAO}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={valores.meta_venda}
                                                onChange={(e) => atualizarCampo(secao.IDSECAO, 'meta_venda', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={valores.meta_margem_pct}
                                                onChange={(e) => atualizarCampo(secao.IDSECAO, 'meta_margem_pct', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={valores.meta_compra}
                                                onChange={(e) => atualizarCampo(secao.IDSECAO, 'meta_compra', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={valores.meta_avaria}
                                                onChange={(e) => atualizarCampo(secao.IDSECAO, 'meta_avaria', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={valores.meta_reducao_estoque_pct}
                                                onChange={(e) =>
                                                    atualizarCampo(secao.IDSECAO, 'meta_reducao_estoque_pct', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() => salvar(secao.IDSECAO)}
                                                disabled={salvandoId === secao.IDSECAO}
                                                className="rounded-lg bg-orange-base px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-light disabled:opacity-50"
                                            >
                                                {salvandoId === secao.IDSECAO ? 'Salvando...' : 'Salvar'}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                    </tbody>
                </table>
            </div>
        </PageShell>
    )
}
