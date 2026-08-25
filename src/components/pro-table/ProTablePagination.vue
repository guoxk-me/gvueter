<script setup lang="ts">
import type { PaginationState } from '@tanstack/vue-table'
import type { AcceptableValue } from 'reka-ui'
import type { ProTableLabels } from './types'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed } from 'vue'
import {
  getAcceptedPageSize,
  getAllowedPageSizes,
  getClampedPageIndex,
} from '@/components/data-table/pagination-contract'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = withDefaults(
  defineProps<{
    pagination: PaginationState
    pageCount: number
    labels: ProTableLabels
    pageSizeOptions?: readonly number[]
  }>(),
  {
    pageSizeOptions: () => [10, 20, 50, 100],
  },
)

const emit = defineEmits<{
  'update:pagination': [pagination: PaginationState]
}>()

const allowedPageSizes = computed(() => getAllowedPageSizes(props.pageSizeOptions))
const pageSize = computed(() => String(props.pagination.pageSize))
const currentPage = computed(() => props.pagination.pageIndex + 1)
const canGoPrevious = computed(() => props.pagination.pageIndex > 0)
const canGoNext = computed(() => props.pagination.pageIndex < props.pageCount - 1)

function updatePageSize(value: AcceptableValue): void {
  const nextPageSize = getAcceptedPageSize(value, allowedPageSizes.value)
  if (nextPageSize === undefined || nextPageSize === props.pagination.pageSize)
    return

  // AI modified: reset page and page size together so no intermediate request can escape.
  emit('update:pagination', { pageIndex: 0, pageSize: nextPageSize })
}

function goToPage(pageIndex: number): void {
  const nextPageIndex = getClampedPageIndex(pageIndex, props.pageCount)
  if (nextPageIndex !== props.pagination.pageIndex)
    emit('update:pagination', { ...props.pagination, pageIndex: nextPageIndex })
}
</script>

<template>
  <!-- AI modified: translated pagination labels wrap within their own groups instead of widening the Shell. -->
  <div
    class="flex min-w-0 flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
  >
    <div class="flex min-w-0 flex-wrap items-center gap-2 text-muted-foreground">
      <span class="break-words">{{ labels.rowsPerPage }}</span>
      <Select :model-value="pageSize" @update:model-value="updatePageSize">
        <SelectTrigger class="h-8 w-20" :aria-label="labels.rowsPerPage">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in allowedPageSizes" :key="option" :value="String(option)">
            {{ option }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:justify-end">
      <span class="break-words text-muted-foreground">
        {{
          labels.pageOf
            .replace('{current}', String(currentPage))
            .replace('{total}', String(pageCount))
        }}
      </span>
      <div class="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          :disabled="!canGoPrevious"
          :aria-label="labels.previousPage"
          @click="goToPage(pagination.pageIndex - 1)"
        >
          <ChevronLeft class="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          :disabled="!canGoNext"
          :aria-label="labels.nextPage"
          @click="goToPage(pagination.pageIndex + 1)"
        >
          <ChevronRight class="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  </div>
</template>
