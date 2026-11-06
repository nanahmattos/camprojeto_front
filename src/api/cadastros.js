import { api } from '@/boot/axios'

// ---- máscaras (a API guarda só os números)

function mascara(numeros, partes) {
  const d = String(numeros || '').replace(/\D/g, '')
  let saida = ''
  let i = 0
  for (const [tam, sep] of partes) {
    if (i >= d.length) break
    saida += (i ? sep : '') + d.slice(i, i + tam)
    i += tam
  }
  return saida
}

export const cnpjTexto = (v) => mascara(v, [[2, ''], [3, '.'], [3, '.'], [4, '/'], [2, '-']])
export const cpfTexto = (v) => mascara(v, [[3, ''], [3, '.'], [3, '.'], [2, '-']])
export const cepTexto = (v) => mascara(v, [[5, ''], [3, '-']])
export const cpfCnpjTexto = (v) => (String(v || '').replace(/\D/g, '').length > 11 ? cnpjTexto(v) : cpfTexto(v))

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']

// endereço pelo CEP (ViaCEP); null se não achar ou sem internet
export async function buscarCep(cep) {
  const numeros = String(cep || '').replace(/\D/g, '')
  if (numeros.length !== 8) return null
  try {
    const r = await fetch('https://viacep.com.br/ws/' + numeros + '/json/')
    const d = await r.json()
    return d.erro ? null : { uf: d.uf, cidade: d.localidade, bairro: d.bairro, endereco: d.logradouro }
  } catch {
    return null
  }
}

// ---- fornecedores (Configurações > Cadastro Fornecedores)

export const TIPOS_PESSOA = { juridica: 'Jurídica', fisica: 'Física' }

// indicador de contribuinte do ICMS, como na NF-e
export const CONTRIBUINTE = {
  1: '1 - Contribuinte ICMS',
  2: '2 - Contribuinte isento de inscrição no cadastro de contribuintes',
  9: '9 - Não contribuinte'
}

export async function listarFornecedores() {
  const { data } = await api.get('/fornecedores')
  return data.data
}

// sem id cria; com id edita
export async function salvarFornecedor(id, payload) {
  const { data } = id ? await api.put('/fornecedores/' + id, payload) : await api.post('/fornecedores', payload)
  return data.data
}

// só desativa: produtos e notas antigas continuam com o nome
export async function excluirFornecedor(id) {
  await api.delete('/fornecedores/' + id)
}

// ---- clientes (Configurações > Cadastro Clientes)

export async function listarClientes(params) {
  const { data } = await api.get('/clientes/cadastro', { params })
  return data // { data: [...], meta: { total, pagina, ultima_pagina } }
}

export async function salvarCliente(id, payload) {
  const { data } = id ? await api.put('/clientes/' + id, payload) : await api.post('/clientes', payload)
  return data.data
}

// a API recusa cliente com O.S
export async function excluirCliente(id) {
  await api.delete('/clientes/' + id)
}
