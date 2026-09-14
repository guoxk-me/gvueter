<script setup lang="ts">
import type { ManagedMenuRecord } from '@/features/menus/types'
import { ListTree, Pencil, Trash2 } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { createDataTableColumnHelper } from '@/components/table-features'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getManagedMenuRows } from '@/features/menus/menu-hierarchy'

const props = defineProps<{
  menus: ManagedMenuRecord[]
  isLoading: boolean
  isDeleting: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  edit: [menu: ManagedMenuRecord]
  delete: [menu: ManagedMenuRecord]
}>()

const { t } = useI18n()
const columnHelper = createDataTableColumnHelper<ReturnType<typeof getManagedMenuRows>[number]>()
const rows = computed(() => getManagedMenuRows(props.menus))
const columns = computed(() => [
  columnHelper.accessor('titleKey', { header: t('menus.name'), enableSorting: false }),
  columnHelper.accessor('kind', { header: t('menus.kind'), enableSorting: false }),
  columnHelper.accessor('path', { header: t('menus.path'), enableSorting: false }),
  columnHelper.accessor('icon', { header: t('menus.icon'), enableSorting: false }),
  columnHelper.accessor('componentKey', { header: t('menus.componentKey'), enableSorting: false }),
  columnHelper.accessor('requiredAbility', { header: t('menus.ability'), enableSorting: false }),
  columnHelper.accessor('permissionIdentifier', {
    header: t('menus.permissionIdentifier'),
    enableSorting: false,
  }),
  columnHelper.accessor('hidden', { header: t('menus.hidden'), enableSorting: false }),
  columnHelper.accessor('keepAlive', { header: t('menus.keepAlive'), enableSorting: false }),
  columnHelper.accessor('order', { header: t('menus.order'), enableSorting: false }),
  ...(props.canManage
    ? [columnHelper.display({ id: 'actions', header: t('common.actions'), enableSorting: false })]
    : []),
])
</script>

<template>
  <DataTable
    :columns="columns"
    :data="rows"
    :is-loading="isLoading"
    :empty-message="t('menus.empty')"
    :default-page-size="20"
    :get-row-id="(menu) => menu.id"
  >
    <template #cell="{ cell, row }">
      <div
        v-if="cell.column.id === 'titleKey'"
        class="flex items-center gap-2 font-medium"
        :style="{ paddingLeft: `${row.original.depth * 1.25}rem` }"
      >
        <ListTree class="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{{ t(row.original.titleKey) }}</span>
        <code class="text-[10px] text-muted-foreground">{{ row.original.titleKey }}</code>
      </div>
      <Badge v-else-if="cell.column.id === 'kind'" variant="secondary">
        {{ t(`menus.kinds.${row.original.kind}`) }}
      </Badge>
      <code v-else-if="cell.column.id === 'path'" class="text-xs text-muted-foreground">
        {{ row.original.kind === 'external' ? row.original.targetUrl : row.original.path || '—' }}
      </code>
      <code v-else-if="cell.column.id === 'icon'" class="text-xs text-muted-foreground">
        {{ row.original.icon || '—' }}
      </code>
      <code v-else-if="cell.column.id === 'componentKey'" class="text-xs">
        {{ row.original.componentKey || '—' }}
      </code>
      <code v-else-if="cell.column.id === 'requiredAbility'" class="text-xs">
        {{
          row.original.requiredAbility
            ? `${row.original.requiredAbility.action}:${row.original.requiredAbility.subject}`
            : '—'
        }}
      </code>
      <code v-else-if="cell.column.id === 'permissionIdentifier'" class="text-xs text-primary">
        {{ row.original.permissionIdentifier }}
      </code>
      <Badge
        v-else-if="cell.column.id === 'hidden'"
        :variant="row.original.hidden ? 'secondary' : 'outline'"
      >
        {{ row.original.hidden ? t('menus.yes') : t('menus.no') }}
      </Badge>
      <Badge
        v-else-if="cell.column.id === 'keepAlive'"
        :variant="row.original.keepAlive ? 'secondary' : 'outline'"
      >
        {{ row.original.keepAlive ? t('menus.yes') : t('menus.no') }}
      </Badge>
      <span v-else-if="cell.column.id === 'order'">{{ row.original.order }}</span>
      <div v-else-if="cell.column.id === 'actions'" class="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t('menus.edit')"
          @click="emit('edit', row.original)"
        >
          <Pencil class="size-4" aria-hidden="true" />
        </Button>
        <ConfirmAction
          :title="t('menus.deleteTitle')"
          :description="t('menus.deleteConfirm', { name: t(row.original.titleKey) })"
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
