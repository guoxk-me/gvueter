<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AdminTabs from '@/components/layout/AdminTabs.vue'

defineProps<{
  isTabsVisible: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <aside
    v-if="isTabsVisible"
    :aria-label="t('nav.pageContext')"
    class="shrink-0 border-b border-border/80 bg-surface"
    data-layout-region="context-bar"
  >
    <AdminTabs v-if="isTabsVisible" data-context-row="tabs" />
  </aside>
</template>
