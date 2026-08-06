<script setup lang="ts">
import { useAllowedUrlState } from '@/composables/use-allowed-url-state'
import {
  DEFAULT_TABLE_TREE_EXPANDED_NODE_IDS,
  TABLE_EXAMPLE_GROUPS,
  TABLE_TREE_EXPANDABLE_NODE_IDS,
} from '@/features/component-gallery/table/table-examples'
import TableExamplesModule from '@/features/component-gallery/table/TableExamplesModule.vue'

defineOptions({ name: 'TableExamplesPage' })

const activeGroup = useAllowedUrlState({
  kind: 'string',
  queryKey: 'tableGroup',
  allowedStates: TABLE_EXAMPLE_GROUPS,
  defaultState: 'foundations',
  history: 'push',
})
const expandedTreeNodeIds = useAllowedUrlState({
  kind: 'list',
  queryKey: 'tableTree',
  allowedStates: TABLE_TREE_EXPANDABLE_NODE_IDS,
  defaultState: DEFAULT_TABLE_TREE_EXPANDED_NODE_IDS,
  emptyStateToken: 'none',
  history: 'push',
})
</script>

<template>
  <!-- AI modified: keep the route page as a composition boundary for the independently testable Table module. -->
  <TableExamplesModule
    v-model:active-group="activeGroup"
    v-model:expanded-tree-node-ids="expandedTreeNodeIds"
  />
</template>
