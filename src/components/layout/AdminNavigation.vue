<script setup lang="ts">
import type { AdminNavigationVariant } from './layout-contract'
import type { NavigationMenuNode } from '@/features/navigation'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminNavigationNode from './AdminNavigationNode.vue'

const props = withDefaults(
  defineProps<{
    nodes: NavigationMenuNode[]
    variant?: AdminNavigationVariant
    collapsed?: boolean
    ariaLabel?: string
  }>(),
  {
    variant: 'vertical',
    collapsed: false,
    ariaLabel: undefined,
  },
)

const emit = defineEmits<{
  nodeSelected: [node: NavigationMenuNode]
}>()

const { t } = useI18n()
const navigationLabel = computed(() => props.ariaLabel ?? t('nav.navigation'))
const listClass = computed(() => [
  props.variant === 'horizontal' ? 'flex min-w-0 items-center gap-1' : 'flex w-full flex-col gap-1',
])
</script>

<template>
  <nav :aria-label="navigationLabel" class="min-w-0">
    <ul v-if="nodes.length" :class="listClass">
      <AdminNavigationNode
        v-for="menuNode in nodes"
        :key="menuNode.id"
        :node="menuNode"
        :variant="variant"
        :collapsed="collapsed"
        @node-selected="emit('nodeSelected', $event)"
      />
    </ul>
    <p v-else-if="!collapsed" class="px-3 py-4 text-xs text-muted-foreground">
      {{ t('nav.noSubmenu') }}
    </p>
  </nav>
</template>
