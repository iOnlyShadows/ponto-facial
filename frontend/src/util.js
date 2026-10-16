export const TIPOS = {
  entrada: { label: 'Entrada', frase: 'Entrada registrada às' },
  intervalo: { label: 'Intervalo', frase: 'Intervalo registrado às' },
  retorno: { label: 'Retorno', frase: 'Retorno registrado às' },
  saida: { label: 'Saída', frase: 'Saída registrada às' },
}

const pad = n => String(n).padStart(2, '0')
export const hojeISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const horaMin = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`
export const segundos = d => pad(d.getSeconds())

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
export const dataLonga = d => cap(d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
export const dataCurta = d => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })

export function iniciais(nome) {
  const p = nome.trim().split(/\s+/)
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}
