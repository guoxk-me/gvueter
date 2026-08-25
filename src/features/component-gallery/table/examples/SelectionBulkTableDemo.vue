<script setup lang="ts">
import type { PaginationState, RowSelectionState, SortingState } from '@tanstack/vue-table'
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import type { CsvExportColumn } from '@/components/admin'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, nextTick, shallowRef } from 'vue'
import { BulkActionBar, CsvExportButton } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getTableExampleScenario, TABLE_WORK_ORDERS } from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

type StatusFilter = 'all' | TableWorkOrder['status']

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const columnHelper = createColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('selection-bulk')
const sourceRows = shallowRef<TableWorkOrder[]>(freshRows())
const selectedRowIds = shallowRef<RowSelectionState>({})
const pagination = shallowRef<PaginationState>({ pageIndex: 0, pageSize: 5 })
const sorting = shallowRef<SortingState>([])
const activeStatus = shallowRef<StatusFilter>('all')
const lastBulkAction = shallowRef('')
const selectedCount = computed(() => Object.keys(selectedRowIds.value).length)
const filteredRows = computed(() =>
  sourceRows.value.filter(
    row => activeStatus.value === 'all' || row.status === activeStatus.value,
  ),
)
const orderedFilteredRows = computed(() => {
  const activeSort = sorting.value[0]
  if (!activeSort)
    return filteredRows.value
  return [...filteredRows.value].sort((leftRow, rightRow) => {
    const leftText = String(leftRow[activeSort.id as 'id' | 'title' | 'owner' | 'status'])
    const rightText = String(rightRow[activeSort.id as 'id' | 'title' | 'owner' | 'status'])
    const direction = leftText.localeCompare(rightText)
    return activeSort.desc ? -direction : direction
  })
})
const currentPageRows = computed(() => {
  const startIndex = pagination.value.pageIndex * pagination.value.pageSize
  return orderedFilteredRows.value.slice(startIndex, startIndex + pagination.value.pageSize)
})
const selectedRows = computed(() => {
  const selectedIds = new Set(Object.keys(selectedRowIds.value))
  return sourceRows.value.filter(row => selectedIds.has(row.id))
})
const exportColumns = computed<readonly CsvExportColumn<TableWorkOrder>[]>(() => [
  { label: props.copy.columns.id, getValue: row => row.id },
  { label: props.copy.columns.title, getValue: row => row.title },
  { label: props.copy.columns.owner, getValue: row => row.owner },
  { label: props.copy.columns.status, getValue: row => props.copy.status[row.status] },
])
const columns = computed(() => [
  columnHelper.accessor('id', {
    header: props.copy.columns.id,
    meta: { textBehavior: 'nowrap', minWidth: 120 },
  }),
  columnHelper.accessor('title', {
    header: props.copy.columns.title,
    meta: { textBehavior: 'wrap', minWidth: 240 },
  }),
  columnHelper.accessor('owner', {
    header: props.copy.columns.owner,
    meta: { textBehavior: 'nowrap', minWidth: 150 },
  }),
  columnHelper.accessor('status', {
    header: props.copy.columns.status,
    meta: { textBehavior: 'nowrap', minWidth: 110 },
  }),
])

function freshRows(): TableWorkOrder[] {
  // Eleven rows make deleting the final selectable page observable: page 3 clamps back to page 2.
  return TABLE_WORK_ORDERS.slice(0, 11).map(row => ({ ...row }))
}

function updateStatusFilter(nextStatus: StatusFilter): void {
  activeStatus.value = nextStatus
  pagination.value = { ...pagination.value, pageIndex: 0 }
  selectedRowIds.value = {}
  // AI modified: data-shaping filters follow the shared contract by resetting page and stale selection together.
}

function handleStatusFilterChange(event: Event): void {
  const statusSelect = event.target
  if (statusSelect instanceof HTMLSelectElement)
    updateStatusFilter(statusSelect.value as StatusFilter)
}

function runBulkAction(action: 'archive' | 'assign'): void {
  const actionLabel = action === 'archive' ? props.copy.actions.archive : props.copy.actions.assign
  lastBulkAction.value = `${actionLabel}: ${Object.keys(selectedRowIds.value).join(', ')}`
}

async function deleteSelectedRows(): Promise<void> {
  const selectedIds = new Set(Object.keys(selectedRowIds.value))
  if (selectedIds.size === 0)
    return
  const remainingRows = sourceRows.value.filter(row => !selectedIds.has(row.id))
  const remainingFilteredCount = remainingRows.filter(
    row => activeStatus.value === 'all' || row.status === activeStatus.value,
  ).length
  const lastPageIndex = Math.max(
    Math.ceil(remainingFilteredCount / pagination.value.pageSize) - 1,
    0,
  )
  const clampedPageIndex = Math.min(pagination.value.pageIndex, lastPageIndex)
  sourceRows.value = remainingRows
  lastBulkAction.value = `${props.copy.selection.delete}: ${[...selectedIds].join(', ')}`
  selectedRowIds.value = {}
  await nextTick()
  pagination.value = { ...pagination.value, pageIndex: clampedPageIndex }
  // AI modified: the owner restores the nearest valid final page after TanStack observes the smaller client dataset.
}

function reportExport(scope: 'current' | 'selected' | 'filtered', rowCount: number): void {
  const scopeLabel
    = scope === 'current'
      ? props.copy.selection.exportCurrentPage
      : scope === 'selected'
        ? props.copy.selection.exportSelected
        : props.copy.selection.exportAll
  lastBulkAction.value = `${scopeLabel}: ${rowCount}`
  // AI modified: scope reporting stays in the demo while shared CSV escaping and formula safety stay in CsvExportButton.
}

function refreshRows(): void {
  sourceRows.value = freshRows()
  selectedRowIds.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
  lastBulkAction.value = props.copy.selection.refreshPolicy
  // AI modified: refresh discards selection because the authoritative dataset may have changed eligibility.
}
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <div class="flex min-w-0 flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3">
      <label class="min-w-48 space-y-1 text-xs font-medium">
        <span>{{ copy.selection.filterStatus }}</span>
        <select
          :value="activeStatus"
          class="h-9 w-full rounded-md border bg-background px-3 text-sm"
          data-testid="selection-status"
          @change="handleStatusFilterChange"
        >
          <option value="all">{{ copy.selection.allStatuses }}</option>
          <option value="open">{{ copy.status.open }}</option>
          <option value="blocked">{{ copy.status.blocked }}</option>
          <option value="done">{{ copy.status.done }}</option>
        </select>
      </label>
      <CsvExportButton
        :rows="currentPageRows"
        :columns="exportColumns"
        file-name="work-orders-current-page.csv"
        :label="copy.selection.exportCurrentPage"
        data-testid="export-current"
        @export="reportExport('current', $event)"
      />
      <CsvExportButton
        :rows="selectedRows"
        :columns="exportColumns"
        file-name="work-orders-selected.csv"
        :label="copy.selection.exportSelected"
        data-testid="export-selected"
        @export="reportExport('selected', $event)"
      />
      <CsvExportButton
        :rows="orderedFilteredRows"
        :columns="exportColumns"
        file-name="work-orders-filtered.csv"
        :label="copy.selection.exportAll"
        data-testid="export-filtered"
        @export="reportExport('filtered', $event)"
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        data-testid="refresh-selection"
        @click="refreshRows"
      >
        {{ copy.selection.refresh }}
      </Button>
    </div>
    <BulkActionBar
      :selected-count="selectedCount"
      :selection-label="copy.actions.selected"
      :clear-label="copy.actions.clear"
      @clear="selectedRowIds = {}"
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="bulk-archive"
        @click="runBulkAction('archive')"
      >
        {{ copy.actions.archive }}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="bulk-assign"
        @click="runBulkAction('assign')"
      >
        {{ copy.actions.assign }}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        data-testid="bulk-delete"
        @click="deleteSelectedRows"
      >
        {{ copy.selection.delete }}
      </Button>
    </BulkActionBar>
    <div class="flex min-w-0 flex-wrap justify-between gap-2 text-sm text-muted-foreground">
      <p role="status" data-testid="last-bulk-action">
        {{ copy.actions.lastBulkAction }}: {{ lastBulkAction || copy.actions.noBulkAction }}
      </p>
      <p data-testid="selection-page-state">
        {{ copy.selection.pageState }}: pageIndex={{ pagination.pageIndex }}, pageSize={{
          pagination.pageSize
        }}, rows={{ filteredRows.length }}
      </p>
    </div>
    <DataTable
      v-model:pagination="pagination"
      v-model:sorting="sorting"
      v-model:selected-row-ids="selectedRowIds"
      :columns="columns"
      :data="filteredRows"
      :empty-message="copy.messages.noRows"
      :default-page-size="5"
      :page-size-options="[5, 10]"
      enable-row-selection
      :get-row-id="(row) => row.id"
      :get-row-can-select="(row) => row.status !== 'done'"
    >
      <template #cell="{ cell, row }">
        <Badge v-if="cell.column.id === 'status'" variant="outline">
          {{ copy.status[row.original.status] }}
        </Badge>
        <span v-else>{{ cell.getValue() }}</span>
      </template>
    </DataTable>
    <template #note>
      {{ copy.selection.refreshPolicy }}
    </template>
  </TableExampleCard>
</template>
