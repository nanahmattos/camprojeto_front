<template>
  <q-page padding>
    <div class="pagina" :style="{ paddingBottom: alterado ? '88px' : '0' }">
      <div>
        <h1 class="titulo-pagina">Configurações</h1>
        <p class="subtitulo-pagina">Taxas por tipo de cliente, margens de lucro e encargos de fornecedor</p>
      </div>

      <q-banner v-if="!podeEditar" dense rounded class="bg-grey-3 text-grey-9">
        <template #avatar><q-icon name="lock_outline" /></template>
        Só administradores podem alterar as configurações. Você está vendo os valores atuais.
      </q-banner>

      <div v-if="!form" class="row justify-center q-pa-xl">
        <q-spinner size="32px" color="primary" />
      </div>

      <template v-else>
        <div class="row q-col-gutter-md items-start">
          <div class="col-12 col-md-5">
            <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Taxas por tipo de cliente">
              <div class="row items-center justify-between no-wrap">
                <h2 class="titulo-secao">Taxas por tipo de cliente</h2>
                <q-btn v-if="podeEditar" flat dense no-caps color="primary" icon="add" label="Adicionar" @click="adicionarTipo" />
              </div>
              <p class="texto-apoio">
                Somada ao preço de venda (já com markup). Com taxa acima de 0%, o orçamento ganha a coluna extra.
              </p>
              <div
                v-for="(t, i) in form.tiposCliente"
                :key="t.id || 'novo-tipo' + i"
                class="grade q-py-xs"
                style="grid-template-columns: minmax(0, 1fr) 110px 40px; border-bottom: 1px solid #f0eee9"
              >
                <q-input
                  v-model="t.nome"
                  aria-label="Nome do tipo de cliente"
                  placeholder="Nome do tipo de cliente"
                  outlined
                  dense
                  :readonly="!podeEditar"
                  :autofocus="!t.id && i === form.tiposCliente.length - 1"
                />
                <q-input
                  v-model="t.taxa"
                  :aria-label="'Taxa ' + t.nome + ' em porcentagem'"
                  placeholder="0"
                  inputmode="decimal"
                  suffix="%"
                  outlined
                  dense
                  :readonly="!podeEditar"
                  input-class="text-right text-mono"
                />
                <q-btn
                  v-if="podeEditar"
                  flat
                  round
                  dense
                  icon="delete_outline"
                  color="grey-8"
                  :aria-label="'Excluir tipo ' + t.nome"
                  :disable="form.tiposCliente.length === 1"
                  @click="form.tiposCliente.splice(i, 1)"
                />
                <span v-else></span>
              </div>
              <p class="texto-apoio" style="font-size: 12px">
                Excluir tira o tipo das listas de escolha. Clientes e O.S que já usam o tipo continuam mostrando o nome.
              </p>
            </section>

            <section class="cartao q-pa-md column q-gutter-y-sm q-mt-md" aria-label="Tabelas de preço da hora">
              <div class="row items-center justify-between no-wrap">
                <h2 class="titulo-secao">Tabelas de preço da hora</h2>
                <q-btn v-if="podeEditar" flat dense no-caps color="primary" icon="add" label="Adicionar" @click="adicionarTabela" />
              </div>
              <p class="texto-apoio">
                Em cada serviço da O.S você escolhe a tabela, e o preço da hora vem dela. A padrão entra nos serviços novos.
              </p>
              <div class="grade grade-cabecalho" style="grid-template-columns: 56px minmax(0, 1fr) 130px 40px">
                <span class="rotulo-coluna">Padrão</span>
                <span class="rotulo-coluna">Nome</span>
                <span class="rotulo-coluna">Preço da hora</span>
                <span></span>
              </div>
              <div
                v-for="(t, i) in form.tabelasPreco"
                :key="t.id || 'nova-tabela' + i"
                class="grade"
                style="grid-template-columns: 56px minmax(0, 1fr) 130px 40px"
              >
                <q-radio
                  :model-value="t.padrao"
                  :val="true"
                  :aria-label="'Usar ' + t.nome + ' como padrão'"
                  :disable="!podeEditar"
                  @update:model-value="marcarPadrao(t)"
                />
                <q-input
                  v-model="t.nome"
                  aria-label="Nome da tabela de preço"
                  placeholder="Ex.: Mecânica diesel"
                  outlined
                  dense
                  :readonly="!podeEditar"
                  :autofocus="!t.id && i === form.tabelasPreco.length - 1"
                />
                <q-input
                  v-model="t.preco"
                  aria-label="Preço da hora"
                  prefix="R$"
                  inputmode="decimal"
                  outlined
                  dense
                  :readonly="!podeEditar"
                  input-class="text-right text-mono"
                />
                <q-btn
                  v-if="podeEditar"
                  flat
                  round
                  dense
                  icon="delete_outline"
                  color="grey-8"
                  :aria-label="'Excluir tabela ' + t.nome"
                  :disable="form.tabelasPreco.length === 1"
                  @click="removerTabela(i)"
                />
                <span v-else></span>
              </div>
            </section>
          </div>

          <div class="col-12 col-md-7">
            <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Preços e margens">
              <h2 class="titulo-secao">Sugestão automática de preço</h2>
              <q-checkbox v-model="form.autoPadrao" label="Ligada por padrão em produtos novos" :disable="!podeEditar" />
              <p class="texto-apoio">Margem aplicada pelo custo da peça. Pode ser trocada em cada produto.</p>
              <div class="grade grade-cabecalho" style="grid-template-columns: minmax(0, 1fr) 140px 120px">
                <span class="rotulo-coluna">De</span>
                <span class="rotulo-coluna">Até (R$)</span>
                <span class="rotulo-coluna">Margem</span>
              </div>
              <div
                v-for="(f, i) in form.faixas"
                :key="'f' + i"
                class="grade"
                style="grid-template-columns: minmax(0, 1fr) 140px 120px"
              >
                <span class="text-mono" style="font-size: 14px">
                  {{ i === 0 ? 'R$ 0,00' : brl(num(form.faixas[i - 1].ate) + 0.01) }}
                </span>
                <q-input
                  v-model="f.ate"
                  aria-label="Até"
                  :placeholder="i === form.faixas.length - 1 ? 'sem limite' : '0,00'"
                  inputmode="decimal"
                  outlined
                  dense
                  :readonly="!podeEditar || i === form.faixas.length - 1"
                  :bg-color="i === form.faixas.length - 1 ? 'grey-2' : undefined"
                  input-class="text-right text-mono"
                />
                <q-input
                  v-model="f.margem"
                  aria-label="Margem em porcentagem"
                  inputmode="decimal"
                  suffix="%"
                  outlined
                  dense
                  :readonly="!podeEditar"
                  input-class="text-right text-mono"
                />
              </div>

            </section>
          </div>
        </div>

        <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Fornecedores">
          <div class="row items-center justify-between">
            <h2 class="titulo-secao">Fornecedores e encargos</h2>
            <q-btn
              v-if="podeEditar"
              outline
              no-caps
              color="grey-8"
              icon="add"
              label="Adicionar fornecedor"
              @click="adicionarFornecedor"
            />
          </div>
          <p class="texto-apoio">
            Somados ao preço de custo antes da margem. ST em 0% = fornecedor sem ST retido. Excluir tira o fornecedor da
            lista; produtos que já usam ele continuam com o nome e o preço.
          </p>

          <p v-if="!form.fornecedores.length" class="texto-apoio q-py-md text-center">
            Nenhum fornecedor cadastrado ainda.
          </p>

          <div v-else class="rolagem-x">
            <div style="min-width: 800px" class="column q-gutter-y-xs">
              <div class="grade grade-cabecalho" :style="{ gridTemplateColumns: colunasFornecedor }">
                <span class="rotulo-coluna">Fornecedor</span>
                <span class="rotulo-coluna">ST %</span>
                <span class="rotulo-coluna">Frete %</span>
                <span class="rotulo-coluna">Despesas %</span>
                <span class="rotulo-coluna text-right">Encargos</span>
                <span></span>
                <span></span>
              </div>
              <div
                v-for="(f, i) in form.fornecedores"
                :key="f.id || 'novo' + i"
                class="grade"
                :style="{ gridTemplateColumns: colunasFornecedor }"
              >
                <q-input
                  v-model="f.nome"
                  aria-label="Nome do fornecedor"
                  placeholder="Nome do fornecedor"
                  outlined
                  dense
                  :readonly="!podeEditar"
                  :autofocus="!f.id && i === form.fornecedores.length - 1"
                />
                <q-input v-model="f.st" aria-label="ST" inputmode="decimal" outlined dense :readonly="!podeEditar" input-class="text-right text-mono" />
                <q-input v-model="f.frete" aria-label="Frete" inputmode="decimal" outlined dense :readonly="!podeEditar" input-class="text-right text-mono" />
                <q-input v-model="f.desp" aria-label="Despesas" inputmode="decimal" outlined dense :readonly="!podeEditar" input-class="text-right text-mono" />
                <span class="text-mono text-weight-bold text-right" style="font-size: 14px">
                  +{{ pct(num(f.st) + num(f.frete) + num(f.desp)) }}
                </span>
                <span>
                  <q-chip v-if="num(f.st) === 0" dense color="grey-3" text-color="grey-9" class="text-weight-bold">
                    Sem ST retido
                  </q-chip>
                </span>
                <q-btn
                  v-if="podeEditar"
                  flat
                  round
                  dense
                  icon="delete_outline"
                  color="grey-8"
                  :aria-label="'Excluir fornecedor ' + (f.nome || 'novo')"
                  @click="form.fornecedores.splice(i, 1)"
                />
                <span v-else></span>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>

    <transition name="barra">
      <div v-if="alterado" class="barra-salvar row items-center no-wrap q-gutter-sm" role="region" aria-label="Alterações não salvas">
        <q-icon name="edit_note" size="22px" />
        <span class="col text-weight-bold" style="font-size: 14px">Alterações não salvas</span>
        <q-btn flat no-caps color="white" label="Descartar" :disable="salvando" @click="descartar" />
        <q-btn unelevated no-caps color="primary" label="Salvar alterações" :loading="salvando" @click="salvar" />
      </div>
    </transition>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useQuasar } from 'quasar'
import { useOficinaStore } from '@/stores/oficina'
import { useAuthStore } from '@/stores/auth'
import { mensagemDeErro } from '@/boot/axios'
import { num, brl, pct } from '@/utils/formato'

const $q = useQuasar()
const store = useOficinaStore()
const auth = useAuthStore()

const colunasFornecedor = 'minmax(200px, 1fr) 110px 110px 110px 110px 140px 40px'

const podeEditar = computed(() => auth.usuario?.papel === 'admin')

// cópia editável; o store só muda depois que a API confirma
const form = ref(null)
const salvando = ref(false)

function copiaDoStore() {
  return JSON.parse(
    JSON.stringify({
      autoPadrao: store.autoPadrao,
      // só os ativos: o que for excluído aqui some da lista enviada e a API desativa
      tiposCliente: store.tiposAtivos,
      tabelasPreco: store.tabelasAtivas,
      faixas: store.faixas,
      fornecedores: store.fornecedoresAtivos
    })
  )
}

const original = ref('')

function descartar() {
  form.value = copiaDoStore()
  original.value = JSON.stringify(form.value)
}

const alterado = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)

watch(
  () => store.configCarregada,
  (pronta) => {
    if (pronta && !form.value) descartar()
  },
  { immediate: true }
)

onMounted(() => {
  // sempre busca de novo ao abrir, para pegar mudanças feitas em outro computador
  store
    .carregarConfiguracoes()
    .then(() => {
      if (!alterado.value) descartar()
    })
    .catch((e) => $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' }))
})

function adicionarTipo() {
  form.value.tiposCliente.push({ id: null, nome: '', taxa: '0', ativo: true })
}

function adicionarTabela() {
  form.value.tabelasPreco.push({ id: null, nome: '', preco: '', padrao: false, ativo: true })
}

function marcarPadrao(tabela) {
  form.value.tabelasPreco.forEach((t) => (t.padrao = t === tabela))
}

function removerTabela(i) {
  const [removida] = form.value.tabelasPreco.splice(i, 1)
  // sempre tem que sobrar uma padrão
  if (removida.padrao && form.value.tabelasPreco.length) form.value.tabelasPreco[0].padrao = true
}

function adicionarFornecedor() {
  form.value.fornecedores.push({ id: null, nome: '', st: '0', frete: '0', desp: '0', ativo: true })
}

async function salvar() {
  salvando.value = true
  try {
    await store.salvarConfiguracoes(form.value)
    descartar()
    $q.notify({ message: 'Configurações salvas.', color: 'positive', icon: 'check', position: 'top' })
  } catch (e) {
    // no topo: embaixo fica a barra de salvar
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
      message: 'As alterações nas configurações vão ser perdidas.',
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
onBeforeUnmount(() => window.removeEventListener('beforeunload', avisoAoFechar))
</script>

<style lang="scss" scoped>
.barra-salvar {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: min(720px, calc(100% - 32px));
  z-index: 2000;
  padding: 10px 10px 10px 16px;
  border-radius: 10px;
  background: #1e2124;
  color: #fff;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}

.barra-enter-active,
.barra-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.barra-enter-from,
.barra-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
