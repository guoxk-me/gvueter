export type CsvCellValue = boolean | null | number | string | undefined

export interface CsvExportColumn<TData> {
  label: string
  getValue: (row: TData) => CsvCellValue
}
