import { api } from '@/boot/axios'

// dados da empresa que saem no cabeçalho dos PDFs
export async function buscarEmpresa() {
  const { data } = await api.get('/empresa')
  return data
}

// multipart: o logo vai junto com os campos. logo = File novo (ou null); removerLogo = tirar o atual
export async function salvarEmpresa(dados, logo, removerLogo) {
  const fd = new FormData()
  for (const campo of ['nome_fantasia', 'razao_social', 'cnpj', 'contato', 'email', 'endereco']) {
    fd.append(campo, dados[campo] ?? '')
  }
  if (logo) fd.append('logo', logo)
  else if (removerLogo) fd.append('remover_logo', '1')
  const { data } = await api.post('/empresa', fd)
  return data
}
