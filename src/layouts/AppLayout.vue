<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useAppearanceStore } from '@/stores/appearance'
import { useThemeColor } from '@/composables/useThemeColor'

// 初始化主题色（保证在 layout 挂载时已激活监听）
useThemeColor()

const appearance = useAppearanceStore()

const SidebarLayout = defineAsyncComponent(() => import('./AdminLayout.vue'))
const TopNavLayout = defineAsyncComponent(() => import('./TopNavLayout.vue'))
const MixedLayout = defineAsyncComponent(() => import('./MixedLayout.vue'))

const currentLayout = computed(() => {
  switch (appearance.layout) {
    case 'top':
      return TopNavLayout
    case 'mixed':
      return MixedLayout
    default:
      return SidebarLayout
  }
})
</script>

<template>
  <component :is="currentLayout" />
</template>
