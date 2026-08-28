import { useState } from 'react'
import PageShell from '../components/PageShell'
import TabButtons from '../components/TabButtons'
import FornecedoresConteudo from '../components/fornecedores/FornecedoresConteudo'
import InadimplenciasConteudo from '../components/fornecedores/InadimplenciasConteudo'
import { useMe } from '../hooks/useMe'

const ABAS = [
    { id: 'fornecedores', label: 'Fornecedores' },
    { id: 'inadimplencias', label: 'Inadimplências' },
] as const

type AbaId = (typeof ABAS)[number]['id']

export default function FornecedoresVendedores() {
    const { me, loading: loadingMe, error: meError } = useMe()
    const [aba, setAba] = useState<AbaId>('fornecedores')

    return (
        <PageShell
            isAdmin={me?.isAdmin ?? false}
            loadingMe={loadingMe}
            meError={meError}
            autorizado={me?.isAdmin ?? false}
            titulo="Fornecedores e Vendedores"
            subtitulo="Cadastro de fornecedores e vendedores, e títulos de inadimplência vinculados."
        >
            <TabButtons abas={ABAS} ativa={aba} onChange={(id) => setAba(id as AbaId)} />

            {aba === 'fornecedores' && <FornecedoresConteudo />}
            {aba === 'inadimplencias' && <InadimplenciasConteudo />}
        </PageShell>
    )
}
