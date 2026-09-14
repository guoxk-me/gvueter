import type { CellData, RowData, TableFeatures } from '@tanstack/vue-table'
import type { DataTableFeatureColumnDef } from '@/components/table-features'

export type TableColumnTextBehavior = 'nowrap' | 'truncate' | 'wrap'

export interface DataTableColumnMeta {
  label?: string
  cellClass?: string
  headerClass?: string
  textBehavior?: TableColumnTextBehavior
  minWidth?: number
}

export interface TableColumnMeta<
  TFeatures extends TableFeatures,
  TData,
  TValue,
> extends DataTableColumnMeta {
  editable?: boolean
  getExportValue?: (
    row: TData,
  ) => TFeatures extends TableFeatures ? TValue | null | undefined : never
}

// AI modified: both table implementations consume one declarative long-text and minimum-width contract.
export const TABLE_COLUMN_TEXT_CLASSES: Record<TableColumnTextBehavior, string> = {
  nowrap: 'whitespace-nowrap',
  truncate: 'min-w-0 truncate',
  wrap: 'min-w-0 whitespace-normal break-words',
}

// AI modified: retain each accessor's value type without falling back to `any` for mixed columns.
export type DataTableColumnDef<TData extends RowData>
  = | DataTableFeatureColumnDef<TData, unknown>
    | { [TKey in keyof TData]-?: DataTableFeatureColumnDef<TData, TData[TKey]> }[keyof TData]

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
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > extends TableColumnMeta<TFeatures, TData, TValue> {}
}
