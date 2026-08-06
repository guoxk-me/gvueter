<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import Drawer from './Drawer.vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    size?: 'sm' | 'md' | 'lg'
    contentClass?: HTMLAttributes['class']
  }>(),
  {
    description: '',
    side: 'right',
    size: 'md',
  },
)

defineSlots<{
  default?: () => unknown
  headerActions?: () => unknown
  footer?: (props: { close: () => void }) => unknown
}>()

const isOpen = defineModel<boolean>('open', { default: false })

function closeDrawer(): void {
  // AI modified: expose an explicit close action to footer slots without leaking sheet internals.
  isOpen.value = false
}
</script>

<template>
  <Drawer
    v-model:open="isOpen"
    :title="title"
    :description="description"
    :side="side"
    :size="size"
    :content-class="contentClass"
  >
    <template v-if="$slots.headerActions" #headerActions>
      <slot name="headerActions" />
    </template>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" :close="closeDrawer" />
    </template>
  </Drawer>
</template>
