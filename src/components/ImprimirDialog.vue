<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <q-card style="width: 600px; max-width: 95vw">
      <q-card-section class="row items-center no-wrap">
        <h2 class="titulo-secao col" style="font-size: 19px">Imprimir {{ alvo }}</h2>
        <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="column q-gutter-y-sm" role="radiogroup" aria-label="Tipo de impressão">
        <label
          v-for="op in opcoes"
          :key="op.value"
          class="row no-wrap items-start q-gutter-x-sm q-pa-md cursor-pointer"
          :style="{
            borderRadius: '8px',
            border: '2px solid ' + (tipo === op.value ? '#B4500F' : '#DAD8D2'),
            background: tipo === op.value ? '#FDF8F3' : '#FFFFFF'
          }"
        >
          <q-radio v-model="tipo" :val="op.value" dense />
          <span class="column q-gutter-y-xs">
            <span class="text-weight-bold" style="font-size: 15px">{{ op.titulo }}</span>
            <span class="text-grey-8" style="font-size: 13px">{{ op.desc }}</span>
          </span>
        </label>

        <div class="q-pa-sm q-mt-sm" style="border-radius: 8px; background: #f3f2ee; font-size: 13px; line-height: 1.5">
          <span class="rotulo-coluna block q-mb-xs">Sai na folha</span>
          {{ colunas[tipo] }}
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn outline no-caps color="grey-8" label="Cancelar" v-close-popup />
        <q-btn unelevated no-caps color="primary" label="Imprimir" @click="imprimir" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useOficinaStore, tipoLabel } from '@/stores/oficina'
import { pct } from '@/utils/formato'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // texto do título: "O.S 0148", "3 O.S selecionadas"…
  alvo: { type: String, default: '' },
  // tipo de cliente da O.S, para saber se sai a coluna da taxa
  tipoCliente: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const $q = useQuasar()
const store = useOficinaStore()
const tipo = ref('cliente')

const opcoes = [
  {
    value: 'tecnico',
    titulo: 'Para o técnico',
    desc: 'Peças, quantidades, serviços e observações pós análise. Nenhum valor.'
  },
  {
    value: 'custo',
    titulo: 'Análise de preço de custo',
    desc: 'Preço pago, fornecedor, encargos (ST, frete, despesas), margem e dados de estoque. Uso interno.'
  },
  {
    value: 'cliente',
    titulo: 'Para o cliente',
    desc: 'Valores de venda. Se o tipo de cliente tiver taxa, sai a coluna com o acréscimo.'
  }
]

const colunas = computed(() => {
  const taxa = props.tipoCliente ? store.taxaDoTipo(props.tipoCliente) : 0
  const colTaxa = taxa > 0 ? ', total com taxa ' + tipoLabel(props.tipoCliente) + ' (+' + pct(taxa) + ')' : ''
  return {
    tecnico:
      'Cabeçalho (cliente, veículo, placa) · Peças: produto, código, qtd · Serviços: descrição, horas · Observações pós análise',
    custo:
      'Peças: produto, código, qtd, preço de custo, fornecedor, ST/frete/despesas, custo efetivo, margem, venda, estoque atual / mínimo · Serviços com valores · Observações internas',
    cliente:
      'Cabeçalho · Peças: produto, código, qtd, valor unit., total' +
      colTaxa +
      ' · Serviços com valores · Totais · Pagamento e parcelas · Observações pós análise'
  }
})

function imprimir() {
  emit('update:modelValue', false)
  $q.notify({ message: 'Enviado para a impressora.', color: 'dark' })
}
</script>
