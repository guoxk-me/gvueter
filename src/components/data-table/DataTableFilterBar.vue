<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { DataTableFilterDefinition, DataTableFilterValues } from './types'
import { FilterX, Search } from '@lucide/vue'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const props = defineProps<{
  filters: readonly DataTableFilterDefinition[]
  class?: HTMLAttributes['class']
}>()

const filterValues = defineModel<DataTableFilterValues>({ required: true })

const hasActiveFilters = computed(() =>
  props.filters.some(
    (filter) => (filterValues.value[filter.key] ?? '') !== (filter.defaultValue ?? ''),
  ),
)

function updateFilter(key: string, value: AcceptableValue): void {
  // AI modified: replace the values object so query keys and parent watchers update predictably.
  const defaultValue = props.filters.find((filter) => filter.key === key)?.defaultValue ?? ''
  filterValues.value = {
    ...filterValues.value,
    [key]: isFilterValue(value) ? String(value) : defaultValue,
  }
}

function isFilterValue(value: AcceptableValue): value is string | number | bigint {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
}

function clearFilters(): void {
  filterValues.value = Object.fromEntries(
    props.filters.map((filter) => [filter.key, filter.defaultValue ?? '']),
  )
}
</script>

<template>
  <!-- AI modified: filter content and actions can wrap independently under translated labels. -->
  <div
    :class="
      cn('flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', props.class)
    "
  >
    <div class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
      <template v-for="filter in filters" :key="filter.key">
        <div v-if="filter.type === 'search'" class="relative w-full sm:max-w-sm">
          <Search
            class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            :model-value="filterValues[filter.key] ?? filter.defaultValue ?? ''"
            class="pl-9"
            :placeholder="filter.placeholder"
            :aria-label="filter.ariaLabel ?? filter.placeholder"
            @update:model-value="updateFilter(filter.key, $event)"
          />
        </div>
        <Select
          v-else
          :model-value="filterValues[filter.key] ?? filter.defaultValue ?? ''"
          @update:model-value="updateFilter(filter.key, $event)"
        >
          <SelectTrigger
            class="w-full sm:w-40"
            :aria-label="filter.ariaLabel ?? filter.placeholder"
          >
            <SelectValue :placeholder="filter.placeholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in filter.options ?? []"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </template>
      <Button
        v-if="hasActiveFilters"
        variant="ghost"
        class="w-fit text-muted-foreground"
        @click="clearFilters"
      >
        <FilterX class="mr-2 size-4" aria-hidden="true" />
        {{ $t('dataTable.clearFilters') }}
      </Button>
    </div>
    <div v-if="$slots.actions" class="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
      <slot name="actions" />
    </div>
  </div>
</template>
