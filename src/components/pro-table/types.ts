import type {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ExpandedState,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import type { DataTableColumnDef, DataTableColumnMeta } from '@/components/data-table/types'

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
  columnVisibility: VisibilityState
  columnOrder: ColumnOrderState
  columnPinning: ColumnPinningState
  expanded: ExpandedState
  density: ProTableDensity
}

export type ProTableColumnDef<TData extends RowData> = DataTableColumnDef<TData>
