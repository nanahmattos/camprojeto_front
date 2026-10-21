<template>
  <q-page />
</template>

<script setup>
import { useRouter } from 'vue-router'

// /configuracao virou um grupo no menu: o endereço antigo cai em Dados da empresa
useRouter().replace('/configuracao/empresa')
</script>
