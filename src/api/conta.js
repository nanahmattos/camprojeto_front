import { api } from '@/boot/axios'

// tipos de conta: o comercial vê tudo, menos o financeiro
export const PAPEIS = {
  admin: { label: 'Administrador', descricao: 'Acesso total, inclusive ao financeiro' },
  comercial: { label: 'Comercial', descricao: 'Orçamentos, estoque e configurações; sem acesso ao financeiro' }
}

// e-mail e/ou senha de quem está logado; senha_atual confirma a troca
export async function salvarMinhaConta(dados) {
  const { data } = await api.put('/minha-conta', dados)
  return data
}

// ---- contas da oficina (só administrador)

export async function listarUsuarios() {
  const { data } = await api.get('/usuarios')
  return data.data
}

// sem id cria; com id edita (senha em branco mantém a atual)
export async function salvarUsuario(dados) {
  const { data } = dados.id ? await api.put('/usuarios/' + dados.id, dados) : await api.post('/usuarios', dados)
  return data
}
