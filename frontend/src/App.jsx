import { useEffect, useState } from 'react'
import RegistrarPonto from './pages/RegistrarPonto'
import Cadastro from './pages/Cadastro'
import Historico from './pages/Historico'
import { dataCurta } from './util'

const TELAS = [
  ['ponto', 'Registrar ponto'],
  ['cadastro', 'Cadastro'],
  ['historico', 'Histórico'],
]

export default function App() {
  const [tela, setTela] = useState('ponto')
  const [quiosque, setQuiosque] = useState(false)

  useEffect(() => {
    const sair = e => e.key === 'Escape' && setQuiosque(false)
    window.addEventListener('keydown', sair)
    return () => window.removeEventListener('keydown', sair)
  }, [])

  function abrirQuiosque() {
    setTela('ponto')
    setQuiosque(true)
    document.documentElement.requestFullscreen?.().catch(() => {})
  }
  function sairQuiosque() {
    setQuiosque(false)
    if (document.fullscreenElement) document.exitFullscreen()
  }

  return (
    <div className="app">
      {!quiosque && (
        <header className="topo">
          <div className="marca">
            <div className="logo"><div /></div>
            <span>Ponto Facial</span>
          </div>
          <nav>
            {TELAS.map(([k, label]) => (
              <button key={k} className={tela === k ? 'ativo' : ''} onClick={() => setTela(k)}>{label}</button>
            ))}
          </nav>
          <div className="topo-dir">
            <span className="sub-p">{dataCurta(new Date())}</span>
            <button className="btn-secundario" onClick={abrirQuiosque}>Abrir modo quiosque</button>
          </div>
        </header>
      )}
      {(tela === 'ponto' || quiosque) && <RegistrarPonto quiosque={quiosque} sairQuiosque={sairQuiosque} />}
      {tela === 'cadastro' && !quiosque && <Cadastro />}
      {tela === 'historico' && !quiosque && <Historico />}
    </div>
  )
}
