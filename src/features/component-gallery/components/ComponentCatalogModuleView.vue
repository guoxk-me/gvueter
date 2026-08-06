<script setup lang="ts">
import type { ComponentCatalogEntry } from '../component-catalog'
import type { ComponentCenterModuleDefinition } from '../component-center-modules'
import { ArrowLeft, SearchX } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { EmptyState, PageHeader } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ComponentCatalogCard from './ComponentCatalogCard.vue'
import ComponentCenterModuleNav from './ComponentCenterModuleNav.vue'

type CatalogView = 'all' | 'needs-enhancement' | 'without-demo' | 'without-tests'

interface CatalogViewOption {
  id: CatalogView
  label: string
}

const props = defineProps<{
  definition: ComponentCenterModuleDefinition
  entries: readonly ComponentCatalogEntry[]
}>()

defineSlots<{
  examples?: () => unknown
}>()

const { t } = useI18n()
const searchQuery = shallowRef('')
const selectedView = shallowRef<CatalogView>('all')

const viewOptions = computed<CatalogViewOption[]>(() => [
  { id: 'all', label: t('components.center.filters.all') },
  { id: 'without-demo', label: t('components.center.filters.withoutDemo') },
  { id: 'without-tests', label: t('components.center.filters.withoutTests') },
  { id: 'needs-enhancement', label: t('components.center.filters.needsEnhancement') },
])

const visibleEntries = computed(() => {
  const requestedText = searchQuery.value.trim().toLocaleLowerCase()

  return props.entries.filter((entry) => {
    const matchesText =
      !requestedText ||
      [entry.displayName, entry.summary, ...entry.businessScenarios, ...entry.states].some(
        (searchableText) => searchableText.toLocaleLowerCase().includes(requestedText),
      )

    if (!matchesText) return false
    if (selectedView.value === 'without-demo') return entry.availability.demo === 'missing'
    if (selectedView.value === 'without-tests') return entry.availability.test === 'missing'
    if (selectedView.value === 'needs-enhancement') return entry.availability.enhancement !== 'none'
    return true
  })
})

function clearCatalogFilters(): void {
  searchQuery.value = ''
  selectedView.value = 'all'
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <PageHeader
      :eyebrow="t('components.eyebrow')"
      :title="t(definition.titleKey)"
      :description="t(definition.descriptionKey)"
    >
      <template #actions>
        <Button as-child variant="outline">
          <RouterLink to="/components">
            <ArrowLeft class="size-4" aria-hidden="true" />
            {{ t('components.center.backToCenter') }}
          </RouterLink>
        </Button>
        <Badge variant="secondary">
          {{ t('components.center.componentCount', { count: entries.length }) }}
        </Badge>
      </template>
    </PageHeader>

    <ComponentCenterModuleNav />

    <slot name="examples" />

    <section class="space-y-3" :aria-labelledby="`${definition.id}-catalog-title`">
      <div class="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div class="space-y-1">
          <h2 :id="`${definition.id}-catalog-title`" class="text-lg font-semibold">
            {{ t('components.center.catalogTitle') }}
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ t('components.center.catalogDescription') }}
          </p>
        </div>
        <p class="text-sm text-muted-foreground" role="status" aria-live="polite">
          {{
            t('components.center.filteredCount', {
              visible: visibleEntries.length,
              total: entries.length,
            })
          }}
        </p>
      </div>

      <div class="rounded-xl border bg-card p-3 shadow-sm">
        <label :for="`${definition.id}-catalog-search`" class="sr-only">
          {{ t('components.center.searchLabel') }}
        </label>
        <Input
          :id="`${definition.id}-catalog-search`"
          v-model="searchQuery"
          type="search"
          :placeholder="t('components.center.searchPlaceholder')"
        />
        <div
          class="mt-3 flex min-w-0 flex-wrap gap-2"
          :aria-label="t('components.center.filterLabel')"
        >
          <Button
            v-for="viewOption in viewOptions"
            :key="viewOption.id"
            type="button"
            size="sm"
            :variant="selectedView === viewOption.id ? 'default' : 'outline'"
            :aria-pressed="selectedView === viewOption.id"
            @click="selectedView = viewOption.id"
          >
            {{ viewOption.label }}
          </Button>
        </div>
      </div>
    </section>

    <div v-if="visibleEntries.length > 0" class="grid min-w-0 gap-4 2xl:grid-cols-2">
      <ComponentCatalogCard v-for="entry in visibleEntries" :key="entry.id" :entry="entry" />
    </div>
    <EmptyState
      v-else
      :icon="SearchX"
      :title="t('components.center.emptyTitle')"
      :description="t('components.center.emptyDescription')"
    >
      <template #actions>
        <Button type="button" variant="outline" @click="clearCatalogFilters">
          {{ t('components.center.clearFilters') }}
        </Button>
      </template>
    </EmptyState>
  </section>
</template>
