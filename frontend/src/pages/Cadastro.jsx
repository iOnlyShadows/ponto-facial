import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import Camera from '../components/Camera'
import Avatar from '../components/Avatar'
import { useEspelho } from '../espelho'

const CARGOS = ['Analista de RH', 'Auxiliar Administrativo', 'Vendedora', 'Vendedor', 'Estoquista', 'Gerente', 'Recepcionista']
const VAZIO = { nome: '', matricula: '', cargo: '' }

export default function Cadastro() {
  const camera = useRef(null)
  const [form, setForm] = useState(VAZIO)
  const [foto, setFoto] = useState(null)
  const [fotoStatus, setFotoStatus] = useState(null) // verificando | ok | sem-rosto | varios
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(null)
  const [destaque, setDestaque] = useState(null)
  const [funcionarios, setFuncionarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroLista, setErroLista] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [espelhar] = useEspelho()

  async function carregar() {
    try {
      setFuncionarios(await api.funcionarios())
      setErroLista(null)
    } catch (e) {
      setErroLista(e.message)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() }, [])

  function campo(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErros(e => ({ ...e, [k]: null }))
  }

  async function capturar() {
    const img = camera.current?.capturar()
    if (!img) return setErros(e => ({ ...e, foto: 'Câmera indisponível. Permita o acesso no navegador.' }))
    setFoto(img)
    setFotoStatus('verificando')
    setErros(e => ({ ...e, foto: null }))
    // Já confere o rosto logo após a captura, antes de enviar o formulário
    try {
      const { rostos } = await api.contarRostos(img)
      if (rostos === 0) {
        setFotoStatus('sem-rosto')
        setErros(e => ({ ...e, foto: 'Nenhum rosto detectado na foto. Refaça a captura com o rosto dentro da moldura.' }))
      } else if (rostos > 1) {
        setFotoStatus('varios')
        setErros(e => ({ ...e, foto: 'Há mais de um rosto na foto. Refaça a captura com apenas o funcionário.' }))
      } else setFotoStatus('ok')
    } catch (e) {
      setFotoStatus(null)
      setErros(er => ({ ...er, foto: e.message }))
    }
  }

  function refazer() {
    setFoto(null)
    setFotoStatus(null)
    setErros(e => ({ ...e, foto: null }))
  }

  async function enviar(ev) {
    ev.preventDefault()
    const nome = form.nome.trim(), matricula = form.matricula.trim(), cargo = form.cargo.trim()
    const novos = {}
    if (!nome) novos.nome = 'Campo obrigatório. Informe o nome completo.'
    if (!matricula) novos.matricula = 'Campo obrigatório. Informe a matrícula.'
    else if (!/^\d{6}$/.test(matricula)) novos.matricula = 'A matrícula deve ter 6 dígitos (ex.: 000123).'
    else {
      const dup = funcionarios.find(f => f.matricula === matricula)
      if (dup) novos.matricula = `Matrícula já cadastrada para ${dup.nome}.`
    }
    if (!cargo) novos.cargo = 'Campo obrigatório. Informe o cargo.'
    if (!foto) novos.foto = 'Capture a foto de referência do funcionário.'
    else if (erros.foto) novos.foto = erros.foto
    if (Object.values(novos).some(Boolean)) {
      setErros(novos)
      setSucesso(null)
      return
    }

    setEnviando(true)
    try {
      const f = await api.cadastrar({ nome, matricula, cargo, foto })
      setSucesso(`${f.nome} foi cadastrado(a) com a matrícula ${f.matricula} e já pode registrar o ponto no terminal.`)
      setDestaque(f.matricula)
      setForm(VAZIO)
      refazer()
      carregar()
    } catch (e) {
      const alvo = e.codigo === 'matricula' ? 'matricula' : ['nenhum', 'multiplo', 'duplicado', 'imagem_invalida'].includes(e.codigo) ? 'foto' : 'geral'
      setErros({ [alvo]: e.message })
      if (alvo === 'foto') setFotoStatus('sem-rosto')
    } finally {
      setEnviando(false)
    }
  }

  async function confirmarExclusao() {
    try {
      await api.excluir(excluindo.matricula)
      setExcluindo(null)
      carregar()
    } catch (e) {
      setExcluindo(null)
      setErroLista(e.message)
    }
  }

  const fotoRuim = fotoStatus === 'sem-rosto' || fotoStatus === 'varios' || (!foto && erros.foto)
  const etiqueta = { verificando: 'Verificando rosto...', ok: 'Foto congelada · rosto detectado', 'sem-rosto': 'Foto congelada · sem rosto', varios: 'Foto congelada · mais de um rosto' }[fotoStatus]

  return (
    <main className="pagina">
      <div className="pagina-conteudo">
        <div>
          <h1>Cadastro de funcionário</h1>
          <p className="sub">A foto cadastrada é usada como referência para o reconhecimento facial no terminal.</p>
        </div>

        {sucesso && (
          <div className="aviso-sucesso">
            <span className="check-azul">✓</span>
            <span>{sucesso}</span>
            <button onClick={() => { setSucesso(null); setDestaque(null) }}>Fechar</button>
          </div>
        )}

        <div className="cadastro-grid">
          <form className="cartao form" onSubmit={enviar} noValidate>
            <div className="cartao-titulo">Novo funcionário</div>

            <label>Nome completo
              <input value={form.nome} onChange={e => campo('nome', e.target.value)} placeholder="Ex.: Ana Paula Moreira" className={erros.nome ? 'invalido' : ''} />
              {erros.nome && <span className="msg-erro">{erros.nome}</span>}
            </label>

            <div className="linha">
              <label className="estreito">Matrícula
                <input value={form.matricula} onChange={e => campo('matricula', e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" className={'mono ' + (erros.matricula ? 'invalido' : '')} />
              </label>
              <label className="largo">Cargo
                <input value={form.cargo} onChange={e => campo('cargo', e.target.value)} list="cargos" placeholder="Ex.: Vendedora" className={erros.cargo ? 'invalido' : ''} />
                <datalist id="cargos">{CARGOS.map(c => <option key={c} value={c} />)}</datalist>
              </label>
            </div>
            {erros.matricula && <span className="msg-erro colado">{erros.matricula}</span>}
            {erros.cargo && <span className="msg-erro colado">{erros.cargo}</span>}

            <div className="foto-bloco">
              <div className="rotulo-campo">Foto de referência</div>
              <div className={'foto-quadro ' + (fotoRuim ? 'invalido' : '')}>
                {foto ? (
                  <>
                    <img src={foto} alt="Foto capturada" className={espelhar ? 'espelhada' : ''} />
                    <div className="etiqueta-foto">{etiqueta}</div>
                  </>
                ) : (
                  <Camera ref={camera} className="camera-cadastro">
                    <div className="moldura-cadastro" />
                    <div className="dica-cadastro">Posicione o rosto dentro da moldura</div>
                  </Camera>
                )}
              </div>
              {erros.foto && <span className="msg-erro">{erros.foto}</span>}
              {foto
                ? <button type="button" className="btn-secundario" onClick={refazer}>Refazer</button>
                : <button type="button" className="btn-contorno" onClick={capturar}>Capturar foto</button>}
            </div>

            {erros.geral && <span className="msg-erro">{erros.geral}</span>}
            <button type="submit" className="btn-primario" disabled={enviando || fotoStatus === 'verificando'}>
              {enviando ? 'Cadastrando...' : 'Cadastrar funcionário'}
            </button>
          </form>

          <section className="cartao lista">
            <div className="lista-topo">
              <div className="cartao-titulo">Funcionários cadastrados</div>
              <div className="sub-p">{funcionarios.length} {funcionarios.length === 1 ? 'funcionário' : 'funcionários'}</div>
            </div>
            {erroLista && <div className="vazio"><b>Não foi possível carregar.</b><span>{erroLista}</span></div>}
            {!erroLista && !carregando && funcionarios.length === 0 && (
              <div className="vazio"><div className="vazio-icone" /><b>Nenhum funcionário cadastrado</b><span>Preencha o formulário ao lado para cadastrar o primeiro.</span></div>
            )}
            {funcionarios.length > 0 && (
              <div className="tabela-rolagem">
                <div className="tabela tabela-func">
                  <div className="tabela-cab"><span>Funcionário</span><span>Matrícula</span><span>Cargo</span><span /></div>
                  {funcionarios.map(f => (
                    <div key={f.matricula} className={'tabela-linha ' + (f.matricula === destaque ? 'destaque' : '')}>
                      <div className="pessoa"><Avatar foto={f.foto} nome={f.nome} /><span className="nome">{f.nome}</span></div>
                      <span className="mono cinza">{f.matricula}</span>
                      <span className="cinza">{f.cargo}</span>
                      <button className="btn-excluir" onClick={() => setExcluindo(f)}>Excluir</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {excluindo && (
        <div className="modal-fundo" onClick={() => setExcluindo(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="modal-titulo">Excluir funcionário?</div>
            <p>{excluindo.nome} (matrícula {excluindo.matricula}) será removido(a) e não poderá mais registrar o ponto. Os registros anteriores continuam no histórico.</p>
            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setExcluindo(null)}>Cancelar</button>
              <button className="btn-perigo" onClick={confirmarExclusao}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
