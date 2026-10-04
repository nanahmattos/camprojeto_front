import { defineBoot } from '#q-app'
import axios from 'axios'

export const CHAVE_TOKEN = 'cam.token'

export function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function gravarToken(token) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // navegador sem localStorage (aba anônima bloqueada): o login vale só até recarregar
  }
}

// em desenvolvimento, /api passa pelo proxy do quasar.config.js até o Laravel;
// em produção, defina VITE_API_URL com o endereço da API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { Accept: 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = lerToken()
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})

// mensagem pronta para mostrar ao usuário a partir de um erro do axios
export function mensagemDeErro(erro) {
  if (!erro.response) return 'Não foi possível falar com o servidor. Verifique sua conexão e se a API está rodando.'
  const { status, data } = erro.response
  if (status === 422 && data.errors) return Object.values(data.errors)[0][0]
  if (data && data.message) return data.message
  return 'Algo deu errado (erro ' + status + '). Tente de novo.'
}

export default defineBoot(({ app }) => {
  app.config.globalProperties.$api = api
})

export { api }
