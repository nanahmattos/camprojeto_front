<template>
  <q-page padding>
    <div class="pagina">
      <div class="row items-end justify-between q-gutter-y-md">
        <div>
          <h1 class="titulo-pagina">Faturas</h1>
          <p class="subtitulo-pagina">Boletos que o fornecedor manda depois, juntando várias notas de entrada</p>
        </div>
        <q-btn unelevated no-caps color="primary" icon="add" label="Nova fatura" @click="abrir(null)" />
      </div>

      <section class="cartao q-pa-md row q-col-gutter-sm items-center" aria-label="Filtros das faturas">
        <q-select
          v-model="filtroFornecedor"
          :options="opcoesFiltroFornecedor"
          label="Fornecedor"
          emit-value
          map-options
          outlined
          dense
          options-dense
          class="col-12 col-sm-6 col-md-4"
        />
      </section>

      <q-table
        :rows="faturas"
        :columns="colunas"
        row-key="id"
        flat
        bordered
        class="tabela-oficina"
        :loading="carregando"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :no-data-label="erro || 'Nenhuma fatura registrada.'"
      >
        <template #body-cell-notas="props">
          <q-td :props="props">
            <span class="text-mono">{{ props.row.notas.map((n) => n.numero_nf || 'sem nº').join(', ') }}</span>
            <div class="texto-apoio" style="font-size: 12px">{{ props.row.notas.length }} nota(s) · {{ brl(props.row.total_notas) }}</div>
          </q-td>
        </template>

        <template #body-cell-parcelas="props">
          <q-td :props="props">
            {{ props.row.boletos.length }}x
            <span v-if="proximaParcela(props.row)" class="texto-apoio"> · próxima vence {{ dataBr(proximaParcela(props.row).vencimento) }}</span>
            <span v-else class="text-positive"> · paga</span>
          </q-td>
        </template>

        <template #body-cell-total_parcelas="props">
          <q-td :props="props" class="text-mono">
            <span class="text-weight-bold">{{ props.value }}</span>
            <q-icon v-if="Math.abs(props.row.total_parcelas - props.row.total_notas) >= 0.005" name="info" color="warning" class="q-ml-xs">
              <q-tooltip>Diferente do total das notas ({{ brl(props.row.total_notas) }}): juros, desconto ou devolução</q-tooltip>
            </q-icon>
          </q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn flat round dense icon="edit" color="grey-8" :aria-label="'Editar fatura ' + props.row.numero" @click="abrir(props.row)" />
            <q-btn
              v-if="ehAdmin"
              flat
              round
              dense
              icon="delete_outline"
              color="negative"
              :aria-label="'Excluir fatura ' + props.row.numero"
              @click="excluir(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="dialogo.aberto" :maximized="$q.screen.lt.sm" @hide="dialogo.erro = ''">
      <q-card style="width: 860px; max-width: 95vw">
        <q-card-section class="row items-center no-wrap">
          <h2 class="titulo-secao col" style="font-size: 19px">{{ dialogo.id ? 'Fatura nº ' + dialogo.numero : 'Nova fatura' }}</h2>
          <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
        </q-card-section>
        <q-separator />

        <q-card-section class="column q-gutter-y-md">
          <q-banner v-if="dialogo.erro" dense rounded class="bg-red-1 text-negative" role="alert">
            <template #avatar><q-icon name="error_outline" /></template>
            {{ dialogo.erro }}
          </q-banner>

          <div class="row q-col-gutter-sm">
            <q-select
              :model-value="form.fornecedor_id"
              :options="opcoesFornecedor"
              label="Fornecedor *"
              emit-value
              map-options
              outlined
              dense
              options-dense
              :disable="!!dialogo.id"
              :hint="dialogo.id ? 'Para outro fornecedor, exclua e registre uma fatura nova.' : ''"
              class="col-12 col-sm-6"
              @update:model-value="mudarFornecedor"
            />
            <q-input v-model="form.obs" label="Observação" placeholder="Ex.: fatura 0045/2026" maxlength="255" outlined dense class="col-12 col-sm-6" />
          </div>

          <div>
            <div class="row items-center justify-between q-mb-xs">
              <span class="rotulo-coluna">Notas desta fatura</span>
              <span v-if="form.notas.length" class="texto-apoio">
                {{ form.notas.length }} marcada(s) · <strong class="text-mono">{{ brl(totalNotas) }}</strong>
              </span>
            </div>
            <p v-if="!form.fornecedor_id" class="texto-apoio q-py-sm">Escolha o fornecedor para ver as notas aguardando boleto.</p>
            <div v-else-if="carregandoNotas" class="row justify-center q-pa-md"><q-spinner size="24px" color="primary" /></div>
            <p v-else-if="!opcoesNotas.length" class="texto-apoio q-py-sm">
              Nenhuma nota deste fornecedor aguardando boleto. Em Notas de entrada, salve a nota com o tipo de pagamento "Boleto agrupado".
            </p>
            <q-list v-else bordered separator class="rounded-borders" style="max-height: 260px; overflow-y: auto">
              <q-item v-for="n in opcoesNotas" :key="n.id" v-ripple tag="label" dense>
                <q-item-section side>
                  <q-checkbox v-model="form.notas" :val="n.id" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>
                    <span class="text-mono text-weight-bold">NF {{ n.numero_nf || 'sem nº' }}</span>
                    <span class="texto-apoio"> · {{ dataBr(n.data_emissao) }}</span>
                    <span v-if="n.requisicao" class="texto-apoio"> · req. {{ n.requisicao }}</span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side class="text-mono">{{ brl(n.valor_total) }}</q-item-section>
              </q-item>
            </q-list>
          </div>

          <div>
            <div class="rotulo-coluna q-mb-xs">Parcelas do boleto</div>
            <p class="texto-apoio">
              Cada parcela vai para Contas a pagar como <strong>{{ nomeFornecedor || 'o fornecedor escolhido' }}</strong>, categoria Fornecedor.
              Se a fatura tiver juros, desconto ou devolução, ajuste os valores: dá para salvar com a soma diferente do total das notas.
            </p>
            <ParcelasBoleto v-model="form.boletos" :total="totalNotas" :emissao="hojeIso()" rotulo-total="total das notas marcadas" />
          </div>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn outline no-caps color="grey-8" label="Cancelar" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Salvar fatura" :loading="dialogo.salvando" @click="salvar" />
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
import { useOficinaStore } from '@/stores/oficina'
import { listarFaturas, notasAguardando, salvarFatura, excluirFatura } from '@/api/financeiro'
import { num, brl, dec, dataBr, hojeIso } from '@/utils/formato'
import ParcelasBoleto from '@/components/ParcelasBoleto.vue'

const $q = useQuasar()
const auth = useAuthStore()
const store = useOficinaStore()
const ehAdmin = computed(() => auth.usuario?.papel === 'admin')

const faturas = ref([])
const carregando = ref(false)
const erro = ref('')
const filtroFornecedor = ref(null)

const opcoesFornecedor = computed(() =>
  store.fornecedores
    .filter((f) => f.ativo || f.id === form.value.fornecedor_id)
    .map((f) => ({ value: f.id, label: f.nome + (f.ativo ? '' : ' (desativado)') }))
)
const opcoesFiltroFornecedor = computed(() => [
  { value: null, label: 'Todos' },
  ...store.fornecedores.map((f) => ({ value: f.id, label: f.nome + (f.ativo ? '' : ' (desativado)') }))
])

const colunas = [
  { name: 'numero', label: 'Nº', field: 'numero', align: 'left', classes: 'text-mono text-weight-bold' },
  { name: 'fornecedor', label: 'Fornecedor', field: (f) => f.fornecedor_nome || '—', align: 'left' },
  { name: 'notas', label: 'Notas', field: 'notas', align: 'left' },
  { name: 'parcelas', label: 'Parcelas', field: 'boletos', align: 'left' },
  { name: 'total_parcelas', label: 'Total', field: 'total_parcelas', format: brl, align: 'right' },
  { name: 'acoes', label: '', field: 'id', align: 'right' }
]

const proximaParcela = (f) => f.boletos.find((b) => b.status !== 'pago')

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    faturas.value = await listarFaturas({ fornecedor_id: filtroFornecedor.value || undefined })
  } catch (e) {
    faturas.value = []
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}

watch(filtroFornecedor, carregar)
onMounted(carregar)

// ---- janela da fatura
const dialogo = reactive({ aberto: false, id: null, numero: null, salvando: false, erro: '' })
const formVazio = () => ({ fornecedor_id: null, obs: '', notas: [], boletos: [{ data_emissao: hojeIso(), vencimento: '', valor: '' }] })
const form = ref(formVazio())

// notas que podem ser marcadas: as aguardando boleto do fornecedor + as que já estão nesta fatura
const notasDaFatura = ref([])
const aguardando = ref([])
const carregandoNotas = ref(false)
const opcoesNotas = computed(() =>
  [...notasDaFatura.value, ...aguardando.value].sort((a, b) => a.data_emissao.localeCompare(b.data_emissao) || a.id - b.id)
)
const totalNotas = computed(() =>
  Math.round(opcoesNotas.value.filter((n) => form.value.notas.includes(n.id)).reduce((s, n) => s + n.valor_total * 100, 0)) / 100
)
const nomeFornecedor = computed(() => store.fornecedores.find((f) => f.id === form.value.fornecedor_id)?.nome)

async function carregarAguardando() {
  aguardando.value = []
  if (!form.value.fornecedor_id) return
  carregandoNotas.value = true
  try {
    aguardando.value = await notasAguardando(form.value.fornecedor_id)
  } catch (e) {
    dialogo.erro = mensagemDeErro(e)
  } finally {
    carregandoNotas.value = false
  }
}

function mudarFornecedor(id) {
  form.value.fornecedor_id = id
  form.value.notas = []
  carregarAguardando()
}

function abrir(fatura) {
  dialogo.id = fatura?.id ?? null
  dialogo.numero = fatura?.numero ?? null
  notasDaFatura.value = fatura ? fatura.notas : []
  form.value = fatura
    ? {
        fornecedor_id: fatura.fornecedor_id,
        obs: fatura.obs || '',
        notas: fatura.notas.map((n) => n.id),
        // valores salvos contam como digitados: marcar ou desmarcar nota não desfaz o ajuste (dá para "Dividir por igual")
        boletos: fatura.boletos.map((b) => ({
          data_emissao: b.data_emissao || '',
          vencimento: b.vencimento,
          valor: dec(b.valor),
          status: b.status,
          manual: true
        }))
      }
    : formVazio()
  dialogo.aberto = true
  carregarAguardando()
}

async function salvar() {
  const f = form.value
  dialogo.erro = ''
  if (!f.fornecedor_id || !f.notas.length) {
    dialogo.erro = 'Escolha o fornecedor e marque as notas desta fatura.'
    return
  }
  if (f.boletos.some((b) => !b.vencimento || b.valor === '')) {
    dialogo.erro = 'Preencha o vencimento e o valor de todas as parcelas.'
    return
  }
  dialogo.salvando = true
  try {
    const salva = await salvarFatura(dialogo.id, {
      fornecedor_id: f.fornecedor_id,
      obs: f.obs.trim() || null,
      notas: f.notas,
      boletos: f.boletos.map((b) => ({ data_emissao: b.data_emissao || null, vencimento: b.vencimento, valor: num(b.valor) }))
    })
    dialogo.aberto = false
    $q.notify({
      message: 'Fatura nº ' + salva.numero + ' salva. ' + (f.boletos.length > 1 ? 'As ' + f.boletos.length + ' parcelas estão' : 'O boleto está') + ' em Contas a pagar.',
      color: 'positive',
      icon: 'check',
      position: 'top'
    })
    carregar()
  } catch (e) {
    dialogo.erro = mensagemDeErro(e)
  } finally {
    dialogo.salvando = false
  }
}

function excluir(fatura) {
  $q.dialog({
    title: 'Excluir fatura nº ' + fatura.numero + '?',
    message:
      'As parcelas saem de Contas a pagar e as notas (' +
      fatura.notas.map((n) => n.numero_nf || 'sem nº').join(', ') +
      ') voltam a aguardar boleto.',
    ok: { label: 'Excluir', color: 'negative', unelevated: true, noCaps: true },
    cancel: { label: 'Cancelar', flat: true, noCaps: true, color: 'grey-8' },
    persistent: true
  }).onOk(async () => {
    try {
      await excluirFatura(fatura.id)
      $q.notify({ message: 'Fatura excluída.', color: 'dark' })
      carregar()
    } catch (e) {
      $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' })
    }
  })
}
</script>
