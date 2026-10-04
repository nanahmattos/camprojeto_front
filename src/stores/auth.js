import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, lerToken, gravarToken } from '@/boot/axios'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(lerToken())
  const usuario = ref(null)

  const logado = computed(() => !!token.value)

  function definirToken(novo) {
    token.value = novo
    gravarToken(novo)
  }

  async function login(email, senha) {
    const { data } = await api.post('/login', { email, senha })
    definirToken(data.token)
    usuario.value = data.usuario
  }

  async function carregarUsuario() {
    const { data } = await api.get('/me')
    usuario.value = data.usuario
  }

  // sai deste aparelho; os outros logins do usuário continuam valendo
  async function logout() {
    try {
      await api.post('/logout')
    } catch {
      // token já inválido no servidor: basta limpar aqui
    } finally {
      limpar()
    }
  }

  function limpar() {
    definirToken(null)
    usuario.value = null
  }

  return { token, usuario, logado, login, carregarUsuario, logout, limpar }
})
