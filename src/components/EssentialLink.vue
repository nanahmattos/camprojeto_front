<template>
  <q-item
    clickable
    :to="props.route"
    class="menu-item"
    active-class="menu-item--ativo"
  >
    <q-item-section
      v-if="props.icon"
      avatar
      style="min-width: 36px"
    >
      <q-icon :name="props.icon" size="20px" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ props.label }}</q-item-label>
      <q-item-label v-if="props.caption" caption>{{ props.caption }}</q-item-label>
    </q-item-section>

    <q-item-section v-if="props.badge" side>
      <q-badge
        rounded
        color="accent"
        text-color="dark"
        class="text-weight-bold"
        :label="props.badge"
        :aria-label="props.badgeLabel"
      />
    </q-item-section>
  </q-item>
</template>

<script setup>
const props = defineProps({
  label: {
    type: String,
    required: true
  },

  caption: {
    type: String,
    default: ''
  },

  route: {
    type: String,
    default: '#'
  },

  icon: {
    type: String,
    default: ''
  },

  badge: {
    type: [String, Number],
    default: ''
  },

  badgeLabel: {
    type: String,
    default: ''
  }
})
</script>
