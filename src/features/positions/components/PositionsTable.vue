<script setup lang="ts">
import type { PositionRecord } from '@/features/positions/types'
import { Pencil, Trash2 } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  positions: PositionRecord[]
  isLoading: boolean
  isDeleting: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  edit: [position: PositionRecord]
  delete: [position: PositionRecord]
}>()

const { t } = useI18n()
const columnHelper = createColumnHelper<PositionRecord>()
const columns = computed(() => [
  columnHelper.accessor('code', { header: t('positions.code') }),
  columnHelper.accessor('name', { header: t('positions.name') }),
  columnHelper.accessor('description', { header: t('positions.descriptionField') }),
  columnHelper.accessor('order', { header: t('positions.order') }),
  columnHelper.accessor('status', { header: t('positions.status') }),
  ...(props.canManage
    ? [columnHelper.display({ id: 'actions', header: t('common.actions'), enableSorting: false })]
    : []),
])
</script>

<template>
  <DataTable
    :columns="columns"
    :data="positions"
    :is-loading="isLoading"
    :empty-message="t('positions.empty')"
    :default-page-size="10"
    :get-row-id="(position) => position.id"
  >
    <template #cell="{ cell, row }">
      <code v-if="cell.column.id === 'code'" class="rounded bg-muted px-1.5 py-0.5 text-xs">
        {{ row.original.code }}
      </code>
      <span v-else-if="cell.column.id === 'name'" class="font-medium">{{ row.original.name }}</span>
      <span v-else-if="cell.column.id === 'description'" class="line-clamp-2 text-muted-foreground">
        {{ row.original.description }}
      </span>
      <span v-else-if="cell.column.id === 'order'">{{ row.original.order }}</span>
      <Badge
        v-else-if="cell.column.id === 'status'"
        :variant="row.original.status === 'active' ? 'outline' : 'secondary'"
      >
        {{ t(`positions.${row.original.status}`) }}
      </Badge>
      <div v-else-if="cell.column.id === 'actions'" class="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t('positions.edit')"
          @click="emit('edit', row.original)"
        >
          <Pencil class="size-4" aria-hidden="true" />
        </Button>
        <ConfirmAction
          :title="t('positions.deleteTitle')"
          :description="t('positions.deleteConfirm', { name: row.original.name })"
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
