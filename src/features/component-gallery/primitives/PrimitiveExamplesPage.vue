<script setup lang="ts">
import { uiPrimitiveCatalog } from '@/features/component-gallery/component-catalog'
import { componentCenterModules } from '@/features/component-gallery/component-center-modules'
import ComponentCatalogModuleView from '@/features/component-gallery/components/ComponentCatalogModuleView.vue'
import PrimitiveShowcase from './components/PrimitiveShowcase.vue'

defineOptions({ name: 'PrimitiveExamplesPage' })

const primitiveDefinition = componentCenterModules.find(
  (componentModule) => componentModule.id === 'primitives',
)
if (!primitiveDefinition) throw new Error('Missing primitive component-center definition')
</script>

<template>
  <!-- AI modified: the dedicated route composes live examples with the authoritative 27-entry catalog. -->
  <ComponentCatalogModuleView :definition="primitiveDefinition" :entries="uiPrimitiveCatalog">
    <template #examples>
      <PrimitiveShowcase :primitive-count="uiPrimitiveCatalog.length" />
    </template>
  </ComponentCatalogModuleView>
</template>
