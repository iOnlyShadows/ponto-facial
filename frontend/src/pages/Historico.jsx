import { useEffect, useState } from 'react'
import { api } from '../api'
import Avatar from '../components/Avatar'
import { TIPOS, dataLonga, hojeISO } from '../util'

export default function Historico() {
  const hoje = hojeISO()
  const [data, setData] = useState(hoje)
  const [busca, setBusca] = useState('')
  const [registros, setRegistros] = useState([])
  const [totalFunc, setTotalFunc] = useState(0)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    Promise.all([api.registros(data), api.funcionarios()])
      .then(([r, f]) => { if (ativo) { setRegistros(r); setTotalFunc(f.length); setErro(null) } })
      .catch(e => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))
    return () => { ativo = false }
  }, [data])

  // Resumo: último tipo de cada funcionário no dia
  const ultimo = {}
  ;[...registros].sort((a, b) => a.hora.localeCompare(b.hora)).forEach(r => { ultimo[r.matricula] = r.tipo })
  const entraram = new Set(registros.filter(r => r.tipo === 'entrada').map(r => r.matricula)).size
  const ehHoje = data === hoje
  const resumo = [
    { label: ehHoje ? 'Entraram hoje' : 'Entraram no dia', valor: entraram, de: `de ${totalFunc} funcionários` },
    { label: ehHoje ? 'Em intervalo agora' : 'Terminaram em intervalo', valor: Object.values(ultimo).filter(t => t === 'intervalo').length },
    { label: ehHoje ? 'Já saíram' : 'Saíram', valor: Object.values(ultimo).filter(t => t === 'saida').length },
  ]

  const q = busca.trim().toLowerCase()
  const linhas = registros.filter(r => !q || r.nome.toLowerCase().includes(q) || r.matricula.includes(q))
  const [a, m, d] = data.split('-')

  return (
    <main className="pagina">
      <div className="pagina-conteudo">
        <div className="hist-topo">
          <div>
            <h1>Histórico de registros</h1>
            <p className="sub">{dataLonga(new Date(+a, +m - 1, +d))}{ehHoje ? ' · hoje' : ''}</p>
          </div>
          <div className="filtros">
            <input type="date" value={data} max={hoje} onChange={e => setData(e.target.value || hoje)} aria-label="Data" />
            <button className="btn-secundario" disabled={ehHoje} onClick={() => setData(hoje)}>Hoje</button>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou matrícula" className="busca" aria-label="Buscar" />
          </div>
        </div>

        <div className="resumo">
          {resumo.map(s => (
            <div key={s.label} className="cartao resumo-item">
              <div className="sub-p">{s.label}</div>
              <div><span className="resumo-valor">{s.valor}</span>{s.de && <span className="sub-p"> {s.de}</span>}</div>
            </div>
          ))}
        </div>

        <section className="cartao">
          {erro && <div className="vazio"><b>Não foi possível carregar.</b><span>{erro}</span></div>}
          {!erro && !carregando && linhas.length === 0 && (
            <div className="vazio">
              <div className="vazio-icone" />
              <b>{registros.length === 0 ? `Nenhum registro em ${d}/${m}/${a}` : `Nenhum resultado para “${busca.trim()}”`}</b>
              <span>{registros.length === 0 ? 'Não houve marcações de ponto neste dia. Escolha outra data no filtro.' : 'Confira o nome ou a matrícula digitada.'}</span>
            </div>
          )}
          {!erro && linhas.length > 0 && (
            <div className="tabela-rolagem">
              <div className="tabela tabela-hist">
                <div className="tabela-cab"><span>Funcionário</span><span>Matrícula</span><span>Tipo</span><span className="dir">Horário</span></div>
                {linhas.map(r => (
                  <div key={r.id} className="tabela-linha">
                    <div className="pessoa">
                      <Avatar foto={r.foto} nome={r.nome} tamanho={32} />
                      <div className="pessoa-texto"><span className="nome">{r.nome}</span><small>{r.cargo}{r.ativo ? '' : ' · excluído'}</small></div>
                    </div>
                    <span className="mono cinza">{r.matricula}</span>
                    <span><span className={'tag ' + r.tipo}>{TIPOS[r.tipo].label}</span></span>
                    <span className="mono dir">{r.hora.slice(0, 5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
