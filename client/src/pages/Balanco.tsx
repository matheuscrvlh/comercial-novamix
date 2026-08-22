import { useState } from 'react'
import PageShell from '../components/PageShell'
import Spinner from '../components/Spinner'
import FiltersMenu from '../components/FiltersMenu'
import FilialMultiFilter from '../components/FilialMultiFilter'
import DataTable from '../components/DataTable'
import { useMe } from '../hooks/useMe'
import { useFinanceiro } from '../hooks/useFinanceiro'
import { formatCurrency, formatPercent, formatRatio } from '../lib/format'
import { getUltimoMesFechado } from '../lib/date'
import type { BalancoLinha, BalancoResponse } from '../types/financeiro'

function hoje() {
    return new Date().toISOString().slice(0, 10)
}

function extrairIndicadores(linhas: BalancoLinha[]) {
    function valor(linha: string) {
        return Number(linhas.find((item) => item.LINHA === linha)?.VALOR ?? 0)
    }

    const disponivel = valor('DISPONIVEL')
    const valoresReceber = valor('VALORES_A_RECEBER')
    const estoques = valor('ESTOQUES')
    const despesasAntecipadas = valor('DESPESAS_ANTECIPADAS')
    const ativoCirculante = disponivel + valoresReceber + estoques + despesasAntecipadas

    const realizavelLp = valor('REALIZAVEL_LONGO_PRAZO')
    const investimentos = valor('INVESTIMENTOS')
    const imobilizado = valor('IMOBILIZADO')
    const ativoNaoCirculante = realizavelLp + investimentos + imobilizado

    const ativoTotal = ativoCirculante + ativoNaoCirculante

    const passivoCirculante = valor('OBRIGACOES_COM_TERCEIROS')
    const passivoNaoCirculante = valor('EXIGIVEL_LONGO_PRAZO')
    const passivoTotal = passivoCirculante + passivoNaoCirculante

    const capitalSocial = valor('CAPITAL_SOCIAL')
    const reservas = valor('RESERVAS')
    const prejuizosAcumulados = valor('PREJUIZOS_ACUMULADOS')
    const resultadoExercicio = ativoTotal - passivoTotal - capitalSocial - reservas - prejuizosAcumulados
    const patrimonioLiquido = capitalSocial + reservas + prejuizosAcumulados + resultadoExercicio

    const liquidezCorrente = passivoCirculante !== 0 ? ativoCirculante / passivoCirculante : 0
    const liquidezSeca = passivoCirculante !== 0 ? (ativoCirculante - estoques) / passivoCirculante : 0
    const capitalGiro = ativoCirculante - passivoCirculante
    const endividamento = ativoTotal !== 0 ? passivoTotal / ativoTotal : 0
    const passivoSobrePl = patrimonioLiquido !== 0 ? passivoTotal / patrimonioLiquido : 0

    return {
        disponivel,
        valoresReceber,
        estoques,
        despesasAntecipadas,
        ativoCirculante,
        realizavelLp,
        investimentos,
        imobilizado,
        ativoNaoCirculante,
        ativoTotal,
        passivoCirculante,
        passivoNaoCirculante,
        passivoTotal,
        capitalSocial,
        reservas,
        prejuizosAcumulados,
        resultadoExercicio,
        patrimonioLiquido,
        liquidezCorrente,
        liquidezSeca,
        capitalGiro,
        endividamento,
        passivoSobrePl,
    }
}

export default function Balanco() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [dataBase, setDataBase] = useState(hoje)
    const [selecionadas, setSelecionadas] = useState<number[]>([])

    const branchesDisponiveis = me ? me.branches : []
    const filiaisAtivas = selecionadas.length > 0 ? selecionadas : branchesDisponiveis

    const habilitado = me !== null && me.isAdmin

    const { data, loading, erro } = useFinanceiro<BalancoResponse>(
        '/financeiro/balanco',
        { dataBase, filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const ultimoFechado = getUltimoMesFechado()
    const {
        data: dataFechado,
        loading: loadingFechado,
        erro: erroFechado,
    } = useFinanceiro<BalancoResponse>(
        '/financeiro/balanco',
        { dataBase: ultimoFechado.fim, filiais: filiaisAtivas.join(',') },
        habilitado
    )

    const {
        disponivel,
        valoresReceber,
        estoques,
        despesasAntecipadas,
        ativoCirculante,
        realizavelLp,
        investimentos,
        imobilizado,
        ativoNaoCirculante,
        ativoTotal,
        passivoCirculante,
        passivoNaoCirculante,
        passivoTotal,
        capitalSocial,
        reservas,
        prejuizosAcumulados,
        resultadoExercicio,
        patrimonioLiquido,
        liquidezCorrente,
        liquidezSeca,
        capitalGiro,
        endividamento,
        passivoSobrePl,
    } = extrairIndicadores(data?.linhas ?? [])

    const fechado = extrairIndicadores(dataFechado?.linhas ?? [])

    const indicadores = [
        { titulo: 'Liquidez corrente', valor: formatRatio(liquidezCorrente) + 'x', ref: 'Ref. 1,5-2,0x' },
        { titulo: 'Liquidez seca', valor: formatRatio(liquidezSeca) + 'x', ref: 'Ref. >=1,0x' },
        { titulo: 'Capital de giro', valor: formatCurrency(capitalGiro), ref: 'Ativo circ. - Passivo circ.' },
        { titulo: 'Endividamento', valor: formatPercent(endividamento), ref: 'Ref. <60%' },
        { titulo: 'Passivo / PL', valor: formatRatio(passivoSobrePl) + 'x', ref: 'Ref. <2,0x' },
        { titulo: 'Patrimônio líquido', valor: formatCurrency(patrimonioLiquido), ref: '' },
    ]

    const comparativo: { linha: string; hoje: number; fechado: number; ratio?: boolean; percent?: boolean }[] = [
        { linha: 'Ativo total', hoje: ativoTotal, fechado: fechado.ativoTotal },
        { linha: 'Passivo total', hoje: passivoTotal, fechado: fechado.passivoTotal },
        { linha: 'Patrimônio líquido', hoje: patrimonioLiquido, fechado: fechado.patrimonioLiquido },
        { linha: 'Capital de giro', hoje: capitalGiro, fechado: fechado.capitalGiro },
        { linha: 'Liquidez corrente', hoje: liquidezCorrente, fechado: fechado.liquidezCorrente, ratio: true },
        { linha: 'Endividamento', hoje: endividamento, fechado: fechado.endividamento, percent: true },
    ]

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={habilitado}
            titulo='Balanço Patrimonial'
            subtitulo='Ativo, Passivo, Patrimônio Líquido e indicadores de liquidez/endividamento.'
            filtros={
                <FiltersMenu>
                    <div className='flex flex-col gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                            Filiais
                        </span>
                        <FilialMultiFilter branches={branchesDisponiveis} selected={filiaisAtivas} onChange={setSelecionadas} />
                    </div>
                    <div className='flex flex-col gap-2'>
                        <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                            Data-base
                        </span>
                        <input
                            type='date'
                            value={dataBase}
                            onChange={(event) => setDataBase(event.target.value)}
                            className='rounded-lg border border-gray-base/30 bg-white px-4 py-2 text-sm font-medium text-gray-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
                        />
                    </div>
                </FiltersMenu>
            }
        >
            {erro && (
                <div className='mb-6 rounded-lg px-4 py-3 text-sm font-medium bg-red-light/10 text-red-base'>{erro}</div>
            )}

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {indicadores.map((item) => (
                    <div
                        key={item.titulo}
                        className='rounded-xl border border-gray-base/30 bg-white dark:bg-dark-surface dark:border-dark-border p-6 shadow-sm'
                    >
                        <span className='text-xs font-semibold uppercase tracking-wide text-gray-dark dark:text-dark-text-muted'>
                            {item.titulo}
                        </span>
                        <div className='mt-2 text-xl font-semibold text-gray-text dark:text-dark-text'>
                            {loading ? <Spinner className='h-5 w-5' /> : item.valor}
                        </div>
                        {item.ref && <span className='text-xs text-gray-dark dark:text-dark-text-muted'>{item.ref}</span>}
                    </div>
                ))}
            </div>

            <div className='mt-6'>
                <DataTable
                    titulo={`Hoje (${dataBase.split('-').reverse().join('/')}) x último fechado (${ultimoFechado.fim.split('-').reverse().join('/')})`}
                    loading={loading || loadingFechado}
                    erro={erroFechado}
                    rows={comparativo}
                    columns={[
                        { key: 'linha', label: 'Linha', render: (row) => String(row.linha) },
                        {
                            key: 'hoje',
                            label: 'Hoje',
                            align: 'right',
                            render: (row) =>
                                row.ratio
                                    ? `${formatRatio(Number(row.hoje))}x`
                                    : row.percent
                                      ? formatPercent(Number(row.hoje))
                                      : formatCurrency(Number(row.hoje)),
                        },
                        {
                            key: 'fechado',
                            label: 'Último fechado',
                            align: 'right',
                            render: (row) =>
                                row.ratio
                                    ? `${formatRatio(Number(row.fechado))}x`
                                    : row.percent
                                      ? formatPercent(Number(row.fechado))
                                      : formatCurrency(Number(row.fechado)),
                        },
                        {
                            key: 'variacao',
                            label: 'Variação',
                            align: 'right',
                            render: (row) => {
                                const base = Number(row.fechado)
                                const variacao = base !== 0 ? (Number(row.hoje) - base) / Math.abs(base) : 0
                                return formatPercent(variacao)
                            },
                            destaque: (row) => Number(row.hoje) < Number(row.fechado),
                        },
                    ]}
                />
            </div>

            <div className='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <DataTable
                    titulo='Ativo'
                    loading={loading}
                    rows={[
                        { linha: 'Ativo circulante', valor: ativoCirculante, destaque: true },
                        { linha: 'Disponível', valor: disponivel, destaque: false },
                        { linha: 'Valores a receber', valor: valoresReceber, destaque: false },
                        { linha: 'Estoques', valor: estoques, destaque: false },
                        { linha: 'Despesas antecipadas', valor: despesasAntecipadas, destaque: false },
                        { linha: 'Ativo não circulante', valor: ativoNaoCirculante, destaque: true },
                        { linha: 'Realizável a longo prazo', valor: realizavelLp, destaque: false },
                        { linha: 'Investimentos', valor: investimentos, destaque: false },
                        { linha: 'Imobilizado', valor: imobilizado, destaque: false },
                        { linha: 'Total do ativo', valor: ativoTotal, destaque: true },
                    ]}
                    columns={[
                        { key: 'linha', label: 'Linha', render: (row) => String(row.linha) },
                        {
                            key: 'valor',
                            label: 'Valor',
                            align: 'right',
                            render: (row) => formatCurrency(Number(row.valor)),
                            destaque: (row) => Boolean(row.destaque),
                        },
                    ]}
                />

                <DataTable
                    titulo='Passivo + Patrimônio Líquido'
                    loading={loading}
                    rows={[
                        { linha: 'Passivo circulante', valor: passivoCirculante, destaque: true },
                        { linha: 'Obrigações com terceiros', valor: passivoCirculante, destaque: false },
                        { linha: 'Passivo não circulante', valor: passivoNaoCirculante, destaque: true },
                        { linha: 'Exigível a longo prazo', valor: passivoNaoCirculante, destaque: false },
                        { linha: 'Patrimônio líquido', valor: patrimonioLiquido, destaque: true },
                        { linha: 'Capital social', valor: capitalSocial, destaque: false },
                        { linha: 'Reservas', valor: reservas, destaque: false },
                        { linha: 'Prejuízos acumulados', valor: prejuizosAcumulados, destaque: false },
                        { linha: 'Resultado do exercício', valor: resultadoExercicio, destaque: false },
                        { linha: 'Total passivo + PL', valor: passivoTotal + patrimonioLiquido, destaque: true },
                    ]}
                    columns={[
                        { key: 'linha', label: 'Linha', render: (row) => String(row.linha) },
                        {
                            key: 'valor',
                            label: 'Valor',
                            align: 'right',
                            render: (row) => formatCurrency(Number(row.valor)),
                            destaque: (row) => Boolean(row.destaque),
                        },
                    ]}
                />
            </div>
        </PageShell>
    )
}
