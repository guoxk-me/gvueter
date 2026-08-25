import type { ColumnDef, RowData } from '@tanstack/vue-table'

export type TableColumnTextBehavior = 'nowrap' | 'truncate' | 'wrap'

export interface DataTableColumnMeta {
  label?: string
  cellClass?: string
  headerClass?: string
  textBehavior?: TableColumnTextBehavior
  minWidth?: number
}

export interface TableColumnMeta<TData, TValue> extends DataTableColumnMeta {
  editable?: boolean
  getExportValue?: (row: TData) => TValue | null | undefined
}

// AI modified: both table implementations consume one declarative long-text and minimum-width contract.
export const TABLE_COLUMN_TEXT_CLASSES: Record<TableColumnTextBehavior, string> = {
  nowrap: 'whitespace-nowrap',
  truncate: 'min-w-0 truncate',
  wrap: 'min-w-0 whitespace-normal break-words',
}

// AI modified: retain each accessor's value type without falling back to `any` for mixed columns.
export type DataTableColumnDef<TData extends RowData>
  = | ColumnDef<TData, unknown>
    | { [TKey in keyof TData]-?: ColumnDef<TData, TData[TKey]> }[keyof TData]

export interface DataTableFilterOption {
  label: string
  value: string
}

export interface DataTableFilterDefinition {
  key: string
  type: 'search' | 'select'
  placeholder: string
  ariaLabel?: string
  defaultValue?: string
  options?: readonly DataTableFilterOption[]
}

export type DataTableFilterValues = Record<string, string>

declare module '@tanstack/vue-table' {
  interface ColumnMeta<TData, TValue> extends TableColumnMeta<TData, TValue> {}
}
