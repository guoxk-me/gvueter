<script setup lang="ts">
import type { DictionaryColor, DictionaryEntry } from '@/features/dictionaries/types'
import { Pencil, Trash2 } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  dictionaryEntries: DictionaryEntry[]
  isLoading: boolean
  isDeleting: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  edit: [dictionaryEntry: DictionaryEntry]
  delete: [dictionaryEntry: DictionaryEntry]
}>()

const { t } = useI18n()
const columnHelper = createColumnHelper<DictionaryEntry>()
// AI modified: explicit utility classes keep dictionary tags aligned with live semantic CSS tokens.
const dictionaryColorClasses: Record<DictionaryColor, string> = {
  primary: 'border-primary/35 bg-primary/10 text-primary',
  success: 'border-success/35 bg-success/10 text-success',
  warning: 'border-warning/35 bg-warning/10 text-warning',
  destructive: 'border-destructive/35 bg-destructive/10 text-destructive',
  secondary: 'border-border bg-secondary text-secondary-foreground',
}
const columns = computed(() => [
  columnHelper.accessor('label', { header: t('dictionaries.entryLabel') }),
  columnHelper.accessor('value', { header: t('dictionaries.entryValue') }),
  columnHelper.accessor('color', { header: t('dictionaries.color') }),
  columnHelper.accessor('order', { header: t('dictionaries.order') }),
  columnHelper.accessor('status', { header: t('dictionaries.status') }),
  ...(props.canManage
    ? [columnHelper.display({ id: 'actions', header: t('common.actions'), enableSorting: false })]
    : []),
])
</script>

<template>
  <DataTable
    :columns="columns"
    :data="dictionaryEntries"
    :is-loading="isLoading"
    :empty-message="t('dictionaries.emptyEntries')"
    :default-page-size="10"
    :get-row-id="(dictionaryEntry) => dictionaryEntry.id"
  >
    <template #cell="{ cell, row }">
      <span v-if="cell.column.id === 'label'" class="font-medium">{{ row.original.label }}</span>
      <code v-else-if="cell.column.id === 'value'" class="rounded bg-muted px-1.5 py-0.5 text-xs">
        {{ row.original.value }}
      </code>
      <Badge
        v-else-if="cell.column.id === 'color'"
        variant="outline"
        :class="dictionaryColorClasses[row.original.color]"
      >
        {{ t(`dictionaries.colors.${row.original.color}`) }}
      </Badge>
      <span v-else-if="cell.column.id === 'order'">{{ row.original.order }}</span>
      <Badge
        v-else-if="cell.column.id === 'status'"
        :variant="row.original.status === 'active' ? 'outline' : 'secondary'"
      >
        {{ t(`dictionaries.${row.original.status}`) }}
      </Badge>
      <div v-else-if="cell.column.id === 'actions'" class="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t('dictionaries.editEntry')"
          @click="emit('edit', row.original)"
        >
          <Pencil class="size-4" aria-hidden="true" />
        </Button>
        <ConfirmAction
          :title="t('dictionaries.deleteEntryTitle')"
          :description="t('dictionaries.deleteEntryConfirm', { label: row.original.label })"
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
  </DataTable>
</template>
