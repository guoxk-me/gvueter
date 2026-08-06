<script setup lang="ts">
import type { SystemParameterRecord } from '../types'
import type { ProTableLabels } from '@/components/pro-table'
import { Pencil, Trash2 } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction, CopyButton, StatusTag } from '@/components/admin'
import { ProTable } from '@/components/pro-table'
import { Button } from '@/components/ui/button'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'

const props = defineProps<{
  parameters: SystemParameterRecord[]
  isLoading: boolean
  isDeleting: boolean
  canUpdate: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{
  edit: [parameter: SystemParameterRecord]
  delete: [parameter: SystemParameterRecord]
}>()

const { locale, t } = useI18n()
const columnHelper = createColumnHelper<SystemParameterRecord>()
const columns = computed(() => [
  columnHelper.accessor('key', {
    header: t('systemParameters.key'),
    size: 260,
    meta: { label: t('systemParameters.key'), textBehavior: 'truncate', minWidth: 220 },
  }),
  columnHelper.accessor('value', {
    header: t('systemParameters.value'),
    size: 220,
    meta: { label: t('systemParameters.value'), textBehavior: 'wrap', minWidth: 180 },
  }),
  columnHelper.accessor('description', {
    header: t('systemParameters.descriptionField'),
    size: 320,
    meta: { label: t('systemParameters.descriptionField'), textBehavior: 'wrap', minWidth: 240 },
  }),
  columnHelper.accessor('status', {
    header: t('systemParameters.status'),
    size: 120,
    meta: { label: t('systemParameters.status'), textBehavior: 'nowrap', minWidth: 112 },
  }),
  columnHelper.accessor('updatedAt', {
    header: t('systemParameters.updatedAt'),
    size: 180,
    meta: { label: t('systemParameters.updatedAt'), textBehavior: 'nowrap', minWidth: 160 },
  }),
  ...(props.canUpdate || props.canDelete
    ? [
        columnHelper.display({
          id: 'actions',
          header: t('common.actions'),
          size: 100,
          enableSorting: false,
          enableHiding: false,
          enablePinning: true,
          meta: {
            label: t('common.actions'),
            headerClass: 'justify-end',
            textBehavior: 'nowrap',
            minWidth: 96,
          },
        }),
      ]
    : []),
])
const labels = computed<ProTableLabels>(() => ({
  columns: t('proTable.columns'),
  density: t('proTable.density'),
  densityCompact: t('proTable.densityCompact'),
  densityStandard: t('proTable.densityStandard'),
  densityComfortable: t('proTable.densityComfortable'),
  fullscreen: t('proTable.fullscreen'),
  exitFullscreen: t('proTable.exitFullscreen'),
  pinLeft: t('proTable.pinLeft'),
  pinRight: t('proTable.pinRight'),
  unpin: t('proTable.unpin'),
  moveColumnUp: t('proTable.moveColumnUp'),
  moveColumnDown: t('proTable.moveColumnDown'),
  columnMoved: t('proTable.columnMoved', {
    column: '{column}',
    position: '{position}',
    total: '{total}',
  }),
  expand: t('proTable.expand'),
  collapse: t('proTable.collapse'),
  editCell: t('proTable.editCell'),
  rowsPerPage: t('dataTable.rowsPerPage'),
  pageOf: t('dataTable.pageOf', { current: '{current}', total: '{total}' }),
  previousPage: t('dataTable.previousPage'),
  nextPage: t('dataTable.nextPage'),
  selectAll: t('dataTable.selectAll'),
  selectRow: t('dataTable.selectRow'),
  actions: t('common.actions'),
}))

function getUpdatedAtLabel(parameter: SystemParameterRecord): string {
  // AI modified: parameter timestamps use explicit locale and business timezone options.
  return getDateTimeLabel(parameter.updatedAt, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
</script>

<template>
  <ProTable
    :columns="columns"
    :data="parameters"
    :labels="labels"
    :is-loading="isLoading"
    :empty-message="t('systemParameters.empty')"
    :page-size-options="[10, 20, 50]"
    :get-row-id="(parameter) => parameter.id"
  >
    <template #cell="{ cell, row }">
      <!-- AI modified: parameter identifiers remain escaped and untranslated while domain actions stay outside ProTable. -->
      <div v-if="cell.column.id === 'key'" class="flex min-w-0 items-center gap-2">
        <code
          class="truncate rounded bg-muted px-1.5 py-0.5 text-xs"
          :title="row.original.key"
          translate="no"
          >{{ row.original.key }}</code
        >
        <CopyButton
          :value="row.original.key"
          :label="t('systemParameters.copyKey')"
          :copied-label="t('common.copied')"
          icon-only
          variant="ghost"
        />
      </div>
      <code
        v-else-if="cell.column.id === 'value'"
        class="line-clamp-2 break-all text-xs"
        :title="row.original.value"
        translate="no"
      >
        {{ row.original.value }}
      </code>
      <span
        v-else-if="cell.column.id === 'description'"
        class="line-clamp-2 text-muted-foreground"
        :title="row.original.description || undefined"
      >
        {{ row.original.description || '—' }}
      </span>
      <StatusTag
        v-else-if="cell.column.id === 'status'"
        :label="t(`systemParameters.${row.original.status}`)"
        :tone="row.original.status === 'active' ? 'success' : 'neutral'"
      />
      <span v-else-if="cell.column.id === 'updatedAt'" class="text-muted-foreground">
        {{ getUpdatedAtLabel(row.original) }}
      </span>
      <div v-else-if="cell.column.id === 'actions'" class="flex w-full justify-end gap-1">
        <Button
          v-if="canUpdate"
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t('systemParameters.edit')"
          @click="emit('edit', row.original)"
        >
          <Pencil class="size-4" aria-hidden="true" />
        </Button>
        <ConfirmAction
          v-if="canDelete"
          :title="t('systemParameters.deleteTitle')"
          :description="t('systemParameters.deleteConfirm', { key: row.original.key })"
          :trigger-label="t('common.delete')"
          :confirm-label="t('common.delete')"
          :cancel-label="t('common.cancel')"
          :pending-label="t('common.loading')"
          trigger-variant="ghost"
          confirm-variant="destructive"
          :is-pending="isDeleting"
          @confirm="emit('delete', row.original)"
        >
          <template #trigger>
            <Button type="button" variant="ghost" size="icon-sm" :aria-label="t('common.delete')">
              <Trash2 class="size-4 text-destructive" aria-hidden="true" />
            </Button>
          </template>
        </ConfirmAction>
      </div>
    </template>
  </ProTable>
</template>
