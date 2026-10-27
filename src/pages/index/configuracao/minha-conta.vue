<template>
  <q-page padding>
    <div class="pagina">
      <div>
        <h1 class="titulo-pagina">Minha conta</h1>
        <p class="subtitulo-pagina">E-mail e senha de acesso{{ ehAdmin ? ' e as contas de quem usa o sistema' : '' }}</p>
      </div>

      <div class="row q-col-gutter-md items-start">
        <div class="col-12 col-md-5">
          <section class="cartao q-pa-md" aria-label="Dados de acesso">
            <div class="row items-center justify-between no-wrap q-mb-sm">
              <h2 class="titulo-secao">Dados de acesso</h2>
              <q-chip dense square :color="ehAdmin ? 'primary' : 'grey-4'" :text-color="ehAdmin ? 'white' : 'grey-9'">
                {{ PAPEIS[auth.usuario?.papel]?.label || auth.usuario?.papel }}
              </q-chip>
            </div>
            <p class="texto-apoio q-mb-md">
              {{ PAPEIS[auth.usuario?.papel]?.descricao }}.
              <template v-if="!ehAdmin">Para mudar o tipo da conta, fale com o administrador.</template>
            </p>

            <q-form class="column q-gutter-y-sm" @submit="salvarMinha">
              <q-input
                v-model="minha.email"
                label="E-mail de login *"
                type="email"
                maxlength="150"
                autocomplete="username"
                outlined
                dense
                :rules="[(v) => !!(v && v.trim()) || 'Informe o e-mail']"
              />
              <q-input
                v-model="minha.senha"
                label="Nova senha"
                hint="Deixe em branco para manter a atual"
                :type="verSenha ? 'text' : 'password'"
                autocomplete="new-password"
                outlined
                dense
                :rules="[(v) => !v || v.length >= 8 || 'Mínimo de 8 caracteres']"
              >
                <template #append>
                  <q-icon
                    :name="verSenha ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    :aria-label="verSenha ? 'Esconder senha' : 'Mostrar senha'"
                    @click="verSenha = !verSenha"
                  />
                </template>
              </q-input>
              <q-input
                v-if="minha.senha"
                v-model="minha.senha_confirmation"
                label="Confirmar nova senha *"
                :type="verSenha ? 'text' : 'password'"
                autocomplete="new-password"
                outlined
                dense
                :rules="[(v) => v === minha.senha || 'As senhas não batem']"
              />
              <q-input
                v-if="alteradoMinha"
                v-model="minha.senha_atual"
                label="Senha atual *"
                hint="Para confirmar que é você"
                type="password"
                autocomplete="current-password"
                outlined
                dense
                :rules="[(v) => !!v || 'Informe a senha atual']"
              />

              <div class="row justify-end q-gutter-sm">
                <q-btn flat no-caps color="grey-8" label="Descartar" :disable="!alteradoMinha || salvandoMinha" @click="resetarMinha" />
                <q-btn
                  type="submit"
                  unelevated
                  no-caps
                  color="primary"
                  label="Salvar"
                  :disable="!alteradoMinha"
                  :loading="salvandoMinha"
                />
              </div>
            </q-form>
          </section>
        </div>

        <div v-if="ehAdmin" class="col-12 col-md-7">
          <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Contas da oficina">
            <div class="row items-center justify-between no-wrap">
              <h2 class="titulo-secao">Contas da oficina</h2>
              <q-btn flat dense no-caps color="primary" icon="person_add" label="Nova conta" @click="abrirConta()" />
            </div>
            <p class="texto-apoio">O administrador tem acesso total. A conta comercial não vê o financeiro.</p>

            <div v-if="!usuarios" class="row justify-center q-pa-lg">
              <q-spinner size="28px" color="primary" />
            </div>
            <q-list v-else separator>
              <q-item v-for="u in usuarios" :key="u.id" :class="{ 'text-grey-6': !u.ativo }">
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ u.nome }}
                    <span v-if="u.id === auth.usuario?.id" class="texto-apoio">(você)</span>
                  </q-item-label>
                  <q-item-label caption>{{ u.email }}</q-item-label>
                </q-item-section>
                <q-item-section side class="row items-center no-wrap q-gutter-x-xs" style="flex-direction: row">
                  <q-chip v-if="!u.ativo" dense square color="grey-3" text-color="grey-8">Desativada</q-chip>
                  <q-chip dense square :color="u.papel === 'admin' ? 'primary' : 'grey-4'" :text-color="u.papel === 'admin' ? 'white' : 'grey-9'">
                    {{ PAPEIS[u.papel]?.label || u.papel }}
                  </q-chip>
                  <q-btn flat round dense icon="edit" color="grey-8" :aria-label="'Editar conta de ' + u.nome" @click="abrirConta(u)" />
                </q-item-section>
              </q-item>
            </q-list>
          </section>
        </div>
      </div>
    </div>

    <q-dialog v-model="dialogo" persistent>
      <q-card style="width: 440px; max-width: 92vw">
        <q-form @submit="salvarConta">
          <q-card-section>
            <h2 class="titulo-secao">{{ conta.id ? 'Editar conta' : 'Nova conta' }}</h2>
          </q-card-section>

          <q-card-section class="column q-gutter-y-sm q-pt-none">
            <q-input
              v-model="conta.nome"
              label="Nome *"
              maxlength="150"
              outlined
              dense
              autofocus
              :rules="[(v) => !!(v && v.trim()) || 'Informe o nome']"
            />
            <q-input
              v-model="conta.email"
              label="E-mail de login *"
              type="email"
              maxlength="150"
              autocomplete="off"
              outlined
              dense
              :rules="[(v) => !!(v && v.trim()) || 'Informe o e-mail']"
            />
            <!-- a própria senha muda no cartão "Dados de acesso", que pede a senha atual -->
            <q-input
              v-if="!editandoAMim"
              v-model="conta.senha"
              :label="conta.id ? 'Nova senha' : 'Senha *'"
              :hint="conta.id ? 'Em branco mantém a atual. Trocar desconecta a pessoa dos aparelhos.' : 'Mínimo de 8 caracteres'"
              type="password"
              autocomplete="new-password"
              outlined
              dense
              :rules="[(v) => (conta.id && !v) || (v && v.length >= 8) || 'Mínimo de 8 caracteres']"
            />

            <div>
              <div class="rotulo-coluna q-mb-xs">Tipo de conta</div>
              <q-option-group
                v-model="conta.papel"
                :options="opcoesPapel"
                type="radio"
                dense
              >
                <template #label="opt">
                  <div class="column q-py-xs">
                    <span>{{ opt.label }}</span>
                    <span class="texto-apoio" style="font-size: 12px">{{ opt.descricao }}</span>
                  </div>
                </template>
              </q-option-group>
            </div>

            <q-toggle
              v-if="conta.id && !editandoAMim"
              v-model="conta.ativo"
              label="Conta ativa"
              color="primary"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn v-close-popup flat no-caps color="grey-8" label="Cancelar" :disable="salvandoConta" />
            <q-btn type="submit" unelevated no-caps color="primary" label="Salvar" :loading="salvandoConta" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { mensagemDeErro } from '@/boot/axios'
import { PAPEIS, salvarMinhaConta, listarUsuarios, salvarUsuario } from '@/api/conta'

const $q = useQuasar()
const auth = useAuthStore()

const ehAdmin = computed(() => auth.usuario?.papel === 'admin')

function erro(e) {
  $q.notify({ message: mensagemDeErro(e), color: 'negative', timeout: 6000, position: 'top' })
}

// ---- dados de acesso de quem está logado

const minha = ref({})
const verSenha = ref(false)
const salvandoMinha = ref(false)

function resetarMinha() {
  minha.value = { email: auth.usuario?.email || '', senha: '', senha_confirmation: '', senha_atual: '' }
}
resetarMinha()

const alteradoMinha = computed(() => minha.value.email !== auth.usuario?.email || !!minha.value.senha)

async function salvarMinha() {
  salvandoMinha.value = true
  try {
    const dados = await salvarMinhaConta(minha.value)
    auth.usuario = dados
    resetarMinha()
    $q.notify({ message: 'Dados de acesso salvos.', color: 'positive', icon: 'check', position: 'top' })
    if (ehAdmin.value) carregarUsuarios()
  } catch (e) {
    erro(e)
  } finally {
    salvandoMinha.value = false
  }
}

// ---- contas da oficina (administrador)

const usuarios = ref(null)

function carregarUsuarios() {
  listarUsuarios()
    .then((lista) => (usuarios.value = lista))
    .catch(erro)
}

onMounted(() => {
  if (ehAdmin.value) carregarUsuarios()
})

const opcoesPapel = Object.entries(PAPEIS).map(([value, p]) => ({ value, ...p }))

const dialogo = ref(false)
const conta = ref({})
const salvandoConta = ref(false)
const editandoAMim = computed(() => !!conta.value.id && conta.value.id === auth.usuario?.id)

function abrirConta(u) {
  conta.value = u
    ? { id: u.id, nome: u.nome, email: u.email, senha: '', papel: u.papel, ativo: u.ativo }
    : { nome: '', email: '', senha: '', papel: 'comercial', ativo: true }
  dialogo.value = true
}

async function salvarConta() {
  salvandoConta.value = true
  try {
    const salvo = await salvarUsuario(conta.value)
    // mudou a própria conta (nome, e-mail ou tipo): o menu acompanha na hora
    if (salvo.id === auth.usuario?.id) Object.assign(auth.usuario, { nome: salvo.nome, email: salvo.email, papel: salvo.papel })
    dialogo.value = false
    resetarMinha()
    $q.notify({ message: 'Conta salva.', color: 'positive', icon: 'check', position: 'top' })
    if (ehAdmin.value) carregarUsuarios()
  } catch (e) {
    erro(e)
  } finally {
    salvandoConta.value = false
  }
}
</script>
