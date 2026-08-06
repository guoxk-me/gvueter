<script setup lang="ts">
import type { ComponentCatalogModule } from '../component-catalog'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { componentCatalog } from '../component-catalog'
import ComponentCatalogCard from './ComponentCatalogCard.vue'

const props = defineProps<{
  modules: readonly ComponentCatalogModule[]
}>()

const { t } = useI18n()
const searchText = shallowRef('')
const moduleEntries = computed(() =>
  componentCatalog.filter((entry) => props.modules.includes(entry.module)),
)
const visibleEntries = computed(() => {
  const requestedText = searchText.value.trim().toLocaleLowerCase()
  if (!requestedText) return moduleEntries.value
  return moduleEntries.value.filter((entry) =>
    [entry.displayName, entry.summary, ...entry.businessScenarios, ...entry.states].some(
      (searchableText) => searchableText.toLocaleLowerCase().includes(requestedText),
    ),
  )
})
</script>

<template>
  <!-- AI modified: dedicated demo routes retain access to the complete API/evidence contract for every owned component. -->
  <details class="group min-w-0 rounded-xl border bg-card p-4" data-component-module-catalog>
    <summary
      class="cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span class="font-semibold">{{ t('components.center.catalogTitle') }}</span>
      <span class="ml-2 text-sm text-muted-foreground">
        {{
          t('components.center.filteredCount', {
            visible: visibleEntries.length,
            total: moduleEntries.length,
          })
        }}
      </span>
    </summary>
    <div class="mt-4 space-y-4">
      <label class="sr-only" :for="`module-catalog-${modules.join('-')}`">
        {{ t('components.center.searchLabel') }}
      </label>
      <Input
        :id="`module-catalog-${modules.join('-')}`"
        v-model="searchText"
        type="search"
        :placeholder="t('components.center.searchPlaceholder')"
      />
      <div class="grid min-w-0 gap-4 2xl:grid-cols-2">
        <ComponentCatalogCard v-for="entry in visibleEntries" :key="entry.id" :entry="entry" />
      </div>
    </div>
  </details>
</template>
