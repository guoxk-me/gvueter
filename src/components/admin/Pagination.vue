<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { PaginationChange } from './business-components'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Pagination as PaginationRoot,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = withDefaults(
  defineProps<{
    total: number
    pageSizeOptions?: readonly number[]
    siblingCount?: number
    disabled?: boolean
    showPageSize?: boolean
  }>(),
  {
    pageSizeOptions: () => [10, 20, 50, 100],
    siblingCount: 1,
    disabled: false,
    showPageSize: true,
  },
)

const emit = defineEmits<{
  change: [pagination: PaginationChange]
}>()

const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })
const { t } = useI18n()
const effectivePageSize = computed(() => Math.max(pageSize.value, 1))
const pageCount = computed(() =>
  Math.max(Math.ceil(Math.max(props.total, 0) / effectivePageSize.value), 1),
)

watch(pageCount, (availablePages) => {
  if (page.value > availablePages) changePage(availablePages)
})

function changePage(nextPage: number): void {
  const availablePage = Math.min(Math.max(nextPage, 1), pageCount.value)
  if (availablePage === page.value) return

  page.value = availablePage
  emit('change', { page: page.value, pageSize: pageSize.value })
}

function changePageSize(nextPageSize: AcceptableValue): void {
  if (typeof nextPageSize !== 'string') return

  const selectedPageSize = Number(nextPageSize)
  if (!props.pageSizeOptions.includes(selectedPageSize) || selectedPageSize === pageSize.value)
    return

  // AI modified: reset to the first page because a new page size changes every server offset.
  pageSize.value = selectedPageSize
  page.value = 1
  emit('change', { page: page.value, pageSize: pageSize.value })
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div v-if="showPageSize" class="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{{ t('dataTable.rowsPerPage') }}</span>
      <Select
        :model-value="String(pageSize)"
        :disabled="disabled"
        @update:model-value="changePageSize"
      >
        <SelectTrigger class="w-20" size="sm" :aria-label="t('dataTable.rowsPerPage')">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="pageSizeOption in pageSizeOptions"
            :key="pageSizeOption"
            :value="String(pageSizeOption)"
          >
            {{ pageSizeOption }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-3">
      <p class="text-sm text-muted-foreground" aria-live="polite">
        {{ t('dataTable.pageOf', { current: page, total: pageCount }) }}
      </p>
      <PaginationRoot
        :page="page"
        :total="Math.max(total, 0)"
        :items-per-page="effectivePageSize"
        :sibling-count="siblingCount"
        :disabled="disabled"
        show-edges
        class="mx-0 w-auto"
        @update:page="changePage"
      >
        <PaginationContent v-slot="{ items }">
          <PaginationPrevious :aria-label="t('dataTable.previousPage')" size="icon-sm">
            <ChevronLeft class="size-4" aria-hidden="true" />
            <span class="sr-only">{{ t('dataTable.previousPage') }}</span>
          </PaginationPrevious>
          <template v-for="(paginationItem, index) in items" :key="index">
            <PaginationItem
              v-if="paginationItem.type === 'page'"
              :value="paginationItem.value"
              :is-active="paginationItem.value === page"
              size="icon-sm"
            >
              {{ paginationItem.value }}
            </PaginationItem>
            <PaginationEllipsis v-else :index="index">
              <span aria-hidden="true">…</span>
              <span class="sr-only">{{ t('components.business.morePages') }}</span>
            </PaginationEllipsis>
          </template>
          <PaginationNext :aria-label="t('dataTable.nextPage')" size="icon-sm">
            <ChevronRight class="size-4" aria-hidden="true" />
            <span class="sr-only">{{ t('dataTable.nextPage') }}</span>
          </PaginationNext>
        </PaginationContent>
      </PaginationRoot>
    </div>
  </div>
</template>
