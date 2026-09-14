import type {
  Cell,
  CellContext,
  Column,
  ColumnDef,
  Header,
  Row,
  RowData,
  Table,
  TableState,
} from '@tanstack/vue-table'
import {
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createExpandedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_equals,
  filterFn_includesString,
  filterFn_inDateRange,
  filterFn_inNumberRange,
  filterFn_weakEquals,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/vue-table'

// AI modified: explicit profiles keep Table 9 capabilities and bundle cost aligned with each wrapper.
export const dataTableFeatures = tableFeatures({
  columnSizingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
})

export const proTableFeatures = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: {
    arrIncludes: filterFn_arrIncludes,
    equals: filterFn_equals,
    inDateRange: filterFn_inDateRange,
    inNumberRange: filterFn_inNumberRange,
    includesString: filterFn_includesString,
    weakEquals: filterFn_weakEquals,
  },
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
})

export type DataTableFeatures = typeof dataTableFeatures
export type ProTableFeatures = typeof proTableFeatures

export type DataTableState = TableState<DataTableFeatures>
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>
export type DataTableColumn<TData extends RowData> = Column<DataTableFeatures, TData, unknown>
export type DataTableCell<TData extends RowData> = Cell<DataTableFeatures, TData, unknown>
export type DataTableHeader<TData extends RowData> = Header<DataTableFeatures, TData, unknown>
export type DataTableCellContext<TData extends RowData, TValue> = CellContext<
  DataTableFeatures,
  TData,
  TValue
>
export type DataTableInstance<TData extends RowData> = Table<DataTableFeatures, TData>

export type ProTableState = TableState<ProTableFeatures>
export type ProTableRow<TData extends RowData> = Row<ProTableFeatures, TData>
export type ProTableColumn<TData extends RowData> = Column<ProTableFeatures, TData, unknown>
export type ProTableCell<TData extends RowData> = Cell<ProTableFeatures, TData, unknown>
export type ProTableCellContext<TData extends RowData, TValue> = CellContext<
  ProTableFeatures,
  TData,
  TValue
>
export type ProTableInstance<TData extends RowData> = Table<ProTableFeatures, TData>

export type DataTableFeatureColumnDef<TData extends RowData, TValue>
  = ColumnDef<DataTableFeatures, TData, TValue>
export type ProTableFeatureColumnDef<TData extends RowData, TValue>
  = ColumnDef<ProTableFeatures, TData, TValue>

export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}

export function createProTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<ProTableFeatures, TData>()
}
