<template>
  <q-layout>
    <q-page-container>
      <q-page class="login row no-wrap">
        <aside class="login-marca gt-sm col-5 column justify-between">
          <div class="column">
            <span class="text-white text-weight-bold" style="font-size: 22px">Centro Automotivo Mattos</span>
            <span style="font-size: 14px; color: #a9adb2">Gestão da oficina</span>
          </div>

          <ul class="login-lista">
            <li>
              <q-icon name="description" size="22px" />
              <span>Orçamentos e ordens de serviço, com impressão para o cliente e para o técnico</span>
            </li>
            <li>
              <q-icon name="inventory_2" size="22px" />
              <span>Estoque com aviso de reposição e histórico de cada movimentação</span>
            </li>
            <li>
              <q-icon name="tune" size="22px" />
              <span>Preço de venda pelo markup de cada faixa e taxas por tipo de cliente</span>
            </li>
          </ul>

          <span style="font-size: 12px; color: #7d8187">Acesso restrito à equipe da oficina</span>
        </aside>

        <main class="col column flex-center q-pa-lg">
          <q-form v-if="!esqueci" class="login-form column q-gutter-y-md" @submit="entrar">
            <div class="lt-md column q-mb-md">
              <span class="text-weight-bold" style="font-size: 18px">Centro Automotivo Mattos</span>
              <span class="text-grey-8" style="font-size: 13px">Gestão da oficina</span>
            </div>

            <div>
              <h1 class="titulo-pagina">Entrar</h1>
              <p class="subtitulo-pagina">Use o e-mail e a senha cadastrados na oficina.</p>
            </div>

            <q-banner v-if="sucesso && !erro" dense rounded class="login-sucesso" role="status">
              <template #avatar><q-icon name="mark_email_read" /></template>
              {{ sucesso }}
            </q-banner>

            <q-banner v-else-if="avisoSessao && !erro" dense rounded class="login-aviso">
              <template #avatar><q-icon name="schedule" /></template>
              Sua sessão expirou. Entre novamente para continuar.
            </q-banner>

            <q-banner v-if="erro" dense rounded class="login-erro" role="alert">
              <template #avatar><q-icon name="error_outline" /></template>
              {{ erro }}
            </q-banner>

            <q-input
              v-model="email"
              type="email"
              label="E-mail"
              autocomplete="username"
              autofocus
              outlined
              bg-color="white"
              :error="!!errosCampo.email"
              :error-message="errosCampo.email"
              @update:model-value="limparErros"
            >
              <template #prepend><q-icon name="mail_outline" /></template>
            </q-input>

            <q-input
              v-model="senha"
              :type="mostrarSenha ? 'text' : 'password'"
              label="Senha"
              autocomplete="current-password"
              outlined
              bg-color="white"
              :error="!!errosCampo.senha"
              :error-message="errosCampo.senha"
              @update:model-value="limparErros"
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

            <q-btn
              type="submit"
              unelevated
              no-caps
              color="primary"
              label="Entrar"
              size="16px"
              class="full-width"
              style="min-height: 48px"
              :loading="carregando"
            />

            <q-btn flat no-caps dense color="primary" label="Esqueci minha senha" class="self-center" @click="abrirEsqueci" />
          </q-form>

          <!-- esqueci minha senha: o administrador recebe por e-mail um link para escolher a senha nova -->
          <q-form v-else class="login-form column q-gutter-y-md" @submit="enviarNovaSenha">
            <div>
              <h1 class="titulo-pagina">Esqueci minha senha</h1>
              <p class="subtitulo-pagina">Confirme o seu e-mail. Se for de um administrador, enviamos um link para escolher uma senha nova.</p>
            </div>

            <q-banner v-if="erroEsqueci" dense rounded class="login-erro" role="alert">
              <template #avatar><q-icon name="error_outline" /></template>
              {{ erroEsqueci }}
            </q-banner>

            <q-input
              v-model="emailEsqueci"
              type="email"
              label="E-mail"
              autocomplete="username"
              autofocus
              outlined
              bg-color="white"
              @update:model-value="erroEsqueci = ''"
            >
              <template #prepend><q-icon name="mail_outline" /></template>
            </q-input>

            <q-btn
              type="submit"
              unelevated
              no-caps
              color="primary"
              label="Enviar link"
              size="16px"
              class="full-width"
              style="min-height: 48px"
              :loading="enviando"
            />

            <q-btn flat no-caps dense color="grey-8" icon="arrow_back" label="Voltar para o login" class="self-center" @click="esqueci = false" />
          </q-form>
        </main>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api, mensagemDeErro } from '@/boot/axios'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const senha = ref('')
const mostrarSenha = ref(false)
const carregando = ref(false)
const erro = ref('')
const errosCampo = reactive({ email: '', senha: '' })

const avisoSessao = computed(() => route.query.expirou === '1')

// ---- esqueci minha senha
const esqueci = ref(false)
const emailEsqueci = ref('')
const erroEsqueci = ref('')
const enviando = ref(false)
// voltou da página de redefinir senha (link do e-mail): e-mail já preenchido
const sucesso = ref(route.query.redefinida === '1' ? 'Senha redefinida. Entre com a senha nova.' : '')
if (typeof route.query.email === 'string') email.value = route.query.email

function abrirEsqueci() {
  emailEsqueci.value = email.value.trim()
  erroEsqueci.value = ''
  esqueci.value = true
}

async function enviarNovaSenha() {
  erroEsqueci.value = ''
  if (!emailEsqueci.value.trim()) {
    erroEsqueci.value = 'Informe o e-mail.'
    return
  }
  enviando.value = true
  try {
    const { data } = await api.post('/esqueci-senha', { email: emailEsqueci.value.trim() })
    // volta para o login com o e-mail preenchido; a senha atual segue valendo até o link ser usado
    email.value = emailEsqueci.value.trim()
    senha.value = ''
    limparErros()
    sucesso.value = data.message + ' Abra o link para escolher a senha nova.'
    esqueci.value = false
  } catch (e) {
    // "Conta não existente", "Peça para seu adm redefinir"…
    erroEsqueci.value = mensagemDeErro(e)
  } finally {
    enviando.value = false
  }
}

function limparErros() {
  erro.value = ''
  errosCampo.email = ''
  errosCampo.senha = ''
}

async function entrar() {
  limparErros()
  carregando.value = true
  try {
    await auth.login(email.value.trim(), senha.value)
    const volta = typeof route.query.volta === 'string' && route.query.volta.startsWith('/') ? route.query.volta : '/'
    router.replace(volta)
  } catch (e) {
    const errors = e.response?.status === 422 ? e.response.data.errors : null
    if (errors && !errors.login) {
      // campo vazio ou e-mail mal digitado: mostra embaixo do campo
      errosCampo.email = errors.email?.[0] || ''
      errosCampo.senha = errors.senha?.[0] || ''
    } else {
      // senha errada, usuário desativado, sem conexão…: aviso no topo
      erro.value = mensagemDeErro(e)
      senha.value = ''
    }
  } finally {
    carregando.value = false
  }
}
</script>

<style lang="scss" scoped>
.login {
  min-height: 100vh;
  background: #f3f2ee;
}

.login-marca {
  background: #1e2124;
  color: #e8e6e1;
  padding: 48px 56px;
}

.login-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 420px;

  li {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    font-size: 16px;
    line-height: 1.45;
  }

  .q-icon {
    color: #8dbf3f;
    margin-top: 1px;
  }
}

.login-form {
  width: 100%;
  max-width: 380px;
}

.login-erro {
  background: #f4d7d3;
  color: #8b2214;
}

.login-sucesso {
  background: #dfeccb;
  color: #2f4a0c;
}

.login-aviso {
  background: #fbe6bf;
  color: #5a3700;
}
</style>
