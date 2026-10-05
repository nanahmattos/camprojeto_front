<template>
  <q-page padding>
    <div class="pagina">
      <div class="row items-end justify-between q-gutter-y-md">
        <div>
          <h1 class="titulo-pagina">Estoque</h1>
          <p class="subtitulo-pagina">Peças, custos, fornecedores e preço de venda</p>
        </div>
        <q-btn unelevated no-caps color="primary" icon="add" label="Novo produto" @click="abrirProduto(null)" />
      </div>

      <div
        v-if="store.qtdRepor"
        class="row items-center q-gutter-sm q-pa-sm"
        style="border-radius: 8px; background: #fbe6bf; color: #5a3700"
      >
        <q-icon name="warning_amber" size="20px" class="q-ml-sm" />
        <span class="col text-weight-bold" style="font-size: 14px">
          {{ store.qtdRepor }} produto(s) chegaram na quantidade mínima. Hora de repor.
        </span>
        <q-btn
          unelevated
          no-caps
          color="white"
          text-color="dark"
          :label="soAbaixo ? 'Mostrar todos' : 'Ver produtos'"
          @click="soAbaixo = !soAbaixo"
        />
      </div>

      <section class="cartao q-pa-md row q-col-gutter-sm items-center" aria-label="Filtros do estoque">
        <q-input
          v-model="busca"
          type="search"
          label="Buscar"
          placeholder="Produto, código, marca ou NCM"
          outlined
          dense
          clearable
          debounce="350"
          class="col-12 col-md-6"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-select
          v-model="filtroFornecedor"
          :options="opcoesFornecedor"
          label="Fornecedor"
          emit-value
          map-options
          outlined
          dense
          class="col-12 col-sm-6 col-md-3"
        />
        <div class="col-12 col-sm-6 col-md-3">
          <q-checkbox v-model="soAbaixo" label="Só abaixo do mínimo" />
        </div>
      </section>

      <q-table
        v-model:pagination="paginacao"
        :rows="produtos"
        :columns="colunas"
        row-key="id"
        flat
        bordered
        class="tabela-oficina tabela-clicavel"
        :loading="carregando"
        :rows-per-page-options="[25, 50, 100]"
        rows-per-page-label="Por página"
        :pagination-label="(ini, fim, total) => ini + '–' + fim + ' de ' + total"
        :no-data-label="erro || 'Nenhum produto encontrado.'"
        binary-state-sort
        @request="aoMudarTabela"
        @row-click="(_evt, row) => abrirProduto(row.id)"
      >
        <template #body-cell-nome="props">
          <q-td :props="props">
            <span class="text-weight-bold">{{ props.row.nome }}</span>
            <span v-if="props.row.abaixo_minimo" class="etiqueta-repor q-ml-sm">Repor</span>
          </q-td>
        </template>

        <template #body-cell-qtd_atual="props">
          <q-td :props="props" class="text-mono" :class="props.row.abaixo_minimo ? 'text-negative text-weight-bold' : ''">
            {{ props.value }}
          </q-td>
        </template>

        <template #body-cell-preco_venda="props">
          <q-td :props="props" class="text-mono text-weight-bold">{{ props.value }}</q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn flat round dense icon="edit" color="grey-8" aria-label="Editar produto" @click.stop="abrirProduto(props.row.id)" />
          </q-td>
        </template>
      </q-table>
    </div>

    <ProdutoDialog
      v-model="dialogo.aberto"
      :produto-id="dialogo.id"
      origem="est"
      @salvo="aoSalvar"
    />
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useOficinaStore } from '@/stores/oficina'
import { mensagemDeErro } from '@/boot/axios'
import { listarProdutos } from '@/api/produtos'
import { brl } from '@/utils/formato'
import ProdutoDialog from '@/components/ProdutoDialog.vue'

const $q = useQuasar()
const store = useOficinaStore()

const busca = ref('')
const filtroFornecedor = ref(null)
const soAbaixo = ref(false)
const dialogo = reactive({ aberto: false, id: null })

const produtos = ref([])
const carregando = ref(false)
const erro = ref('')
const paginacao = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0, sortBy: 'nome', descending: false })

const opcoesFornecedor = computed(() => [
  { value: null, label: 'Todos' },
  ...store.fornecedoresAtivos.map((f) => ({ value: f.id, label: f.nome }))
])

const mono = 'text-mono'
const qtd = (v) => (v === null ? '—' : String(v).replace('.', ','))
const colunas = [
  { name: 'nome', label: 'Produto', field: 'nome', align: 'left', sortable: true },
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left', classes: mono, sortable: true },
  { name: 'marca', label: 'Marca', field: (p) => p.marca || '—', align: 'left' },
  { name: 'ncm', label: 'NCM', field: (p) => p.ncm || '—', align: 'left', classes: mono },
  { name: 'qtd_atual', label: 'Qtd', field: 'qtd_atual', format: qtd, align: 'right', sortable: true },
  { name: 'qtd_min', label: 'Mín', field: 'qtd_min', format: qtd, align: 'right', classes: mono + ' text-grey-8' },
  { name: 'qtd_max', label: 'Máx', field: 'qtd_max', format: qtd, align: 'right', classes: mono + ' text-grey-8' },
  { name: 'custo', label: 'Custo', field: 'custo', format: brl, align: 'right', classes: mono, sortable: true },
  { name: 'fornecedor', label: 'Fornecedor', field: (p) => p.fornecedor_nome || '—', align: 'left' },
  { name: 'preco_venda', label: 'Venda', field: 'preco_venda', format: brl, align: 'right', sortable: true },
  { name: 'atualizado_em', label: 'Alterado', field: 'atualizado_em', align: 'left', classes: 'text-grey-8', sortable: true },
  { name: 'acoes', label: '', field: 'id', align: 'right' }
]

async function carregar() {
  carregando.value = true
  erro.value = ''
  const p = paginacao.value
  try {
    const r = await listarProdutos({
      busca: busca.value || undefined,
      fornecedor_id: filtroFornecedor.value || undefined,
      abaixo_minimo: soAbaixo.value ? 1 : undefined,
      ordenar: p.sortBy || 'nome',
      direcao: p.descending ? 'desc' : 'asc',
      por_pagina: p.rowsPerPage,
      page: p.page
    })
    produtos.value = r.data
    paginacao.value = { ...p, rowsNumber: r.meta.total }
  } catch (e) {
    produtos.value = []
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}

// a QTable avisa quando muda página, tamanho da página ou ordenação
function aoMudarTabela({ pagination }) {
  paginacao.value = { ...pagination }
  carregar()
}

// filtro novo começa da primeira página
watch([busca, filtroFornecedor, soAbaixo], () => {
  paginacao.value = { ...paginacao.value, page: 1 }
  carregar()
})

onMounted(carregar)

function abrirProduto(id) {
  dialogo.id = id
  dialogo.aberto = true
}

function aoSalvar() {
  $q.notify({ message: 'Produto salvo no estoque.', color: 'dark' })
  carregar()
  store.carregarResumoEstoque()
}
</script>
