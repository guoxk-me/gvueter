<script setup lang="ts" generic="TData extends RowData">
import type {
  Column,
  PaginationState,
  Row,
  RowData,
  RowSelectionState,
  SortingState,
  TableState,
  Updater,
} from '@tanstack/vue-table'
import type { DataTableColumnDef } from './types'
import { ArrowDown, ArrowUp, ChevronsUpDown } from '@lucide/vue'
import {
  FlexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  isFunction,
  useVueTable,
} from '@tanstack/vue-table'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import DataTablePagination from './DataTablePagination.vue'
import {
  getAcceptedPageSize,
  getAllowedPageSizes,
  getClampedPagination,
  getTablePageCount,
} from './pagination-contract'
import { TABLE_COLUMN_TEXT_CLASSES } from './types'

const props = withDefaults(
  defineProps<{
    columns: DataTableColumnDef<TData>[]
    data: TData[]
    emptyMessage: string
    isLoading?: boolean
    defaultPageSize?: number
    pageSizeOptions?: readonly number[]
    getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
    getRowLabel?: (originalRow: TData) => string
    enableRowSelection?: boolean
    getRowCanSelect?: (originalRow: TData) => boolean
  }>(),
  {
    isLoading: false,
    defaultPageSize: 10,
    pageSizeOptions: () => [5, 10, 20, 50],
    enableRowSelection: false,
  },
)

const emit = defineEmits<{
  paginationChange: [pagination: PaginationState]
  sortingChange: [sorting: SortingState]
  selectionChange: [selectedRowIds: RowSelectionState]
}>()

const { t } = useI18n()
const paginationModel = defineModel<PaginationState>('pagination')
const sortingModel = defineModel<SortingState>('sorting')
const selectedRowIds = defineModel<RowSelectionState>('selectedRowIds', { default: () => ({}) })
const allowedPageSizes = computed(() => getAllowedPageSizes(props.pageSizeOptions))
const initialPageSize =
  getAcceptedPageSize(props.defaultPageSize, allowedPageSizes.value) ??
  allowedPageSizes.value[0] ??
  10
const internalPagination = shallowRef<PaginationState>({
  pageIndex: 0,
  pageSize: initialPageSize,
})
const internalSorting = shallowRef<SortingState>([])
const pagination = computed<PaginationState>({
  get: () => paginationModel.value ?? internalPagination.value,
  set: (nextPagination) => {
    if (paginationModel.value === undefined) internalPagination.value = nextPagination
    else paginationModel.value = nextPagination
  },
})
const sorting = computed<SortingState>({
  get: () => sortingModel.value ?? internalSorting.value,
  set: (nextSorting) => {
    if (sortingModel.value === undefined) internalSorting.value = nextSorting
    else sortingModel.value = nextSorting
  },
})
const reactiveTableState = computed<Partial<TableState>>(() => ({
  pagination: pagination.value,
  sorting: sorting.value,
  rowSelection: selectedRowIds.value,
}))
const pageCount = computed(() => getTablePageCount(props.data.length, pagination.value.pageSize))

function nextState<T>(updater: Updater<T>, currentValue: T): T {
  return isFunction(updater) ? updater(currentValue) : updater
}

const table = useVueTable({
  // AI modified: centralize sorting and pagination so feature tables only describe their columns.
  get columns() {
    return props.columns
  },
  get data() {
    return props.data
  },
  getRowId: props.getRowId,
  get state() {
    return reactiveTableState.value
  },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  enableRowSelection: (row) =>
    props.enableRowSelection && (props.getRowCanSelect?.(row.original) ?? true),
  onPaginationChange: (updater) => applyPaginationChange(nextState(updater, pagination.value)),
  onSortingChange: (updater) => {
    const nextSorting = nextState(updater, sorting.value)
    const previousPageIndex = pagination.value.pageIndex
    const nextPagination = { ...pagination.value, pageIndex: 0 }
    const nextSelection = clearSelectionForDataChange()
    sorting.value = nextSorting
    pagination.value = nextPagination
    syncTableState({
      sorting: nextSorting,
      pagination: nextPagination,
      rowSelection: nextSelection,
    })
    if (previousPageIndex !== 0) emit('paginationChange', nextPagination)
    emit('sortingChange', nextSorting)
  },
  onRowSelectionChange: (updater) => {
    const nextSelection = nextState(updater, selectedRowIds.value)
    selectedRowIds.value = nextSelection
    syncTableState({ rowSelection: nextSelection })
    emit('selectionChange', nextSelection)
  },
})

function syncTableState(state: Partial<TableState>): void {
  // AI modified: controlled updates also restore reactive option values materialized by object spread.
  table.setOptions((previousOptions) => ({
    ...previousOptions,
    columns: props.columns,
    data: props.data,
    state: { ...table.initialState, ...previousOptions.state, ...state },
  }))
}

function clearSelectionForDataChange(): RowSelectionState {
  if (Object.keys(selectedRowIds.value).length === 0) return selectedRowIds.value

  // AI modified: filters, refreshes, sorting, and page-size changes clear stale selections.
  const nextSelection: RowSelectionState = {}
  selectedRowIds.value = nextSelection
  emit('selectionChange', nextSelection)
  return nextSelection
}

function applyPaginationChange(requestedPagination: PaginationState): void {
  const nextPageSize = getAcceptedPageSize(requestedPagination.pageSize, allowedPageSizes.value)
  if (nextPageSize === undefined) return

  const isPageSizeChange = nextPageSize !== pagination.value.pageSize
  const nextPagination = getClampedPagination(
    {
      pageIndex: isPageSizeChange ? 0 : requestedPagination.pageIndex,
      pageSize: nextPageSize,
    },
    getTablePageCount(props.data.length, nextPageSize),
  )
  if (
    nextPagination.pageIndex === pagination.value.pageIndex &&
    nextPagination.pageSize === pagination.value.pageSize
  ) {
    return
  }

  const nextSelection = isPageSizeChange ? clearSelectionForDataChange() : selectedRowIds.value
  pagination.value = nextPagination
  syncTableState({ pagination: nextPagination, rowSelection: nextSelection })
  emit('paginationChange', nextPagination)
}

function getRowsForState(_state: Partial<TableState>, _data: TData[]): Row<TData>[] {
  return table.getRowModel().rows
}

function getHeaderGroupsForState(_state: Partial<TableState>) {
  return table.getHeaderGroups()
}

// AI modified: same-page API replacements must invalidate Vue's cached TanStack row projection.
const rows = computed(() => getRowsForState(reactiveTableState.value, props.data))
const headerGroups = computed(() => getHeaderGroupsForState(reactiveTableState.value))
const columnCount = computed(() => table.getAllLeafColumns().length)
const totalColumnCount = computed(() => columnCount.value + (props.enableRowSelection ? 1 : 0))
const canSelectRows = computed(() => rows.value.some((row) => row.getCanSelect()))

function updateAllRowSelection(value: boolean | 'indeterminate'): void {
  table.toggleAllPageRowsSelected(value === true)
}

function updateRowSelection(row: Row<TData>, value: boolean | 'indeterminate'): void {
  row.toggleSelected(value === true)
}

function getColumnAriaSort(column: Column<TData>): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.getCanSort()) return undefined

  // AI modified: expose TanStack's visual sort state on the semantic column header.
  const sortDirection = column.getIsSorted()
  if (sortDirection === 'asc') return 'ascending'
  if (sortDirection === 'desc') return 'descending'
  return 'none'
}

function getRowSelectionLabel(row: Row<TData>): string {
  // AI modified: selection controls identify the business row instead of repeating a generic name.
  const readableRowLabel = props.getRowLabel?.(row.original).trim() || row.id
  return `${t('dataTable.selectRow')}: ${readableRowLabel}`
}

watch([() => props.data, () => props.data.length], () => {
  const nextSelection = clearSelectionForDataChange()
  const nextPagination = getClampedPagination(pagination.value, pageCount.value)
  if (nextPagination.pageIndex === pagination.value.pageIndex) {
    syncTableState({ rowSelection: nextSelection })
    return
  }

  pagination.value = nextPagination
  syncTableState({ pagination: nextPagination, rowSelection: nextSelection })
  emit('paginationChange', nextPagination)
})

watch(
  [allowedPageSizes, () => pagination.value.pageIndex, () => pagination.value.pageSize, pageCount],
  () => {
    const safePageSize =
      getAcceptedPageSize(pagination.value.pageSize, allowedPageSizes.value) ??
      allowedPageSizes.value[0] ??
      10
    const safePagination = getClampedPagination(
      {
        pageIndex: safePageSize === pagination.value.pageSize ? pagination.value.pageIndex : 0,
        pageSize: safePageSize,
      },
      getTablePageCount(props.data.length, safePageSize),
    )
    if (
      safePagination.pageIndex === pagination.value.pageIndex &&
      safePagination.pageSize === pagination.value.pageSize
    ) {
      return
    }

    // AI modified: invalid external state and shrinking datasets recover without a blank page.
    pagination.value = safePagination
    syncTableState({ pagination: safePagination })
    emit('paginationChange', safePagination)
  },
  { immediate: true },
)
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border">
    <Table>
      <TableHeader>
        <TableRow v-for="headerGroup in headerGroups" :key="headerGroup.id">
          <TableHead v-if="enableRowSelection" class="w-10 px-3">
            <Checkbox
              :model-value="
                table.getIsAllPageRowsSelected()
                  ? true
                  : table.getIsSomePageRowsSelected()
                    ? 'indeterminate'
                    : false
              "
              :aria-label="t('dataTable.selectAll')"
              :disabled="!canSelectRows"
              @update:model-value="updateAllRowSelection"
            />
          </TableHead>
          <TableHead
            v-for="header in headerGroup.headers"
            :key="header.id"
            :aria-sort="getColumnAriaSort(header.column)"
            :class="[
              header.column.id === 'actions' ? 'w-12' : undefined,
              header.column.columnDef.meta?.headerClass,
              TABLE_COLUMN_TEXT_CLASSES[header.column.columnDef.meta?.textBehavior ?? 'wrap'],
            ]"
            :style="
              header.column.columnDef.meta?.minWidth
                ? { minWidth: `${header.column.columnDef.meta.minWidth}px` }
                : undefined
            "
          >
            <template v-if="!header.isPlaceholder">
              <Button
                v-if="header.column.getCanSort()"
                variant="ghost"
                class="-ml-3 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                @click="header.column.toggleSorting()"
              >
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                <ArrowUp
                  v-if="header.column.getIsSorted() === 'asc'"
                  class="ml-1 size-3.5"
                  aria-hidden="true"
                />
                <ArrowDown
                  v-else-if="header.column.getIsSorted() === 'desc'"
                  class="ml-1 size-3.5"
                  aria-hidden="true"
                />
                <ChevronsUpDown v-else class="ml-1 size-3.5" aria-hidden="true" />
              </Button>
              <span v-else-if="header.column.id === 'actions'" class="sr-only">
                {{ t('common.actions') }}
              </span>
              <FlexRender
                v-else
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </template>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="isLoading">
          <TableRow v-for="rowIndex in defaultPageSize" :key="rowIndex">
            <TableCell v-if="enableRowSelection">
              <Skeleton class="size-4" />
            </TableCell>
            <TableCell v-for="columnIndex in columnCount" :key="columnIndex">
              <Skeleton class="h-5 w-full" />
            </TableCell>
          </TableRow>
        </template>
        <TableEmpty v-else-if="rows.length === 0" :colspan="totalColumnCount">
          {{ emptyMessage }}
        </TableEmpty>
        <TableRow v-for="row in rows" v-else :key="row.id">
          <TableCell v-if="enableRowSelection" class="px-3">
            <Checkbox
              :model-value="row.getIsSelected()"
              :aria-label="getRowSelectionLabel(row)"
              :disabled="!row.getCanSelect()"
              @update:model-value="updateRowSelection(row, $event)"
            />
          </TableCell>
          <TableCell
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            :class="[
              cell.column.columnDef.meta?.cellClass,
              TABLE_COLUMN_TEXT_CLASSES[cell.column.columnDef.meta?.textBehavior ?? 'wrap'],
            ]"
            :style="
              cell.column.columnDef.meta?.minWidth
                ? { minWidth: `${cell.column.columnDef.meta.minWidth}px` }
                : undefined
            "
          >
            <slot name="cell" :cell="cell" :row="row">
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </slot>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <DataTablePagination
      :pagination="pagination"
      :page-count="pageCount"
      :page-size-options="allowedPageSizes"
      @update:pagination="applyPaginationChange"
    />
  </div>
</template>
