import { api } from '@/boot/axios'
import { FORMAS_API } from '@/api/ordens'

// a API grava códigos sem acento; a tela mostra os nomes
export const CATEGORIAS_GASTO = {
  funcionarios: 'Funcionários',
  aluguel: 'Aluguel',
  contadora: 'Contadora',
  imposto: 'Imposto',
  agua: 'Água',
  luz: 'Luz',
  internet: 'Internet',
  softwares: 'Softwares',
  monitoramento: 'Monitoramento',
  fornecedor: 'Fornecedor',
  terceirizado: 'Terceirizado',
  outros: 'Outros'
}

export const STATUS_GASTO = { pendente: 'Pendente', pago: 'Pago' }

// mesma lista do pagamento do orçamento; "Pendente" não é forma de pagar uma nota
export const FORMAS_NOTA = Object.fromEntries(Object.entries(FORMAS_API).filter(([k]) => k !== 'pendente'))

// mês no formato da API: "2026-10"
export function mesAtual() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

// ---- contas a pagar (na API ainda se chamam gastos fixos)

export async function listarGastos(filtros) {
  const { data } = await api.get('/gastos-fixos', { params: filtros })
  return data // { data: [...], totais: { total, pendente, pago } }
}

// novo com repetir_ate: a API devolve um lançamento por mês
export async function salvarGasto(id, payload) {
  const { data } = id ? await api.put('/gastos-fixos/' + id, payload) : await api.post('/gastos-fixos', payload)
  return data.data
}

export async function mudarStatusGasto(id, status) {
  const { data } = await api.patch('/gastos-fixos/' + id + '/status', { status })
  return data.data
}

// proximos: leva junto os meses seguintes da mesma repetição
export async function excluirGasto(id, proximos = false) {
  await api.delete('/gastos-fixos/' + id, { params: proximos ? { proximos: 1 } : {} })
}

// ---- notas de entrada

export async function listarNotas(filtros) {
  const { data } = await api.get('/notas-entrada', { params: filtros })
  return data // { data: [...], totais: { quantidade, total, credito, boleto } }
}

// com forma "boleto", a API cria/atualiza a conta a pagar do boleto
export async function salvarNota(id, payload) {
  const { data } = id ? await api.put('/notas-entrada/' + id, payload) : await api.post('/notas-entrada', payload)
  return data.data
}

export async function excluirNota(id) {
  await api.delete('/notas-entrada/' + id)
}
