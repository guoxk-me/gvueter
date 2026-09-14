import type {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnVisibilityState,
  ExpandedState,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
} from '@tanstack/vue-table'
import type { DataTableColumnMeta } from '@/components/data-table/types'
import type { ProTableFeatureColumnDef } from '@/components/table-features'

export type ProTableDensity = 'compact' | 'standard' | 'comfortable'

export interface ProTableEditCommit<TData> {
  row: TData
  rowId: string
  columnId: string
  value: string
  previousValue: unknown
}

export interface ProTableLabels {
  columns: string
  density: string
  densityCompact: string
  densityStandard: string
  densityComfortable: string
  fullscreen: string
  exitFullscreen: string
  pinLeft: string
  pinRight: string
  unpin: string
  moveColumnUp: string
  moveColumnDown: string
  columnMoved: string
  expand: string
  collapse: string
  editCell: string
  rowsPerPage: string
  pageOf: string
  previousPage: string
  nextPage: string
  selectAll: string
  selectRow: string
  actions: string
}

export interface ProTableColumnMeta extends DataTableColumnMeta {
  editable?: boolean
}

export interface ProTableState {
  pagination: PaginationState
  sorting: SortingState
  columnFilters: ColumnFiltersState
  selectedRowIds: RowSelectionState
  columnVisibility: ColumnVisibilityState
  columnOrder: ColumnOrderState
  columnPinning: ColumnPinningState
  expanded: ExpandedState
  density: ProTableDensity
}

// AI modified: ProTable columns expose only the features registered by its Table 9 profile.
export type ProTableColumnDef<TData extends RowData>
  = | ProTableFeatureColumnDef<TData, unknown>
    | { [TKey in keyof TData]-?: ProTableFeatureColumnDef<TData, TData[TKey]> }[keyof TData]
