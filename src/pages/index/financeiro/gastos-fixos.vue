<template>
  <q-page padding>
    <div class="pagina">
      <div class="row items-end justify-between q-gutter-y-md">
        <div>
          <h1 class="titulo-pagina">Gastos fixos</h1>
          <p class="subtitulo-pagina">Contas da oficina: aluguel, funcionários, impostos, luz…</p>
        </div>
        <q-btn unelevated no-caps color="primary" icon="add" label="Novo gasto" @click="abrir(null)" />
      </div>

      <section class="cartao q-pa-md row q-col-gutter-sm items-center" aria-label="Filtros dos gastos">
        <div class="col-12 col-sm-6 col-md-4">
          <MesSeletor v-model="mes" />
        </div>
        <q-select
          v-model="filtroCategoria"
          :options="opcoesFiltroCategoria"
          label="Categoria"
          emit-value
          map-options
          outlined
          dense
          class="col-12 col-sm-6 col-md-3"
        />
      </section>

      <div class="row q-col-gutter-md" aria-label="Totais do mês">
        <div class="col-12 col-sm-4">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">Total no mês</span>
            <strong class="text-mono" style="font-size: 22px">{{ brl(totais.total) }}</strong>
          </div>
        </div>
        <div class="col-6 col-sm-4">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">Pendentes</span>
            <strong class="text-mono text-negative" style="font-size: 22px">{{ brl(totais.pendente) }}</strong>
          </div>
        </div>
        <div class="col-6 col-sm-4">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">Pagos</span>
            <strong class="text-mono text-positive" style="font-size: 22px">{{ brl(totais.pago) }}</strong>
          </div>
        </div>
      </div>

      <q-table
        :rows="gastos"
        :columns="colunas"
        row-key="id"
        flat
        bordered
        class="tabela-oficina"
        :loading="carregando"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :no-data-label="erro || 'Nenhum gasto neste mês.'"
      >
        <template #body-cell-nome="props">
          <q-td :props="props">
            <span class="text-weight-bold">{{ props.row.nome }}</span>
            <q-icon v-if="props.row.recorrencia" name="event_repeat" size="16px" color="grey-7" class="q-ml-xs">
              <q-tooltip>Repete todo mês</q-tooltip>
            </q-icon>
          </q-td>
        </template>

        <template #body-cell-valor="props">
          <q-td :props="props" class="text-mono text-weight-bold">{{ props.value }}</q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-select
              :model-value="props.row.status"
              :options="opcoesStatus"
              emit-value
              map-options
              outlined
              dense
              options-dense
              :bg-color="props.row.status === 'pago' ? 'green-1' : 'red-1'"
              :color="props.row.status === 'pago' ? 'positive' : 'negative'"
              :loading="trocandoStatus === props.row.id"
              :aria-label="'Status de ' + props.row.nome"
              style="width: 130px"
              @update:model-value="(s) => trocarStatus(props.row, s)"
            />
          </q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn flat round dense icon="edit" color="grey-8" :aria-label="'Editar ' + props.row.nome" @click="abrir(props.row)" />
            <q-btn
              v-if="ehAdmin"
              flat
              round
              dense
              icon="delete_outline"
              color="negative"
              :aria-label="'Excluir ' + props.row.nome"
              @click="excluir(props.row)"
            />
          </q-td>
        </template>

        <template v-if="gastos.length" #bottom-row>
          <q-tr class="text-weight-bold">
            <q-td colspan="4" class="text-right">Total</q-td>
            <q-td class="text-right text-mono">{{ brl(totais.total) }}</q-td>
            <q-td colspan="2"></q-td>
          </q-tr>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="dialogo.aberto" @hide="dialogo.erro = ''">
      <q-card style="width: 620px; max-width: 95vw">
        <q-card-section class="row items-center no-wrap">
          <h2 class="titulo-secao col" style="font-size: 19px">{{ dialogo.id ? 'Editar gasto' : 'Novo gasto' }}</h2>
          <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
        </q-card-section>
        <q-separator />

        <q-card-section class="column q-gutter-y-md">
          <q-banner v-if="dialogo.erro" dense rounded class="bg-red-1 text-negative" role="alert">
            <template #avatar><q-icon name="error_outline" /></template>
            {{ dialogo.erro }}
          </q-banner>

          <div class="row q-col-gutter-sm">
            <q-input v-model="form.data_emissao" type="date" label="Data de emissão" stack-label outlined dense class="col-6" />
            <q-input v-model="form.vencimento" type="date" label="Vencimento *" stack-label outlined dense class="col-6" />
            <q-input v-model="form.nome" label="Nome *" placeholder="Ex.: Aluguel do galpão" outlined dense maxlength="150" class="col-12" />
            <q-select
              v-model="form.categoria"
              :options="opcoesCategoria"
              label="Categoria *"
              emit-value
              map-options
              outlined
              dense
              class="col-12 col-sm-5"
            />
            <q-input
              v-model="form.valor"
              label="Valor *"
              prefix="R$"
              placeholder="0,00"
              inputmode="decimal"
              outlined
              dense
              input-class="text-right text-mono"
              class="col-6 col-sm-4"
            />
            <q-select v-model="form.status" :options="opcoesStatus" label="Status" emit-value map-options outlined dense class="col-6 col-sm-3" />
          </div>

          <div v-if="!dialogo.id" class="column q-gutter-y-sm q-pa-sm" style="border: 1px solid #eceae4; border-radius: 8px">
            <q-checkbox v-model="form.repetir" label="Essa cobrança ocorre todo mês, na mesma data de vencimento" />
            <div v-if="form.repetir" class="row q-col-gutter-sm items-center">
              <q-input
                v-model="form.repetir_ate"
                type="date"
                label="Repetir até *"
                stack-label
                outlined
                dense
                :min="form.vencimento || undefined"
                class="col-12 col-sm-6"
              />
              <span v-if="qtdRepeticoes" class="col-12 col-sm-6 texto-apoio">
                Vão ser criados <strong>{{ qtdRepeticoes }}</strong> lançamentos, um por mês. Cada um tem o seu status.
              </span>
            </div>
          </div>
          <p v-else-if="dialogo.recorrencia" class="texto-apoio">
            Este gasto faz parte de uma cobrança que se repete. A alteração vale só para este mês.
          </p>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn outline no-caps color="grey-8" label="Cancelar" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Salvar gasto" :loading="dialogo.salvando" @click="salvar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { mensagemDeErro } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import {
  CATEGORIAS_GASTO,
  STATUS_GASTO,
  mesAtual,
  listarGastos,
  salvarGasto,
  mudarStatusGasto,
  excluirGasto
} from '@/api/financeiro'
import { num, brl, dec, dataBr, hojeIso, addMonths } from '@/utils/formato'
import MesSeletor from '@/components/MesSeletor.vue'

const $q = useQuasar()
const auth = useAuthStore()
const ehAdmin = computed(() => auth.usuario?.papel === 'admin')

const mes = ref(mesAtual())
const filtroCategoria = ref(null)
const gastos = ref([])
const totais = ref({ total: 0, pendente: 0, pago: 0 })
const carregando = ref(false)
const erro = ref('')
const trocandoStatus = ref(null)

const paraOpcoes = (mapa) => Object.entries(mapa).map(([value, label]) => ({ value, label }))
const opcoesCategoria = paraOpcoes(CATEGORIAS_GASTO)
const opcoesFiltroCategoria = [{ value: null, label: 'Todas' }, ...opcoesCategoria]
const opcoesStatus = paraOpcoes(STATUS_GASTO)

const colunas = [
  { name: 'vencimento', label: 'Vencimento', field: 'vencimento', format: dataBr, align: 'left', classes: 'text-mono' },
  { name: 'data_emissao', label: 'Emissão', field: 'data_emissao', format: (v) => dataBr(v) || '—', align: 'left', classes: 'text-mono text-grey-8' },
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' },
  { name: 'categoria', label: 'Categoria', field: (g) => CATEGORIAS_GASTO[g.categoria] || g.categoria, align: 'left' },
  { name: 'valor', label: 'Valor', field: 'valor', format: brl, align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'acoes', label: '', field: 'id', align: 'right' }
]

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const r = await listarGastos({ mes: mes.value, categoria: filtroCategoria.value || undefined })
    gastos.value = r.data
    totais.value = r.totais
  } catch (e) {
    gastos.value = []
    totais.value = { total: 0, pendente: 0, pago: 0 }
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}

watch([mes, filtroCategoria], carregar)
onMounted(carregar)

async function trocarStatus(gasto, status) {
  trocandoStatus.value = gasto.id
  try {
    Object.assign(gasto, await mudarStatusGasto(gasto.id, status))
    carregar() // totais de pendentes e pagos mudam
  } catch (e) {
    $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' })
  } finally {
    trocandoStatus.value = null
  }
}

// ---- formulário
const dialogo = reactive({ aberto: false, id: null, recorrencia: null, salvando: false, erro: '' })
const form = ref({})

function abrir(gasto) {
  dialogo.id = gasto?.id ?? null
  dialogo.recorrencia = gasto?.recorrencia ?? null
  form.value = gasto
    ? {
        data_emissao: gasto.data_emissao || '',
        vencimento: gasto.vencimento,
        nome: gasto.nome,
        categoria: gasto.categoria,
        valor: dec(gasto.valor),
        status: gasto.status,
        repetir: false,
        repetir_ate: ''
      }
    : { data_emissao: hojeIso(), vencimento: '', nome: '', categoria: null, valor: '', status: 'pendente', repetir: false, repetir_ate: '' }
  dialogo.aberto = true
}

// prévia de quantos meses a repetição cria (a API conta do mesmo jeito)
const qtdRepeticoes = computed(() => {
  const f = form.value
  if (!f.repetir || !f.vencimento || !f.repetir_ate || f.repetir_ate <= f.vencimento) return 0
  let n = 0
  while (n < 60 && addMonthsSemVirar(f.vencimento, n) <= f.repetir_ate) n++
  return n
})

// dia 31 em mês curto fica no último dia do mês (igual à API)
function addMonthsSemVirar(iso, k) {
  const [a, m, d] = iso.split('-').map(Number)
  const ultimo = new Date(a, m - 1 + k + 1, 0).getDate()
  return addMonths(a + '-' + String(m).padStart(2, '0') + '-01', k).slice(0, 8) + String(Math.min(d, ultimo)).padStart(2, '0')
}

async function salvar() {
  const f = form.value
  dialogo.erro = ''
  if (!f.vencimento || !f.nome.trim() || !f.categoria || f.valor === '') {
    dialogo.erro = 'Preencha vencimento, nome, categoria e valor.'
    return
  }
  if (f.repetir && !f.repetir_ate) {
    dialogo.erro = 'Informe até quando a cobrança se repete.'
    return
  }
  dialogo.salvando = true
  try {
    const salvo = await salvarGasto(dialogo.id, {
      data_emissao: f.data_emissao || null,
      vencimento: f.vencimento,
      nome: f.nome.trim(),
      categoria: f.categoria,
      valor: num(f.valor),
      status: f.status,
      repetir_ate: !dialogo.id && f.repetir ? f.repetir_ate : undefined
    })
    const lista = Array.isArray(salvo) ? salvo : [salvo]
    dialogo.aberto = false
    $q.notify({
      message: lista.length > 1 ? lista.length + ' lançamentos criados, um por mês.' : 'Gasto salvo.',
      color: 'positive',
      icon: 'check'
    })
    // mostra o mês do gasto salvo
    const mesGasto = lista[0].vencimento.slice(0, 7)
    if (mesGasto !== mes.value) mes.value = mesGasto
    else carregar()
  } catch (e) {
    dialogo.erro = mensagemDeErro(e)
  } finally {
    dialogo.salvando = false
  }
}

// ---- exclusão: em uma cobrança repetida, pergunta se leva junto os próximos meses
function excluir(gasto) {
  const repetido = !!gasto.recorrencia
  $q.dialog({
    title: 'Excluir ' + gasto.nome + '?',
    message: repetido
      ? 'Este gasto se repete todo mês. Excluir só o de ' + dataBr(gasto.vencimento) + ', ou este e os próximos?'
      : 'Não dá para desfazer.',
    options: repetido
      ? {
          type: 'radio',
          model: 'este',
          items: [
            { label: 'Só este mês', value: 'este' },
            { label: 'Este e os próximos meses', value: 'proximos' }
          ]
        }
      : undefined,
    ok: { label: 'Excluir', color: 'negative', unelevated: true, noCaps: true },
    cancel: { label: 'Cancelar', flat: true, noCaps: true, color: 'grey-8' },
    persistent: true
  }).onOk(async (escolha) => {
    try {
      await excluirGasto(gasto.id, escolha === 'proximos')
      $q.notify({ message: 'Gasto excluído.', color: 'dark' })
      carregar()
    } catch (e) {
      $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' })
    }
  })
}
</script>
