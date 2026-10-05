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
            debounce="350"
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
        <q-btn no-caps unelevated color="white" text-color="dark" label="Imprimir selecionadas" @click="abrirImpressao(selecionadas.length + ' O.S selecionadas', '', selecionadas.map((o) => o.numero))" />
        <q-btn no-caps unelevated color="white" text-color="dark" label="Enviar por e-mail" @click="avisar(selecionadas.length + ' O.S prontas para enviar por e-mail.')" />
        <q-btn
          v-if="ehAdmin"
          no-caps
          unelevated
          color="negative"
          icon="delete_outline"
          label="Excluir selecionadas"
          :loading="excluindo"
          @click="excluir(selecionadas)"
        />
        <q-btn no-caps flat color="white" label="Limpar seleção" @click="selecionadas = []" />
      </div>

      <q-table
        v-model:selected="selecionadas"
        v-model:pagination="paginacao"
        :rows="ordens"
        :columns="colunas"
        row-key="id"
        selection="multiple"
        flat
        bordered
        class="tabela-oficina tabela-clicavel"
        :loading="carregando"
        :rows-per-page-options="[25, 50, 100]"
        rows-per-page-label="Por página"
        :pagination-label="(ini, fim, total) => ini + '–' + fim + ' de ' + total"
        :selected-rows-label="() => ''"
        :no-data-label="erro || 'Nenhuma O.S encontrada com esses filtros.'"
        binary-state-sort
        @request="aoMudarTabela"
        @row-click="(_evt, row) => router.push('/orcamentos/' + numeroOS(row.numero))"
      >
        <template #body-cell-numero="props">
          <q-td :props="props">
            <router-link
              :to="'/orcamentos/' + numeroOS(props.row.numero)"
              class="text-primary text-weight-bold text-mono"
              style="text-underline-offset: 3px"
              @click.stop
            >
              {{ numeroOS(props.row.numero) }}
            </router-link>
          </q-td>
        </template>

        <template #body-cell-cliente="props">
          <q-td :props="props">
            <div class="text-weight-bold ellipsis" style="max-width: 280px">{{ props.row.cliente_nome }}</div>
            <div class="text-grey-8" style="font-size: 12px">{{ store.tipoLabel(props.row.tipo_cliente_id) }}</div>
          </q-td>
        </template>

        <template #body-cell-placa="props">
          <q-td :props="props">
            <span v-if="props.row.placa" class="placa">{{ props.row.placa }}</span>
          </q-td>
        </template>

        <template #body-cell-total_cliente="props">
          <q-td :props="props" class="text-mono text-weight-bold">{{ props.value }}</q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <span class="chip-status" :class="'status-' + props.row.status.replace('_', '-')">{{ STATUS_API[props.row.status] }}</span>
          </q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props" @click.stop>
            <q-btn flat round dense icon="more_horiz" color="grey-8" aria-label="Ações da O.S">
              <q-menu anchor="bottom right" self="top right">
                <q-list style="min-width: 230px">
                  <q-item v-close-popup clickable @click="abrirImpressao('O.S ' + numeroOS(props.row.numero), props.row.tipo_cliente_id, [props.row.numero])">
                    <q-item-section avatar><q-icon name="print" /></q-item-section>
                    <q-item-section>Imprimir…</q-item-section>
                  </q-item>
                  <q-item v-close-popup clickable @click="avisar('O.S ' + numeroOS(props.row.numero) + ' pronta para enviar por e-mail.')">
                    <q-item-section avatar><q-icon name="mail_outline" /></q-item-section>
                    <q-item-section>Enviar por e-mail</q-item-section>
                  </q-item>
                  <q-item v-close-popup clickable @click="avisar('O.S ' + numeroOS(props.row.numero) + ' pronta para enviar por WhatsApp.')">
                    <q-item-section avatar><q-icon name="chat_bubble_outline" /></q-item-section>
                    <q-item-section>Enviar por WhatsApp</q-item-section>
                  </q-item>
                  <template v-if="ehAdmin">
                    <q-separator />
                    <q-item v-close-popup clickable class="text-negative" @click="excluir([props.row])">
                      <q-item-section avatar><q-icon name="delete_outline" color="negative" /></q-item-section>
                      <q-item-section>Excluir</q-item-section>
                    </q-item>
                  </template>
                </q-list>
              </q-menu>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <ImprimirDialog v-model="impressao.aberta" :alvo="impressao.alvo" :tipo-cliente="impressao.tipo" :numeros="impressao.numeros" />
  </q-page>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useOficinaStore } from '@/stores/oficina'
import { mensagemDeErro } from '@/boot/axios'
import { listarOrdens, excluirOrdem, confirmarExclusao, numeroOS, STATUS_API } from '@/api/ordens'
import { useAuthStore } from '@/stores/auth'
import { brl, dataBr } from '@/utils/formato'
import ImprimirDialog from '@/components/ImprimirDialog.vue'

const $q = useQuasar()
const router = useRouter()
const store = useOficinaStore()
const auth = useAuthStore()
const ehAdmin = computed(() => auth.usuario?.papel === 'admin')
const excluindo = ref(false)

const busca = ref('')
const filtroTipo = ref(null)
const dataDe = ref('')
const dataAte = ref('')
const filtroStatus = ref('todos')
const selecionadas = ref([])
const impressao = reactive({ aberta: false, alvo: '', tipo: '', numeros: [] })

const ordens = ref([])
const contagem = ref({})
const carregando = ref(false)
const erro = ref('')
const paginacao = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0, sortBy: 'numero', descending: true })

const opcoesTipo = computed(() => [
  { value: null, label: 'Todos' },
  ...store.tiposCliente.map((t) => ({ value: t.id, label: t.nome }))
])

const colunas = [
  { name: 'numero', label: 'Nº O.S', field: 'numero', align: 'left', sortable: true },
  { name: 'data', label: 'Data', field: 'data', align: 'left', sortable: true, format: dataBr },
  { name: 'cliente', label: 'Cliente', field: 'cliente_nome', align: 'left', sortable: true },
  { name: 'veiculo', label: 'Veículo', field: 'veiculo_modelo', align: 'left' },
  { name: 'placa', label: 'Placa', field: 'placa', align: 'left' },
  { name: 'total_cliente', label: 'Total', field: 'total_cliente', format: brl, align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  { name: 'acoes', label: '', field: 'id', align: 'right' }
]

const filtrosStatus = computed(() => [
  { value: 'todos', label: 'Todos', qtd: contagem.value.todos ?? 0 },
  ...Object.entries(STATUS_API).map(([value, label]) => ({ value, label, qtd: contagem.value[value] ?? 0 }))
])

async function carregar() {
  carregando.value = true
  erro.value = ''
  const p = paginacao.value
  try {
    const r = await listarOrdens({
      busca: busca.value || undefined,
      status: filtroStatus.value !== 'todos' ? filtroStatus.value : undefined,
      tipo_cliente_id: filtroTipo.value || undefined,
      de: dataDe.value || undefined,
      ate: dataAte.value || undefined,
      ordenar: p.sortBy || 'numero',
      direcao: p.descending ? 'desc' : 'asc',
      por_pagina: p.rowsPerPage,
      page: p.page
    })
    ordens.value = r.data
    contagem.value = r.meta.contagem
    paginacao.value = { ...p, rowsNumber: r.meta.total }
    selecionadas.value = []
  } catch (e) {
    ordens.value = []
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}

function aoMudarTabela({ pagination }) {
  paginacao.value = { ...pagination }
  carregar()
}

watch([busca, filtroTipo, dataDe, dataAte, filtroStatus], () => {
  paginacao.value = { ...paginacao.value, page: 1 }
  carregar()
})

onMounted(carregar)

function abrirImpressao(alvo, tipo, numeros) {
  impressao.alvo = alvo
  impressao.tipo = tipo
  impressao.numeros = numeros
  impressao.aberta = true
}

async function excluir(lista) {
  const texto = lista.length === 1 ? 'a O.S ' + numeroOS(lista[0].numero) : 'as ' + lista.length + ' O.S selecionadas'
  if (!(await confirmarExclusao($q, texto))) return
  excluindo.value = true
  let ok = 0
  const erros = []
  // uma por vez: se uma falhar, as outras continuam
  for (const o of lista) {
    try {
      await excluirOrdem(o.numero)
      ok++
    } catch (e) {
      erros.push(numeroOS(o.numero) + ': ' + mensagemDeErro(e))
    }
  }
  excluindo.value = false
  if (ok) $q.notify({ message: ok === 1 ? 'O.S excluída.' : ok + ' O.S excluídas.', color: 'dark' })
  if (erros.length) $q.notify({ message: 'Não excluída: ' + erros.join(' · '), color: 'negative', timeout: 8000 })
  store.carregarResumoEstoque()
  carregar()
}

function avisar(message) {
  $q.notify({ message, color: 'dark' })
}
</script>
