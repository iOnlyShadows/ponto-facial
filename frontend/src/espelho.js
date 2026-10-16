import { useEffect, useState } from 'react'

// Espelhar a imagem da câmera na tela.
// Ligado: como a câmera frontal do celular (a própria pessoa se vê, ex.: quiosque).
// Desligado: imagem real (câmera virada para a pessoa e operador do outro lado).
// Só muda o que aparece na tela; a foto enviada ao DeepFace é sempre a imagem real.
const CHAVE = 'ponto.espelhar'
const EVENTO = 'ponto-espelho'

function ler() {
  try { return localStorage.getItem(CHAVE) !== 'nao' } catch { return true }
}

export function useEspelho() {
  const [espelhar, setEspelhar] = useState(ler)
  useEffect(() => {
    const atualizar = () => setEspelhar(ler())
    window.addEventListener(EVENTO, atualizar)
    return () => window.removeEventListener(EVENTO, atualizar)
  }, [])
  function alternar() {
    try { localStorage.setItem(CHAVE, ler() ? 'nao' : 'sim') } catch {}
    window.dispatchEvent(new Event(EVENTO))
  }
  return [espelhar, alternar]
}
