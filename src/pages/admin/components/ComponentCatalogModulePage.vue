<script setup lang="ts">
import type {
  ComponentCenterModuleDefinition,
  ComponentCenterModuleId,
} from '@/features/component-gallery/component-center-modules'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState } from '@/components/admin'
import { componentCatalog } from '@/features/component-gallery/component-catalog'
import { componentCenterModules } from '@/features/component-gallery/component-center-modules'
import { componentModuleExamples } from '@/features/component-gallery/component-module-examples'
import ComponentCatalogModuleView from '@/features/component-gallery/components/ComponentCatalogModuleView.vue'
import ComponentModuleExamples from '@/features/component-gallery/components/ComponentModuleExamples.vue'

defineOptions({ name: 'ComponentCatalogModulePage' })

const props = defineProps<{
  moduleId: ComponentCenterModuleId
}>()

const { t } = useI18n()

const selectedDefinition = computed<ComponentCenterModuleDefinition | undefined>(() =>
  componentCenterModules.find(componentModule => componentModule.id === props.moduleId),
)

const moduleEntries = computed(() => {
  const definition = selectedDefinition.value
  if (!definition)
    return []

  // AI modified: route ownership comes from the typed module contract, never from an arbitrary query or backend component name.
  return componentCatalog.filter(entry => definition.catalogModules.includes(entry.module))
})

const selectedExamples = computed(() => componentModuleExamples[props.moduleId] ?? [])
</script>

<template>
  <ComponentCatalogModuleView
    v-if="selectedDefinition"
    :definition="selectedDefinition"
    :entries="moduleEntries"
  >
    <template #examples>
      <ComponentModuleExamples
        v-if="selectedExamples.length > 0"
        :key="selectedDefinition.id"
        :examples="selectedExamples"
      />
    </template>
  </ComponentCatalogModuleView>
  <EmptyState
    v-else
    :title="t('components.center.unknownModuleTitle')"
    :description="t('components.center.unknownModuleDescription')"
  />
</template>
