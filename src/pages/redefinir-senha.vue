<template>
  <q-layout>
    <q-page-container>
      <q-page class="redefinir column flex-center q-pa-lg">
        <q-form class="redefinir-form column q-gutter-y-md" @submit="salvar">
          <div>
            <h1 class="titulo-pagina">Escolher nova senha</h1>
            <p class="subtitulo-pagina">
              <template v-if="email">Para {{ email }}. </template>Depois de salvar, entre com a senha nova.
            </p>
          </div>

          <q-banner v-if="erro" dense rounded class="redefinir-erro" role="alert">
            <template #avatar><q-icon name="error_outline" /></template>
            {{ erro }}
          </q-banner>

          <template v-if="linkValido">
            <q-input
              v-model="senha"
              :type="mostrarSenha ? 'text' : 'password'"
              label="Nova senha"
              hint="Mínimo de 8 caracteres"
              autocomplete="new-password"
              autofocus
              outlined
              bg-color="white"
              :rules="[(v) => (v && v.length >= 8) || 'Mínimo de 8 caracteres']"
            >
              <template #prepend><q-icon name="lock_outline" /></template>
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  :icon="mostrarSenha ? 'visibility_off' : 'visibility'"
                  :aria-label="mostrarSenha ? 'Esconder senha' : 'Mostrar senha'"
                  @click="mostrarSenha = !mostrarSenha"
                />
              </template>
            </q-input>

            <q-input
              v-model="confirmacao"
              :type="mostrarSenha ? 'text' : 'password'"
              label="Confirmar nova senha"
              autocomplete="new-password"
              outlined
              bg-color="white"
              :rules="[(v) => v === senha || 'As senhas não batem']"
            >
              <template #prepend><q-icon name="lock_outline" /></template>
            </q-input>

            <q-btn
              type="submit"
              unelevated
              no-caps
              color="primary"
              label="Salvar nova senha"
              size="16px"
              class="full-width"
              style="min-height: 48px"
              :loading="salvando"
            />
          </template>

          <q-btn flat no-caps dense color="grey-8" icon="arrow_back" label="Voltar para o login" class="self-center" to="/login" />
        </q-form>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, mensagemDeErro } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// o link do e-mail traz ?email=...&token=...
const email = typeof route.query.email === 'string' ? route.query.email : ''
const token = typeof route.query.token === 'string' ? route.query.token : ''
const linkValido = ref(!!(email && token))

const senha = ref('')
const confirmacao = ref('')
const mostrarSenha = ref(false)
const salvando = ref(false)
const erro = ref(linkValido.value ? '' : 'Link incompleto. Abra o link do e-mail de novo ou peça um novo em "Esqueci minha senha".')

async function salvar() {
  erro.value = ''
  salvando.value = true
  try {
    await api.post('/redefinir-senha', { email, token, senha: senha.value, senha_confirmation: confirmacao.value })
    // a API derruba todos os logins da conta, inclusive um aberto neste navegador
    auth.limpar()
    router.replace({ path: '/login', query: { redefinida: '1', email } })
  } catch (e) {
    erro.value = mensagemDeErro(e)
    // link vencido ou já usado: não adianta tentar de novo com ele
    if (e.response?.data?.errors?.token) linkValido.value = false
  } finally {
    salvando.value = false
  }
}
</script>

<style lang="scss" scoped>
.redefinir {
  min-height: 100vh;
  background: #f3f2ee;
}

.redefinir-form {
  width: 100%;
  max-width: 380px;
}

.redefinir-erro {
  background: #f4d7d3;
  color: #8b2214;
}
</style>
