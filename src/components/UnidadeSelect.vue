<template>
  <!-- unidades mais usadas na lista; dá para digitar outra (vira maiúscula, até 6 letras) -->
  <q-select
    :model-value="modelValue"
    :options="opcoes"
    use-input
    hide-selected
    fill-input
    input-debounce="0"
    new-value-mode="add-unique"
    maxlength="6"
    outlined
    dense
    options-dense
    input-class="text-mono text-uppercase"
    @filter="filtrar"
    @input-value="digitado"
    @update:model-value="(v) => emit('update:modelValue', (v || '').toUpperCase())"
  />
</template>

<script setup>
import { ref } from 'vue'
import { UNIDADES } from '@/api/produtos'

defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])

const opcoes = ref(UNIDADES)

function filtrar(texto, atualizar) {
  const t = texto.toUpperCase()
  atualizar(() => (opcoes.value = t ? UNIDADES.filter((u) => u.startsWith(t)) : UNIDADES))
}

// o que foi digitado já vale, sem precisar apertar Enter
function digitado(texto) {
  emit('update:modelValue', texto.toUpperCase().slice(0, 6))
}
</script>
