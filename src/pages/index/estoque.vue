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
        :rows="produtosFiltrados"
        :columns="colunas"
        row-key="indice"
        flat
        bordered
        class="tabela-oficina"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        no-data-label="Nenhum produto encontrado."
      >
        <template #body-cell-nome="props">
          <q-td :props="props">
            <span class="text-weight-bold">{{ props.row.nome }}</span>
            <span v-if="props.row.repor" class="etiqueta-repor q-ml-sm">Repor</span>
          </q-td>
        </template>

        <template #body-cell-qtd="props">
          <q-td :props="props" class="text-mono" :class="props.row.repor ? 'text-negative text-weight-bold' : ''">
            {{ props.value }}
          </q-td>
        </template>

        <template #body-cell-venda="props">
          <q-td :props="props" class="text-mono text-weight-bold">{{ props.value }}</q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn flat round dense icon="edit" color="grey-8" aria-label="Editar produto" @click="abrirProduto(props.row.indice)" />
          </q-td>
        </template>
      </q-table>
    </div>

    <ProdutoDialog
      v-model="dialogo.aberto"
      :produto="dialogo.produto"
      :indice="dialogo.indice"
      origem="est"
      @salvo="avisarSalvo"
    />
  </q-page>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useOficinaStore } from '@/stores/oficina'
import { num, brl } from '@/utils/formato'
import ProdutoDialog from '@/components/ProdutoDialog.vue'

const $q = useQuasar()
const store = useOficinaStore()

const busca = ref('')
const filtroFornecedor = ref('')
const soAbaixo = ref(false)
const dialogo = reactive({ aberto: false, produto: null, indice: null })

const opcoesFornecedor = computed(() => [
  { value: '', label: 'Todos' },
  ...store.fornecedores.map((f) => ({ value: f.nome, label: f.nome }))
])

const mono = 'text-mono'
const colunas = [
  { name: 'nome', label: 'Produto', field: 'nome', align: 'left', sortable: true },
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left', classes: mono },
  { name: 'marca', label: 'Marca', field: (p) => p.marca || '—', align: 'left' },
  { name: 'ncm', label: 'NCM', field: (p) => p.ncm || '—', align: 'left', classes: mono },
  { name: 'qtd', label: 'Qtd', field: 'qtd', align: 'right', sortable: true, sort: (a, b) => num(a) - num(b) },
  { name: 'min', label: 'Mín', field: 'min', align: 'right', classes: mono + ' text-grey-8' },
  { name: 'max', label: 'Máx', field: 'max', align: 'right', classes: mono + ' text-grey-8' },
  { name: 'custo', label: 'Custo', field: (p) => num(p.custo), format: brl, align: 'right', classes: mono },
  { name: 'fornecedor', label: 'Fornecedor', field: 'fornecedor', align: 'left' },
  { name: 'venda', label: 'Venda', field: (p) => store.precoVenda(p), format: brl, align: 'right', sortable: true },
  { name: 'alterado', label: 'Alterado', field: (p) => p.alterado || p.criado, align: 'left', classes: 'text-grey-8' },
  { name: 'acoes', label: '', field: 'indice', align: 'right' }
]

const produtosFiltrados = computed(() => {
  const q = (busca.value || '').trim().toLowerCase()
  return store.estoque
    .map((p, indice) => ({ ...p, indice, repor: store.abaixoDoMinimo(p) }))
    .filter(
      (p) =>
        (!q || (p.nome + ' ' + p.codigo + ' ' + p.marca + ' ' + p.ncm).toLowerCase().includes(q)) &&
        (!filtroFornecedor.value || p.fornecedor === filtroFornecedor.value) &&
        (!soAbaixo.value || p.repor)
    )
})

function abrirProduto(indice) {
  dialogo.indice = indice
  dialogo.produto = indice === null ? null : store.estoque[indice]
  dialogo.aberto = true
}

function avisarSalvo() {
  $q.notify({ message: 'Produto salvo no estoque.', color: 'dark' })
}
</script>
