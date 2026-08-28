import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import GestaoComercial from './pages/GestaoComercial'
import AnaliseComercial from './pages/AnaliseComercial'
import Metas from './pages/Metas'
import Tributacao from './pages/Tributacao'
import Estoque from './pages/Estoque'
import CatalogoProdutos from './pages/CatalogoProdutos'
import FornecedoresVendedores from './pages/FornecedoresVendedores'

export default function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/gestao-comercial' element={<GestaoComercial />}/>
        <Route path='/analise-comercial' element={<AnaliseComercial />}/>
        <Route path='/configuracoes' element={<Metas />}/>
        <Route path='/tributacao' element={<Tributacao />}/>
        <Route path='/estoque' element={<Estoque />}/>
        <Route path='/produtos' element={<CatalogoProdutos />}/>
        <Route path='/fornecedores-vendedores' element={<FornecedoresVendedores />}/>
      </Routes>
    </>
  )
}
