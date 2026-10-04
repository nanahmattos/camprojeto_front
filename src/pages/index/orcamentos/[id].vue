<template>
  <q-page padding>
    <div v-if="os" class="pagina">
      <!-- Barra de topo -->
      <div class="row items-center q-gutter-sm">
        <q-btn outline no-caps color="grey-8" icon="chevron_left" label="Orçamentos" to="/orcamentos" />
        <h1 class="titulo-pagina col" style="font-size: 26px">
          Orçamento <span class="text-mono">{{ os.id || 'novo' }}</span>
        </h1>
        <q-select v-model="os.status" :options="STATUS" label="Status" outlined dense style="width: 170px" />
        <q-btn outline no-caps color="grey-8" icon="print" label="Imprimir" @click="impressaoAberta = true" />
        <q-btn unelevated no-caps color="primary" label="Salvar O.S" @click="salvar" />
      </div>

      <!-- Cabeçalho -->
      <section class="cartao q-pa-md column q-gutter-y-md" aria-label="Cabeçalho">
        <h2 class="titulo-secao">Cabeçalho</h2>
        <div class="row q-col-gutter-sm">
          <q-input :model-value="os.id || 'novo'" label="Nº da O.S" readonly outlined dense input-class="text-mono" class="col-6 col-sm-3 col-md-1" />
          <q-input v-model="os.data" type="date" label="Data" stack-label outlined dense class="col-6 col-sm-3 col-md-2" />
          <q-input v-model="os.cliente" label="Cliente" placeholder="Nome do cliente" outlined dense class="col-12 col-sm-6 col-md-4" />
          <q-select
            :model-value="os.tipo"
            :options="opcoesTipo"
            label="Tipo de cliente"
            emit-value
            map-options
            outlined
            dense
            class="col-12 col-sm-4 col-md-2"
            @update:model-value="mudarTipo"
          />
          <q-input v-model="os.veiculo" label="Veículo / modelo" placeholder="Ex.: Sprinter 415 CDI" outlined dense class="col-12 col-sm-5 col-md-2" />
          <q-input
            v-model="os.placa"
            label="Placa"
            placeholder="AAA0A00"
            outlined
            dense
            maxlength="7"
            input-class="text-mono text-uppercase"
            class="col-12 col-sm-3 col-md-1"
          />
        </div>
        <p v-if="mostrarTaxa" class="aviso-taxa">
          Cliente <strong>{{ store.tipoLabel(os.tipo) }}</strong>: acréscimo de <strong>{{ textoTaxa }}</strong> sobre o
          valor de venda. Aparece como coluna extra nas peças e serviços e na impressão para o cliente.
        </p>
        <p v-else class="texto-apoio">{{ store.tipoLabel(os.tipo) }}: sem acréscimo de tipo de cliente.</p>
      </section>

      <!-- Peças -->
      <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Peças">
        <div class="row items-center justify-between">
          <h2 class="titulo-secao">Peças</h2>
          <q-btn outline no-caps color="grey-8" icon="add" label="Adicionar peça" @click="adicionarPeca" />
        </div>
        <div class="rolagem-x">
          <div :style="{ minWidth: mostrarTaxa ? '1000px' : '860px' }">
            <div class="grade grade-cabecalho" :style="{ gridTemplateColumns: colunasPecas }">
              <span class="rotulo-coluna">Nome do produto</span>
              <span class="rotulo-coluna">Código</span>
              <span class="rotulo-coluna text-right">Qtd</span>
              <span class="rotulo-coluna text-right">Valor unit.</span>
              <span class="rotulo-coluna text-right">Valor total</span>
              <span v-if="mostrarTaxa" class="rotulo-coluna text-right texto-taxa">Total {{ store.tipoLabel(os.tipo) }} {{ textoTaxa }}</span>
              <span></span>
              <span></span>
            </div>
            <div
              v-for="(p, i) in os.pecas"
              :key="'p' + i"
              class="grade q-py-xs"
              :style="{ gridTemplateColumns: colunasPecas }"
            >
              <q-input v-model="p.nome" placeholder="Nome do produto" aria-label="Nome do produto" outlined dense />
              <q-input v-model="p.codigo" placeholder="Código" aria-label="Código" outlined dense input-class="text-mono" />
              <q-input v-model="p.qtd" aria-label="Quantidade" inputmode="decimal" outlined dense input-class="text-right text-mono" />
              <q-input v-model="p.unit" placeholder="0,00" aria-label="Valor unitário" inputmode="decimal" outlined dense input-class="text-right text-mono" />
              <q-input :model-value="dec(num(p.qtd) * num(p.unit))" aria-label="Valor total" readonly outlined dense bg-color="grey-2" input-class="text-right text-mono" />
              <q-input
                v-if="mostrarTaxa"
                :model-value="dec(num(p.qtd) * num(p.unit) * fatorTaxa)"
                aria-label="Total com taxa do tipo de cliente"
                readonly
                outlined
                dense
                class="campo-taxa"
                input-class="text-right text-mono"
              />
              <q-btn outline no-caps color="grey-8" icon="inventory_2" label="Estoque" size="13px" aria-label="Abrir estoque desta peça" @click="abrirEstoque(i)" />
              <q-btn flat round dense icon="close" color="grey-8" aria-label="Remover peça" @click="os.pecas.splice(i, 1)" />
            </div>
          </div>
        </div>
        <div class="row justify-end q-gutter-lg" style="font-size: 14px">
          <span class="text-grey-8">Subtotal peças <strong class="text-mono text-dark">{{ brl(T.pecas) }}</strong></span>
          <span v-if="mostrarTaxa" class="texto-taxa">Com taxa <strong class="text-mono">{{ brl(T.pecas * fatorTaxa) }}</strong></span>
        </div>
      </section>

      <!-- Serviços -->
      <section class="cartao q-pa-md column q-gutter-y-sm" aria-label="Serviços">
        <div class="row items-center q-gutter-sm">
          <h2 class="titulo-secao col">Serviços</h2>
          <q-btn
            outline
            no-caps
            color="grey-8"
            icon="edit"
            label="Serviços pré-salvos"
            :aria-expanded="salvosAbertos"
            @click="salvosAbertos = !salvosAbertos"
          />
          <q-btn outline no-caps color="grey-8" icon="add" label="Adicionar serviço" @click="adicionarServico" />
        </div>

        <q-slide-transition>
          <div
            v-show="salvosAbertos"
            class="column q-gutter-y-sm q-pa-md"
            style="border: 1px solid #e9c9ae; background: #fdf8f3; border-radius: 8px"
          >
            <div class="row items-baseline q-gutter-x-sm">
              <strong style="font-size: 14px">Pré-salvos para {{ os.veiculo || '[veículo]' }} · {{ os.placa || '[placa]' }}</strong>
              <span class="text-grey-8" style="font-size: 12px">Edite aqui; clique em Usar para incluir no orçamento.</span>
            </div>
            <div
              v-for="(sv, i) in store.servicosSalvos"
              :key="'sv' + i"
              class="grade"
              style="grid-template-columns: minmax(0, 1fr) 90px auto 40px"
            >
              <q-input v-model="sv.desc" aria-label="Descrição do serviço pré-salvo" outlined dense bg-color="white" />
              <q-input v-model="sv.horas" aria-label="Horas" outlined dense bg-color="white" input-class="text-right text-mono" />
              <q-btn outline no-caps color="grey-8" label="Usar" @click="usarSalvo(sv)" />
              <q-btn flat round dense icon="close" color="grey-8" aria-label="Excluir pré-salvo" @click="store.servicosSalvos.splice(i, 1)" />
            </div>
            <div>
              <q-btn outline no-caps color="grey-8" label="Salvar serviços desta O.S como pré-salvos" @click="salvarComoPreSalvos" />
            </div>
          </div>
        </q-slide-transition>

        <div class="rolagem-x">
          <div :style="{ minWidth: mostrarTaxa ? '820px' : '680px' }">
            <div class="grade grade-cabecalho" :style="{ gridTemplateColumns: colunasServicos }">
              <span class="rotulo-coluna">Descrição do serviço</span>
              <span class="rotulo-coluna text-right">Horas</span>
              <span class="rotulo-coluna text-right">Preço hora</span>
              <span class="rotulo-coluna text-right">Total</span>
              <span v-if="mostrarTaxa" class="rotulo-coluna text-right texto-taxa">Total {{ store.tipoLabel(os.tipo) }} {{ textoTaxa }}</span>
              <span></span>
            </div>
            <div
              v-for="(s, i) in os.servicos"
              :key="'s' + i"
              class="grade q-py-xs"
              :style="{ gridTemplateColumns: colunasServicos }"
            >
              <q-input v-model="s.desc" placeholder="Descrição do serviço" aria-label="Descrição do serviço" outlined dense />
              <q-input v-model="s.horas" placeholder="0" aria-label="Horas" inputmode="decimal" outlined dense input-class="text-right text-mono" />
              <q-input v-model="s.ph" aria-label="Preço hora" inputmode="decimal" outlined dense input-class="text-right text-mono" />
              <q-input :model-value="dec(num(s.horas) * num(s.ph))" aria-label="Total do serviço" readonly outlined dense bg-color="grey-2" input-class="text-right text-mono" />
              <q-input
                v-if="mostrarTaxa"
                :model-value="dec(num(s.horas) * num(s.ph) * fatorTaxa)"
                aria-label="Total com taxa do tipo de cliente"
                readonly
                outlined
                dense
                class="campo-taxa"
                input-class="text-right text-mono"
              />
              <q-btn flat round dense icon="close" color="grey-8" aria-label="Remover serviço" @click="os.servicos.splice(i, 1)" />
            </div>
          </div>
        </div>
        <div class="row justify-end q-gutter-lg" style="font-size: 14px">
          <span class="text-grey-8">Subtotal serviços <strong class="text-mono text-dark">{{ brl(T.servicos) }}</strong></span>
          <span v-if="mostrarTaxa" class="texto-taxa">Com taxa <strong class="text-mono">{{ brl(T.servicos * fatorTaxa) }}</strong></span>
        </div>
      </section>

      <!-- Observações + Totais -->
      <div class="row q-col-gutter-md items-stretch">
        <div class="col-12 col-md-8">
          <section class="cartao q-pa-md column q-gutter-y-md full-height" aria-label="Observações">
            <q-input
              v-model="os.obsAnalise"
              type="textarea"
              autogrow
              label="Observações pós análise / execução"
              placeholder="O que foi encontrado e o que foi feito no veículo"
              outlined
              input-style="min-height: 80px"
            />
            <q-input
              v-model="os.obsInterna"
              type="textarea"
              autogrow
              label="Observações internas"
              hint="Não saem na impressão do cliente nem do técnico."
              placeholder="Anotações da oficina"
              outlined
              bg-color="grey-1"
              input-style="min-height: 80px"
            />
            <div class="row q-col-gutter-sm items-center">
              <div class="col-12 col-sm-auto">
                <q-btn-toggle
                  :model-value="os.desconto.tipo"
                  :options="[
                    { label: 'R$', value: 'valor' },
                    { label: '%', value: 'pct' }
                  ]"
                  no-caps
                  unelevated
                  toggle-color="dark"
                  color="grey-3"
                  text-color="grey-9"
                  aria-label="Tipo de desconto"
                  @update:model-value="mudarTipoDesconto"
                />
              </div>
              <q-input
                :model-value="os.desconto.valor"
                label="Desconto"
                :placeholder="os.desconto.tipo === 'pct' ? '0' : '0,00'"
                :prefix="os.desconto.tipo === 'valor' ? 'R$' : undefined"
                :suffix="os.desconto.tipo === 'pct' ? '%' : undefined"
                inputmode="decimal"
                debounce="400"
                outlined
                dense
                clearable
                input-class="text-right text-mono"
                class="col-12 col-sm-4"
                @update:model-value="mudarDesconto"
              />
              <span v-if="T.desconto > 0" class="col-12 col-sm text-grey-8" style="font-size: 13px">
                − <strong class="text-mono text-dark">{{ brl(T.desconto) }}</strong> no total para o cliente
              </span>
            </div>
          </section>
        </div>
        <div class="col-12 col-md-4">
          <section class="cartao q-pa-md column q-gutter-y-sm full-height" aria-label="Totais" style="font-size: 14px">
            <h2 class="titulo-secao q-mb-xs">Totais</h2>
            <div class="row justify-between"><span class="text-grey-8">Peças</span><span class="text-mono">{{ brl(T.pecas) }}</span></div>
            <div class="row justify-between"><span class="text-grey-8">Serviços</span><span class="text-mono">{{ brl(T.servicos) }}</span></div>
            <div class="row justify-between q-pt-sm text-weight-bold" style="border-top: 1px solid #eceae4">
              <span>Total (preço padrão)</span><span class="text-mono">{{ brl(T.total) }}</span>
            </div>
            <div v-if="mostrarTaxa" class="row justify-between texto-taxa">
              <span>Acréscimo {{ store.tipoLabel(os.tipo) }} ({{ textoTaxa }})</span>
              <span class="text-mono">{{ brl(T.comTaxa - T.total) }}</span>
            </div>
            <div v-if="T.desconto > 0" class="row justify-between text-positive">
              <span>Desconto{{ os.desconto.tipo === 'pct' ? ' (' + pct(num(os.desconto.valor)) + ')' : '' }}</span>
              <span class="text-mono">− {{ brl(T.desconto) }}</span>
            </div>
            <q-space />
            <div class="row justify-between items-baseline q-pa-md bg-dark text-white" style="border-radius: 8px">
              <span class="text-weight-bold">Total para o cliente</span>
              <span class="text-mono text-weight-bold" style="font-size: 22px">{{ brl(T.totalCliente) }}</span>
            </div>
          </section>
        </div>
      </div>

      <!-- Pagamento -->
      <section class="cartao q-pa-md column q-gutter-y-md" aria-label="Pagamento">
        <h2 class="titulo-secao">Pagamento</h2>
        <div class="row q-col-gutter-sm items-center">
          <q-input
            :model-value="os.pagamento.parcelas"
            type="number"
            min="1"
            max="24"
            label="Nº de parcelas"
            outlined
            dense
            input-class="text-right text-mono"
            class="col-6 col-sm-3 col-md-2"
            @update:model-value="mudarParcelas"
          />
          <q-input
            :model-value="os.pagamento.data"
            type="date"
            label="Data (1ª parcela)"
            stack-label
            outlined
            dense
            class="col-6 col-sm-3 col-md-2"
            @update:model-value="mudarDataPagamento"
          />
          <q-input :model-value="dec(T.totalCliente)" label="Valor total" readonly outlined dense bg-color="grey-2" input-class="text-right text-mono" class="col-6 col-sm-3 col-md-2" />
          <q-select
            :model-value="os.pagamento.forma"
            :options="FORMAS_PAGAMENTO"
            label="Forma"
            outlined
            dense
            class="col-6 col-sm-3 col-md-2"
            @update:model-value="mudarForma"
          />
          <q-input v-model="os.pagamento.obs" label="Observações" placeholder="Ex.: empenho, combinado com o cliente" outlined dense class="col-12 col-sm-8 col-md-2" />
          <div class="col-12 col-sm-4 col-md-2">
            <q-btn outline no-caps color="grey-8" label="Recalcular parcelas" class="full-width" @click="recalcularParcelas" />
          </div>
        </div>

        <div class="rolagem-x">
          <div style="min-width: 760px">
            <div class="grade grade-cabecalho" style="grid-template-columns: 80px 170px 150px 160px minmax(0, 1fr)">
              <span class="rotulo-coluna">Parcela</span>
              <span class="rotulo-coluna">Data</span>
              <span class="rotulo-coluna text-right">Valor</span>
              <span class="rotulo-coluna">Forma</span>
              <span class="rotulo-coluna">Observações</span>
            </div>
            <div
              v-for="(pg, i) in os.pagamento.lista"
              :key="'pg' + i"
              class="grade q-py-xs"
              style="grid-template-columns: 80px 170px 150px 160px minmax(0, 1fr)"
            >
              <span class="text-mono text-weight-bold">{{ i + 1 }}/{{ os.pagamento.lista.length }}</span>
              <q-input v-model="pg.data" type="date" aria-label="Data da parcela" outlined dense />
              <q-input v-model="pg.valor" aria-label="Valor da parcela" inputmode="decimal" outlined dense input-class="text-right text-mono" />
              <q-select v-model="pg.forma" :options="FORMAS_PAGAMENTO" aria-label="Forma de pagamento" outlined dense />
              <q-input v-model="pg.obs" aria-label="Observação da parcela" outlined dense />
            </div>
          </div>
        </div>

        <div class="row justify-end items-center q-gutter-md" style="font-size: 14px">
          <q-chip v-if="diferencaParcelas" square icon="warning" color="red-1" text-color="negative" class="text-weight-bold">
            Soma das parcelas diferente do total
          </q-chip>
          <span class="text-grey-8">Soma das parcelas <strong class="text-mono text-dark">{{ brl(somaParcelas) }}</strong></span>
        </div>
      </section>
    </div>

    <ProdutoDialog
      v-model="produtoDialog.aberto"
      :produto="produtoDialog.produto"
      :indice="produtoDialog.indice"
      origem="orc"
      @salvo="produtoSalvo"
    />

    <ImprimirDialog
      v-if="os"
      v-model="impressaoAberta"
      :alvo="'O.S ' + (os.id || 'nova')"
      :tipo-cliente="os.tipo"
    />
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useOficinaStore, STATUS, FORMAS_PAGAMENTO } from '@/stores/oficina'
import { num, brl, dec, pct } from '@/utils/formato'
import ProdutoDialog from '@/components/ProdutoDialog.vue'
import ImprimirDialog from '@/components/ImprimirDialog.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const store = useOficinaStore()

// cópia local da O.S; só vai para a lista ao clicar em Salvar
const os = ref(null)
const salvosAbertos = ref(false)
const impressaoAberta = ref(false)
const produtoDialog = reactive({ aberto: false, produto: null, indice: null, peca: null })

function carregar(id) {
  if (!id) return
  const encontrada = id === 'nova' ? store.novaOrdem() : store.buscarOrdem(id)
  if (!encontrada) {
    $q.notify({ message: 'O.S ' + id + ' não encontrada.', color: 'negative' })
    router.replace('/orcamentos')
    return
  }
  os.value = encontrada
  salvosAbertos.value = false
}

watch(() => route.params.id, carregar, { immediate: true })

const opcoesTipo = computed(() => store.tiposCliente.map((t) => ({ value: t.id, label: t.nome })))

const T = computed(() => store.totais(os.value))
const mostrarTaxa = computed(() => T.value.taxa > 0)
const fatorTaxa = computed(() => 1 + T.value.taxa / 100)
const textoTaxa = computed(() => '+' + pct(T.value.taxa))

const colunasPecas = computed(() =>
  mostrarTaxa.value
    ? 'minmax(220px, 2.4fr) 110px 80px 120px 120px 140px 104px 40px'
    : 'minmax(220px, 2.4fr) 110px 80px 120px 120px 104px 40px'
)
const colunasServicos = computed(() =>
  mostrarTaxa.value
    ? 'minmax(260px, 3fr) 90px 120px 120px 140px 40px'
    : 'minmax(260px, 3fr) 90px 120px 120px 40px'
)

const somaParcelas = computed(() => os.value.pagamento.lista.reduce((a, p) => a + num(p.valor), 0))
const diferencaParcelas = computed(() => Math.abs(somaParcelas.value - T.value.totalCliente) > 0.009)

// ---- peças
function adicionarPeca() {
  os.value.pecas.push({ nome: '', codigo: '', qtd: '1', unit: '', est: null })
}

function abrirEstoque(i) {
  const p = os.value.pecas[i]
  const noEstoque = p.est !== null && p.est !== undefined
  produtoDialog.produto = noEstoque ? store.estoque[p.est] : store.novoProduto(p.nome, p.codigo)
  produtoDialog.indice = noEstoque ? p.est : null
  produtoDialog.peca = i
  produtoDialog.aberto = true
}

function produtoSalvo({ produto, indice }) {
  Object.assign(os.value.pecas[produtoDialog.peca], {
    nome: produto.nome,
    codigo: produto.codigo,
    unit: dec(store.precoVenda(produto)),
    est: indice
  })
  $q.notify({ message: 'Produto salvo e preço atualizado na O.S.', color: 'dark' })
}

// ---- serviços
function adicionarServico() {
  os.value.servicos.push({ desc: '', horas: '', ph: store.precoHoraPadrao })
}

function usarSalvo(sv) {
  os.value.servicos.push({ desc: sv.desc, horas: sv.horas, ph: store.precoHoraPadrao })
}

function salvarComoPreSalvos() {
  const novos = os.value.servicos.filter((s) => s.desc).map((s) => ({ desc: s.desc, horas: s.horas }))
  store.servicosSalvos.push(...novos)
  $q.notify({ message: 'Serviços salvos como pré-salvos.', color: 'dark' })
}

// ---- pagamento
function recalcularParcelas() {
  os.value.pagamento.lista = store.gerarParcelas(os.value)
}

function mudarTipo(tipo) {
  os.value.tipo = tipo
  recalcularParcelas()
}

function mudarDesconto(v) {
  os.value.desconto.valor = v ?? ''
  recalcularParcelas()
}

function mudarTipoDesconto(tipo) {
  os.value.desconto.tipo = tipo
  recalcularParcelas()
}

function mudarParcelas(v) {
  os.value.pagamento.parcelas = v
  if (parseInt(v, 10) > 0) recalcularParcelas()
}

function mudarDataPagamento(v) {
  os.value.pagamento.data = v
  recalcularParcelas()
}

function mudarForma(v) {
  os.value.pagamento.forma = v
  os.value.pagamento.lista.forEach((p) => (p.forma = v))
}

// ---- salvar
function salvar() {
  const nova = !os.value.id
  const id = store.salvarOrdem(os.value)
  os.value.id = id
  $q.notify({ message: 'O.S ' + id + ' salva.', color: 'dark' })
  if (nova) router.replace('/orcamentos/' + id)
}
</script>
