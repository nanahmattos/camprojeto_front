<template>
  <div class="column q-gutter-y-sm">
    <div class="row q-col-gutter-sm items-center">
      <q-input
        :model-value="modelValue.length"
        type="number"
        label="Parcelas *"
        min="1"
        :max="MAX_PARCELAS"
        inputmode="numeric"
        outlined
        dense
        input-class="text-mono"
        class="col-6 col-sm-3 col-md-2"
        @update:model-value="mudarParcelas"
      />
      <span v-if="modelValue.length > 1" class="col texto-apoio">
        O {{ rotuloTotal }} foi dividido entre as parcelas. Mudando o valor de uma, as que você não mexeu dividem o restante.
      </span>
    </div>

    <div v-for="(b, i) in modelValue" :key="i" class="row q-col-gutter-sm items-center">
      <span class="col-12 col-sm-auto rotulo-coluna text-mono" style="min-width: 48px">{{ i + 1 }}/{{ modelValue.length }}</span>
      <CampoData
        :model-value="b.data_emissao"
        label="Data de emissão"
        stack-label
        outlined
        dense
        class="col-12 col-sm-4 col-md-3"
        @update:model-value="(v) => mudarCampo(i, 'data_emissao', v)"
      />
      <CampoData
        :model-value="b.vencimento"
        label="Vencimento *"
        stack-label
        outlined
        dense
        class="col-6 col-sm-3 col-md-3"
        @update:model-value="(v) => mudarCampo(i, 'vencimento', v)"
      />
      <q-input
        :model-value="b.valor"
        label="Valor *"
        prefix="R$"
        placeholder="0,00"
        inputmode="decimal"
        outlined
        dense
        input-class="text-right text-mono"
        class="col-6 col-sm-3 col-md-3"
        @update:model-value="(v) => mudarValor(i, v)"
      />
      <q-chip v-if="b.status === 'pago'" dense square color="green-1" text-color="positive" icon="check" class="col-auto">Paga</q-chip>
    </div>

    <div v-if="diferenca" class="row items-center q-gutter-x-sm" role="status">
      <span class="texto-apoio text-negative">
        A soma das parcelas ({{ brl(soma) }}) não bate com o {{ rotuloTotal }} ({{ brl(total) }}).
      </span>
      <q-btn flat dense no-caps color="primary" icon="calculate" label="Dividir por igual" @click="dividir" />
    </div>
  </div>
</template>

<script setup>
// Parcelas de um boleto (nota de entrada ou fatura): cada uma vira uma conta a pagar.
// v-model = [{ data_emissao, vencimento, valor ("1.025,00"), manual?, status? }]
// O total é dividido entre as parcelas; a que for mudada à mão (manual) fica, e as outras dividem o restante.
import { computed, watch } from 'vue'
import { num, brl, dec } from '@/utils/formato'
import CampoData from '@/components/CampoData.vue'

const MAX_PARCELAS = 60

const props = defineProps({
  modelValue: { type: Array, required: true },
  // valor a dividir (número)
  total: { type: Number, default: 0 },
  // emissão das parcelas novas; quando muda, as parcelas que tinham a antiga acompanham
  emissao: { type: String, default: '' },
  rotuloTotal: { type: String, default: 'valor total' }
})
const emit = defineEmits(['update:modelValue'])

const copia = () => props.modelValue.map((b) => ({ ...b }))

// o que falta do total (fora as mudadas à mão) é dividido entre as outras, em centavos;
// os centavos que sobram vão nas primeiras (100 / 3 = 33,34 + 33,33 + 33,33)
function distribuir(lista) {
  const livres = lista.filter((b) => !b.manual)
  if (livres.length) {
    const fixos = lista.filter((b) => b.manual).reduce((s, b) => s + Math.round(num(b.valor) * 100), 0)
    const centavos = Math.max(0, Math.round(props.total * 100) - fixos)
    const n = livres.length
    const base = Math.floor(centavos / n)
    livres.forEach((b, i) => (b.valor = dec((base + (i < centavos % n ? 1 : 0)) / 100)))
  }
  emit('update:modelValue', lista)
}

// divide o total por igual entre todas (esquece os valores mudados à mão)
function dividir() {
  distribuir(copia().map((b) => ({ ...b, manual: false })))
}

function mudarValor(i, v) {
  const lista = copia()
  lista[i] = { ...lista[i], valor: v, manual: true }
  distribuir(lista)
}

function mudarCampo(i, campo, v) {
  const lista = copia()
  lista[i] = { ...lista[i], [campo]: v }
  emit('update:modelValue', lista)
}

// mudou a quantidade: mantém as parcelas que já existem, cria as que faltam e divide por igual
function mudarParcelas(v) {
  const n = Math.min(MAX_PARCELAS, Math.max(1, parseInt(v, 10) || 1))
  const atual = copia()
  const lista = Array.from({ length: n }, (_, i) => atual[i] || { data_emissao: props.emissao, vencimento: '', valor: '' })
  distribuir(lista.map((b) => ({ ...b, manual: false })))
}

const soma = computed(() => props.modelValue.reduce((s, b) => s + num(b.valor), 0))
const diferenca = computed(() => props.modelValue.length > 0 && Math.abs(soma.value - props.total) >= 0.005)

// total e emissão alimentam as parcelas; se a lista também trocou (abriu outro registro), não mexe.
// mudou o total: as parcelas mudadas à mão ficam, as outras se ajustam
watch(
  () => [props.modelValue, props.total],
  ([lista], [antes]) => lista === antes && distribuir(copia())
)
watch(
  () => [props.modelValue, props.emissao],
  ([lista, nova], [antes, antiga]) => {
    if (lista !== antes) return
    // a emissão da parcela acompanha até ser mudada à mão
    if (lista.some((b) => !b.data_emissao || b.data_emissao === antiga)) {
      emit('update:modelValue', lista.map((b) => (!b.data_emissao || b.data_emissao === antiga ? { ...b, data_emissao: nova } : b)))
    }
  }
)
</script>
