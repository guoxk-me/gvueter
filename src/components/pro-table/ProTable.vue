<script setup lang="ts" generic="TData extends RowData">
import type {
  Cell,
  Column,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ExpandedState,
  PaginationState,
  Row,
  RowData,
  RowSelectionState,
  SortingState,
  TableState,
  Updater,
  VisibilityState,
} from '@tanstack/vue-table'
import type { VirtualItem } from '@tanstack/vue-virtual'
import type { CSSProperties } from 'vue'
import type {
  ProTableColumnDef,
  ProTableDensity,
  ProTableEditCommit,
  ProTableLabels,
} from './types'
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown } from '@lucide/vue'
import {
  FlexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  isFunction,
  useVueTable,
} from '@tanstack/vue-table'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import {
  getAcceptedPageSize,
  getAllowedPageSizes,
  getClampedPagination,
  getTablePageCount,
} from '@/components/data-table/pagination-contract'
import { TABLE_COLUMN_TEXT_CLASSES } from '@/components/data-table/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import ProTablePagination from './ProTablePagination.vue'
import ProTableToolbar from './ProTableToolbar.vue'

interface RenderedRow<T> {
  key: string | number
  row: Row<T>
  virtualItem?: VirtualItem
}

const props = withDefaults(
  defineProps<{
    columns: ProTableColumnDef<TData>[]
    data: TData[]
    labels: ProTableLabels
    emptyMessage: string
    isLoading?: boolean
    rowCount?: number
    pageSizeOptions?: readonly number[]
    manualPagination?: boolean
    manualSorting?: boolean
    manualFiltering?: boolean
    enableRowSelection?: boolean
    enableExpanding?: boolean
    enableVirtualization?: boolean
    virtualHeight?: number
    virtualOverscan?: number
    enableColumnControls?: boolean
    enableColumnOrdering?: boolean
    enableColumnPinning?: boolean
    enableDensity?: boolean
    enableFullscreen?: boolean
    getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
    getRowLabel?: (originalRow: TData) => string
    getSubRows?: (originalRow: TData, index: number) => TData[] | undefined
    getRowCanSelect?: (originalRow: TData) => boolean
    getRowCanExpand?: (row: Row<TData>) => boolean
  }>(),
  {
    isLoading: false,
    rowCount: undefined,
    pageSizeOptions: () => [10, 20, 50, 100],
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
    enableRowSelection: false,
    enableExpanding: false,
    enableVirtualization: false,
    virtualHeight: 480,
    virtualOverscan: 8,
    enableColumnControls: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
    enableDensity: true,
    enableFullscreen: true,
  },
)

const emit = defineEmits<{
  paginationChange: [pagination: PaginationState]
  sortingChange: [sorting: SortingState]
  filterChange: [filters: ColumnFiltersState]
  selectionChange: [selection: { selectedRowIds: RowSelectionState; rows: TData[] }]
  expandedChange: [expanded: ExpandedState]
  editCommit: [change: ProTableEditCommit<TData>]
}>()

const slots = defineSlots<{
  cell?: (props: { cell: Cell<TData, unknown>; row: Row<TData> }) => unknown
  'expanded-row'?: (props: { row: Row<TData> }) => unknown
  'toolbar-leading'?: () => unknown
  'toolbar-import'?: () => unknown
  'toolbar-export'?: () => unknown
  'toolbar-print'?: () => unknown
}>()

const pagination = defineModel<PaginationState>('pagination', {
  default: () => ({ pageIndex: 0, pageSize: 10 }),
})
const sorting = defineModel<SortingState>('sorting', { default: () => [] })
const columnFilters = defineModel<ColumnFiltersState>('columnFilters', { default: () => [] })
const selectedRowIds = defineModel<RowSelectionState>('selectedRowIds', { default: () => ({}) })
const columnVisibility = defineModel<VisibilityState>('columnVisibility', { default: () => ({}) })
const columnOrder = defineModel<ColumnOrderState>('columnOrder', { default: () => [] })
const columnPinning = defineModel<ColumnPinningState>('columnPinning', {
  default: () => ({ left: [], right: [] }),
})
const expanded = defineModel<ExpandedState>('expanded', { default: () => ({}) })
const density = defineModel<ProTableDensity>('density', { default: 'standard' })
const allowedPageSizes = computed(() => getAllowedPageSizes(props.pageSizeOptions))

const reactiveTableState = computed<Partial<TableState>>(() => ({
  pagination: pagination.value,
  sorting: sorting.value,
  columnFilters: columnFilters.value,
  rowSelection: selectedRowIds.value,
  columnVisibility: columnVisibility.value,
  columnOrder: columnOrder.value,
  columnPinning: columnPinning.value,
  expanded: expanded.value,
}))

const tableRoot = useTemplateRef<HTMLDivElement>('tableRoot')
const tableViewport = useTemplateRef<HTMLDivElement>('tableViewport')
const editingCellId = shallowRef<string>()
const editingCellTrigger = shallowRef<HTMLElement>()
const editValue = shallowRef('')
const isFullscreen = shallowRef(false)

function nextState<T>(updater: Updater<T>, currentValue: T): T {
  return isFunction(updater) ? updater(currentValue) : updater
}

const table = useVueTable({
  get columns() {
    return props.columns
  },
  get data() {
    return props.data
  },
  get rowCount() {
    return props.rowCount
  },
  get state() {
    return reactiveTableState.value
  },
  getRowId: props.getRowId,
  getSubRows: props.getSubRows,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  manualPagination: props.manualPagination,
  manualSorting: props.manualSorting,
  manualFiltering: props.manualFiltering,
  enableRowSelection: (row) =>
    props.enableRowSelection && (props.getRowCanSelect?.(row.original) ?? true),
  enableExpanding: props.enableExpanding,
  getRowCanExpand: props.getRowCanExpand,
  enableColumnPinning: props.enableColumnPinning,
  onPaginationChange: (updater) => {
    applyPaginationChange(nextState(updater, pagination.value))
  },
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
  onColumnFiltersChange: (updater) => {
    const nextFilters = nextState(updater, columnFilters.value)
    const previousPageIndex = pagination.value.pageIndex
    const nextPagination = { ...pagination.value, pageIndex: 0 }
    const nextSelection = clearSelectionForDataChange()
    columnFilters.value = nextFilters
    pagination.value = nextPagination
    syncTableState({
      columnFilters: nextFilters,
      pagination: nextPagination,
      rowSelection: nextSelection,
    })
    if (previousPageIndex !== 0) emit('paginationChange', nextPagination)
    emit('filterChange', nextFilters)
  },
  onRowSelectionChange: (updater) => {
    const nextSelection = nextState(updater, selectedRowIds.value)
    selectedRowIds.value = nextSelection
    syncTableState({ rowSelection: nextSelection })
    const selectedRows = table
      .getCoreRowModel()
      .flatRows.filter((row) => nextSelection[row.id])
      .map((row) => row.original)
    emit('selectionChange', { selectedRowIds: nextSelection, rows: selectedRows })
  },
  onColumnVisibilityChange: (updater) => {
    columnVisibility.value = nextState(updater, columnVisibility.value)
    syncTableState({ columnVisibility: columnVisibility.value })
  },
  onColumnOrderChange: (updater) => {
    columnOrder.value = nextState(updater, columnOrder.value)
    syncTableState({ columnOrder: columnOrder.value })
  },
  onColumnPinningChange: (updater) => {
    columnPinning.value = nextState(updater, columnPinning.value)
    syncTableState({ columnPinning: columnPinning.value })
  },
  onExpandedChange: (updater) => {
    const nextExpanded = nextState(updater, expanded.value)
    expanded.value = nextExpanded
    syncTableState({ expanded: nextExpanded })
    emit('expandedChange', nextExpanded)
  },
})

function syncTableState(state: Partial<TableState>): void {
  // AI modified: controlled model updates reach TanStack memoized row models in the same interaction.
  table.setOptions((previousOptions) => ({
    ...previousOptions,
    state: { ...table.initialState, ...previousOptions.state, ...state },
  }))
}

function clearSelectionForDataChange(): RowSelectionState {
  if (Object.keys(selectedRowIds.value).length === 0) return selectedRowIds.value

  // AI modified: data-shaping changes clear selection; ordinary page navigation preserves stable IDs.
  const nextSelection: RowSelectionState = {}
  selectedRowIds.value = nextSelection
  emit('selectionChange', { selectedRowIds: nextSelection, rows: [] })
  return nextSelection
}

const rowHeight = computed(() => {
  if (density.value === 'compact') return 36
  if (density.value === 'comfortable') return 56
  return 44
})
function getRowsForState(_state: Partial<TableState>): Row<TData>[] {
  return table.getRowModel().rows
}

function getHeaderGroupsForState(_state: Partial<TableState>) {
  return table.getHeaderGroups()
}

function getColumnCountForState(_state: Partial<TableState>): number {
  return table.getVisibleLeafColumns().length
}

function getColumnWidth(column: Column<TData>): number {
  const declaredMinimumWidth = column.columnDef.meta?.minWidth
  return typeof declaredMinimumWidth === 'number' && Number.isFinite(declaredMinimumWidth)
    ? Math.max(column.getSize(), declaredMinimumWidth)
    : column.getSize()
}

function getTableSizeForState(_state: Partial<TableState>): number {
  return table
    .getVisibleLeafColumns()
    .reduce((totalWidth, column) => totalWidth + getColumnWidth(column), 0)
}

function getPaginationRowCountForState(_state: Partial<TableState>): number {
  return props.manualPagination
    ? (props.rowCount ?? 0)
    : table.getPrePaginationRowModel().rows.length
}

const rows = computed(() => getRowsForState(reactiveTableState.value))
const headerGroups = computed(() => getHeaderGroupsForState(reactiveTableState.value))
const columnCount = computed(() => getColumnCountForState(reactiveTableState.value))
const leadingColumnCount = computed(
  () => Number(props.enableRowSelection) + Number(props.enableExpanding),
)
const totalColumnCount = computed(() => columnCount.value + leadingColumnCount.value)
const tableMinWidth = computed(
  () => getTableSizeForState(reactiveTableState.value) + leadingColumnCount.value * 44,
)
const paginationRowCount = computed(() => getPaginationRowCountForState(reactiveTableState.value))
const pageCount = computed(() => {
  const knownPageCount = getTablePageCount(paginationRowCount.value, pagination.value.pageSize)
  // AI modified: loading server pages keep the restored page reachable until the authoritative total arrives.
  return props.manualPagination && props.isLoading
    ? Math.max(knownPageCount, pagination.value.pageIndex + 1)
    : knownPageCount
})

function applyPaginationChange(requestedPagination: PaginationState): void {
  const nextPageSize = getAcceptedPageSize(requestedPagination.pageSize, allowedPageSizes.value)
  if (nextPageSize === undefined) return

  const isPageSizeChange = nextPageSize !== pagination.value.pageSize
  const requestedState = {
    pageIndex: isPageSizeChange ? 0 : requestedPagination.pageIndex,
    pageSize: nextPageSize,
  }
  const nextPageCount = getTablePageCount(paginationRowCount.value, nextPageSize)
  const nextPagination = getClampedPagination(requestedState, nextPageCount)
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

watch(
  [
    allowedPageSizes,
    pageCount,
    () => pagination.value.pageIndex,
    () => pagination.value.pageSize,
    () => props.isLoading,
  ],
  () => {
    const safePageSize =
      getAcceptedPageSize(pagination.value.pageSize, allowedPageSizes.value) ??
      allowedPageSizes.value[0] ??
      10
    const requestedPagination = {
      pageIndex: safePageSize === pagination.value.pageSize ? pagination.value.pageIndex : 0,
      pageSize: safePageSize,
    }
    // AI modified: a loading server total is unknown, so URL-restored pages wait for the response before max clamping.
    const safePagination =
      props.manualPagination && props.isLoading
        ? {
            ...requestedPagination,
            pageIndex: Number.isSafeInteger(requestedPagination.pageIndex)
              ? Math.max(requestedPagination.pageIndex, 0)
              : 0,
          }
        : getClampedPagination(
            requestedPagination,
            getTablePageCount(paginationRowCount.value, safePageSize),
          )

    if (
      safePagination.pageIndex === pagination.value.pageIndex &&
      safePagination.pageSize === pagination.value.pageSize
    ) {
      return
    }

    // AI modified: total/filter shrink and invalid external state recover to a valid page immediately.
    pagination.value = safePagination
    syncTableState({ pagination: safePagination })
    emit('paginationChange', safePagination)
  },
  { immediate: true },
)

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: props.enableVirtualization ? rows.value.length : 0,
    getScrollElement: () => tableViewport.value,
    estimateSize: (index: number) => {
      const row = rows.value[index]
      return row?.getIsExpanded() && slots['expanded-row'] ? rowHeight.value * 2 : rowHeight.value
    },
    getItemKey: (index: number) => rows.value[index]?.id ?? index,
    overscan: props.virtualOverscan,
    initialRect: { width: 0, height: props.virtualHeight },
  })),
)

const renderedRows = computed<RenderedRow<TData>[]>(() => {
  if (!props.enableVirtualization) return rows.value.map((row) => ({ key: row.id, row }))

  const virtualItems = rowVirtualizer.value.getVirtualItems()
  if (virtualItems.length === 0) {
    // AI modified: SSR/hidden containers keep a bounded first viewport until dimensions are observable.
    const fallbackCount = Math.ceil(props.virtualHeight / rowHeight.value) + props.virtualOverscan
    return rows.value.slice(0, fallbackCount).map((row) => ({ key: row.id, row }))
  }

  return virtualItems.flatMap((virtualItem) => {
    const row = rows.value[virtualItem.index]
    return row ? [{ key: String(virtualItem.key), row, virtualItem }] : []
  })
})

const bodyStyle = computed<CSSProperties | undefined>(() => {
  if (!props.enableVirtualization) return undefined
  return {
    display: 'grid',
    height: `${rowVirtualizer.value.getTotalSize()}px`,
    position: 'relative',
  }
})

function getRowStyle(renderedRow: RenderedRow<TData>): CSSProperties | undefined {
  // AI modified: non-virtual rows may grow when a column intentionally wraps long business text.
  if (!renderedRow.virtualItem) return { minHeight: `${rowHeight.value}px` }
  return {
    display: 'flex',
    height: `${rowHeight.value}px`,
    position: 'absolute',
    transform: `translateY(${renderedRow.virtualItem.start}px)`,
    width: '100%',
  }
}

function getExpandedRowStyle(renderedRow: RenderedRow<TData>): CSSProperties | undefined {
  if (!renderedRow.virtualItem) return { minHeight: `${rowHeight.value}px` }
  return {
    display: 'flex',
    height: `${rowHeight.value}px`,
    position: 'absolute',
    transform: `translateY(${renderedRow.virtualItem.start + rowHeight.value}px)`,
    width: '100%',
  }
}

function getColumnStyle(column: Column<TData>): CSSProperties {
  const pinned = column.getIsPinned()
  const leadingWidth = leadingColumnCount.value * 44
  // AI modified: declared content minima participate in the actual flex width instead of being cosmetic metadata.
  const columnWidth = getColumnWidth(column)
  const pinnedColumns =
    pinned === 'left'
      ? table.getLeftVisibleLeafColumns()
      : pinned === 'right'
        ? table.getRightVisibleLeafColumns()
        : []
  const pinnedIndex = pinnedColumns.findIndex((pinnedColumn) => pinnedColumn.id === column.id)
  const leftOffset =
    pinned === 'left'
      ? leadingWidth +
        pinnedColumns
          .slice(0, Math.max(pinnedIndex, 0))
          .reduce((totalWidth, pinnedColumn) => totalWidth + getColumnWidth(pinnedColumn), 0)
      : undefined
  const rightOffset =
    pinned === 'right'
      ? pinnedColumns
          .slice(pinnedIndex + 1)
          .reduce((totalWidth, pinnedColumn) => totalWidth + getColumnWidth(pinnedColumn), 0)
      : undefined
  return {
    width: `${columnWidth}px`,
    minWidth: `${columnWidth}px`,
    flex: `1 0 ${columnWidth}px`,
    position: pinned ? 'sticky' : 'relative',
    left: leftOffset === undefined ? undefined : `${leftOffset}px`,
    right: rightOffset === undefined ? undefined : `${rightOffset}px`,
    zIndex: pinned ? 2 : 0,
    background: pinned ? 'var(--background)' : undefined,
  }
}

function updateAllRowSelection(value: boolean | 'indeterminate'): void {
  table.toggleAllPageRowsSelected(value === true)
}

function updateRowSelection(row: Row<TData>, value: boolean | 'indeterminate'): void {
  row.toggleSelected(value === true)
}

function getColumnAriaSort(column: Column<TData>): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.getCanSort()) return undefined

  // AI modified: the semantic header mirrors the visible sort direction for assistive technology.
  const sortDirection = column.getIsSorted()
  if (sortDirection === 'asc') return 'ascending'
  if (sortDirection === 'desc') return 'descending'
  return 'none'
}

function getRowSelectionLabel(row: Row<TData>): string {
  // AI modified: row selection names include a stable business identifier when one is supplied.
  const readableRowLabel = props.getRowLabel?.(row.original).trim() || row.id
  return `${props.labels.selectRow}: ${readableRowLabel}`
}

function beginCellEdit(cell: Cell<TData, unknown>, event: MouseEvent | KeyboardEvent): void {
  if (!cell.column.columnDef.meta?.editable || props.isLoading) return
  if (!(event.currentTarget instanceof HTMLElement)) return

  editingCellId.value = cell.id
  editingCellTrigger.value = event.currentTarget
  editValue.value = String(cell.getValue() ?? '')
}

function handleCellEditKeydown(cell: Cell<TData, unknown>, event: KeyboardEvent): void {
  if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== 'F2')) return

  event.preventDefault()
  beginCellEdit(cell, event)
}

function restoreEditingCellFocus(): void {
  const trigger = editingCellTrigger.value
  editingCellTrigger.value = undefined
  // AI modified: keyboard editing returns focus to the cell that opened the editor.
  void nextTick(() => {
    if (trigger?.isConnected) trigger.focus()
  })
}

function cancelCellEdit(): void {
  editingCellId.value = undefined
  restoreEditingCellFocus()
}

function commitCellEdit(
  cell: Cell<TData, unknown>,
  row: Row<TData>,
  shouldRestoreFocus = true,
): void {
  if (editingCellId.value !== cell.id) return

  const change: ProTableEditCommit<TData> = {
    row: row.original,
    rowId: row.id,
    columnId: cell.column.id,
    value: editValue.value,
    previousValue: cell.getValue(),
  }
  editingCellId.value = undefined
  emit('editCommit', change)
  if (shouldRestoreFocus) restoreEditingCellFocus()
  else editingCellTrigger.value = undefined
}

async function toggleFullscreen(): Promise<void> {
  const root = tableRoot.value
  if (!root) return

  if (isFullscreen.value && document.fullscreenElement !== root) {
    isFullscreen.value = false
    return
  }

  if (document.fullscreenElement === root) {
    await document.exitFullscreen?.()
    isFullscreen.value = false
    return
  }

  if (root.requestFullscreen) await root.requestFullscreen()
  isFullscreen.value = true
  await nextTick()
}

function syncFullscreenState(): void {
  isFullscreen.value = document.fullscreenElement === tableRoot.value
}

onMounted(() => document.addEventListener('fullscreenchange', syncFullscreenState))
onUnmounted(() => document.removeEventListener('fullscreenchange', syncFullscreenState))
</script>

<template>
  <div
    ref="tableRoot"
    class="overflow-hidden rounded-lg border border-border bg-background"
    :class="{ 'fixed inset-0 z-50 flex flex-col rounded-none': isFullscreen }"
    data-testid="pro-table"
  >
    <ProTableToolbar
      :table="table"
      :labels="labels"
      :density="density"
      :column-order="columnOrder"
      :is-fullscreen="isFullscreen"
      :enable-column-controls="enableColumnControls"
      :enable-column-ordering="enableColumnOrdering"
      :enable-column-pinning="enableColumnPinning"
      :enable-density="enableDensity"
      :enable-fullscreen="enableFullscreen"
      @density-change="density = $event"
      @fullscreen-toggle="toggleFullscreen"
    >
      <template #leading>
        <slot name="toolbar-leading" />
      </template>
      <template #import>
        <slot name="toolbar-import" />
      </template>
      <template #export>
        <slot name="toolbar-export" />
      </template>
      <template #print>
        <slot name="toolbar-print" />
      </template>
    </ProTableToolbar>

    <div
      ref="tableViewport"
      class="overflow-auto"
      :class="{ 'flex-1': isFullscreen }"
      :style="enableVirtualization ? { maxHeight: `${virtualHeight}px` } : undefined"
      data-testid="pro-table-viewport"
    >
      <table
        class="grid w-full border-collapse text-sm"
        :style="{ minWidth: `${tableMinWidth}px` }"
      >
        <thead class="sticky top-0 z-10 grid border-b border-border bg-muted/60 backdrop-blur">
          <tr
            v-for="headerGroup in headerGroups"
            :key="headerGroup.id"
            class="flex w-full"
            :style="{ height: `${rowHeight}px` }"
          >
            <th
              v-if="enableRowSelection"
              class="sticky left-0 z-20 flex w-11 shrink-0 items-center justify-center bg-muted/95"
            >
              <Checkbox
                :model-value="
                  table.getIsAllPageRowsSelected()
                    ? true
                    : table.getIsSomePageRowsSelected()
                      ? 'indeterminate'
                      : false
                "
                :aria-label="labels.selectAll"
                @update:model-value="updateAllRowSelection"
              />
            </th>
            <th
              v-if="enableExpanding"
              class="sticky z-20 flex w-11 shrink-0 items-center justify-center bg-muted/95"
              :style="{ left: enableRowSelection ? '44px' : '0' }"
            />
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              :aria-sort="getColumnAriaSort(header.column)"
              class="flex items-center px-3 text-left text-xs font-medium text-muted-foreground"
              :class="[
                header.column.columnDef.meta?.headerClass,
                TABLE_COLUMN_TEXT_CLASSES[header.column.columnDef.meta?.textBehavior ?? 'wrap'],
              ]"
              :style="getColumnStyle(header.column)"
              scope="col"
            >
              <template v-if="!header.isPlaceholder">
                <Button
                  v-if="header.column.getCanSort()"
                  type="button"
                  variant="ghost"
                  class="-ml-3 h-auto min-h-8 min-w-0 px-3 py-1 text-left text-xs font-medium whitespace-normal"
                  @click="header.column.toggleSorting()"
                >
                  <FlexRender
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
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
                <FlexRender
                  v-else
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </template>
            </th>
          </tr>
        </thead>

        <tbody v-if="isLoading" class="grid">
          <tr
            v-for="rowIndex in pagination.pageSize"
            :key="rowIndex"
            class="flex w-full border-b border-border last:border-0"
            :style="{ height: `${rowHeight}px` }"
          >
            <td
              v-for="columnIndex in totalColumnCount"
              :key="columnIndex"
              class="flex flex-1 items-center px-3"
            >
              <Skeleton class="h-4 w-full" />
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="rows.length === 0" class="grid">
          <tr>
            <td :colspan="totalColumnCount" class="py-12 text-center text-sm text-muted-foreground">
              {{ emptyMessage }}
            </td>
          </tr>
        </tbody>
        <tbody v-else class="grid" :style="bodyStyle">
          <template v-for="renderedRow in renderedRows" :key="renderedRow.key">
            <tr
              class="flex w-full border-b border-border hover:bg-muted/40"
              :style="getRowStyle(renderedRow)"
              :data-row-id="renderedRow.row.id"
            >
              <td
                v-if="enableRowSelection"
                class="sticky left-0 z-10 flex w-11 shrink-0 items-center justify-center bg-background"
              >
                <Checkbox
                  :model-value="renderedRow.row.getIsSelected()"
                  :disabled="!renderedRow.row.getCanSelect()"
                  :aria-label="getRowSelectionLabel(renderedRow.row)"
                  @update:model-value="updateRowSelection(renderedRow.row, $event)"
                />
              </td>
              <td
                v-if="enableExpanding"
                class="sticky z-10 flex w-11 shrink-0 items-center justify-center bg-background"
                :style="{
                  left: enableRowSelection ? '44px' : '0',
                  paddingLeft: `${Math.min(renderedRow.row.depth, 3) * 4}px`,
                }"
              >
                <Button
                  v-if="renderedRow.row.getCanExpand()"
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  :aria-label="renderedRow.row.getIsExpanded() ? labels.collapse : labels.expand"
                  @click="renderedRow.row.toggleExpanded()"
                >
                  <ChevronRight
                    class="size-4 transition-transform"
                    :class="{ 'rotate-90': renderedRow.row.getIsExpanded() }"
                    aria-hidden="true"
                  />
                </Button>
              </td>
              <td
                v-for="cell in renderedRow.row.getVisibleCells()"
                :key="cell.id"
                class="flex items-center px-3"
                :class="[
                  cell.column.columnDef.meta?.cellClass,
                  TABLE_COLUMN_TEXT_CLASSES[cell.column.columnDef.meta?.textBehavior ?? 'wrap'],
                ]"
                :style="getColumnStyle(cell.column)"
                :title="cell.column.columnDef.meta?.editable ? labels.editCell : undefined"
                :tabindex="cell.column.columnDef.meta?.editable ? 0 : undefined"
                :aria-keyshortcuts="cell.column.columnDef.meta?.editable ? 'Enter F2' : undefined"
                @dblclick="beginCellEdit(cell, $event)"
                @keydown="handleCellEditKeydown(cell, $event)"
              >
                <Input
                  v-if="editingCellId === cell.id"
                  v-model="editValue"
                  class="h-8"
                  :aria-label="cell.column.columnDef.meta?.label ?? cell.column.id"
                  autofocus
                  @blur="commitCellEdit(cell, renderedRow.row, false)"
                  @keydown.enter.prevent="commitCellEdit(cell, renderedRow.row)"
                  @keydown.esc.prevent="cancelCellEdit"
                />
                <slot v-else name="cell" :cell="cell" :row="renderedRow.row">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </slot>
              </td>
            </tr>
            <tr
              v-if="renderedRow.row.getIsExpanded() && $slots['expanded-row']"
              class="flex w-full border-b border-border bg-muted/20"
              :style="getExpandedRowStyle(renderedRow)"
            >
              <td :colspan="totalColumnCount" class="w-full p-4">
                <slot name="expanded-row" :row="renderedRow.row" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <ProTablePagination
      :pagination="pagination"
      :page-count="pageCount"
      :labels="labels"
      :page-size-options="allowedPageSizes"
      @update:pagination="applyPaginationChange"
    />
  </div>
</template>
