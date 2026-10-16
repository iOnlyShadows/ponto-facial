// Chamadas à API Python. Em caso de erro, lança um Error com .codigo e a mensagem da API.
async function req(url, options = {}) {
  let resp
  try {
    resp = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    const e = new Error('Não foi possível falar com o servidor. Verifique se a API está rodando.')
    e.codigo = 'offline'
    throw e
  }
  const dados = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const e = new Error(dados.mensagem || 'Erro inesperado no servidor.')
    // Sem mensagem da API e erro 5xx = o proxy do Vite não alcançou a API (ela está desligada)
    e.codigo = dados.codigo || (resp.status >= 500 && !dados.mensagem ? 'offline' : 'erro')
    if (e.codigo === 'offline') e.message = 'Não foi possível falar com o servidor. Verifique se a API está rodando.'
    throw e
  }
  return dados
}

export const api = {
  funcionarios: () => req('/api/funcionarios'),
  contarRostos: foto => req('/api/rostos', { method: 'POST', body: { foto } }),
  cadastrar: dados => req('/api/funcionarios', { method: 'POST', body: dados }),
  excluir: matricula => req(`/api/funcionarios/${matricula}`, { method: 'DELETE' }),
  registrarPonto: (foto, tipo) => req('/api/ponto', { method: 'POST', body: { foto, tipo } }),
  registros: data => req(`/api/registros?data=${data}`),
}
