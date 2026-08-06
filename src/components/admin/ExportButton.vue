<script setup lang="ts" generic="TData">
import type { CsvExportColumn } from './csv-export'
import { useI18n } from 'vue-i18n'
import CsvExportButton from './CsvExportButton.vue'

withDefaults(
  defineProps<{
    rows: readonly TData[]
    columns: readonly CsvExportColumn<TData>[]
    fileName?: string
    label?: string
    disabled?: boolean
  }>(),
  {
    fileName: 'export.csv',
    disabled: false,
  },
)

const emit = defineEmits<{
  export: [rowCount: number]
}>()

const { t } = useI18n()
</script>

<template>
  <CsvExportButton
    :rows="rows"
    :columns="columns"
    :file-name="fileName"
    :label="label ?? t('components.business.exportAction')"
    :disabled="disabled"
    @export="emit('export', $event)"
  />
</template>
