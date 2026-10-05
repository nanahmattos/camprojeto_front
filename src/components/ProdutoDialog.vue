<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @before-show="carregar"
  >
    <q-card style="width: 820px; max-width: 95vw">
      <q-card-section class="row items-center no-wrap q-gutter-sm">
        <h2 class="titulo-secao col" style="font-size: 19px">{{ titulo }}</h2>
        <span v-if="form && abaixoDoMinimo" class="etiqueta-repor">Repor estoque</span>
        <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
      </q-card-section>

      <q-separator />

      <div v-if="!form" class="row justify-center q-pa-xl">
        <q-spinner size="32px" color="primary" />
      </div>

      <q-card-section v-else class="column q-gutter-y-md">
        <q-banner v-if="erro" dense rounded class="bg-red-1 text-negative" role="alert">
          <template #avatar><q-icon name="error_outline" /></template>
          {{ erro }}
        </q-banner>

        <div class="row q-col-gutter-sm">
          <q-input v-model="form.nome" label="Nome do produto" outlined dense class="col-12 col-md-6" />
          <q-input v-model="form.codigo" label="Código" outlined dense input-class="text-mono" class="col-6 col-md-3" />
          <q-input v-model="form.marca" label="Marca" outlined dense class="col-6 col-md-3" />
          <q-input v-model="form.ncm" label="NCM" placeholder="0000.00.00" outlined dense input-class="text-mono" class="col-6 col-md-3" />
          <q-input
            v-model="form.qtd"
            :label="produtoId ? 'Quantidade em estoque' : 'Quantidade inicial'"
            inputmode="decimal"
            outlined
            dense
            input-class="text-right text-mono"
            class="col-6 col-md-3"
          />
          <q-input v-model="form.min" label="Qtd mínima" inputmode="decimal" outlined dense input-class="text-right text-mono" class="col-6 col-md-3" />
          <q-input v-model="form.max" label="Qtd máxima" inputmode="decimal" outlined dense input-class="text-right text-mono" class="col-6 col-md-3" />
          <p v-if="mudouQuantidade" class="col-12 texto-apoio">
            A diferença ({{ diferencaTexto }}) vai ficar registrada como ajuste no histórico do produto.
          </p>
        </div>

        <div class="cartao q-pa-md column" style="background: #faf9f6; gap: 16px">
          <div class="row q-col-gutter-sm items-center">
            <q-select
              v-model="form.fornecedor_id"
              :options="opcoesFornecedor"
              label="Fornecedor"
              emit-value
              map-options
              outlined
              dense
              bg-color="white"
              class="col-12 col-sm-6 col-md-4"
            />
            <q-input
              v-model="form.custo"
              label="Preço de custo (R$)"
              placeholder="0,00"
              inputmode="decimal"
              outlined
              dense
              bg-color="white"
              input-class="text-right text-mono"
              class="col-12 col-sm-6 col-md-3"
            />
            <div class="col-12 col-md-5">
              <div class="rotulo-coluna q-mb-xs">Encargos do fornecedor</div>
              <div class="row q-gutter-xs">
                <q-chip dense square color="grey-3" text-color="grey-9">{{ textoST }}</q-chip>
                <q-chip dense square color="grey-3" text-color="grey-9">Frete {{ pct(num(calc.fornecedor.frete)) }}</q-chip>
                <q-chip dense square color="grey-3" text-color="grey-9">Despesas {{ pct(num(calc.fornecedor.desp)) }}</q-chip>
              </div>
            </div>
          </div>

          <div class="row justify-between q-py-sm" style="border-top: 1px dashed #cfcbc3; border-bottom: 1px dashed #cfcbc3; font-size: 14px">
            <span class="text-grey-8">Custo efetivo (custo + {{ pct(calc.encargos) }} de encargos)</span>
            <strong class="text-mono">{{ brl(calc.efetivo) }}</strong>
          </div>

          <q-checkbox
            :model-value="form.auto !== false"
            label="Sugestão automática de preço"
            class="text-weight-bold"
            @update:model-value="setAuto"
          />

          <div v-if="form.auto !== false" class="row q-col-gutter-sm items-center">
            <q-input
              :model-value="margemExibida"
              label="Margem de lucro (%)"
              inputmode="decimal"
              outlined
              dense
              bg-color="white"
              input-class="text-right text-mono"
              class="col-12 col-sm-4 col-md-3"
              @update:model-value="(v) => (form.margem = v)"
            />
            <div class="col-12 col-sm-8 col-md-5 column" style="font-size: 13px">
              <span class="text-grey-8">
                Faixa: <strong class="text-dark">{{ store.faixaTexto(calc.faixa) }}</strong> · sugestão
                {{ String(calc.sugerida).replace('.', ',') }}%
              </span>
              <q-btn
                v-if="margemEditada"
                flat
                dense
                no-caps
                color="primary"
                class="self-start q-px-none"
                style="text-decoration: underline"
                label="Voltar para a margem sugerida"
                @click="form.margem = ''"
              />
            </div>
            <q-input
              :model-value="dec(calc.venda)"
              label="Valor de venda (R$)"
              readonly
              outlined
              dense
              bg-color="white"
              color="primary"
              input-class="text-right text-mono text-weight-bold"
              class="col-12 col-md-4"
            />
          </div>

          <div v-else class="row q-col-gutter-sm items-center">
            <q-input
              v-model="form.venda"
              label="Valor de venda (R$)"
              inputmode="decimal"
              outlined
              dense
              bg-color="white"
              input-class="text-right text-mono text-weight-bold"
              class="col-12 col-sm-5 col-md-4"
            />
            <span class="col-12 col-sm-7 col-md-8 text-grey-8" style="font-size: 13px">
              Preço digitado à mão. Margem resultante:
              <strong class="text-mono text-dark">{{ margemReal }}</strong>
            </span>
          </div>

          <div style="font-size: 13px" class="text-grey-8">
            Lucro por unidade: <strong class="text-mono text-dark">{{ brl(vendaFinal - calc.efetivo) }}</strong>
          </div>
        </div>

        <div v-if="produtoId" class="column q-gutter-y-xs">
          <div class="row items-baseline justify-between">
            <span class="rotulo-coluna">Últimas movimentações</span>
            <span class="text-grey-8" style="font-size: 12px">
              Criado em {{ form.criado || '—' }} · alterado em {{ form.alterado || '—' }}
            </span>
          </div>
          <p v-if="!movimentacoes.length" class="texto-apoio">Nenhuma movimentação ainda.</p>
          <q-markup-table v-else flat dense bordered separator="horizontal" class="tabela-oficina">
            <tbody>
              <tr v-for="m in movimentacoes" :key="m.id">
                <td class="text-grey-8" style="width: 120px">{{ m.criado_em }}</td>
                <td style="width: 90px">
                  <span class="chip-status" :class="classeMov(m)">{{ rotuloMov(m.tipo) }}</span>
                </td>
                <td class="text-right text-mono text-weight-bold" style="width: 80px">{{ sinalQtd(m) }}</td>
                <td class="ellipsis" style="max-width: 280px">
                  {{ m.observacao || '' }}<span v-if="m.os_numero"> · O.S {{ m.os_numero }}</span>
                </td>
                <td class="text-grey-8 text-right">{{ m.usuario || '' }}</td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn outline no-caps color="grey-8" label="Cancelar" v-close-popup />
        <q-btn
          unelevated
          no-caps
          color="primary"
          :label="origem === 'orc' ? 'Salvar e usar na O.S' : 'Salvar produto'"
          :loading="salvando"
          :disable="!form"
          @click="salvar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useOficinaStore } from '@/stores/oficina'
import { mensagemDeErro } from '@/boot/axios'
import { obterProduto, salvarProduto, listarMovimentacoes, paraForm, formNovo } from '@/api/produtos'
import { num, brl, dec, pct } from '@/utils/formato'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // id do produto a editar; null = produto novo
  produtoId: { type: Number, default: null },
  // para produto novo vindo da O.S: nome e código já digitados na peça
  inicial: { type: Object, default: () => ({}) },
  // 'orc' quando aberto pela O.S, 'est' quando aberto pelo estoque
  origem: { type: String, default: 'est' }
})

const emit = defineEmits(['update:modelValue', 'salvo'])

const store = useOficinaStore()
const form = ref(null)
const qtdOriginal = ref(null)
const movimentacoes = ref([])
const erro = ref('')
const salvando = ref(false)

async function carregar() {
  form.value = null
  erro.value = ''
  movimentacoes.value = []
  // fornecedores, faixas e "preço automático por padrão" vêm das configurações:
  // sem elas o produto novo nasceria sem fornecedor e a prévia de preço sairia errada
  if (!store.configCarregada) {
    try {
      await store.carregarConfiguracoes()
    } catch (e) {
      erro.value = mensagemDeErro(e)
    }
  }
  if (!props.produtoId) {
    form.value = formNovo({
      ...props.inicial,
      fornecedorId: store.fornecedoresAtivos[0]?.id ?? null,
      auto: store.autoPadrao
    })
    qtdOriginal.value = null
    return
  }
  try {
    const [produto, movs] = await Promise.all([obterProduto(props.produtoId), listarMovimentacoes(props.produtoId)])
    form.value = paraForm(produto)
    qtdOriginal.value = produto.qtd_atual
    movimentacoes.value = movs
  } catch (e) {
    erro.value = mensagemDeErro(e)
    form.value = formNovo()
  }
}

const titulo = computed(() => (props.produtoId ? 'Produto no estoque' : 'Novo produto no estoque'))
// fornecedores ativos; o do produto entra mesmo se tiver sido desativado
const opcoesFornecedor = computed(() => [
  { value: null, label: 'Sem fornecedor' },
  ...store.fornecedores
    .filter((f) => f.ativo || f.id === form.value?.fornecedor_id)
    .map((f) => ({ value: f.id, label: f.nome + (f.ativo ? '' : ' (desativado)') }))
])
const calc = computed(() => store.preco(form.value.custo, form.value.fornecedor_id, form.value.margem))
const textoST = computed(() => {
  const st = num(calc.value.fornecedor.st)
  return st === 0 ? 'Sem ST retido' : 'ST ' + pct(st)
})
const margemEditada = computed(() => !['', null, undefined].includes(form.value.margem))
const margemExibida = computed(() =>
  margemEditada.value ? form.value.margem : String(calc.value.sugerida).replace('.', ',')
)
const vendaFinal = computed(() => (form.value.auto === false ? num(form.value.venda) : calc.value.venda))
const margemReal = computed(() =>
  calc.value.efetivo > 0 ? pct((vendaFinal.value / calc.value.efetivo - 1) * 100) : '—'
)
const abaixoDoMinimo = computed(() => form.value.min !== '' && num(form.value.qtd) <= num(form.value.min))

const diferenca = computed(() => (qtdOriginal.value === null ? 0 : num(form.value.qtd) - qtdOriginal.value))
const mudouQuantidade = computed(() => props.produtoId && form.value.qtd !== '' && Math.abs(diferenca.value) > 0.0005)
const diferencaTexto = computed(() => (diferenca.value > 0 ? '+' : '') + String(Math.round(diferenca.value * 1000) / 1000).replace('.', ','))

function setAuto(ligado) {
  // ao desligar, começa do preço que estava sendo sugerido
  if (!ligado) form.value.venda = dec(calc.value.venda)
  form.value.auto = ligado
}

const ROTULOS = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' }
const rotuloMov = (t) => ROTULOS[t] || t
const classeMov = (m) =>
  m.tipo === 'entrada' || (m.tipo === 'ajuste' && m.quantidade > 0) ? 'status-em-aberto' : 'status-pendente'
function sinalQtd(m) {
  const q = m.tipo === 'saida' ? -m.quantidade : m.quantidade
  return (q > 0 ? '+' : '') + String(q).replace('.', ',')
}

async function salvar() {
  erro.value = ''
  salvando.value = true
  try {
    const produto = await salvarProduto(props.produtoId, form.value)
    emit('salvo', produto)
    emit('update:modelValue', false)
  } catch (e) {
    erro.value = mensagemDeErro(e)
  } finally {
    salvando.value = false
  }
}
</script>
