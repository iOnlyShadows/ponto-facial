import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useEspelho } from '../espelho'

// Câmera do navegador (getUserMedia). O pai chama ref.current.capturar() para tirar uma foto.
const Camera = forwardRef(function Camera({ children, className = '' }, ref) {
  const video = useRef(null)
  const [status, setStatus] = useState('pendente') // pendente | ativa | erro
  const [espelhar, alternarEspelho] = useEspelho()

  useEffect(() => {
    let stream
    let cancelado = false
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false })
      .then(s => {
        if (cancelado) return s.getTracks().forEach(t => t.stop())
        stream = s
        video.current.srcObject = s
        setStatus('ativa')
      })
      .catch(() => setStatus('erro'))
    if (!navigator.mediaDevices) setStatus('erro')
    return () => {
      cancelado = true
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [])

  useImperativeHandle(ref, () => ({
    pronta: () => status === 'ativa',
    // Foto do quadro atual em JPEG (data URL). Vai sem espelhar: é a imagem real da câmera.
    capturar() {
      const v = video.current
      if (status !== 'ativa' || !v.videoWidth) return null
      const largura = Math.min(960, v.videoWidth)
      const altura = Math.round(v.videoHeight * (largura / v.videoWidth))
      const canvas = document.createElement('canvas')
      canvas.width = largura
      canvas.height = altura
      canvas.getContext('2d').drawImage(v, 0, 0, largura, altura)
      return canvas.toDataURL('image/jpeg', 0.9)
    },
  }), [status])

  return (
    <div className={'camera ' + className}>
      <video ref={video} autoPlay muted playsInline className={(status === 'ativa' ? '' : 'oculto') + (espelhar ? ' espelhada' : '')} />
      {status !== 'ativa' && (
        <div className="camera-vazia">
          <svg viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="150" r="78" /><path d="M40 400c0-96 72-160 160-160s160 64 160 160z" /></svg>
        </div>
      )}
      {children}
      <div className="camera-status">
        <span className={'ponto-status ' + status} />
        {status === 'ativa' ? 'Câmera ativa' : status === 'pendente' ? 'Aguardando permissão da câmera' : 'Câmera indisponível. Permita o acesso no navegador.'}
      </div>
      <button type="button" className="btn-espelho" onClick={alternarEspelho} aria-pressed={espelhar}
        title={espelhar ? 'A pessoa se vê como num espelho (câmera virada para quem usa a tela)' : 'Imagem real (câmera virada para a pessoa, operador do outro lado)'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M8 7 3 12l5 5V7ZM16 7l5 5-5 5V7Z" /></svg>
        {espelhar ? 'Espelhada' : 'Sem espelho'}
      </button>
    </div>
  )
})

export default Camera
