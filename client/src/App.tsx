import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import GestaoComercial from './pages/GestaoComercial'
import Metas from './pages/Metas'
import Tributacao from './pages/Tributacao'
import EstoqueTransferencias from './pages/EstoqueTransferencias'
import ComparativoFabricante from './pages/ComparativoFabricante'
import AnaliseMargem from './pages/AnaliseMargem'
import TicketOperador from './pages/TicketOperador'
import CatalogoProdutos from './pages/CatalogoProdutos'

export default function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/gestao-comercial' element={<GestaoComercial />}/>
        <Route path='/configuracoes' element={<Metas />}/>
        <Route path='/tributacao' element={<Tributacao />}/>
        <Route path='/estoque-transferencias' element={<EstoqueTransferencias />}/>
        <Route path='/comparativo-fabricante' element={<ComparativoFabricante />}/>
        <Route path='/analise-margem' element={<AnaliseMargem />}/>
        <Route path='/ticket-operador' element={<TicketOperador />}/>
        <Route path='/catalogo-produtos' element={<CatalogoProdutos />}/>
      </Routes>
    </>
  )
}
