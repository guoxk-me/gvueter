<script setup lang="ts">
import type { TreeNode } from '@/components/admin'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { TreeView } from '@/components/admin'
import { Button } from '@/components/ui/button'
import ComponentDemoCard from './ComponentDemoCard.vue'

const { t } = useI18n()
const permissionNodes: readonly TreeNode[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    children: [
      {
        id: 'analytics',
        label: 'Analytics',
        children: [
          { id: 'analytics-overview', label: 'Overview' },
          { id: 'analytics-export', label: 'Exports' },
        ],
      },
      {
        id: 'administration',
        label: 'Administration',
        children: [
          { id: 'users', label: 'Users' },
          { id: 'roles', label: 'Roles & permissions' },
          { id: 'audit', label: 'Audit log' },
        ],
      },
      {
        id: 'regional-archives',
        label: 'Regional archives (load on demand)',
        hasChildren: true,
      },
    ],
  },
]
const regionalArchiveNodes: readonly TreeNode[] = [
  { id: 'archive-apac', label: 'APAC retention archive' },
  { id: 'archive-emea', label: 'EMEA retention archive' },
  { id: 'archive-americas', label: 'Americas retention archive' },
]

const selectedNodeId = shallowRef<string | null>('analytics-overview')
const checkedNodeIds = shallowRef(['analytics-overview', 'users'])
const expandedNodeIds = shallowRef(['workspace', 'analytics', 'administration'])
const selectedNodeLabel = computed(
  () =>
    findNodeLabel(permissionNodes, selectedNodeId.value) ??
    findNodeLabel(regionalArchiveNodes, selectedNodeId.value) ??
    t('components.hierarchy.noSelection'),
)

function findNodeLabel(nodes: readonly TreeNode[], nodeId: string | null): string | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return node.label

    const childLabel = node.children && findNodeLabel(node.children, nodeId)
    if (childLabel) return childLabel
  }
  return undefined
}

function expandAllNodes(): void {
  expandedNodeIds.value = ['workspace', 'analytics', 'administration']
}

function collapseAllNodes(): void {
  expandedNodeIds.value = []
}

async function loadPermissionChildren(node: TreeNode): Promise<readonly TreeNode[]> {
  if (node.id !== 'regional-archives') return []

  // AI modified: the hierarchy Demo exercises the same on-demand boundary used by large org/category trees.
  await new Promise((resolve) => window.setTimeout(resolve, 180))
  return regionalArchiveNodes
}
</script>

<template>
  <ComponentDemoCard
    :title="t('components.hierarchy.title')"
    :description="t('components.hierarchy.description')"
  >
    <div class="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" @click="expandAllNodes">
        {{ t('components.hierarchy.expandAll') }}
      </Button>
      <Button type="button" variant="ghost" size="sm" @click="collapseAllNodes">
        {{ t('components.hierarchy.collapseAll') }}
      </Button>
    </div>
    <TreeView
      v-model:selected-id="selectedNodeId"
      v-model:checked-ids="checkedNodeIds"
      v-model:expanded-ids="expandedNodeIds"
      :nodes="permissionNodes"
      :label="t('components.hierarchy.treeLabel')"
      :check-label="t('components.hierarchy.checkLabel')"
      :expand-label="t('components.hierarchy.expandLabel')"
      :collapse-label="t('components.hierarchy.collapseLabel')"
      :loading-label="t('common.loading')"
      :retry-load-label="t('common.retry')"
      :load-children="loadPermissionChildren"
      checkable
    />
    <p class="text-sm text-muted-foreground">
      {{ t('components.hierarchy.selected', { name: selectedNodeLabel }) }}
      · {{ t('components.hierarchy.checked', { count: checkedNodeIds.length }) }}
    </p>
    <template #usage>
      &lt;TreeView v-model:checked-ids="permissions" :nodes="nodes" :load-children="loadChildren"
      checkable /&gt;
    </template>
  </ComponentDemoCard>
</template>
