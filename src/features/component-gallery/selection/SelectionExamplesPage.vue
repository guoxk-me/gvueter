<script setup lang="ts">
import { computed } from 'vue'
import { componentCatalog } from '../component-catalog'
import { componentCenterModules } from '../component-center-modules'
import ComponentCatalogModuleView from '../components/ComponentCatalogModuleView.vue'
import SelectionExamplesShowcase from './SelectionExamplesShowcase.vue'

defineOptions({ name: 'SelectionExamplesPage' })

const selectionDefinition = componentCenterModules.find(
  componentModule => componentModule.id === 'selection',
)
if (!selectionDefinition)
  throw new Error('The selection component-center module is not registered.')

const selectionEntries = computed(() =>
  componentCatalog.filter(entry => entry.module === 'selection'),
)
</script>

<template>
  <!-- AI modified: the dedicated route combines real selection workflows with the existing truthful catalog. -->
  <ComponentCatalogModuleView :definition="selectionDefinition" :entries="selectionEntries">
    <template #examples>
      <SelectionExamplesShowcase />
    </template>
  </ComponentCatalogModuleView>
</template>
