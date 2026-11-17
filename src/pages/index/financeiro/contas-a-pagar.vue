<template>
  <q-page padding>
    <div class="pagina pagina-com-tabela">
      <div class="row items-end justify-between q-gutter-y-md">
        <div>
          <h1 class="titulo-pagina">Contas a pagar</h1>
          <p class="subtitulo-pagina">Aluguel, funcionários, fornecedores, terceirizados, impostos, luz…</p>
        </div>
        <q-btn unelevated no-caps color="primary" icon="add" label="Nova conta" @click="abrir(null)" />
      </div>

      <!-- período pelo vencimento; status filtra só a lista (os totais mostram o período todo) -->
      <!-- tudo numa linha; em tela estreita quebra para a de baixo -->
      <section class="cartao q-pa-md filtros-linha" aria-label="Filtros das contas">
        <q-btn-toggle
          v-model="periodo"
          :options="opcoesPeriodo"
          no-caps
          unelevated
          dense
          toggle-color="primary"
          color="grey-2"
          text-color="grey-9"
          class="filtro-toggle"
          aria-label="Período pelo vencimento"
        />
        <MesSeletor v-if="periodo === 'mes'" v-model="mes" class="filtro-mes" />
        <template v-else-if="periodo === 'data'">
          <CampoData v-model="dataDe" label="Vencimento de" stack-label outlined dense class="filtro-data" />
          <CampoData v-model="dataAte" label="até" stack-label outlined dense :min="dataDe || undefined" class="filtro-data" />
        </template>
        <span v-else class="texto-apoio">
          Vencimento em <strong class="text-mono">{{ dataBr(diaFiltro) }}</strong>
        </span>
        <q-btn-toggle
          v-model="filtroStatus"
          :options="opcoesFiltroStatus"
          no-caps
          unelevated
          dense
          toggle-color="primary"
          color="grey-2"
          text-color="grey-9"
          class="filtro-toggle"
          aria-label="Status"
        />
        <q-select
          v-model="filtroCategoria"
          :options="opcoesFiltroCategoria"
          label="Categoria"
          emit-value
          map-options
          outlined
          dense
          class="filtro-categoria"
        />
      </section>

      <div class="row q-col-gutter-md" :aria-label="'Totais ' + rotuloPeriodo">
        <div class="col-12 col-sm-4">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">Total {{ rotuloPeriodo }}</span>
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
        :rows="gastosVisiveis"
        :columns="colunas"
        row-key="id"
        flat
        bordered
        class="tabela-oficina tabela-clicavel tabela-rolagem"
        :loading="carregando"
        @row-click="(_, row) => abrir(row)"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :no-data-label="erro || semContas"
      >
        <template #body-cell-nome="props">
          <q-td :props="props">
            <span class="text-weight-bold">{{ props.row.nome }}</span>
            <q-icon v-if="props.row.recorrencia" name="event_repeat" size="16px" color="grey-7" class="q-ml-xs">
              <q-tooltip>Repete todo mês</q-tooltip>
            </q-icon>
            <q-icon v-if="props.row.fatura" name="receipt_long" size="16px" color="grey-7" class="q-ml-xs">
              <q-tooltip>{{ textoFatura(props.row.fatura) }}</q-tooltip>
            </q-icon>
            <div v-if="props.row.fatura" class="texto-apoio" style="font-size: 12px">
              {{ notasDaFatura(props.row.fatura) }}
            </div>
          </q-td>
        </template>

        <template #body-cell-valor="props">
          <q-td :props="props" class="text-mono text-weight-bold">{{ props.value }}</q-td>
        </template>

        <!-- o status não abre a edição da linha -->
        <template #body-cell-status="props">
          <q-td :props="props" @click.stop>
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

        <template v-if="gastosVisiveis.length" #bottom-row>
          <q-tr class="text-weight-bold linha-total">
            <q-td colspan="4" class="text-right"
              >Total{{ filtroStatus ? ' ' + opcoesFiltroStatus.find((o) => o.value === filtroStatus).label.toLowerCase() : '' }}</q-td
            >
            <q-td class="text-right text-mono">{{ brl(totalVisivel) }}</q-td>
            <q-td></q-td>
          </q-tr>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="dialogo.aberto" @hide="dialogo.erro = ''">
      <q-card style="width: 620px; max-width: 95vw">
        <q-card-section class="row items-center no-wrap">
          <h2 class="titulo-secao col" style="font-size: 19px">
            {{ dialogo.id ? 'Editar conta' : 'Nova conta' }}
          </h2>
          <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
        </q-card-section>
        <q-separator />

        <q-card-section class="column q-gutter-y-md">
          <q-banner v-if="dialogo.erro" dense rounded class="bg-red-1 text-negative" role="alert">
            <template #avatar><q-icon name="error_outline" /></template>
            {{ dialogo.erro }}
          </q-banner>

          <div class="row q-col-gutter-sm">
            <CampoData v-model="form.data_emissao" label="Data de emissão" stack-label outlined dense class="col-6" />
            <CampoData v-model="form.vencimento" label="Vencimento *" stack-label outlined dense class="col-6" />
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
              <CampoData
                v-model="form.repetir_ate"
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
          <p v-else-if="dialogo.fatura" class="texto-apoio">
            {{ textoFatura(dialogo.fatura) }}.
            {{
              dialogo.fatura.da_nota
                ? 'Se a nota for alterada, emissão, vencimento, valor e nome voltam a seguir a nota.'
                : 'Se a fatura for alterada (em Financeiro > Faturas), emissão, vencimento, valor e nome voltam a seguir a fatura.'
            }}
          </p>
          <p v-else-if="dialogo.recorrencia" class="texto-apoio">
            Esta conta faz parte de uma cobrança que se repete. A alteração vale só para este mês.
          </p>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <!-- excluir fica na edição, à esquerda, longe do Salvar -->
          <q-btn
            v-if="dialogo.id && ehAdmin"
            flat
            no-caps
            color="negative"
            icon="delete_outline"
            label="Excluir conta"
            @click="excluir(dialogo.gasto)"
          />
          <q-space />
          <q-btn outline no-caps color="grey-8" label="Cancelar" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Salvar conta" :loading="dialogo.salvando" @click="salvar" />
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
import { CATEGORIAS_GASTO, STATUS_GASTO, mesAtual, listarGastos, salvarGasto, mudarStatusGasto, excluirGasto } from '@/api/financeiro'
import { num, brl, dec, dataBr, hojeIso, addMonths } from '@/utils/formato'
import MesSeletor from '@/components/MesSeletor.vue'
import CampoData from '@/components/CampoData.vue'

const $q = useQuasar()
const auth = useAuthStore()
const ehAdmin = computed(() => auth.usuario?.papel === 'admin')

// período pelo vencimento: mês, hoje, ontem ou entre datas
const periodo = ref('mes')
const opcoesPeriodo = [
  { value: 'mes', label: 'Mês' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: 'data', label: 'Data' },
]
const mes = ref(mesAtual())
const dataDe = ref(hojeIso())
const dataAte = ref(hojeIso())
const ontemIso = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
// dia de "hoje" / "ontem"
const diaFiltro = computed(() => (periodo.value === 'ontem' ? ontemIso() : hojeIso()))
const rotuloPeriodo = computed(() => {
  if (periodo.value === 'mes') return 'no mês'
  if (periodo.value === 'hoje') return 'de hoje'
  if (periodo.value === 'ontem') return 'de ontem'
  return 'no período'
})

const filtroStatus = ref(null)
const opcoesFiltroStatus = [
  { value: null, label: 'Todas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'pago', label: 'Pagas' },
]
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
  {
    name: 'vencimento',
    label: 'Vencimento',
    field: 'vencimento',
    format: dataBr,
    align: 'left',
    classes: 'text-mono',
  },
  {
    name: 'data_emissao',
    label: 'Emissão',
    field: 'data_emissao',
    format: (v) => dataBr(v) || '—',
    align: 'left',
    classes: 'text-mono text-grey-8',
  },
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left' },
  {
    name: 'categoria',
    label: 'Categoria',
    field: (g) => CATEGORIAS_GASTO[g.categoria] || g.categoria,
    align: 'left',
  },
  { name: 'valor', label: 'Valor', field: 'valor', format: brl, align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
]

// boleto de fornecedor: da própria nota ou de uma fatura com várias notas
const notasDaFatura = (f) => (f.notas.length > 1 ? 'NFs ' : 'NF ') + (f.notas.join(', ') || 'sem nº')
const textoFatura = (f) =>
  f.da_nota ? 'Boleto da nota de entrada ' + notasDaFatura(f) : 'Boleto da fatura nº ' + f.numero + ' (' + notasDaFatura(f) + ')'

// status filtra aqui mesmo: os cards de total, pendentes e pagos continuam mostrando o período todo
const gastosVisiveis = computed(() => (filtroStatus.value ? gastos.value.filter((g) => g.status === filtroStatus.value) : gastos.value))
const totalVisivel = computed(() => gastosVisiveis.value.reduce((s, g) => s + g.valor, 0))
const semContas = computed(() => {
  const status = filtroStatus.value === 'pago' ? ' paga' : filtroStatus.value === 'pendente' ? ' pendente' : ''
  return 'Nenhuma conta' + status + ' ' + (periodo.value === 'mes' ? 'neste mês' : rotuloPeriodo.value) + '.'
})

function filtrosPeriodo() {
  if (periodo.value === 'mes') return { mes: mes.value }
  if (periodo.value === 'data') {
    // data final vazia ou antes da inicial: só o dia inicial
    const de = dataDe.value || hojeIso()
    return { de, ate: dataAte.value && dataAte.value >= de ? dataAte.value : de }
  }
  return { de: diaFiltro.value }
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const r = await listarGastos({
      ...filtrosPeriodo(),
      categoria: filtroCategoria.value || undefined,
    })
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

watch([periodo, mes, dataDe, dataAte, filtroCategoria], carregar)
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
const dialogo = reactive({
  aberto: false,
  id: null,
  gasto: null,
  recorrencia: null,
  fatura: null,
  salvando: false,
  erro: '',
})
const form = ref({})

function abrir(gasto) {
  dialogo.id = gasto?.id ?? null
  dialogo.gasto = gasto ?? null
  dialogo.recorrencia = gasto?.recorrencia ?? null
  dialogo.fatura = gasto?.fatura ?? null
  form.value = gasto
    ? {
        data_emissao: gasto.data_emissao || '',
        vencimento: gasto.vencimento,
        nome: gasto.nome,
        categoria: gasto.categoria,
        valor: dec(gasto.valor),
        status: gasto.status,
        repetir: false,
        repetir_ate: '',
      }
    : {
        data_emissao: hojeIso(),
        vencimento: '',
        nome: '',
        categoria: null,
        valor: '',
        status: 'pendente',
        repetir: false,
        repetir_ate: '',
      }
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
      repetir_ate: !dialogo.id && f.repetir ? f.repetir_ate : undefined,
    })
    const lista = Array.isArray(salvo) ? salvo : [salvo]
    dialogo.aberto = false
    $q.notify({
      message: lista.length > 1 ? lista.length + ' lançamentos criados, um por mês.' : 'Conta salva.',
      color: 'positive',
      icon: 'check',
    })
    // no filtro por mês, mostra o mês da conta salva
    const mesGasto = lista[0].vencimento.slice(0, 7)
    if (periodo.value === 'mes' && mesGasto !== mes.value) mes.value = mesGasto
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
      ? 'Esta conta se repete todo mês. Excluir só o de ' + dataBr(gasto.vencimento) + ', ou este e os próximos?'
      : 'Não dá para desfazer.',
    options: repetido
      ? {
          type: 'radio',
          model: 'este',
          items: [
            { label: 'Só este mês', value: 'este' },
            { label: 'Este e os próximos meses', value: 'proximos' },
          ],
        }
      : undefined,
    ok: { label: 'Excluir', color: 'negative', unelevated: true, noCaps: true },
    cancel: { label: 'Cancelar', flat: true, noCaps: true, color: 'grey-8' },
    persistent: true,
  }).onOk(async (escolha) => {
    try {
      await excluirGasto(gasto.id, escolha === 'proximos')
      dialogo.aberto = false
      $q.notify({ message: 'Conta excluída.', color: 'dark' })
      carregar()
    } catch (e) {
      $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' })
    }
  })
}
</script>

<style lang="scss" scoped>
// clicar na linha abre a edição
.tabela-clicavel :deep(tbody tr:not(.linha-total)) {
  cursor: pointer;
}

// a tabela rola por dentro: cabeçalho e total ficam fixos.
// celular/tablet: no máximo a altura da tela (menos a barra do topo e o respiro da página)
.tabela-rolagem {
  max-height: calc(100dvh - 50px - 32px);
  min-height: 240px;

  :deep(thead tr th) {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #faf9f6;
  }

  :deep(.linha-total td) {
    position: sticky;
    bottom: 0;
    z-index: 1;
    background: #fff;
    border-top: 1px solid #dad8d2;
  }

  // barra de carregamento abaixo do cabeçalho fixo
  &.q-table--loading :deep(thead tr:last-child th) {
    top: 48px;
  }
}

// computador (sem barra no topo): a página ocupa a janela e a tabela fica com o espaço que sobra
@media (min-width: 1024px) {
  .pagina-com-tabela {
    height: calc(100dvh - 32px);
  }

  .tabela-rolagem {
    flex: 1 1 0;
    max-height: none;
    min-height: 280px;
  }
}

.filtros-linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.filtro-mes {
  width: 230px;
}

.filtro-data {
  width: 150px;
}

.filtro-categoria {
  width: 180px;
  margin-left: auto;
}

// celular: cada filtro ocupa a largura toda
@media (max-width: 599px) {
  .filtro-mes,
  .filtro-categoria {
    width: 100%;
    margin-left: 0;
  }

  .filtro-data {
    flex: 1 1 0;
  }
}

.filtro-toggle {
  border: 1px solid #dad8d2;
  border-radius: 8px;
  overflow: hidden;
  min-height: 40px;

  :deep(.q-btn) {
    padding: 4px 14px;
  }
}
</style>
