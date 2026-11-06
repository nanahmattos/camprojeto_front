<template>
  <q-page padding>
    <div class="pagina">
      <div class="row items-end justify-between q-gutter-y-md">
        <div>
          <h1 class="titulo-pagina">Cadastro de clientes</h1>
          <p class="subtitulo-pagina">Clientes da oficina com contato, documento e os veículos de cada um</p>
        </div>
        <q-btn unelevated no-caps color="primary" icon="add" label="Adicionar cliente" @click="abrir(null)" />
      </div>

      <section class="cartao q-pa-md row q-col-gutter-sm items-center" aria-label="Busca de clientes">
        <q-input
          v-model="busca"
          placeholder="Buscar por nome, CPF/CNPJ, telefone ou placa"
          aria-label="Buscar cliente"
          outlined
          dense
          clearable
          debounce="350"
          class="col-12 col-sm-6 col-md-5"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </section>

      <q-table
        v-model:pagination="paginacao"
        :rows="clientes"
        :columns="colunas"
        row-key="id"
        flat
        bordered
        class="tabela-oficina"
        :loading="carregando"
        :rows-per-page-options="[25, 50, 100]"
        :no-data-label="erro || (busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.')"
        @request="aoPaginar"
      >
        <template #body-cell-nome="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.nome }}</div>
            <div v-if="props.row.email" class="texto-apoio" style="font-size: 12px">{{ props.row.email }}</div>
          </q-td>
        </template>

        <template #body-cell-contato="props">
          <q-td :props="props">
            <div v-if="props.row.telefone">{{ props.row.telefone }}</div>
            <div v-if="props.row.whatsapp" class="texto-apoio" style="font-size: 12px">WhatsApp {{ props.row.whatsapp }}</div>
            <span v-if="!props.row.telefone && !props.row.whatsapp">—</span>
          </q-td>
        </template>

        <template #body-cell-veiculos="props">
          <q-td :props="props">
            <q-chip
              v-for="v in props.row.veiculos"
              :key="v.id"
              dense
              square
              color="grey-3"
              text-color="grey-9"
              class="text-mono"
            >
              {{ v.placa }}
              <q-tooltip>{{ v.modelo }}</q-tooltip>
            </q-chip>
            <span v-if="!props.row.veiculos.length" class="text-grey-7">—</span>
          </q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn flat round dense icon="edit" color="grey-8" :aria-label="'Editar ' + props.row.nome" @click="abrir(props.row)" />
            <q-btn
              flat
              round
              dense
              icon="delete_outline"
              color="negative"
              :disable="props.row.qtd_ordens > 0"
              :aria-label="'Excluir ' + props.row.nome"
              @click="excluir(props.row)"
            >
              <q-tooltip v-if="props.row.qtd_ordens > 0">Tem O.S cadastradas: não pode ser excluído</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="dialogo.aberto" @hide="dialogo.erro = ''">
      <q-card style="width: 620px; max-width: 95vw">
        <q-card-section class="row items-center no-wrap">
          <h2 class="titulo-secao col" style="font-size: 19px">{{ dialogo.id ? 'Editar cliente' : 'Novo cliente' }}</h2>
          <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
        </q-card-section>
        <q-separator />

        <q-card-section class="column q-gutter-y-md">
          <q-banner v-if="dialogo.erro" dense rounded class="bg-red-1 text-negative" role="alert">
            <template #avatar><q-icon name="error_outline" /></template>
            {{ dialogo.erro }}
          </q-banner>

          <div class="row q-col-gutter-sm">
            <q-input v-model="form.nome" label="Nome *" maxlength="150" outlined dense autofocus class="col-12 col-sm-8" />
            <q-select
              v-model="form.tipo_cliente_id"
              :options="opcoesTipo"
              label="Tipo de cliente *"
              emit-value
              map-options
              outlined
              dense
              class="col-12 col-sm-4"
            />
            <q-input
              v-model="form.cpf_cnpj"
              label="CPF ou CNPJ"
              inputmode="numeric"
              :mask="form.cpf_cnpj && form.cpf_cnpj.length > 11 ? '##.###.###/####-##' : '###.###.###-###'"
              unmasked-value
              outlined
              dense
              input-class="text-mono"
              class="col-12 col-sm-6"
            />
            <q-input v-model="form.email" label="E-mail" type="email" maxlength="150" outlined dense class="col-12 col-sm-6" />
            <q-input v-model="form.telefone" label="Telefone" inputmode="tel" maxlength="20" outlined dense class="col-12 col-sm-6" />
            <q-input v-model="form.whatsapp" label="WhatsApp" inputmode="tel" maxlength="20" outlined dense class="col-12 col-sm-6" />
            <q-input v-model="form.endereco" label="Endereço" maxlength="255" outlined dense class="col-12" />
          </div>

          <div v-if="dialogo.veiculos.length">
            <div class="rotulo-coluna q-mb-xs">Veículos</div>
            <div class="row q-gutter-xs">
              <q-chip v-for="v in dialogo.veiculos" :key="v.id" dense square color="grey-3" text-color="grey-9">
                <span class="text-mono q-mr-xs">{{ v.placa }}</span>{{ v.modelo }}
              </q-chip>
            </div>
          </div>
          <p class="texto-apoio q-mb-none">Os veículos entram pela O.S, junto com a placa.</p>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn outline no-caps color="grey-8" label="Cancelar" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Salvar cliente" :loading="dialogo.salvando" @click="salvar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { mensagemDeErro } from '@/boot/axios'
import { useOficinaStore } from '@/stores/oficina'
import { listarClientes, salvarCliente, excluirCliente, cpfCnpjTexto } from '@/api/cadastros'

const $q = useQuasar()
const store = useOficinaStore()

const clientes = ref([])
const carregando = ref(false)
const erro = ref('')
const busca = ref('')
const paginacao = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 })

const colunas = [
  { name: 'nome', label: 'Cliente', field: 'nome', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: (c) => store.tipoLabel(c.tipo_cliente_id), align: 'left' },
  { name: 'cpf_cnpj', label: 'CPF / CNPJ', field: 'cpf_cnpj', format: (v) => (v ? cpfCnpjTexto(v) : '—'), align: 'left', classes: 'text-mono' },
  { name: 'contato', label: 'Telefone', field: 'telefone', align: 'left' },
  { name: 'veiculos', label: 'Veículos', field: 'veiculos', align: 'left' },
  { name: 'acoes', label: '', field: 'id', align: 'right' }
]

// tipos ativos; o do cliente entra mesmo se tiver sido desativado
const opcoesTipo = computed(() =>
  store.tiposCliente
    .filter((t) => t.ativo || t.id === form.value.tipo_cliente_id)
    .map((t) => ({ value: t.id, label: t.ativo ? t.nome : t.nome + ' (removido)' }))
)

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const r = await listarClientes({
      busca: (busca.value || '').trim() || undefined,
      page: paginacao.value.page,
      por_pagina: paginacao.value.rowsPerPage
    })
    clientes.value = r.data
    paginacao.value = { ...paginacao.value, page: r.meta.pagina, rowsNumber: r.meta.total }
  } catch (e) {
    clientes.value = []
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}

function aoPaginar({ pagination }) {
  paginacao.value = { ...paginacao.value, page: pagination.page, rowsPerPage: pagination.rowsPerPage }
  carregar()
}

watch(busca, () => {
  paginacao.value = { ...paginacao.value, page: 1 }
  carregar()
})
onMounted(carregar)

// ---- janela de cadastro
const dialogo = reactive({ aberto: false, id: null, veiculos: [], salvando: false, erro: '' })
const form = ref({})

function abrir(c) {
  dialogo.id = c?.id ?? null
  dialogo.veiculos = c?.veiculos ?? []
  form.value = c
    ? {
        nome: c.nome,
        tipo_cliente_id: c.tipo_cliente_id,
        cpf_cnpj: c.cpf_cnpj || '',
        telefone: c.telefone || '',
        whatsapp: c.whatsapp || '',
        email: c.email || '',
        endereco: c.endereco || ''
      }
    : { nome: '', tipo_cliente_id: store.tipoPadraoId(), cpf_cnpj: '', telefone: '', whatsapp: '', email: '', endereco: '' }
  dialogo.aberto = true
}

async function salvar() {
  const f = form.value
  dialogo.erro = ''
  if (!f.nome.trim() || !f.tipo_cliente_id) {
    dialogo.erro = 'Preencha o nome e o tipo de cliente.'
    return
  }
  if (f.cpf_cnpj && f.cpf_cnpj.length !== 11 && f.cpf_cnpj.length !== 14) {
    dialogo.erro = 'O CPF precisa ter 11 números e o CNPJ, 14.'
    return
  }
  dialogo.salvando = true
  try {
    await salvarCliente(dialogo.id, { ...f, nome: f.nome.trim() })
    dialogo.aberto = false
    $q.notify({ message: 'Cliente salvo.', color: 'positive', icon: 'check', position: 'top' })
    carregar()
  } catch (e) {
    dialogo.erro = mensagemDeErro(e)
  } finally {
    dialogo.salvando = false
  }
}

function excluir(c) {
  $q.dialog({
    title: 'Excluir ' + c.nome + '?',
    message: c.veiculos.length ? 'Os veículos dele (' + c.veiculos.map((v) => v.placa).join(', ') + ') também são excluídos.' : 'Não dá para desfazer.',
    ok: { label: 'Excluir', color: 'negative', unelevated: true, noCaps: true },
    cancel: { label: 'Cancelar', flat: true, noCaps: true, color: 'grey-8' },
    persistent: true
  }).onOk(async () => {
    try {
      await excluirCliente(c.id)
      $q.notify({ message: 'Cliente excluído.', color: 'dark' })
      carregar()
    } catch (e) {
      $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' })
    }
  })
}
</script>
