<template>
  <q-page />
</template>

<script setup>
import { useRouter } from 'vue-router'

// a tela inicial é a lista de orçamentos
useRouter().replace('/orcamentos')
</script>
