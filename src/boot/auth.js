import { defineBoot } from '#q-app'
import { api } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'

const ROTAS_PUBLICAS = ['/login']

export default defineBoot(({ router, store }) => {
  const auth = useAuthStore(store)

  router.beforeEach(async (to) => {
    const publica = ROTAS_PUBLICAS.includes(to.path)

    if (!auth.logado) {
      return publica ? true : { path: '/login', query: to.fullPath !== '/' ? { volta: to.fullPath } : {} }
    }

    // tem token guardado, mas ainda não sabemos de quem: pergunta à API
    if (!auth.usuario) {
      try {
        await auth.carregarUsuario()
      } catch {
        auth.limpar()
        return { path: '/login', query: { expirou: '1' } }
      }
    }

    if (publica) return '/'
    return true
  })

  // token venceu ou foi revogado no meio do uso: volta para o login
  api.interceptors.response.use(
    (resposta) => resposta,
    (erro) => {
      if (erro.response?.status === 401 && auth.usuario) {
        const volta = router.currentRoute.value.fullPath
        auth.limpar()
        router.replace({ path: '/login', query: { volta, expirou: '1' } })
      }
      return Promise.reject(erro)
    }
  )
})
