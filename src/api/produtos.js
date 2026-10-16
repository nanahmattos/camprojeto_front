import { api } from '@/boot/axios'
import { num, dec, paraTexto } from '@/utils/formato'

// unidades oferecidas na lista (dá para digitar outra)
export const UNIDADES = ['UN', 'PC', 'JG', 'KIT', 'PAR', 'CX', 'LT', 'KG', 'M']

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

// o produto sai do estoque; o histórico e as O.S antigas continuam com ele
export async function excluirProduto(id) {
  await api.delete('/produtos/' + id)
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
    unidade: p.unidade || 'UN',
    qtd: qtdTexto(p.qtd_atual),
    min: qtdTexto(p.qtd_min),
    max: qtdTexto(p.qtd_max),
    custo: dec(p.custo),
    base_icms: p.base_icms === null || p.base_icms === undefined ? '' : dec(p.base_icms),
    fornecedor_id: p.fornecedor_id,
    categoria_id: p.categoria_id,
    auto: p.preco_auto,
    margem: paraTexto(p.margem_percent),
    venda: dec(p.preco_venda),
    criado: p.criado_em,
    alterado: p.atualizado_em
  }
}

export function formNovo({ nome = '', codigo = '', unidade = 'UN', fornecedorId = null, auto = true } = {}) {
  return {
    nome,
    codigo,
    marca: '',
    ncm: '',
    unidade,
    qtd: '0',
    min: '',
    max: '',
    custo: '',
    base_icms: '',
    fornecedor_id: fornecedorId,
    categoria_id: null,
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
    unidade: (f.unidade || '').trim().toUpperCase() || 'UN',
    qtd: opcional(f.qtd),
    qtd_min: opcional(f.min),
    qtd_max: opcional(f.max),
    custo: num(f.custo),
    base_icms: opcional(f.base_icms),
    fornecedor_id: f.fornecedor_id || null,
    categoria_id: f.categoria_id || null,
    preco_auto: f.auto !== false,
    margem_percent: f.auto !== false ? opcional(f.margem) : null,
    preco_venda: f.auto === false ? num(f.venda) : undefined
  }
}
