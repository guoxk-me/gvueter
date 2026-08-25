<script setup lang="ts">
import type { PaginationState } from '@tanstack/vue-table'
import type { AcceptableValue } from 'reka-ui'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getAcceptedPageSize,
  getAllowedPageSizes,
  getClampedPageIndex,
} from './pagination-contract'

const props = withDefaults(
  defineProps<{
    pagination: PaginationState
    pageCount: number
    pageSizeOptions?: readonly number[]
  }>(),
  {
    pageSizeOptions: () => [5, 10, 20, 50],
  },
)

const emit = defineEmits<{
  'update:pagination': [pagination: PaginationState]
}>()

const { t } = useI18n()
const allowedPageSizes = computed(() => getAllowedPageSizes(props.pageSizeOptions))
const pageSize = computed(() => String(props.pagination.pageSize))
const currentPage = computed(() => props.pagination.pageIndex + 1)
const canGoPrevious = computed(() => props.pagination.pageIndex > 0)
const canGoNext = computed(() => props.pagination.pageIndex < props.pageCount - 1)

function updatePageSize(value: AcceptableValue): void {
  const nextPageSize = getAcceptedPageSize(value, allowedPageSizes.value)
  if (nextPageSize === undefined || nextPageSize === props.pagination.pageSize)
    return

  // AI modified: page-size changes use one atomic state update and always return to page one.
  emit('update:pagination', { pageIndex: 0, pageSize: nextPageSize })
}

function goToPage(pageIndex: number): void {
  const nextPageIndex = getClampedPageIndex(pageIndex, props.pageCount)
  if (nextPageIndex !== props.pagination.pageIndex)
    emit('update:pagination', { ...props.pagination, pageIndex: nextPageIndex })
}
</script>

<template>
  <!-- AI modified: pagination groups wrap without pushing the page or table wider. -->
  <div
    class="flex min-w-0 flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
  >
    <div class="flex min-w-0 flex-wrap items-center gap-2 text-muted-foreground">
      <span class="break-words">{{ t('dataTable.rowsPerPage') }}</span>
      <Select :model-value="pageSize" @update:model-value="updatePageSize">
        <SelectTrigger class="h-8 w-18" :aria-label="t('dataTable.rowsPerPage')">
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
        {{ t('dataTable.pageOf', { current: currentPage, total: pageCount }) }}
      </span>
      <div class="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          :disabled="!canGoPrevious"
          :aria-label="t('dataTable.previousPage')"
          @click="goToPage(pagination.pageIndex - 1)"
        >
          <ChevronLeft class="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          :disabled="!canGoNext"
          :aria-label="t('dataTable.nextPage')"
          @click="goToPage(pagination.pageIndex + 1)"
        >
          <ChevronRight class="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  </div>
</template>
