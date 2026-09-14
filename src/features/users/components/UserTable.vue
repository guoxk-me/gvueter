<script setup lang="ts">
import type { PaginationState, RowSelectionState, SortingState } from '@tanstack/vue-table'
import type { ProTableDensity, ProTableEditCommit } from '@/components/pro-table'
import type { AdminUser } from '@/features/users/types'
import { FileUp, MoreHorizontal, Pencil, Printer, RefreshCw, Trash2 } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CopyButton, CsvExportButton } from '@/components/admin'
import { ProTable } from '@/components/pro-table'
import { createProTableColumnHelper } from '@/components/table-features'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { maskEmail } from '@/features/users/user-privacy'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'

const props = withDefaults(
  defineProps<{
    users: AdminUser[]
    total: number
    isLoading: boolean
    canManage: boolean
    canDelete: boolean
    canImport: boolean
    isImportDisabled?: boolean
    importDisabledReason?: string
  }>(),
  {
    isImportDisabled: false,
    importDisabledReason: '',
  },
)

const emit = defineEmits<{
  edit: [user: AdminUser]
  delete: [user: AdminUser]
  bulkDelete: []
  import: []
  refresh: []
  inlineEdit: [change: { user: AdminUser, columnId: string, value: string }]
}>()

const pagination = defineModel<PaginationState>('pagination', { required: true })
const sorting = defineModel<SortingState>('sorting', { required: true })
const selectedRowIds = defineModel<RowSelectionState>('selectedRowIds', { required: true })
const density = defineModel<ProTableDensity>('density', { default: 'standard' })
const { locale, t } = useI18n()
const columnHelper = createProTableColumnHelper<AdminUser>()
const selectedCount = computed(() => Object.values(selectedRowIds.value).filter(Boolean).length)

const columns = computed(() => [
  columnHelper.accessor('name', {
    header: t('users.name'),
    size: 220,
    meta: {
      label: t('users.name'),
      editable: props.canManage,
      textBehavior: 'wrap',
      minWidth: 180,
    },
  }),
  columnHelper.accessor('email', {
    header: t('users.email'),
    size: 280,
    meta: { label: t('users.email'), textBehavior: 'truncate', minWidth: 220 },
  }),
  columnHelper.accessor('role', {
    header: t('users.role'),
    size: 160,
    meta: { label: t('users.role'), textBehavior: 'nowrap', minWidth: 120 },
  }),
  columnHelper.accessor('status', {
    header: t('users.status'),
    size: 140,
    meta: { label: t('users.status'), textBehavior: 'nowrap', minWidth: 112 },
  }),
  columnHelper.accessor('createdAt', {
    header: t('users.createdAt'),
    size: 180,
    meta: { label: t('users.createdAt'), textBehavior: 'nowrap', minWidth: 160 },
  }),
  ...(props.canManage || props.canDelete
    ? [
        columnHelper.display({
          id: 'actions',
          header: t('common.actions'),
          size: 72,
          enableSorting: false,
          enableHiding: false,
          enablePinning: true,
          meta: { label: t('common.actions'), textBehavior: 'nowrap', minWidth: 72 },
        }),
      ]
    : []),
])

const exportColumns = computed(() => [
  // AI modified: canonical headers make exported user CSV files directly re-importable.
  { label: 'name', getValue: (user: AdminUser) => user.name },
  {
    label: 'email',
    getValue: (user: AdminUser) => (props.canManage ? user.email : maskEmail(user.email)),
  },
  { label: 'role', getValue: (user: AdminUser) => user.role },
  { label: 'status', getValue: (user: AdminUser) => user.status },
  { label: 'createdAt', getValue: (user: AdminUser) => user.createdAt },
])

function getCreatedAtLabel(user: AdminUser): string {
  // AI modified: user creation dates use the admin timezone rather than the device timezone.
  return getDateTimeLabel(user.createdAt, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'medium',
  })
}

function getUserInitials(user: AdminUser): string {
  return user.name.slice(0, 2).toLocaleUpperCase(locale.value)
}

function handleInlineEdit(change: ProTableEditCommit<AdminUser>): void {
  if (change.columnId === 'name' && change.value.trim() && change.value !== change.previousValue) {
    emit('inlineEdit', {
      user: change.row,
      columnId: change.columnId,
      value: change.value.trim(),
    })
  }
}

function clearSelection(): void {
  selectedRowIds.value = {}
}

function printUsers(): void {
  window.print()
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="selectedCount > 0"
      class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3"
      role="status"
    >
      <span class="text-sm font-medium">
        {{ t('users.selectedCount', { count: selectedCount }) }}
      </span>
      <div class="flex items-center gap-2">
        <Button
          v-if="canDelete"
          type="button"
          variant="destructive"
          size="sm"
          @click="emit('bulkDelete')"
        >
          <Trash2 class="mr-2 size-4" aria-hidden="true" />
          {{ t('users.bulkDelete') }}
        </Button>
        <Button type="button" variant="ghost" size="sm" @click="clearSelection">
          {{ t('dataTable.clearSelection') }}
        </Button>
      </div>
    </div>

    <!-- AI modified: paged user tables keep all 50-or-fewer rows in the accessibility tree. -->
    <ProTable
      v-model:pagination="pagination"
      v-model:sorting="sorting"
      v-model:selected-row-ids="selectedRowIds"
      v-model:density="density"
      :columns="columns"
      :data="users"
      :row-count="total"
      :is-loading="isLoading"
      :empty-message="t('users.noResults')"
      :page-size-options="[5, 10, 20, 50]"
      :get-row-id="(user) => String(user.id)"
      :get-row-label="(user) => user.name"
      :enable-row-selection="canDelete"
      manual-pagination
      manual-sorting
      @edit-commit="handleInlineEdit"
    >
      <template #toolbar-leading>
        <Button type="button" variant="outline" :disabled="isLoading" @click="emit('refresh')">
          <RefreshCw class="mr-2 size-4" aria-hidden="true" />
          {{ t('common.refresh') }}
        </Button>
      </template>
      <template #toolbar-import>
        <Button
          v-if="canImport"
          type="button"
          variant="outline"
          :disabled="isImportDisabled"
          :title="isImportDisabled ? importDisabledReason : undefined"
          @click="emit('import')"
        >
          <FileUp class="mr-2 size-4" aria-hidden="true" />
          {{ t('users.import') }}
        </Button>
      </template>
      <template #toolbar-export>
        <CsvExportButton
          :rows="users"
          :columns="exportColumns"
          file-name="users.csv"
          :label="t('users.export')"
        />
      </template>
      <template #toolbar-print>
        <Button type="button" variant="outline" @click="printUsers">
          <Printer class="mr-2 size-4" aria-hidden="true" />
          {{ t('users.print') }}
        </Button>
      </template>
      <template #cell="{ cell, row }">
        <!-- AI modified: sensitive presentation stays outside the generic table and email identifiers remain untranslated. -->
        <div v-if="cell.column.id === 'name'" class="flex min-w-0 items-center gap-3 font-medium">
          <Avatar>
            <AvatarImage
              v-if="row.original.avatar"
              :src="row.original.avatar"
              alt=""
              aria-hidden="true"
            />
            <AvatarFallback>{{ getUserInitials(row.original) }}</AvatarFallback>
          </Avatar>
          <span class="min-w-0 break-words">{{ row.original.name }}</span>
        </div>
        <div
          v-else-if="cell.column.id === 'email'"
          class="flex min-w-0 items-center gap-2 text-muted-foreground"
        >
          <span
            class="truncate"
            :data-masked="!canManage"
            :title="canManage ? row.original.email : maskEmail(row.original.email)"
            translate="no"
          >
            {{ canManage ? row.original.email : maskEmail(row.original.email) }}
          </span>
          <CopyButton
            v-if="canManage"
            :value="row.original.email"
            :label="t('users.copyEmail')"
            :copied-label="t('common.copied')"
          />
        </div>
        <Badge v-else-if="cell.column.id === 'role'" variant="secondary">
          {{ t(`roles.${row.original.role}`) }}
        </Badge>
        <Badge
          v-else-if="cell.column.id === 'status'"
          :variant="row.original.status === 'active' ? 'outline' : 'destructive'"
        >
          {{ t(`users.${row.original.status}`) }}
        </Badge>
        <span v-else-if="cell.column.id === 'createdAt'" class="text-muted-foreground">
          {{ getCreatedAtLabel(row.original) }}
        </span>
        <DropdownMenu v-else-if="cell.column.id === 'actions'">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" :aria-label="t('common.actions')">
              <MoreHorizontal class="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem v-if="canManage" @click="emit('edit', row.original)">
              <Pencil class="mr-2 size-4" aria-hidden="true" />
              {{ t('common.edit') }}
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="canDelete"
              class="text-destructive"
              @click="emit('delete', row.original)"
            >
              <Trash2 class="mr-2 size-4" aria-hidden="true" />
              {{ t('common.delete') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
    </ProTable>
  </div>
</template>
