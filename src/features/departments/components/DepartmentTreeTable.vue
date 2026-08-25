<script setup lang="ts">
import type { DepartmentRecord, DepartmentTreeNode } from '@/features/departments/types'
import { Building2, Pencil, Trash2 } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDepartmentTree } from '@/features/departments/department-tree'

interface DepartmentRow extends DepartmentRecord {
  depth: number
}

const props = defineProps<{
  departments: DepartmentRecord[]
  isLoading: boolean
  isDeleting: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  edit: [department: DepartmentRecord]
  delete: [department: DepartmentRecord]
}>()

const { t } = useI18n()
const columnHelper = createColumnHelper<DepartmentRow>()
const departmentsById = computed(
  () => new Map(props.departments.map(department => [department.id, department])),
)
const rows = computed(() => {
  const flattenedDepartments: DepartmentRow[] = []

  function visitDepartment(department: DepartmentTreeNode, depth: number): void {
    flattenedDepartments.push({ ...department, depth })
    for (const childDepartment of department.children) visitDepartment(childDepartment, depth + 1)
  }

  for (const rootDepartment of getDepartmentTree(props.departments))
    visitDepartment(rootDepartment, 0)

  return flattenedDepartments
})
const columns = computed(() => [
  columnHelper.accessor('name', { header: t('departments.name'), enableSorting: false }),
  columnHelper.accessor('parentId', { header: t('departments.parent'), enableSorting: false }),
  columnHelper.accessor('order', { header: t('departments.order'), enableSorting: false }),
  columnHelper.accessor('status', { header: t('departments.status'), enableSorting: false }),
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
    :empty-message="t('departments.empty')"
    :default-page-size="20"
    :get-row-id="(department) => department.id"
  >
    <template #cell="{ cell, row }">
      <div
        v-if="cell.column.id === 'name'"
        class="flex items-center gap-2 font-medium"
        :style="{ paddingLeft: `${row.original.depth * 1.25}rem` }"
      >
        <Building2 class="size-4 shrink-0 text-primary" aria-hidden="true" />
        {{ row.original.name }}
      </div>
      <span v-else-if="cell.column.id === 'parentId'" class="text-muted-foreground">
        {{
          row.original.parentId
            ? departmentsById.get(row.original.parentId)?.name
            : t('departments.root')
        }}
      </span>
      <span v-else-if="cell.column.id === 'order'">{{ row.original.order }}</span>
      <Badge
        v-else-if="cell.column.id === 'status'"
        :variant="row.original.status === 'active' ? 'outline' : 'secondary'"
      >
        {{ t(`departments.${row.original.status}`) }}
      </Badge>
      <div v-else-if="cell.column.id === 'actions'" class="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t('departments.edit')"
          @click="emit('edit', row.original)"
        >
          <Pencil class="size-4" aria-hidden="true" />
        </Button>
        <ConfirmAction
          :title="t('departments.deleteTitle')"
          :description="t('departments.deleteConfirm', { name: row.original.name })"
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
