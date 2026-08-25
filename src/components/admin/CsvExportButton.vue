<script setup lang="ts" generic="TData">
import type { CsvExportColumn } from './csv-export'
import { Download } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    rows: readonly TData[]
    columns: readonly CsvExportColumn<TData>[]
    fileName?: string
    label?: string
    disabled?: boolean
  }>(),
  {
    fileName: 'export.csv',
    label: 'Export CSV',
    disabled: false,
  },
)

const emit = defineEmits<{
  export: [rowCount: number]
}>()

function downloadCsv(): void {
  if (props.disabled || props.rows.length === 0)
    return

  const csvLines = [
    props.columns.map(column => escapeCsvCell(column.label)).join(','),
    ...props.rows.map(row =>
      props.columns.map(column => escapeCsvCell(column.getValue(row))).join(','),
    ),
  ]
  const exportBlob = new Blob([`\uFEFF${csvLines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const exportUrl = URL.createObjectURL(exportBlob)
  const downloadLink = document.createElement('a')
  downloadLink.href = exportUrl
  downloadLink.download = props.fileName.endsWith('.csv') ? props.fileName : `${props.fileName}.csv`
  downloadLink.click()
  URL.revokeObjectURL(exportUrl)
  emit('export', props.rows.length)
}

function escapeCsvCell(cellValue: string | number | boolean | null | undefined): string {
  const rawValue = cellValue === null || cellValue === undefined ? '' : String(cellValue)
  // AI modified: neutralize spreadsheet formulas before values reach a downloaded CSV.
  const firstMeaningfulCharacter = [...rawValue].find((character) => {
    const characterCode = character.charCodeAt(0)
    return characterCode > 32 && character !== '\u00A0' && character !== '\uFEFF'
  })
  const safeValue
    = firstMeaningfulCharacter && '=+-@'.includes(firstMeaningfulCharacter)
      ? `'${rawValue}`
      : rawValue
  return `"${safeValue.replace(/"/g, '""')}"`
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    :disabled="disabled || rows.length === 0"
    @click="downloadCsv"
  >
    <Download class="mr-2 size-4" aria-hidden="true" />
    {{ label }}
  </Button>
</template>
