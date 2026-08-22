import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Resultado from './pages/Resultado'
import Balanco from './pages/Balanco'
import Despesas from './pages/Despesas'
import ContasPagar from './pages/ContasPagar'
import ContasReceber from './pages/ContasReceber'
import Conciliacoes from './pages/Conciliacoes'

export default function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/resultado' element={<Resultado />}/>
        <Route path='/balanco' element={<Balanco />}/>
        <Route path='/despesas' element={<Despesas />}/>
        <Route path='/contas-a-pagar' element={<ContasPagar />}/>
        <Route path='/contas-a-receber' element={<ContasReceber />}/>
        <Route path='/conciliacoes' element={<Conciliacoes />}/>
      </Routes>
    </>
  )
}
