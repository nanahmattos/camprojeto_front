<template>
  <q-page padding>
    <div class="pagina">
      <div class="row items-end justify-between q-gutter-y-md">
        <div>
          <h1 class="titulo-pagina">Orçamentos</h1>
          <p class="subtitulo-pagina">Ordens de serviço e orçamentos da oficina</p>
        </div>
        <q-btn unelevated no-caps color="primary" icon="add" label="Nova O.S" to="/orcamentos/nova" />
      </div>

      <section class="cartao q-pa-md column q-gutter-y-md" aria-label="Filtros">
        <div class="row q-col-gutter-sm">
          <q-input
            v-model="busca"
            type="search"
            label="Buscar"
            placeholder="Cliente, placa, veículo ou nº da O.S"
            outlined
            dense
            clearable
            class="col-12 col-md-5"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
          <q-select
            v-model="filtroTipo"
            :options="opcoesTipo"
            label="Tipo de cliente"
            emit-value
            map-options
            outlined
            dense
            class="col-12 col-sm-4 col-md-3"
          />
          <q-input v-model="dataDe" type="date" label="Data de" stack-label outlined dense class="col-6 col-sm-4 col-md-2" />
          <q-input v-model="dataAte" type="date" label="Data até" stack-label outlined dense class="col-6 col-sm-4 col-md-2" />
        </div>

        <div class="row items-center q-gutter-sm">
          <span class="rotulo-coluna q-mr-xs">Status</span>
          <q-btn
            v-for="f in filtrosStatus"
            :key="f.value"
            rounded
            no-caps
            unelevated
            :outline="filtroStatus !== f.value"
            :color="filtroStatus === f.value ? 'dark' : 'grey-8'"
            :aria-pressed="filtroStatus === f.value"
            size="13px"
            @click="filtroStatus = f.value"
          >
            {{ f.label }}
            <span class="text-mono q-ml-sm" style="font-weight: 500">{{ f.qtd }}</span>
          </q-btn>
        </div>
      </section>

      <div
        v-if="selecionadas.length"
        class="row items-center q-gutter-sm q-pa-sm bg-dark text-white"
        style="border-radius: 8px"
      >
        <span class="col text-weight-bold q-pl-sm" style="font-size: 14px">
          {{ selecionadas.length }} selecionada(s)
        </span>
        <q-btn no-caps unelevated color="white" text-color="dark" label="Imprimir selecionadas" @click="abrirImpressao(selecionadas.length + ' O.S selecionadas', '')" />
        <q-btn no-caps unelevated color="white" text-color="dark" label="Enviar por e-mail" @click="avisar(selecionadas.length + ' O.S prontas para enviar por e-mail.')" />
        <q-btn no-caps flat color="white" label="Limpar seleção" @click="selecionadas = []" />
      </div>

      <q-table
        v-model:selected="selecionadas"
        :rows="ordensFiltradas"
        :columns="colunas"
        row-key="id"
        selection="multiple"
        flat
        bordered
        class="tabela-oficina"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        no-data-label="Nenhuma O.S encontrada com esses filtros."
        :selected-rows-label="() => ''"
      >
        <template #body-cell-id="props">
          <q-td :props="props">
            <router-link
              :to="'/orcamentos/' + props.row.id"
              class="text-primary text-weight-bold text-mono"
              style="text-underline-offset: 3px"
            >
              {{ props.row.id }}
            </router-link>
          </q-td>
        </template>

        <template #body-cell-cliente="props">
          <q-td :props="props">
            <div class="text-weight-bold ellipsis" style="max-width: 280px">{{ props.row.cliente }}</div>
            <div class="text-grey-8" style="font-size: 12px">{{ tipoLabel(props.row.tipo) }}</div>
          </q-td>
        </template>

        <template #body-cell-placa="props">
          <q-td :props="props">
            <span class="placa">{{ props.row.placa }}</span>
          </q-td>
        </template>

        <template #body-cell-total="props">
          <q-td :props="props" class="text-mono text-weight-bold">{{ props.value }}</q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <span class="chip-status" :class="classeStatus(props.row.status)">{{ props.row.status }}</span>
          </q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn flat round dense icon="more_horiz" color="grey-8" aria-label="Ações da O.S">
              <q-menu anchor="bottom right" self="top right">
                <q-list style="min-width: 230px">
                  <q-item v-close-popup clickable @click="abrirImpressao('O.S ' + props.row.id, props.row.tipo)">
                    <q-item-section avatar><q-icon name="print" /></q-item-section>
                    <q-item-section>Imprimir…</q-item-section>
                  </q-item>
                  <q-item v-close-popup clickable @click="avisar('O.S ' + props.row.id + ' pronta para enviar por e-mail.')">
                    <q-item-section avatar><q-icon name="mail_outline" /></q-item-section>
                    <q-item-section>Enviar por e-mail</q-item-section>
                  </q-item>
                  <q-item v-close-popup clickable @click="avisar('O.S ' + props.row.id + ' pronta para enviar por WhatsApp.')">
                    <q-item-section avatar><q-icon name="chat_bubble_outline" /></q-item-section>
                    <q-item-section>Enviar por WhatsApp</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <p class="texto-apoio">
        Mostrando {{ ordensFiltradas.length }} de {{ store.ordens.length }} ordens de serviço
      </p>
    </div>

    <ImprimirDialog v-model="impressao.aberta" :alvo="impressao.alvo" :tipo-cliente="impressao.tipo" />
  </q-page>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { useOficinaStore, TIPOS, STATUS, tipoLabel } from '@/stores/oficina'
import { brl, dataBr } from '@/utils/formato'
import ImprimirDialog from '@/components/ImprimirDialog.vue'

const $q = useQuasar()
const store = useOficinaStore()

const busca = ref('')
const filtroTipo = ref('')
const dataDe = ref('')
const dataAte = ref('')
const filtroStatus = ref('todos')
const selecionadas = ref([])
const impressao = reactive({ aberta: false, alvo: '', tipo: '' })

const opcoesTipo = [{ value: '', label: 'Todos' }, ...TIPOS]

const colunas = [
  { name: 'id', label: 'Nº O.S', field: 'id', align: 'left', sortable: true },
  { name: 'data', label: 'Data', field: 'data', align: 'left', sortable: true, format: dataBr },
  { name: 'cliente', label: 'Cliente', field: 'cliente', align: 'left', sortable: true },
  { name: 'veiculo', label: 'Veículo', field: 'veiculo', align: 'left' },
  { name: 'placa', label: 'Placa', field: 'placa', align: 'left' },
  {
    name: 'total',
    label: 'Total',
    field: (os) => store.totais(os).totalCliente,
    format: brl,
    align: 'right',
    sortable: true
  },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  { name: 'acoes', label: '', field: 'id', align: 'right' }
]

const filtrosStatus = computed(() => [
  { value: 'todos', label: 'Todos', qtd: store.ordens.length },
  ...STATUS.map((s) => ({ value: s, label: s, qtd: store.ordens.filter((o) => o.status === s).length }))
])

const ordensFiltradas = computed(() => {
  const q = (busca.value || '').trim().toLowerCase()
  return store.ordens.filter(
    (o) =>
      (filtroStatus.value === 'todos' || o.status === filtroStatus.value) &&
      (!filtroTipo.value || o.tipo === filtroTipo.value) &&
      (!dataDe.value || o.data >= dataDe.value) &&
      (!dataAte.value || o.data <= dataAte.value) &&
      (!q || (o.cliente + ' ' + o.placa + ' ' + o.id + ' ' + o.veiculo).toLowerCase().includes(q))
  )
})

function classeStatus(status) {
  return {
    'Em aberto': 'status-em-aberto',
    Finalizado: 'status-finalizado',
    Pendente: 'status-pendente',
    'Não aprovado': 'status-nao-aprovado'
  }[status]
}

function abrirImpressao(alvo, tipo) {
  impressao.alvo = alvo
  impressao.tipo = tipo
  impressao.aberta = true
}

function avisar(message) {
  $q.notify({ message, color: 'dark' })
}
</script>
