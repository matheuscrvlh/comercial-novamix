import { useState } from 'react'
import PageShell from '../components/PageShell'
import TabButtons from '../components/TabButtons'
import TransferenciasConteudo from '../components/estoque/TransferenciasConteudo'
import AcoesCompraConteudo from '../components/estoque/AcoesCompraConteudo'
import ValidadeConteudo from '../components/estoque/ValidadeConteudo'
import { useMe } from '../hooks/useMe'

const ABAS = [
    { id: 'transferencias', label: 'Transferências & Saldos' },
    { id: 'acoes-compra', label: 'Ações de Compra' },
    { id: 'validade', label: 'Controle de Validade' },
] as const

type AbaId = (typeof ABAS)[number]['id']

export default function Estoque() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [aba, setAba] = useState<AbaId>('transferencias')

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Estoque"
            subtitulo="Transferências entre lojas, estoque negativo e parado, ações de compra e controle de validade."
        >
            <TabButtons abas={ABAS} ativa={aba} onChange={(id) => setAba(id as AbaId)} />

            {aba === 'transferencias' && <TransferenciasConteudo />}
            {aba === 'acoes-compra' && <AcoesCompraConteudo />}
            {aba === 'validade' && <ValidadeConteudo />}
        </PageShell>
    )
}
