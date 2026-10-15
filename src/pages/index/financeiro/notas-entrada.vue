<template>
  <q-page padding>
    <div class="pagina">
      <div>
        <h1 class="titulo-pagina">Notas de entrada</h1>
        <p class="subtitulo-pagina">Compras de fornecedor: NF-e / DANFCe, requisição e forma de pagamento</p>
      </div>

      <q-expansion-item
        v-model="formAberto"
        class="cartao overflow-hidden"
        header-class="text-weight-bold"
        :icon="editandoId ? 'edit' : 'add'"
        :label="editandoId ? 'Editar nota de entrada' : 'Nova nota de entrada'"
        :caption="editandoId ? 'Alterando a nota ' + (form.numero_nf || 'sem número') : 'Clique para abrir o formulário'"
      >
        <q-separator />
        <div class="q-pa-md column q-gutter-y-md">
          <q-banner v-if="erroForm" dense rounded class="bg-red-1 text-negative" role="alert">
            <template #avatar><q-icon name="error_outline" /></template>
            {{ erroForm }}
          </q-banner>

          <div class="row q-col-gutter-sm">
            <q-input v-model="form.data_emissao" type="date" label="Data de emissão *" stack-label outlined dense class="col-12 col-sm-6 col-md-2" />
            <q-select
              v-model="form.fornecedor_id"
              :options="opcoesFornecedor"
              label="Fornecedor"
              emit-value
              map-options
              outlined
              dense
              class="col-12 col-sm-6 col-md-4"
            />
            <q-input v-model="form.numero_nf" label="Nº NF-e / DANFCe" outlined dense maxlength="60" input-class="text-mono" class="col-12 col-sm-6 col-md-3" />
            <q-input v-model="form.requisicao" label="Requisição" outlined dense maxlength="60" input-class="text-mono" class="col-12 col-sm-6 col-md-3" />
            <q-input
              v-model="form.valor_total"
              label="Valor total da nota *"
              prefix="R$"
              placeholder="0,00"
              inputmode="decimal"
              outlined
              dense
              input-class="text-right text-mono"
              class="col-12 col-sm-6 col-md-3"
            />
            <q-select
              v-model="form.forma"
              :options="opcoesForma"
              label="Tipo de pagamento"
              emit-value
              map-options
              outlined
              dense
              class="col-12 col-sm-6 col-md-3"
            />
            <q-input
              v-if="form.forma === 'credito'"
              v-model="form.cartao_final"
              label="Nº final do cartão"
              placeholder="0000"
              maxlength="4"
              inputmode="numeric"
              outlined
              dense
              input-class="text-mono"
              class="col-12 col-sm-6 col-md-2"
              @update:model-value="(v) => (form.cartao_final = String(v || '').replace(/\D/g, ''))"
            />
          </div>

          <div class="row justify-end q-gutter-sm">
            <q-btn outline no-caps color="grey-8" :label="editandoId ? 'Cancelar edição' : 'Limpar'" @click="limpar" />
            <q-btn unelevated no-caps color="primary" :label="editandoId ? 'Salvar alterações' : 'Salvar nota'" :loading="salvando" @click="salvar" />
          </div>
        </div>
      </q-expansion-item>

      <section class="cartao q-pa-md row q-col-gutter-sm items-center" aria-label="Filtros das notas">
        <div class="col-12 col-sm-6 col-md-4">
          <MesSeletor v-model="mes" />
        </div>
      </section>

      <div class="row q-col-gutter-md" aria-label="Totais do mês">
        <div class="col-12 col-sm-4">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">Notas no mês</span>
            <strong class="text-mono" style="font-size: 22px">{{ brl(totais.total) }}</strong>
            <span class="texto-apoio">{{ totais.quantidade }} nota(s)</span>
          </div>
        </div>
        <div class="col-6 col-sm-4">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">No cartão de crédito</span>
            <strong class="text-mono" style="font-size: 22px">{{ brl(totais.credito) }}</strong>
          </div>
        </div>
        <div class="col-6 col-sm-4">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">Em boletos</span>
            <strong class="text-mono" style="font-size: 22px">{{ brl(totais.boleto) }}</strong>
          </div>
        </div>
      </div>

      <q-table
        :rows="notas"
        :columns="colunas"
        row-key="id"
        flat
        bordered
        class="tabela-oficina"
        :loading="carregando"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :no-data-label="erro || 'Nenhuma nota neste mês.'"
      >
        <template #body-cell-forma="props">
          <q-td :props="props">
            {{ FORMAS_API[props.row.forma] || props.row.forma }}
            <span v-if="props.row.cartao_final" class="text-mono text-grey-8 q-ml-xs">•••• {{ props.row.cartao_final }}</span>
          </q-td>
        </template>

        <template #body-cell-valor_total="props">
          <q-td :props="props" class="text-mono text-weight-bold">{{ props.value }}</q-td>
        </template>

        <template #body-cell-acoes="props">
          <q-td :props="props">
            <q-btn flat round dense icon="edit" color="grey-8" aria-label="Editar nota" @click="editar(props.row)" />
            <q-btn
              v-if="ehAdmin"
              flat
              round
              dense
              icon="delete_outline"
              color="negative"
              aria-label="Excluir nota"
              @click="excluir(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { mensagemDeErro } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import { useOficinaStore } from '@/stores/oficina'
import { FORMAS_API } from '@/api/ordens'
import { FORMAS_NOTA, mesAtual, listarNotas, salvarNota, excluirNota } from '@/api/financeiro'
import { num, brl, dec, dataBr, hojeIso } from '@/utils/formato'
import MesSeletor from '@/components/MesSeletor.vue'

const $q = useQuasar()
const auth = useAuthStore()
const store = useOficinaStore()
const ehAdmin = computed(() => auth.usuario?.papel === 'admin')

const mes = ref(mesAtual())
const notas = ref([])
const totais = ref({ quantidade: 0, total: 0, credito: 0, boleto: 0 })
const carregando = ref(false)
const erro = ref('')

const opcoesForma = Object.entries(FORMAS_NOTA).map(([value, label]) => ({ value, label }))
// fornecedores ativos; o da nota entra mesmo se tiver sido desativado
const opcoesFornecedor = computed(() => [
  { value: null, label: 'Sem fornecedor' },
  ...store.fornecedores
    .filter((f) => f.ativo || f.id === form.value.fornecedor_id)
    .map((f) => ({ value: f.id, label: f.nome + (f.ativo ? '' : ' (desativado)') }))
])

const colunas = [
  { name: 'data_emissao', label: 'Emissão', field: 'data_emissao', format: dataBr, align: 'left', classes: 'text-mono' },
  { name: 'fornecedor', label: 'Fornecedor', field: (n) => n.fornecedor_nome || '—', align: 'left' },
  { name: 'numero_nf', label: 'Nº NF-e / DANFCe', field: (n) => n.numero_nf || '—', align: 'left', classes: 'text-mono' },
  { name: 'requisicao', label: 'Requisição', field: (n) => n.requisicao || '—', align: 'left', classes: 'text-mono' },
  { name: 'forma', label: 'Pagamento', field: 'forma', align: 'left' },
  { name: 'valor_total', label: 'Valor total', field: 'valor_total', format: brl, align: 'right' },
  { name: 'acoes', label: '', field: 'id', align: 'right' }
]

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const r = await listarNotas({ mes: mes.value })
    notas.value = r.data
    totais.value = r.totais
  } catch (e) {
    notas.value = []
    totais.value = { quantidade: 0, total: 0, credito: 0, boleto: 0 }
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}

watch(mes, carregar)
onMounted(carregar)

// ---- formulário (no topo da página)
const formAberto = ref(false)
const editandoId = ref(null)
const salvando = ref(false)
const erroForm = ref('')

const formVazio = () => ({
  data_emissao: hojeIso(),
  fornecedor_id: null,
  numero_nf: '',
  requisicao: '',
  valor_total: '',
  forma: 'boleto',
  cartao_final: ''
})
const form = ref(formVazio())

function limpar() {
  form.value = formVazio()
  editandoId.value = null
  erroForm.value = ''
}

function editar(nota) {
  editandoId.value = nota.id
  erroForm.value = ''
  form.value = {
    data_emissao: nota.data_emissao,
    fornecedor_id: nota.fornecedor_id,
    numero_nf: nota.numero_nf || '',
    requisicao: nota.requisicao || '',
    valor_total: dec(nota.valor_total),
    forma: nota.forma,
    cartao_final: nota.cartao_final || ''
  }
  formAberto.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function salvar() {
  const f = form.value
  erroForm.value = ''
  if (!f.data_emissao || f.valor_total === '') {
    erroForm.value = 'Preencha a data de emissão e o valor total da nota.'
    return
  }
  if (f.forma === 'credito' && f.cartao_final && f.cartao_final.length !== 4) {
    erroForm.value = 'O final do cartão precisa ter 4 números.'
    return
  }
  salvando.value = true
  try {
    const salva = await salvarNota(editandoId.value, {
      data_emissao: f.data_emissao,
      fornecedor_id: f.fornecedor_id || null,
      numero_nf: f.numero_nf.trim() || null,
      requisicao: f.requisicao.trim() || null,
      valor_total: num(f.valor_total),
      forma: f.forma,
      cartao_final: f.forma === 'credito' ? f.cartao_final || null : null
    })
    $q.notify({ message: editandoId.value ? 'Nota alterada.' : 'Nota salva.', color: 'positive', icon: 'check' })
    limpar()
    // mostra o mês da nota salva
    const mesNota = salva.data_emissao.slice(0, 7)
    if (mesNota !== mes.value) mes.value = mesNota
    else carregar()
  } catch (e) {
    erroForm.value = mensagemDeErro(e)
  } finally {
    salvando.value = false
  }
}

function excluir(nota) {
  $q.dialog({
    title: 'Excluir nota ' + (nota.numero_nf || 'sem número') + '?',
    message: (nota.fornecedor_nome ? nota.fornecedor_nome + ' · ' : '') + brl(nota.valor_total) + '. Não dá para desfazer.',
    ok: { label: 'Excluir', color: 'negative', unelevated: true, noCaps: true },
    cancel: { label: 'Cancelar', flat: true, noCaps: true, color: 'grey-8' },
    persistent: true
  }).onOk(async () => {
    try {
      await excluirNota(nota.id)
      if (editandoId.value === nota.id) limpar()
      $q.notify({ message: 'Nota excluída.', color: 'dark' })
      carregar()
    } catch (e) {
      $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' })
    }
  })
}
</script>
