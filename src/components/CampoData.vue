<template>
  <q-input
    v-model="texto"
    mask="##/##/####"
    placeholder="dd/mm/aaaa"
    inputmode="numeric"
    :error="!!erro"
    :error-message="erro"
    :hide-bottom-space="!erro"
    @update:model-value="digitado"
    @blur="aoSair"
  >
    <template #append>
      <q-icon name="event" class="cursor-pointer" :aria-label="'Abrir calendário'">
        <q-popup-proxy ref="popup" cover transition-show="scale" transition-hide="scale">
          <q-date
            :model-value="modelValue || null"
            mask="YYYY-MM-DD"
            :options="min ? permitida : undefined"
            today-btn
            minimal
            @update:model-value="escolhido"
          />
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
</template>

<script setup>
// Campo de data: digita dd/mm/aaaa ou escolhe no calendário (q-date).
// O v-model é a data no formato da API ("2026-11-06"); vazio = ''.
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  // data mínima no formato da API; antes dela o calendário bloqueia
  min: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const popup = ref(null)
const texto = ref('')
const erro = ref('')

const paraTexto = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

watch(
  () => props.modelValue,
  (iso) => {
    // não atrapalha quem ainda está digitando a mesma data
    if (paraIso(texto.value) !== (iso || '')) texto.value = paraTexto(iso)
    erro.value = ''
  },
  { immediate: true }
)

// "06/11/2026" -> "2026-11-06"; null se não for uma data de verdade
function paraIso(t) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t || '')
  if (!m) return null
  const [, d, mes, a] = m.map(Number)
  const data = new Date(a, mes - 1, d)
  if (data.getFullYear() !== a || data.getMonth() !== mes - 1 || data.getDate() !== d) return null
  return m[3] + '-' + m[2] + '-' + m[1]
}

// q-date manda "YYYY/MM/DD" para as opções
function permitida(d) {
  return d.replace(/\//g, '-') >= props.min
}

function digitado(t) {
  erro.value = ''
  if (!t) return emit('update:modelValue', '')
  const iso = paraIso(t)
  if (iso) emit('update:modelValue', iso)
}

// data pela metade ou inexistente (31/02): volta para a que vale, para o campo não mostrar uma e salvar outra
function aoSair() {
  if (!texto.value) return
  const iso = paraIso(texto.value)
  if (!iso) texto.value = paraTexto(props.modelValue)
  else if (props.min && iso < props.min) erro.value = 'Data antes de ' + paraTexto(props.min)
}

function escolhido(iso) {
  emit('update:modelValue', iso || '')
  popup.value?.hide()
}
</script>
