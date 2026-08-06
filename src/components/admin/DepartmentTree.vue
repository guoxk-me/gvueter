<script setup lang="ts">
import type { TreeNode } from './tree-view'
import type { DepartmentRecord, DepartmentTreeNode } from '@/features/departments/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDepartmentTree } from '@/features/departments/department-tree'
import TreeView from './TreeView.vue'

const props = withDefaults(
  defineProps<{
    departments: readonly DepartmentRecord[]
    disabledIds?: readonly string[]
    label?: string
    emptyLabel?: string
    expandLabel?: string
    collapseLabel?: string
    expandAll?: boolean
    checkable?: boolean
    selectable?: boolean
  }>(),
  {
    disabledIds: () => [],
    expandAll: true,
    checkable: false,
    selectable: true,
  },
)

const { t } = useI18n()
const selectedDepartmentId = defineModel<string | undefined>()
const checkedDepartmentIds = defineModel<string[]>('checkedIds', { default: () => [] })
const selectedTreeId = computed<string | null>({
  get: () => selectedDepartmentId.value ?? null,
  set: (departmentId) => (selectedDepartmentId.value = departmentId ?? undefined),
})
const disabledDepartmentIds = computed(() => new Set(props.disabledIds))
const departmentNodes = computed<TreeNode[]>(() =>
  getSelectableDepartments(getDepartmentTree(props.departments), disabledDepartmentIds.value),
)

function getSelectableDepartments(
  departments: readonly DepartmentTreeNode[],
  disabledIds: ReadonlySet<string>,
): TreeNode[] {
  return departments.map((department) => ({
    id: department.id,
    label: department.name,
    // AI modified: backend-disabled departments stay visible in context but cannot become a selected scope.
    disabled: department.status === 'disabled' || disabledIds.has(department.id),
    children: getSelectableDepartments(department.children, disabledIds),
  }))
}
</script>

<template>
  <TreeView
    v-model:selected-id="selectedTreeId"
    v-model:checked-ids="checkedDepartmentIds"
    :nodes="departmentNodes"
    :label="label ?? t('components.selectors.departmentLabel')"
    :empty-label="emptyLabel ?? t('components.selectors.departmentEmpty')"
    :expand-label="expandLabel ?? t('components.hierarchy.expandLabel')"
    :collapse-label="collapseLabel ?? t('components.hierarchy.collapseLabel')"
    :expand-all="expandAll"
    :checkable="checkable"
    :include-parent-when-checked="checkable"
    :selectable="selectable"
  />
</template>
