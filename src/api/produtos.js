import { api } from '@/boot/axios'
import { num, dec, paraTexto } from '@/utils/formato'

// ---- chamadas

export async function listarProdutos(filtros) {
  const { data } = await api.get('/produtos', { params: filtros })
  return data // { data: [...], meta: { total, current_page, per_page, ... } }
}

export async function obterProduto(id) {
  const { data } = await api.get('/produtos/' + id)
  return data.data
}

export async function salvarProduto(id, form) {
  const payload = paraPayload(form)
  const { data } = id ? await api.put('/produtos/' + id, payload) : await api.post('/produtos', payload)
  return data.data
}

export async function listarMovimentacoes(id, limite = 10) {
  const { data } = await api.get('/produtos/' + id + '/movimentacoes', { params: { limite } })
  return data.data
}

export async function resumoEstoque() {
  const { data } = await api.get('/estoque/resumo')
  return data // { total, abaixo_minimo }
}

// ---- formulário: números como texto no padrão brasileiro, igual ao que se digita

function qtdTexto(v) {
  if (v === null || v === undefined) return ''
  return String(Math.round(v * 1000) / 1000).replace('.', ',')
}

export function paraForm(p) {
  return {
    nome: p.nome,
    codigo: p.codigo,
    marca: p.marca || '',
    ncm: p.ncm || '',
    qtd: qtdTexto(p.qtd_atual),
    min: qtdTexto(p.qtd_min),
    max: qtdTexto(p.qtd_max),
    custo: dec(p.custo),
    fornecedor_id: p.fornecedor_id,
    auto: p.preco_auto,
    margem: paraTexto(p.margem_percent),
    venda: dec(p.preco_venda),
    criado: p.criado_em,
    alterado: p.atualizado_em
  }
}

export function formNovo({ nome = '', codigo = '', fornecedorId = null, auto = true } = {}) {
  return {
    nome,
    codigo,
    marca: '',
    ncm: '',
    qtd: '0',
    min: '',
    max: '',
    custo: '',
    fornecedor_id: fornecedorId,
    auto,
    margem: '',
    venda: '',
    criado: '',
    alterado: ''
  }
}

const opcional = (v) => (v === '' || v === null || v === undefined ? null : num(v))

function paraPayload(f) {
  return {
    nome: f.nome.trim(),
    codigo: f.codigo.trim(),
    marca: f.marca.trim() || null,
    ncm: f.ncm.trim() || null,
    qtd: opcional(f.qtd),
    qtd_min: opcional(f.min),
    qtd_max: opcional(f.max),
    custo: num(f.custo),
    fornecedor_id: f.fornecedor_id || null,
    preco_auto: f.auto !== false,
    margem_percent: f.auto !== false ? opcional(f.margem) : null,
    preco_venda: f.auto === false ? num(f.venda) : undefined
  }
}
