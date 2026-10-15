<template>
  <!-- mês no formato "2026-10"; setas para o anterior e o próximo -->
  <div class="row items-center no-wrap mes-seletor" role="group" aria-label="Mês">
    <q-btn flat round dense icon="chevron_left" color="grey-8" aria-label="Mês anterior" @click="mudar(-1)" />
    <span class="col text-center text-weight-bold" style="font-size: 15px; min-width: 140px" aria-live="polite">{{ rotulo }}</span>
    <q-btn flat round dense icon="chevron_right" color="grey-8" aria-label="Próximo mês" @click="mudar(1)" />
    <q-btn v-if="modelValue !== mesAtual()" flat dense no-caps color="primary" label="Hoje" class="q-ml-xs" @click="emit('update:modelValue', mesAtual())" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { mesAtual } from '@/api/financeiro'

const props = defineProps({ modelValue: { type: String, required: true } })
const emit = defineEmits(['update:modelValue'])

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const rotulo = computed(() => {
  const [a, m] = props.modelValue.split('-').map(Number)
  return MESES[m - 1] + ' de ' + a
})

function mudar(k) {
  const [a, m] = props.modelValue.split('-').map(Number)
  const d = new Date(a, m - 1 + k, 1)
  emit('update:modelValue', d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
}
</script>

<style scoped>
.mes-seletor {
  border: 1px solid #dad8d2;
  border-radius: 8px;
  padding: 2px 4px;
  min-height: 40px;
}
</style>
