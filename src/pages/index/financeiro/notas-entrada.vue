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
            <CampoData v-model="form.data_emissao" label="Data de emissão *" stack-label outlined dense class="col-12 col-sm-6 col-md-2" />
            <q-select
              v-model="form.fornecedor_id"
              :options="opcoesFornecedor"
              label="Fornecedor"
              emit-value
              map-options
              outlined
              options-dense
              dense
              :disable="naFaturaAgrupada"
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
              :disable="naFaturaAgrupada"
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
              :disable="naFaturaAgrupada"
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

          <!-- boleto: a nota tem o dela (cada parcela vira uma conta a pagar); boleto agrupado: aguarda o boleto da fatura -->
          <div v-if="ehBoleto(form.forma)" class="column q-gutter-y-sm q-pa-sm" style="border: 1px solid #eceae4; border-radius: 8px">
            <div class="row items-center q-gutter-x-sm no-wrap">
              <q-icon name="event_repeat" size="20px" color="grey-7" />
              <span class="text-weight-bold">Dados do boleto</span>
            </div>

            <template v-if="naFaturaAgrupada">
              <q-banner dense rounded class="bg-blue-1 text-blue-10">
                <template #avatar><q-icon name="receipt_long" /></template>
                Esta nota está na <strong>fatura nº {{ form.fatura.numero }}</strong>, junto com outras notas do fornecedor. As parcelas ficam em
                Financeiro &gt; Faturas. Para mudar fornecedor, valor ou forma de pagamento, tire a nota da fatura antes.
                <template #action>
                  <q-btn flat no-caps color="primary" label="Abrir faturas" to="/financeiro/faturas" />
                </template>
              </q-banner>
            </template>

            <template v-else>
              <p v-if="form.forma === AGRUPADO" class="texto-apoio">
                O fornecedor junta várias notas e manda os boletos depois. A nota fica <strong>aguardando boleto</strong> e ainda não vai para
                Contas a pagar. Quando os boletos chegarem, registre em <strong>Financeiro &gt; Faturas</strong>.
              </p>
              <template v-else>
                <p class="texto-apoio">
                  Cada parcela vai para Contas a pagar como <strong>{{ nomeFornecedor || 'o fornecedor escolhido' }}</strong>, categoria Fornecedor, pendente.
                </p>
                <!-- crédito de devolução: o fornecedor desconta no boleto; as parcelas dividem o restante -->
                <div v-if="form.forma === COM_CREDITO" class="row q-col-gutter-sm items-center">
                  <q-input
                    v-model="form.credito"
                    label="Crédito de devolução *"
                    prefix="R$"
                    placeholder="0,00"
                    inputmode="decimal"
                    outlined
                    dense
                    input-class="text-right text-mono"
                    class="col-12 col-sm-6 col-md-3"
                  />
                  <span v-if="quitadaComCredito" class="col texto-apoio">
                    O crédito cobre a nota inteira: <strong>não tem boleto</strong> e nada vai para Contas a pagar.
                  </span>
                  <span v-else class="col texto-apoio">
                    Nota de {{ brl(num(form.valor_total)) }} − crédito de {{ brl(num(form.credito)) }} =
                    <strong class="text-mono">{{ brl(valorBoleto) }}</strong> no boleto.
                  </span>
                </div>
                <ParcelasBoleto
                  v-if="!quitadaComCredito"
                  v-model="form.boletos"
                  :total="valorBoleto"
                  :emissao="form.data_emissao"
                  :rotulo-total="form.forma === COM_CREDITO ? 'valor da nota menos o crédito' : 'valor total da nota'"
                />
              </template>
            </template>
          </div>

          <div class="row justify-end q-gutter-sm">
            <q-btn outline no-caps color="grey-8" :label="editandoId ? 'Cancelar edição' : 'Limpar'" @click="limpar" />
            <q-btn unelevated no-caps color="primary" :label="editandoId ? 'Salvar alterações' : 'Salvar nota'" :loading="salvando" @click="salvar" />
          </div>
        </div>
      </q-expansion-item>

      <section class="cartao q-pa-md row q-col-gutter-sm items-center" aria-label="Filtros das notas">
        <div class="col-12 col-sm-6 col-md-4">
          <MesSeletor v-if="!soAguardando" v-model="mes" />
        </div>
        <q-toggle v-model="soAguardando" label="Só aguardando boleto (todos os meses)" color="warning" class="col-12 col-sm-auto" />
      </section>

      <div class="row q-col-gutter-md" aria-label="Totais do mês">
        <div class="col-12 col-sm-6 col-md-3">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">Notas no mês</span>
            <strong class="text-mono" style="font-size: 22px">{{ brl(totais.total) }}</strong>
            <span class="texto-apoio">{{ totais.quantidade }} nota(s)</span>
          </div>
        </div>
        <div class="col-6 col-sm-6 col-md-3">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">No cartão de crédito</span>
            <strong class="text-mono" style="font-size: 22px">{{ brl(totais.credito) }}</strong>
          </div>
        </div>
        <div class="col-6 col-sm-6 col-md-3">
          <div class="cartao q-pa-md column">
            <span class="rotulo-coluna">Em boletos</span>
            <strong class="text-mono" style="font-size: 22px">{{ brl(totais.boleto) }}</strong>
          </div>
        </div>
        <!-- de todos os meses: dívida que ainda não está em Contas a pagar -->
        <div class="col-6 col-sm-6 col-md-3">
          <button
            type="button"
            class="cartao q-pa-md column full-width text-left cursor-pointer cartao-aguardando"
            :aria-pressed="soAguardando"
            @click="soAguardando = !soAguardando"
          >
            <span class="rotulo-coluna">Aguardando boleto</span>
            <strong class="text-mono" :class="totais.aguardando.quantidade ? 'text-warning' : ''" style="font-size: 22px">
              {{ brl(totais.aguardando.total) }}
            </strong>
            <span class="texto-apoio">{{ totais.aguardando.quantidade }} nota(s), todos os meses</span>
          </button>
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
        :no-data-label="erro || (soAguardando ? 'Nenhuma nota aguardando boleto.' : 'Nenhuma nota neste mês.')"
      >
        <template #body-cell-forma="props">
          <q-td :props="props">
            {{ ROTULO_FORMA[formaDaNota(props.row)] || FORMAS_API[props.row.forma] || props.row.forma }}
            <span v-if="props.row.credito_devolucao" class="text-mono text-grey-8 q-ml-xs">· −{{ brl(props.row.credito_devolucao) }}</span>
            <span v-if="props.row.cartao_final" class="text-mono text-grey-8 q-ml-xs">•••• {{ props.row.cartao_final }}</span>
            <span v-if="props.row.boletos.length > 1" class="text-grey-8 q-ml-xs">· {{ props.row.boletos.length }}x</span>
            <span v-else-if="props.row.boletos.length" class="text-grey-8 q-ml-xs">· vence {{ dataBr(props.row.boletos[0].vencimento) }}</span>
            <q-badge v-if="props.row.paga_com_credito" color="green-1" text-color="positive" class="q-ml-xs">Paga com crédito</q-badge>
            <q-badge v-else-if="props.row.aguardando_boleto" color="warning" text-color="dark" class="q-ml-xs">Aguardando boleto</q-badge>
            <q-badge v-else-if="props.row.fatura && !props.row.fatura.da_nota" color="blue-1" text-color="blue-10" class="q-ml-xs">
              Fatura nº {{ props.row.fatura.numero }}
            </q-badge>
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
import { num, brl, dec, dataBr } from '@/utils/formato'
import MesSeletor from '@/components/MesSeletor.vue'
import CampoData from '@/components/CampoData.vue'
import ParcelasBoleto from '@/components/ParcelasBoleto.vue'

const $q = useQuasar()
const auth = useAuthStore()
const store = useOficinaStore()
const ehAdmin = computed(() => auth.usuario?.papel === 'admin')

const mes = ref(mesAtual())
const notas = ref([])
const totaisVazios = () => ({ quantidade: 0, total: 0, credito: 0, boleto: 0, aguardando: { quantidade: 0, total: 0 } })
const totais = ref(totaisVazios())
const soAguardando = ref(false)
const carregando = ref(false)
const erro = ref('')

// "Boleto agrupado" e "Boleto c/ crédito" só existem na tela:
// para a API, agrupado é boleto que aguarda a fatura (boleto_depois) e c/ crédito é boleto com credito_devolucao
const AGRUPADO = 'boleto_agrupado'
const COM_CREDITO = 'boleto_credito'
const temBoletoProprio = (forma) => forma === 'boleto' || forma === COM_CREDITO
const ehBoleto = (forma) => temBoletoProprio(forma) || forma === AGRUPADO
const opcoesForma = Object.entries(FORMAS_NOTA).flatMap(([value, label]) =>
  value === 'boleto'
    ? [
        { value, label },
        { value: COM_CREDITO, label: 'Boleto c/ crédito (devolução)' },
        { value: AGRUPADO, label: 'Boleto agrupado (vem depois)' }
      ]
    : [{ value, label }]
)
// aguardando boleto ou numa fatura agrupada; boleto da nota com desconto de devolução
const formaDaNota = (nota) => {
  if (nota.forma !== 'boleto') return nota.forma
  if (nota.aguardando_boleto || (nota.fatura && !nota.fatura.da_nota)) return AGRUPADO
  return nota.credito_devolucao ? COM_CREDITO : 'boleto'
}
const ROTULO_FORMA = { [AGRUPADO]: 'Boleto agrupado', [COM_CREDITO]: 'Boleto c/ crédito' }
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
    const r = await listarNotas(soAguardando.value ? { aguardando: 1 } : { mes: mes.value })
    notas.value = r.data
    totais.value = r.totais
  } catch (e) {
    notas.value = []
    totais.value = totaisVazios()
    erro.value = mensagemDeErro(e)
  } finally {
    carregando.value = false
  }
}

watch([mes, soAguardando], carregar)
onMounted(carregar)

// ---- formulário (no topo da página)
const formAberto = ref(false)
const editandoId = ref(null)
const salvando = ref(false)
const erroForm = ref('')

const formVazio = () => ({
  data_emissao: dataBr(),
  fornecedor_id: null,
  numero_nf: '',
  requisicao: '',
  valor_total: '',
  forma: 'boleto',
  cartao_final: '',
  credito: '',
  fatura: null,
  // a emissão da parcela começa igual à da nota (vazia) para acompanhá-la quando a nota for preenchida
  boletos: [{ data_emissao: '', vencimento: '', valor: '' }]
})
const form = ref(formVazio())

// o que sai em boleto: a nota inteira, ou a nota menos o crédito de devolução
const valorBoleto = computed(() => {
  const total = num(form.value.valor_total)
  return form.value.forma === COM_CREDITO ? Math.max(0, Math.round((total - num(form.value.credito)) * 100) / 100) : total
})
// o crédito de devolução cobre a nota inteira: não tem boleto
const quitadaComCredito = computed(() => form.value.forma === COM_CREDITO && num(form.value.credito) > 0 && valorBoleto.value === 0)

const nomeFornecedor = computed(() => store.fornecedores.find((f) => f.id === form.value.fornecedor_id)?.nome)

// nota numa fatura agrupada: fornecedor, valor e forma ficam presos à fatura
const naFaturaAgrupada = computed(() => !!form.value.fatura && !form.value.fatura.da_nota)

function limpar() {
  form.value = formVazio()
  editandoId.value = null
  erroForm.value = ''
}

function editar(nota) {
  editandoId.value = nota.id
  erroForm.value = ''
  const boletos = nota.boletos.length
    ? nota.boletos.map((b) => ({ data_emissao: b.data_emissao || nota.data_emissao, vencimento: b.vencimento, valor: dec(b.valor) }))
    : [{ data_emissao: nota.data_emissao, vencimento: '', valor: dec(nota.valor_total - (nota.credito_devolucao || 0)) }]
  form.value = {
    data_emissao: nota.data_emissao,
    fornecedor_id: nota.fornecedor_id,
    numero_nf: nota.numero_nf || '',
    requisicao: nota.requisicao || '',
    valor_total: dec(nota.valor_total),
    forma: formaDaNota(nota),
    cartao_final: nota.cartao_final || '',
    credito: nota.credito_devolucao ? dec(nota.credito_devolucao) : '',
    fatura: nota.fatura,
    boletos
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
  // parcelas só no boleto da própria nota (e se o crédito não cobrir a nota toda)
  const comCredito = f.forma === COM_CREDITO
  const boleto = temBoletoProprio(f.forma) && !quitadaComCredito.value
  if (ehBoleto(f.forma) && !f.fornecedor_id) {
    erroForm.value = 'No boleto, escolha o fornecedor.'
    return
  }
  if (comCredito && (num(f.credito) <= 0 || num(f.credito) > num(f.valor_total))) {
    erroForm.value = 'Informe o crédito de devolução: maior que zero e até o valor total da nota.'
    return
  }
  if (boleto && f.boletos.some((b) => !b.vencimento || b.valor === '')) {
    erroForm.value = 'Preencha o vencimento e o valor de todas as parcelas do boleto.'
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
      credito_devolucao: comCredito ? num(f.credito) : null,
      forma: ehBoleto(f.forma) ? 'boleto' : f.forma,
      cartao_final: f.forma === 'credito' ? f.cartao_final || null : null,
      boleto_depois: f.forma === AGRUPADO,
      boletos: boleto ? f.boletos.map((b) => ({ data_emissao: b.data_emissao || null, vencimento: b.vencimento, valor: num(b.valor) })) : null
    })
    const msg = editandoId.value ? 'Nota alterada.' : 'Nota salva.'
    const extra = f.boletos.length > 1 ? ' As ' + f.boletos.length + ' parcelas estão em Contas a pagar.' : ' O boleto está em Contas a pagar.'
    const aguardando =
      f.forma === AGRUPADO && !naFaturaAgrupada.value
        ? ' Ela fica aguardando boleto.'
        : comCredito
          ? ' Paga com o crédito de devolução, sem boleto.'
          : ''
    $q.notify({ message: msg + (boleto ? extra : aguardando), color: 'positive', icon: 'check' })
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
  if (nota.fatura && !nota.fatura.da_nota) {
    $q.notify({
      message: 'Esta nota está na fatura nº ' + nota.fatura.numero + '. Tire a nota da fatura (em Financeiro > Faturas) antes de excluir.',
      color: 'warning',
      textColor: 'dark',
      position: 'top'
    })
    return
  }
  $q.dialog({
    title: 'Excluir nota ' + (nota.numero_nf || 'sem número') + '?',
    message:
      (nota.fornecedor_nome ? nota.fornecedor_nome + ' · ' : '') +
      brl(nota.valor_total) +
      '.' +
      (nota.boletos.length ? ' O boleto também sai de Contas a pagar.' : '') +
      ' Não dá para desfazer.',
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

<style lang="scss" scoped>
.cartao-aguardando {
  border: 1px solid transparent;
  font: inherit;
  color: inherit;

  &[aria-pressed='true'] {
    border-color: var(--q-warning);
  }
}
</style>
