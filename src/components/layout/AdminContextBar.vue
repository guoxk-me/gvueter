<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AdminTabs from '@/components/layout/AdminTabs.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'

defineProps<{
  hasBreadcrumbIcon: boolean
  isBreadcrumbVisible: boolean
  isTabsVisible: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <aside
    v-if="isBreadcrumbVisible || isTabsVisible"
    :aria-label="t('nav.pageContext')"
    class="shrink-0 border-b border-border bg-background"
    data-layout-region="context-bar"
  >
    <!-- AI modified: breadcrumb and tabs share one surface and one owned bottom boundary. -->
    <!-- AI modified: each optional context row has a stable tokenized height inside the shared surface. -->
    <div
      v-if="isBreadcrumbVisible"
      class="flex h-[var(--admin-context-breadcrumb-height)] min-w-0 items-center overflow-x-auto px-4"
      data-context-row="breadcrumb"
    >
      <AppBreadcrumb :has-icon="hasBreadcrumbIcon" />
    </div>
    <AdminTabs v-if="isTabsVisible" data-context-row="tabs" />
  </aside>
</template>
