<template>
  <q-page padding>
    <div v-if="!os" class="row justify-center q-pa-xl">
      <q-spinner size="32px" color="primary" />
    </div>

    <div v-else class="pagina">
      <!-- Barra de topo -->
      <div class="row items-center q-gutter-sm">
        <q-btn outline no-caps color="grey-8" icon="chevron_left" label="Orçamentos" to="/orcamentos" />
        <h1 class="titulo-pagina col" style="font-size: 26px; margin-left: 12px">
          Orçamento <span class="text-mono">{{ numeroOS(os.numero) || 'novo' }}</span>
          <span v-if="alterado" class="text-grey-7 text-weight-regular q-ml-sm" style="font-size: 14px">· não salvo</span>
        </h1>
        <q-select v-model="os.status" :options="STATUS" label="Status" outlined dense style="width: 170px" />
        <q-btn outline no-caps color="grey-8" icon="print" label="Imprimir" :disable="!os.numero" @click="impressaoAberta = true">
          <q-tooltip v-if="!os.numero">Salve a O.S antes de imprimir</q-tooltip>
        </q-btn>
        <q-btn
          v-if="os.numero && ehAdmin"
          outline
          no-caps
          color="negative"
          icon="delete_outline"
          label="Excluir"
          :loading="excluindo"
          @click="excluir"
        />
        <q-btn unelevated no-caps color="primary" label="Salvar O.S" :loading="salvando" @click="salvar" />
      </div>

      <!-- Cabeçalho -->
      <section class="cartao q-pa-md column q-gutter-y-md" aria-label="Cabeçalho">
        <h2 class="titulo-secao">Cabeçalho</h2>
        <div class="row q-col-gutter-sm">
          <q-input :model-value="numeroOS(os.numero) || 'novo'" label="Nº da O.S" readonly outlined dense input-class="text-mono" class="col-6 col-sm-3 col-md-1" />
          <q-input v-model="os.data" type="date" label="Data" stack-label outlined dense class="col-6 col-sm-3 col-md-2" />
          <q-input
            :model-value="os.cliente"
            label="Cliente"
            placeholder="Nome do cliente"
            autocomplete="off"
            outlined
            dense
            class="col-12 col-sm-6 col-md-4"
            @update:model-value="digitarCliente"
            @blur="fecharSugestoes"
          >
            <q-menu v-model="menuClientes" no-parent-event no-focus no-refocus fit :offset="[0, 4]">
              <q-list dense style="min-width: 280px">
                <q-item v-for="c in sugestoesCliente" :key="c.id" clickable @mousedown.prevent @click="escolherCliente(c)">
                  <q-item-section>
                    <q-item-label>{{ c.nome }}</q-item-label>
                    <q-item-label caption>
                      {{ store.tipoLabel(c.tipo_cliente_id) }}
                      <span v-if="c.veiculos.length"> · {{ c.veiculos.map((v) => v.placa).join(', ') }}</span>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-input>
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
            maxlength="8"
            input-class="text-mono text-uppercase"
            class="col-12 col-sm-3 col-md-1"
            :loading="buscandoPlaca"
            @blur="buscarPlaca"
          />
        </div>
        <div v-if="veiculosDoCliente.length > 1 && !os.placa" class="row items-center q-gutter-sm">
          <span class="texto-apoio">Veículos de {{ os.cliente }}:</span>
          <q-chip
            v-for="v in veiculosDoCliente"
            :key="v.id"
            clickable
            dense
            color="grey-3"
            text-color="grey-9"
            @click="usarVeiculo(v)"
          >
            <span class="text-mono q-mr-xs">{{ v.placa }}</span> {{ v.modelo }}
          </q-chip>
        </div>
        <p v-if="avisoPlaca" class="texto-apoio">{{ avisoPlaca }}</p>
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
            @click="alternarSalvos"
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
            <div v-if="carregandoSalvos" class="row justify-center q-pa-sm"><q-spinner color="primary" /></div>
            <p v-else-if="!salvos.length" class="texto-apoio">Nenhum serviço pré-salvo ainda.</p>
            <div
              v-for="sv in salvos"
              :key="sv.id"
              class="grade"
              style="grid-template-columns: minmax(0, 1fr) 90px auto 40px"
            >
              <q-input
                v-model="sv.desc"
                aria-label="Descrição do serviço pré-salvo"
                outlined
                dense
                bg-color="white"
                @change="atualizarSalvo(sv)"
              >
                <template v-if="sv.doVeiculo" #prepend>
                  <q-icon name="directions_car" size="18px" color="grey-7"><q-tooltip>Pré-salvo deste veículo</q-tooltip></q-icon>
                </template>
              </q-input>
              <q-input v-model="sv.horas" aria-label="Horas" outlined dense bg-color="white" input-class="text-right text-mono" @change="atualizarSalvo(sv)" />
              <q-btn outline no-caps color="grey-8" label="Usar" @click="usarSalvo(sv)" />
              <q-btn flat round dense icon="close" color="grey-8" aria-label="Excluir pré-salvo" @click="excluirSalvo(sv)" />
            </div>
            <div>
              <q-btn outline no-caps color="grey-8" label="Salvar serviços desta O.S como pré-salvos" @click="salvarComoPreSalvos" />
            </div>
          </div>
        </q-slide-transition>

        <div class="rolagem-x">
          <div :style="{ minWidth: mostrarTaxa ? '1000px' : '860px' }">
            <div class="grade grade-cabecalho" :style="{ gridTemplateColumns: colunasServicos }">
              <span class="rotulo-coluna">Descrição do serviço</span>
              <span class="rotulo-coluna">Tabela</span>
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
              <q-select
                :model-value="s.tabela"
                :options="opcoesTabela(s.tabela)"
                aria-label="Tabela de preço da hora"
                emit-value
                map-options
                outlined
                dense
                options-dense
                @update:model-value="(id) => escolherTabela(s, id)"
              />
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
          <section class="cartao q-pa-md column no-wrap q-gutter-y-md full-height" aria-label="Observações">
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
          <section class="cartao q-pa-md column no-wrap q-gutter-y-sm full-height" aria-label="Totais" style="font-size: 14px">
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
      :produto-id="produtoDialog.id"
      :inicial="produtoDialog.inicial"
      origem="orc"
      @salvo="produtoSalvo"
    />

    <ImprimirDialog
      v-if="os"
      v-model="impressaoAberta"
      :alvo="'O.S ' + (numeroOS(os.numero) || 'nova')"
      :tipo-cliente="os.tipo"
      :numeros="os.numero ? [os.numero] : []"
      :aviso="alterado ? 'Esta O.S tem alterações não salvas: o PDF sai com a última versão salva.' : ''"
    />
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useQuasar } from 'quasar'
import { useOficinaStore, STATUS, FORMAS_PAGAMENTO } from '@/stores/oficina'
import { mensagemDeErro } from '@/boot/axios'
import { useAuthStore } from '@/stores/auth'
import {
  excluirOrdem,
  confirmarExclusao,
  obterOrdem,
  salvarOrdem,
  numeroOS,
  buscarClientes,
  veiculoPorPlaca,
  listarServicosSalvos,
  criarServicosSalvos,
  atualizarServicoSalvo,
  apagarServicoSalvo
} from '@/api/ordens'
import { num, brl, dec, pct } from '@/utils/formato'
import ProdutoDialog from '@/components/ProdutoDialog.vue'
import ImprimirDialog from '@/components/ImprimirDialog.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const store = useOficinaStore()
const auth = useAuthStore()
const ehAdmin = computed(() => auth.usuario?.papel === 'admin')
const excluindo = ref(false)

// cópia local da O.S; só vai para o banco ao clicar em Salvar
const os = ref(null)
const original = ref('')
const salvando = ref(false)
const salvosAbertos = ref(false)
const impressaoAberta = ref(false)
const produtoDialog = reactive({ aberto: false, id: null, inicial: {}, peca: null })

// ---- cliente e veículo
const sugestoesCliente = ref([])
const menuClientes = ref(false)
const veiculosDoCliente = ref([])
const buscandoPlaca = ref(false)
const avisoPlaca = ref('')

// ---- serviços pré-salvos
const salvos = ref([])
const carregandoSalvos = ref(false)

const alterado = computed(() => !!os.value && JSON.stringify(os.value) !== original.value)

function usar(form) {
  os.value = form
  original.value = JSON.stringify(form)
  salvos.value = []
  salvosAbertos.value = false
  veiculosDoCliente.value = []
  avisoPlaca.value = ''
}

async function carregar(param) {
  if (!param) return
  if (param === 'nova') {
    if (!store.configCarregada) await store.carregarConfiguracoes().catch(() => {})
    usar(store.novaOrdem())
    return
  }
  const numero = parseInt(param, 10)
  // acabou de salvar uma O.S nova e a URL trocou de "nova" para o número: já está carregada
  if (os.value && os.value.numero === numero) return
  os.value = null
  try {
    usar(await obterOrdem(numero))
  } catch (e) {
    $q.notify({ message: mensagemDeErro(e), color: 'negative' })
    router.replace('/orcamentos')
  }
}

watch(() => route.params.id, carregar, { immediate: true })

// parcelas acompanham o total enquanto ninguém mexeu nelas à mão
// (se a soma batia com o total anterior, refaz; se foi ajustada, deixa como está)
watch(
  () => [os.value, os.value ? store.totais(os.value).totalCliente : 0],
  ([osAtual, total], [osAntes, totalAntes]) => {
    if (!osAtual || osAtual !== osAntes || Math.abs(total - totalAntes) < 0.005) return
    const soma = osAtual.pagamento.lista.reduce((a, p) => a + num(p.valor), 0)
    if (Math.abs(soma - totalAntes) < 0.01) recalcularParcelas()
  }
)

// tipos ativos; o da O.S entra mesmo se tiver sido desativado depois
const opcoesTipo = computed(() =>
  store.tiposCliente
    .filter((t) => t.ativo || t.id === os.value?.tipo)
    .map((t) => ({ value: t.id, label: t.nome + (t.ativo ? '' : ' (desativado)') }))
)

// tabelas de preço ativas (+ a já usada no serviço, se tiver sido desativada)
function opcoesTabela(atual) {
  return [
    ...store.tabelasPreco
      .filter((t) => t.ativo || t.id === atual)
      .map((t) => ({ value: t.id, label: t.nome + ' · R$ ' + t.preco + (t.ativo ? '' : ' (desativada)') })),
    { value: null, label: 'Preço à mão' }
  ]
}

// escolher a tabela preenche o preço da hora (que continua editável)
function escolherTabela(s, id) {
  s.tabela = id
  const t = store.tabelaPreco(id)
  if (t) s.ph = t.preco
}

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
    ? 'minmax(240px, 3fr) 170px 80px 110px 120px 140px 40px'
    : 'minmax(240px, 3fr) 170px 80px 110px 120px 40px'
)

const somaParcelas = computed(() => os.value.pagamento.lista.reduce((a, p) => a + num(p.valor), 0))
const diferencaParcelas = computed(() => Math.abs(somaParcelas.value - T.value.totalCliente) > 0.009)

// ---- cliente e veículo
// sugestões enquanto digita; o texto digitado vale como cliente novo até escolher um da lista
let buscaClienteTimer = null

function digitarCliente(texto) {
  os.value.cliente = texto || ''
  os.value.clienteId = null
  veiculosDoCliente.value = []
  clearTimeout(buscaClienteTimer)
  if (!texto || texto.trim().length < 2) {
    menuClientes.value = false
    return
  }
  buscaClienteTimer = setTimeout(async () => {
    try {
      sugestoesCliente.value = await buscarClientes(texto.trim())
      menuClientes.value = sugestoesCliente.value.length > 0
    } catch {
      menuClientes.value = false
    }
  }, 300)
}

function fecharSugestoes() {
  clearTimeout(buscaClienteTimer)
  menuClientes.value = false
}

function escolherCliente(c) {
  menuClientes.value = false
  os.value.cliente = c.nome
  os.value.clienteId = c.id
  if (c.tipo_cliente_id && c.tipo_cliente_id !== os.value.tipo) mudarTipo(c.tipo_cliente_id)
  veiculosDoCliente.value = c.veiculos
  if (!os.value.placa && c.veiculos.length === 1) usarVeiculo(c.veiculos[0])
}

function usarVeiculo(v) {
  os.value.placa = v.placa
  os.value.veiculo = v.modelo
  os.value.veiculoId = v.id
  avisoPlaca.value = ''
}

// ao sair do campo placa: se já está cadastrada, completa o veículo e (se vazio) o cliente
async function buscarPlaca() {
  const placa = (os.value.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  os.value.placa = placa
  avisoPlaca.value = ''
  if (placa.length !== 7) {
    os.value.veiculoId = null
    if (placa) avisoPlaca.value = 'A placa precisa ter 7 letras e números (ex.: AAA0A00).'
    return
  }
  buscandoPlaca.value = true
  try {
    const v = await veiculoPorPlaca(placa)
    if (!v) {
      os.value.veiculoId = null
      avisoPlaca.value = 'Placa nova: o veículo será cadastrado ao salvar a O.S.'
      return
    }
    os.value.veiculoId = v.id
    if (!os.value.veiculo) os.value.veiculo = v.modelo
    if (!os.value.cliente) {
      os.value.cliente = v.cliente.nome
      os.value.clienteId = v.cliente.id
      if (v.cliente.tipo_cliente_id !== os.value.tipo) mudarTipo(v.cliente.tipo_cliente_id)
    } else if (os.value.clienteId && os.value.clienteId !== v.cliente.id) {
      avisoPlaca.value = 'Este veículo está cadastrado para ' + v.cliente.nome + '.'
    }
  } catch {
    // sem a busca ainda dá para digitar tudo à mão
  } finally {
    buscandoPlaca.value = false
  }
}

// ---- peças
function adicionarPeca() {
  os.value.pecas.push({ nome: '', codigo: '', qtd: '1', unit: '', est: null })
}

function abrirEstoque(i) {
  // peça ligada a um produto (est = id do produto) abre o cadastro dele;
  // senão abre um produto novo já com o nome e o código digitados
  const p = os.value.pecas[i]
  produtoDialog.id = p.est || null
  produtoDialog.inicial = { nome: p.nome, codigo: p.codigo }
  produtoDialog.peca = i
  produtoDialog.aberto = true
}

function produtoSalvo(produto) {
  Object.assign(os.value.pecas[produtoDialog.peca], {
    nome: produto.nome,
    codigo: produto.codigo,
    unit: dec(produto.preco_venda),
    est: produto.id
  })
  store.carregarResumoEstoque()
  $q.notify({ message: 'Produto salvo e preço atualizado na O.S.', color: 'dark' })
}

// ---- serviços e pré-salvos
function adicionarServico() {
  os.value.servicos.push(store.servico('', ''))
}

async function carregarSalvos() {
  carregandoSalvos.value = true
  try {
    salvos.value = await listarServicosSalvos(os.value.veiculoId)
  } catch (e) {
    $q.notify({ message: mensagemDeErro(e), color: 'negative' })
  } finally {
    carregandoSalvos.value = false
  }
}

function alternarSalvos() {
  salvosAbertos.value = !salvosAbertos.value
  if (salvosAbertos.value) carregarSalvos()
}

function usarSalvo(sv) {
  os.value.servicos.push(store.servico(sv.desc, sv.horas))
}

async function atualizarSalvo(sv) {
  try {
    await atualizarServicoSalvo(sv)
  } catch (e) {
    $q.notify({ message: mensagemDeErro(e), color: 'negative' })
  }
}

async function excluirSalvo(sv) {
  try {
    await apagarServicoSalvo(sv.id)
    salvos.value = salvos.value.filter((x) => x.id !== sv.id)
  } catch (e) {
    $q.notify({ message: mensagemDeErro(e), color: 'negative' })
  }
}

async function salvarComoPreSalvos() {
  const novos = os.value.servicos.filter((s) => s.desc.trim())
  if (!novos.length) return
  try {
    // ficam ligados ao veículo quando a O.S já tem um veículo cadastrado
    await criarServicosSalvos(novos, os.value.veiculoId)
    $q.notify({ message: 'Serviços salvos como pré-salvos.', color: 'dark' })
    if (salvosAbertos.value) carregarSalvos()
  } catch (e) {
    $q.notify({ message: mensagemDeErro(e), color: 'negative' })
  }
}

// ---- pagamento
function recalcularParcelas() {
  os.value.pagamento.lista = store.gerarParcelas(os.value)
}

function mudarTipo(tipo) {
  os.value.tipo = tipo
  // tipo novo: vale a taxa de hoje desse tipo
  os.value.taxa = store.tiposCliente.find((t) => t.id === tipo)?.taxa ?? '0'
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
async function salvar() {
  if (!os.value.cliente.trim()) {
    $q.notify({ message: 'Informe o cliente.', color: 'negative', position: 'top' })
    return
  }
  salvando.value = true
  try {
    const nova = !os.value.numero
    const salva = await salvarOrdem(os.value)
    usar(salva)
    store.carregarResumoEstoque()
    $q.notify({ message: 'O.S ' + numeroOS(salva.numero) + ' salva.', color: 'positive', icon: 'check' })
    if (nova) router.replace('/orcamentos/' + numeroOS(salva.numero))
  } catch (e) {
    $q.notify({ message: mensagemDeErro(e), color: 'negative', timeout: 6000, position: 'top' })
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  if (!(await confirmarExclusao($q, 'a O.S ' + numeroOS(os.value.numero)))) return
  excluindo.value = true
  try {
    await excluirOrdem(os.value.numero)
    const numero = numeroOS(os.value.numero)
    original.value = JSON.stringify(os.value) // já foi excluída: não perguntar "sair sem salvar?"
    store.carregarResumoEstoque()
    $q.notify({ message: 'O.S ' + numero + ' excluída.', color: 'dark' })
    router.replace('/orcamentos')
  } catch (e) {
    $q.notify({ message: mensagemDeErro(e), color: 'negative', position: 'top' })
  } finally {
    excluindo.value = false
  }
}

// avisa antes de sair com alterações não salvas
onBeforeRouteLeave(() => {
  if (!alterado.value) return true
  return new Promise((resolve) => {
    $q.dialog({
      title: 'Sair sem salvar?',
      message: 'As alterações nesta O.S vão ser perdidas.',
      ok: { label: 'Sair sem salvar', color: 'negative', unelevated: true, noCaps: true },
      cancel: { label: 'Continuar editando', flat: true, noCaps: true, color: 'grey-8' },
      persistent: true
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
  })
})

function avisoAoFechar(e) {
  if (alterado.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
window.addEventListener('beforeunload', avisoAoFechar)
onBeforeUnmount(() => window.removeEventListener('beforeunload', avisoAoFechar))
</script>
