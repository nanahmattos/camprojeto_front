<template>
  <q-page padding>
    <div class="pagina">
      <div>
        <h1 class="titulo-pagina">Dados da empresa</h1>
        <p class="subtitulo-pagina">Saem no cabeçalho dos orçamentos e das ordens de serviço em PDF</p>
      </div>

      <q-banner v-if="!podeEditar" dense rounded class="bg-grey-3 text-grey-9">
        <template #avatar><q-icon name="lock_outline" /></template>
        Só administradores podem alterar os dados da empresa. Você está vendo os valores atuais.
      </q-banner>

      <div v-if="!form" class="row justify-center q-pa-xl">
        <q-spinner size="32px" color="primary" />
      </div>

      <q-form v-else class="row q-col-gutter-md items-start" @submit="salvar">
        <div class="col-12 col-md-4">
          <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Logo">
            <h2 class="titulo-secao">Logo</h2>
            <p class="texto-apoio">Aparece no canto superior esquerdo do PDF. PNG ou JPG, até 2 MB.</p>

            <div class="previa row items-center justify-center">
              <img v-if="previa" :src="previa" alt="Logo da empresa" />
              <span v-else class="texto-apoio column items-center">
                <q-icon name="image" size="40px" color="grey-5" />
                Sem logo
              </span>
            </div>

            <template v-if="podeEditar">
              <q-file
                v-model="arquivo"
                label="Escolher imagem"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                :max-file-size="2 * 1024 * 1024"
                outlined
                dense
                clearable
                @rejected="arquivoRecusado"
              >
                <template #prepend><q-icon name="upload" /></template>
              </q-file>
              <q-btn
                v-if="previa && !arquivo"
                flat
                no-caps
                dense
                color="negative"
                icon="delete_outline"
                label="Remover logo"
                class="self-start"
                @click="removerLogo = true"
              />
            </template>
          </section>
        </div>

        <div class="col-12 col-md-8">
          <section class="cartao q-pa-md" aria-label="Dados cadastrais">
            <h2 class="titulo-secao q-mb-md">Dados cadastrais</h2>
            <div class="row q-col-gutter-sm">
              <q-input
                v-model="form.nome_fantasia"
                class="col-12 col-sm-6"
                label="Nome fantasia *"
                maxlength="150"
                outlined
                dense
                :readonly="!podeEditar"
                :rules="[(v) => !!(v && v.trim()) || 'Informe o nome fantasia']"
              />
              <q-input
                v-model="form.razao_social"
                class="col-12 col-sm-6"
                label="Razão social"
                maxlength="150"
                outlined
                dense
                :readonly="!podeEditar"
              />
              <q-input
                v-model="form.cnpj"
                class="col-12 col-sm-6"
                label="CNPJ"
                mask="##.###.###/####-##"
                unmasked-value
                inputmode="numeric"
                outlined
                dense
                :readonly="!podeEditar"
                :rules="[(v) => !v || v.length === 14 || 'O CNPJ tem 14 dígitos']"
              />
              <q-input
                v-model="form.contato"
                class="col-12 col-sm-6"
                label="Contato (telefone / WhatsApp)"
                maxlength="20"
                inputmode="tel"
                outlined
                dense
                :readonly="!podeEditar"
              />
              <q-input
                v-model="form.email"
                class="col-12 col-sm-6"
                label="E-mail"
                type="email"
                maxlength="150"
                outlined
                dense
                :readonly="!podeEditar"
              />
              <q-input
                v-model="form.endereco"
                class="col-12"
                label="Endereço"
                maxlength="255"
                outlined
                dense
                :readonly="!podeEditar"
              />
            </div>

            <div v-if="podeEditar" class="row justify-end q-gutter-sm q-mt-sm">
              <q-btn flat no-caps color="grey-8" label="Descartar" :disable="!alterado || salvando" @click="descartar" />
              <q-btn
                type="submit"
                unelevated
                no-caps
                color="primary"
                label="Salvar"
                :disable="!alterado"
                :loading="salvando"
              />
            </div>
          </section>
        </div>
      </q-form>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { mensagemDeErro } from '@/boot/axios'
import { buscarEmpresa, salvarEmpresa } from '@/api/empresa'

const $q = useQuasar()
const auth = useAuthStore()

const podeEditar = computed(() => auth.usuario?.papel === 'admin')

const form = ref(null)
const logoAtual = ref(null) // data URL que veio da API
const arquivo = ref(null) // imagem nova escolhida, ainda não enviada
const removerLogo = ref(false)
const salvando = ref(false)

let original = ''
let carregado = null

function aplicar(d) {
  carregado = d
  logoAtual.value = d.logo
  form.value = {
    nome_fantasia: d.nome_fantasia || '',
    razao_social: d.razao_social || '',
    cnpj: d.cnpj || '',
    contato: d.contato || '',
    email: d.email || '',
    endereco: d.endereco || ''
  }
  original = JSON.stringify(form.value)
  arquivo.value = null
  removerLogo.value = false
}

function descartar() {
  aplicar(carregado)
}

const alterado = computed(() => !!form.value && (JSON.stringify(form.value) !== original || !!arquivo.value || removerLogo.value))

// prévia: a imagem escolhida agora, senão o logo salvo (a não ser que vá ser removido)
const urlArquivo = ref(null)
watch(arquivo, (f) => {
  if (urlArquivo.value) URL.revokeObjectURL(urlArquivo.value)
  urlArquivo.value = f ? URL.createObjectURL(f) : null
  if (f) removerLogo.value = false
})
const previa = computed(() => urlArquivo.value || (removerLogo.value ? null : logoAtual.value))

function arquivoRecusado() {
  $q.notify({ message: 'Escolha uma imagem PNG ou JPG de até 2 MB.', color: 'negative', position: 'top' })
}

onMounted(() => {
  buscarEmpresa()
    .then(aplicar)
    .catch((e) => $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' }))
})

async function salvar() {
  salvando.value = true
  try {
    aplicar(await salvarEmpresa(form.value, arquivo.value, removerLogo.value))
    // o nome do menu lateral vem do login: acompanha sem precisar entrar de novo
    if (auth.usuario?.oficina) auth.usuario.oficina.nome = form.value.nome_fantasia
    $q.notify({ message: 'Dados da empresa salvos.', color: 'positive', icon: 'check', position: 'top' })
  } catch (e) {
    $q.notify({ message: mensagemDeErro(e), color: 'negative', timeout: 6000, position: 'top' })
  } finally {
    salvando.value = false
  }
}

// avisa antes de sair com alterações não salvas
onBeforeRouteLeave(() => {
  if (!alterado.value) return true
  return new Promise((resolve) => {
    $q.dialog({
      title: 'Sair sem salvar?',
      message: 'As alterações nos dados da empresa vão ser perdidas.',
      ok: { label: 'Sair sem salvar', color: 'negative', unelevated: true, noCaps: true },
      cancel: { label: 'Continuar editando', flat: true, noCaps: true, color: 'grey-8' },
      persistent: true
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
  })
})

function avisoAoFechar(e) {
  if (alterado.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
window.addEventListener('beforeunload', avisoAoFechar)
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', avisoAoFechar)
  if (urlArquivo.value) URL.revokeObjectURL(urlArquivo.value)
})
</script>

<style lang="scss" scoped>
.previa {
  height: 160px;
  border: 1px dashed #cfcbc3;
  border-radius: 8px;
  background: #faf9f6;
  padding: 12px;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
</style>
