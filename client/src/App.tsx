import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import GestaoComercial from './pages/GestaoComercial'
import Metas from './pages/Metas'

export default function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/gestao-comercial' element={<GestaoComercial />}/>
        <Route path='/metas' element={<Metas />}/>
      </Routes>
    </>
  )
}
