<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ADMIN_ICON_OPTIONS } from '@/components/admin/icon-selector'
import PageHeader from '@/components/admin/PageHeader.vue'
import { Badge } from '@/components/ui/badge'
import { componentCatalog } from '../component-catalog'
import ComponentCatalogCard from '../components/ComponentCatalogCard.vue'
import ComponentCenterModuleNav from '../components/ComponentCenterModuleNav.vue'
import IconCatalogExplorer from './components/IconCatalogExplorer.vue'
import IconRegistryGuidance from './components/IconRegistryGuidance.vue'
import IconSelectorDemo from './components/IconSelectorDemo.vue'
import IconUsageGuidance from './components/IconUsageGuidance.vue'

defineOptions({ name: 'IconExamplesPage' })

const { t } = useI18n()
const iconSelectorCatalogEntry = computed(() =>
  componentCatalog.find((entry) => entry.id === 'icon-selector'),
)
</script>

<template>
  <section class="min-w-0 space-y-6">
    <PageHeader
      :eyebrow="t('components.eyebrow')"
      :title="t('components.center.modules.icons.title')"
      :description="t('components.center.modules.icons.description')"
    >
      <template #actions>
        <Badge variant="secondary">
          {{ t('components.iconGallery.inventoryCount', { count: ADMIN_ICON_OPTIONS.length }) }}
        </Badge>
      </template>
    </PageHeader>

    <ComponentCenterModuleNav />
    <IconCatalogExplorer />
    <IconSelectorDemo />
    <IconUsageGuidance />
    <IconRegistryGuidance />

    <section
      v-if="iconSelectorCatalogEntry"
      class="space-y-3"
      aria-labelledby="icon-contract-title"
    >
      <div>
        <h2 id="icon-contract-title" class="text-lg font-semibold">
          {{ t('components.iconGallery.contractTitle') }}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ t('components.iconGallery.contractDescription') }}
        </p>
      </div>
      <ComponentCatalogCard :entry="iconSelectorCatalogEntry" />
    </section>
  </section>
</template>
