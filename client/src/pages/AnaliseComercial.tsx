import { useState } from 'react'
import PageShell from '../components/PageShell'
import TabButtons from '../components/TabButtons'
import ComparativoFabricanteConteudo from '../components/analise/ComparativoFabricanteConteudo'
import AnaliseMargemConteudo from '../components/analise/AnaliseMargemConteudo'
import TicketOperadorConteudo from '../components/analise/TicketOperadorConteudo'
import CotacaoConcorrenteConteudo from '../components/analise/CotacaoConcorrenteConteudo'
import { useMe } from '../hooks/useMe'

const ABAS = [
    { id: 'margem', label: 'Análise de Margem' },
    { id: 'fabricante', label: 'Comparativo por Fabricante' },
    { id: 'ticket', label: 'Ticket por Operador' },
    { id: 'cotacao', label: 'Cotação com Concorrente' },
] as const

type AbaId = (typeof ABAS)[number]['id']

export default function AnaliseComercial() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [aba, setAba] = useState<AbaId>('margem')

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Análise Comercial"
            subtitulo="Comparativo por fabricante, exceções de margem, desempenho de operador e cotação de concorrentes."
        >
            <TabButtons abas={ABAS} ativa={aba} onChange={(id) => setAba(id as AbaId)} />

            {aba === 'fabricante' && <ComparativoFabricanteConteudo />}
            {aba === 'margem' && <AnaliseMargemConteudo />}
            {aba === 'ticket' && <TicketOperadorConteudo />}
            {aba === 'cotacao' && <CotacaoConcorrenteConteudo />}
        </PageShell>
    )
}
