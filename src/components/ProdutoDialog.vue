<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @before-show="carregar"
  >
    <q-card v-if="form" style="width: 820px; max-width: 95vw">
      <q-card-section class="row items-center no-wrap q-gutter-sm">
        <h2 class="titulo-secao col" style="font-size: 19px">{{ titulo }}</h2>
        <span v-if="store.abaixoDoMinimo(form)" class="etiqueta-repor">Repor estoque</span>
        <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="column q-gutter-y-md">
        <div class="row q-col-gutter-sm">
          <q-input v-model="form.nome" label="Nome do produto" outlined dense class="col-12 col-md-6" />
          <q-input v-model="form.codigo" label="Código" outlined dense input-class="text-mono" class="col-6 col-md-3" />
          <q-input v-model="form.marca" label="Marca" outlined dense class="col-6 col-md-3" />
          <q-input v-model="form.ncm" label="NCM" placeholder="0000.00.00" outlined dense input-class="text-mono" class="col-6 col-md-3" />
          <q-input v-model="form.qtd" label="Quantidade" inputmode="decimal" outlined dense input-class="text-right text-mono" class="col-6 col-md-3" />
          <q-input v-model="form.min" label="Qtd mínima" inputmode="decimal" outlined dense input-class="text-right text-mono" class="col-6 col-md-3" />
          <q-input v-model="form.max" label="Qtd máxima" inputmode="decimal" outlined dense input-class="text-right text-mono" class="col-6 col-md-3" />
        </div>

        <div class="cartao q-pa-md column q-gutter-y-md" style="background: #faf9f6">
          <div class="row q-col-gutter-sm items-center">
            <q-select
              v-model="form.fornecedor"
              :options="nomesFornecedores"
              label="Fornecedor"
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

        <div class="row q-gutter-md text-grey-8" style="font-size: 13px">
          <span>Criado em <strong class="text-grey-9">{{ form.criado || '—' }}</strong></span>
          <span>Alterado em <strong class="text-grey-9">{{ form.alterado || '—' }}</strong></span>
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
          @click="salvar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useOficinaStore } from '@/stores/oficina'
import { num, brl, dec, pct } from '@/utils/formato'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // produto a editar; null = produto novo
  produto: { type: Object, default: null },
  // posição no estoque; null = ainda não está no estoque
  indice: { type: Number, default: null },
  // 'orc' quando aberto pela O.S, 'est' quando aberto pelo estoque
  origem: { type: String, default: 'est' }
})

const emit = defineEmits(['update:modelValue', 'salvo'])

const store = useOficinaStore()
const form = ref(null)

function carregar() {
  form.value = props.produto ? JSON.parse(JSON.stringify(props.produto)) : store.novoProduto()
}

const titulo = computed(() => (props.indice === null ? 'Novo produto no estoque' : 'Produto no estoque'))
const nomesFornecedores = computed(() => store.fornecedores.map((f) => f.nome))
const calc = computed(() => store.preco(form.value.custo, form.value.fornecedor, form.value.margem))
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

function setAuto(ligado) {
  // ao desligar, começa do preço que estava sendo sugerido
  if (!ligado) form.value.venda = dec(calc.value.venda)
  form.value.auto = ligado
}

function salvar() {
  const indice = store.salvarProduto(form.value, props.indice)
  emit('salvo', { produto: store.estoque[indice], indice })
  emit('update:modelValue', false)
}
</script>
