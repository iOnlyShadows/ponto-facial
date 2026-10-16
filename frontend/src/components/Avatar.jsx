import { useState } from 'react'
import { iniciais } from '../util'

const TONS = [['#DCE5F0', '#24456E'], ['#EADFCF', '#6B4A1E'], ['#DDE3D6', '#3E4D2C'], ['#ECDDE3', '#6E3248'], ['#E1DFEE', '#3F3870'], ['#D9E7EA', '#245560']]

// Foto do cadastro; se não carregar, mostra as iniciais com uma cor fixa por nome.
export default function Avatar({ foto, nome, tamanho = 36 }) {
  const [falhou, setFalhou] = useState(false)
  const estilo = { width: tamanho, height: tamanho, fontSize: tamanho * 0.36, borderRadius: tamanho > 60 ? 12 : 8 }
  if (foto && !falhou) return <img className="avatar" src={foto} alt="" style={estilo} onError={() => setFalhou(true)} />
  const [bg, fg] = TONS[[...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % TONS.length]
  return <div className="avatar avatar-iniciais" style={{ ...estilo, background: bg, color: fg }}>{iniciais(nome)}</div>
}
