<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import ComponentCenterNavigation from './ComponentCenterNavigation.vue'
import ComponentCenterSummary from './ComponentCenterSummary.vue'

const { t } = useI18n()
</script>

<template>
  <section class="min-w-0 space-y-6">
    <PageHeader
      :eyebrow="t('components.eyebrow')"
      :title="t('components.title')"
      :description="t('components.center.description')"
    >
      <template #actions>
        <Badge variant="secondary">
          {{ t('components.center.typedInventory') }}
        </Badge>
      </template>
    </PageHeader>

    <!-- AI modified: routes replace the former ten-tab gallery so each capability has a shareable destination. -->
    <ComponentCenterSummary />
    <ComponentCenterNavigation />
  </section>
</template>
