<script setup lang="ts">
import type { ExpandedState } from '@tanstack/vue-table'
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ProTable } from '@/components/pro-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrencyLabel } from '@/lib/display-format'
import {
  DEFAULT_TABLE_TREE_EXPANDED_NODE_IDS,
  getTableExampleScenario,
  TABLE_TREE_EXPANDABLE_NODE_IDS,
  TABLE_TREE_WORK_ORDERS,
} from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

type AsyncBranchState = 'idle' | 'loading' | 'failed' | 'loaded'

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const { locale } = useI18n()
const columnHelper = createColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('tree')
const expandedNodeIds = defineModel<readonly string[]>('expandedNodeIds', {
  default: () => [...DEFAULT_TABLE_TREE_EXPANDED_NODE_IDS],
})
const expanded = computed<ExpandedState>({
  get: () => Object.fromEntries(expandedNodeIds.value.map(nodeId => [nodeId, true])),
  set: (nextExpanded) => {
    // AI modified: only expandable fixture IDs leave the table as shareable list state.
    expandedNodeIds.value
      = nextExpanded === true
        ? [...TABLE_TREE_EXPANDABLE_NODE_IDS]
        : Object.entries(nextExpanded)
            .filter(
              ([nodeId, isExpanded]) =>
                isExpanded
                && TABLE_TREE_EXPANDABLE_NODE_IDS.includes(
                  nodeId as (typeof TABLE_TREE_EXPANDABLE_NODE_IDS)[number],
                ),
            )
            .map(([nodeId]) => nodeId)
  },
})
const treeRows = shallowRef<TableWorkOrder[]>(
  TABLE_TREE_WORK_ORDERS.map((row) => {
    if (row.id === 'program-identity')
      return { ...row, children: undefined }
    return {
      ...row,
      children: row.children?.map(child => ({
        ...child,
        children: child.children?.map(grandchild => ({ ...grandchild })),
      })),
    }
  }),
)
const asyncBranchState = shallowRef<AsyncBranchState>('idle')
let loadAttempt = 0
let loadTimer: ReturnType<typeof globalThis.setTimeout> | undefined
const columns = computed(() => [
  columnHelper.accessor('title', {
    header: props.copy.columns.title,
    size: 300,
    meta: { label: props.copy.columns.title, textBehavior: 'wrap', minWidth: 260 },
  }),
  columnHelper.accessor('owner', {
    header: props.copy.columns.owner,
    size: 170,
    meta: { label: props.copy.columns.owner, textBehavior: 'nowrap', minWidth: 150 },
  }),
  columnHelper.accessor('status', {
    header: props.copy.columns.status,
    size: 120,
    meta: { label: props.copy.columns.status, textBehavior: 'nowrap', minWidth: 110 },
  }),
  columnHelper.accessor('amount', {
    header: props.copy.columns.amount,
    size: 150,
    meta: { label: props.copy.columns.amount, textBehavior: 'nowrap', minWidth: 140 },
  }),
])

function isAsyncBranchExpanded(nextExpanded: ExpandedState): boolean {
  return nextExpanded === true || nextExpanded['program-identity'] === true
}

function loadIdentityChildren(): void {
  if (asyncBranchState.value === 'loading' || asyncBranchState.value === 'loaded')
    return

  loadAttempt += 1
  asyncBranchState.value = 'loading'
  if (loadTimer)
    globalThis.clearTimeout(loadTimer)

  // AI modified: the first deterministic failure makes retry and recovery observable without a flaky backend.
  loadTimer = globalThis.setTimeout(() => {
    if (loadAttempt === 1) {
      asyncBranchState.value = 'failed'
      return
    }

    const identitySource = TABLE_TREE_WORK_ORDERS.find(row => row.id === 'program-identity')
    const loadedChildren
      = identitySource?.children?.map(child => ({
        ...child,
        children: child.children?.map(grandchild => ({ ...grandchild })),
      })) ?? []
    treeRows.value = treeRows.value.map(row =>
      row.id === 'program-identity' ? { ...row, children: loadedChildren } : row,
    )
    asyncBranchState.value = 'loaded'
  }, 140)
}

watch(
  expanded,
  (nextExpanded) => {
    if (isAsyncBranchExpanded(nextExpanded) && asyncBranchState.value === 'idle')
      loadIdentityChildren()
  },
  { deep: true },
)

onUnmounted(() => {
  if (loadTimer)
    globalThis.clearTimeout(loadTimer)
})
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <div
      class="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
      role="status"
    >
      <span class="font-medium">{{ copy.tree.loadState }}</span>
      <span data-testid="tree-load-state">{{ copy.tree[asyncBranchState] }}</span>
      <Button
        v-if="asyncBranchState === 'failed'"
        type="button"
        size="sm"
        variant="outline"
        data-testid="tree-retry"
        @click="loadIdentityChildren"
      >
        {{ copy.tree.retry }}
      </Button>
    </div>
    <!-- AI modified: native expansion retains default three-level rows while an unloaded branch remains genuinely expandable. -->
    <ProTable
      v-model:expanded="expanded"
      :columns="columns"
      :data="treeRows"
      :labels="copy.tableLabels"
      :empty-message="copy.messages.noRows"
      :page-size-options="[10, 20]"
      enable-expanding
      :enable-column-controls="false"
      :enable-column-ordering="false"
      :enable-column-pinning="false"
      :enable-density="false"
      :enable-fullscreen="false"
      :get-row-id="(row) => row.id"
      :get-sub-rows="(row) => row.children"
      :get-row-can-expand="
        (row) => row.original.id === 'program-identity' || Boolean(row.original.children?.length)
      "
    >
      <template #cell="{ cell, row }">
        <Badge v-if="cell.column.id === 'status'" variant="outline">
          {{ copy.status[row.original.status] }}
        </Badge>
        <span v-else-if="cell.column.id === 'amount'" class="tabular-nums">
          {{
            getCurrencyLabel(row.original.amount, {
              locale,
              currency: 'CNY',
              maximumFractionDigits: 0,
            })
          }}
        </span>
        <span v-else>{{ cell.getValue() }}</span>
      </template>
    </ProTable>
  </TableExampleCard>
</template>
