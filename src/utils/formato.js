// Números digitados no padrão brasileiro ("1.234,56") e formatação de valores

export function num(s) {
  if (s === null || s === undefined) return 0
  s = String(s).trim()
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.')
  const x = parseFloat(s)
  return isFinite(x) ? x : 0
}

export function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function dec(v) {
  return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',')
}

export function pct(v) {
  return String(Math.round(v * 100) / 100).replace('.', ',') + '%'
}

export function hojeIso() {
  const d = new Date()
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

export function dataBr(iso) {
  return iso ? iso.split('-').reverse().join('/') : ''
}

export function addMonths(iso, k) {
  const p = iso.split('-').map(Number)
  const d = new Date(p[0], p[1] - 1 + k, p[2])
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

// número vindo da API -> texto no padrão dos campos ("8,5"); null vira ""
export function paraTexto(v) {
  if (v === null || v === undefined) return ''
  return String(Math.round(v * 100) / 100).replace('.', ',')
}
