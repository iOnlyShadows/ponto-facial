import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import Camera from '../components/Camera'
import Avatar from '../components/Avatar'
import { TIPOS, dataLonga, horaMin, segundos } from '../util'

const OPCOES = [
  ['auto', 'Automático', 'Próxima marcação pela sequência do dia'],
  ['entrada', 'Entrada', 'Início da jornada'],
  ['intervalo', 'Intervalo', 'Saída para almoço ou pausa'],
  ['retorno', 'Retorno', 'Volta do intervalo'],
  ['saida', 'Saída', 'Fim da jornada'],
]

const ERROS = {
  nao: { icone: '×', grave: true, titulo: 'Funcionário não reconhecido.', texto: 'Tente novamente ou procure o RH.' },
  nenhum: { icone: '!', titulo: 'Nenhum rosto detectado.', texto: 'Fique de frente para a câmera, a cerca de 50 cm, com o rosto dentro da moldura e bem iluminado. Retire boné ou óculos escuros e tente novamente.' },
  multiplo: { icone: '!', titulo: 'Mais de um rosto na imagem.', texto: 'O registro é feito uma pessoa por vez. Peça para quem estiver atrás aguardar fora do enquadramento e tente novamente.' },
  camera: { icone: '!', titulo: 'Câmera indisponível.', texto: 'Permita o acesso à câmera no navegador e tente novamente.' },
}

const PILULA = {
  aguardando: 'Posicione o rosto dentro da moldura',
  processando: 'Identificando...',
  reconhecido: 'Rosto reconhecido',
  nao: 'Não reconhecido',
  nenhum: 'Nenhum rosto detectado',
  multiplo: 'Mais de um rosto na imagem',
}

const VOLTA_SUCESSO = 6
const VOLTA_ERRO = 9

export default function RegistrarPonto({ quiosque, sairQuiosque }) {
  const camera = useRef(null)
  const [agora, setAgora] = useState(new Date())
  const [tipo, setTipo] = useState('auto')
  const [fase, setFase] = useState('aguardando')
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)
  const [voltaEm, setVoltaEm] = useState(null) // timestamp em que a tela volta para "aguardando"

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Volta sozinho para a tela inicial depois de mostrar o resultado
  useEffect(() => {
    if (voltaEm && agora.getTime() >= voltaEm) reiniciar()
  }, [agora, voltaEm])

  function reiniciar() {
    setFase('aguardando')
    setResultado(null)
    setErro(null)
    setVoltaEm(null)
    setTipo('auto')
  }

  async function registrar() {
    const foto = camera.current?.capturar()
    if (!foto) return mostrarErro({ codigo: 'camera' })
    setFase('processando')
    try {
      const r = await api.registrarPonto(foto, tipo === 'auto' ? null : tipo)
      setResultado(r)
      setFase('reconhecido')
      setVoltaEm(Date.now() + VOLTA_SUCESSO * 1000)
    } catch (e) {
      mostrarErro(e)
    }
  }

  function mostrarErro(e) {
    const conhecido = ERROS[e.codigo]
    setErro(conhecido || { icone: '!', titulo: e.codigo === 'repetido' ? 'Ponto já registrado.' : 'Não foi possível registrar.', texto: e.message })
    setFase(['nao', 'nenhum', 'multiplo'].includes(e.codigo) ? e.codigo : 'falha')
    setVoltaEm(Date.now() + VOLTA_ERRO * 1000)
  }

  const ocupado = fase !== 'aguardando'
  const restante = voltaEm ? Math.max(0, Math.ceil((voltaEm - agora.getTime()) / 1000)) : 0
  const moldura = { processando: 'azul', reconhecido: 'verde', nao: 'vermelho' }[fase] || 'tracejada'
  const escurecer = ['reconhecido', 'nao', 'nenhum', 'multiplo', 'falha'].includes(fase)
  const rotuloBotao = { aguardando: 'Registrar ponto', processando: 'Identificando...', reconhecido: 'Novo registro' }[fase] || 'Tentar novamente'

  return (
    <main className="ponto">
      <section className="ponto-camera">
        <Camera ref={camera}>
          <div className={`moldura ${moldura} ${escurecer ? 'escura' : ''}`}>
            {fase === 'processando' && <div className="scan"><div className="scan-brilho" /><div className="scan-linha" /></div>}
          </div>
          <div className="pilula-topo">
            <div className={'pilula ' + (fase === 'reconhecido' ? 'ok' : fase === 'nao' ? 'falhou' : '')}>
              {fase === 'processando' && <span className="spinner" />}
              {PILULA[fase] || 'Tente novamente'}
            </div>
          </div>

          {fase === 'reconhecido' && resultado && (
            <div className="card-resultado">
              <div className="card-resultado-corpo">
                <Avatar foto={resultado.funcionario.foto} nome={resultado.funcionario.nome} tamanho={96} />
                <div className="card-resultado-info">
                  <div className="card-nome">{resultado.funcionario.nome}</div>
                  <div className="card-cargo">{resultado.funcionario.cargo} · Matrícula <span className="mono">{resultado.funcionario.matricula}</span></div>
                  <div className="card-frase"><span className="check">✓</span>{TIPOS[resultado.tipo].frase} {resultado.hora.slice(0, 5)}</div>
                </div>
                <div className="card-confianca">
                  <div className="rotulo">Similaridade</div>
                  <div className="valor mono">{resultado.similaridade.toFixed(1).replace('.', ',')}%</div>
                </div>
              </div>
              <div className="card-rodape">
                <span>Tipo: {resultado.automatico ? `Automático (${TIPOS[resultado.tipo].label})` : `${TIPOS[resultado.tipo].label} (manual)`}</span>
                <span>Voltando à tela inicial em {restante} s</span>
              </div>
              <div className="barra"><div style={{ width: `${(restante / VOLTA_SUCESSO) * 100}%` }} /></div>
            </div>
          )}

          {erro && (
            <div className="card-erro">
              <div className={'icone ' + (erro.grave ? 'grave' : '')}>{erro.icone}</div>
              <div>
                <div className={'titulo ' + (erro.grave ? 'grave' : '')}>{erro.titulo}</div>
                <div className="texto">{erro.texto}</div>
              </div>
            </div>
          )}
        </Camera>
      </section>

      <aside className="ponto-painel">
        <div className="painel-topo">
          <span>Terminal 01 · Recepção</span>
          {quiosque && <button className="btn-sair" onClick={sairQuiosque}>Sair (Esc)</button>}
        </div>
        <div className="relogio">
          <div className="relogio-data">{dataLonga(agora)}</div>
          <div className="relogio-hora"><span>{horaMin(agora)}</span><small>:{segundos(agora)}</small></div>
        </div>
        <div className="tipos">
          <div className="rotulo">Tipo de registro</div>
          {OPCOES.map(([chave, label, desc]) => (
            <button key={chave} className={'tipo ' + (tipo === chave ? 'sel' : '')} disabled={ocupado} onClick={() => setTipo(chave)}>
              <span className="radio"><span /></span>
              <span><b>{label}</b><small>{desc}</small></span>
            </button>
          ))}
        </div>
        <div className="painel-acao">
          <button className="btn-registrar" disabled={fase === 'processando'} onClick={fase === 'aguardando' ? registrar : reiniciar}>{rotuloBotao}</button>
          <div className="dica">Olhe para a câmera e toque no botão</div>
        </div>
      </aside>
    </main>
  )
}
