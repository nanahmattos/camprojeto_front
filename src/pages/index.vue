<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="lt-md bg-dark">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title class="text-weight-bold" style="font-size: 16px">
          {{ nomeOficina }}
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="240"
      class="menu-lateral"
    >
      <div class="column no-wrap full-height">
        <nav aria-label="Menu principal" class="col q-pa-md">
          <div class="q-px-sm q-pb-lg q-pt-xs column">
            <span class="text-white text-weight-bold" style="font-size: 16px">
              {{ nomeOficina }}
            </span>
            <span style="font-size: 12px; color: #a9adb2">Gestão da oficina</span>
          </div>

          <q-list>
            <EssentialLink
              v-for="link in linksList"
              :key="link.label"
              v-bind="link"
            />
          </q-list>
        </nav>

        <div v-if="auth.usuario" class="q-pa-md row items-center no-wrap q-gutter-x-sm" style="border-top: 1px solid #34383d">
          <q-avatar size="36px" color="accent" text-color="dark" class="text-weight-bold" font-size="14px">
            {{ iniciais }}
          </q-avatar>
          <div class="col column" style="min-width: 0">
            <span class="text-white ellipsis" style="font-size: 14px; font-weight: 600">{{ auth.usuario.nome }}</span>
            <span class="ellipsis" style="font-size: 12px; color: #a9adb2">{{ auth.usuario.email }}</span>
          </div>
          <q-btn
            flat
            round
            dense
            icon="logout"
            color="grey-5"
            aria-label="Sair"
            :loading="saindo"
            @click="sair"
          >
            <q-tooltip>Sair</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import EssentialLink from '@/components/EssentialLink.vue'
import { useOficinaStore } from '@/stores/oficina'
import { useAuthStore } from '@/stores/auth'

const store = useOficinaStore()
const auth = useAuthStore()
const router = useRouter()

const nomeOficina = computed(() => auth.usuario?.oficina.nome || 'Centro Automotivo Mattos')

const iniciais = computed(() => {
  const partes = (auth.usuario?.nome || '').trim().split(/\s+/)
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
})

const saindo = ref(false)

async function sair() {
  saindo.value = true
  await auth.logout()
  saindo.value = false
  router.replace('/login')
}

const linksList = computed(() => [
  {
    label: 'Orçamentos',
    icon: 'description',
    route: '/orcamentos'
  },
  {
    label: 'Estoque',
    icon: 'inventory_2',
    route: '/estoque',
    badge: store.qtdRepor || '',
    badgeLabel: store.qtdRepor + ' produtos para repor'
  },
  {
    label: 'Configurações',
    icon: 'tune',
    route: '/configuracao'
  }
])

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>
