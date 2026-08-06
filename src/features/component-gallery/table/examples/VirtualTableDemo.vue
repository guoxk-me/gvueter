<script setup lang="ts">
import type { PaginationState } from '@tanstack/vue-table'
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, shallowRef } from 'vue'
import { ProTable } from '@/components/pro-table'
import { Badge } from '@/components/ui/badge'
import { getTableExampleScenario, TABLE_WORK_ORDERS } from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const columnHelper = createColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('virtual-scroll')
const pagination = shallowRef<PaginationState>({ pageIndex: 0, pageSize: 1000 })
// AI modified: unique stable IDs make virtual row recycling observable and safe under sorting.
const virtualRows: TableWorkOrder[] = Array.from({ length: 1000 }, (_, index) => {
  const sourceRow = TABLE_WORK_ORDERS[index % TABLE_WORK_ORDERS.length]
  if (!sourceRow) throw new Error('Virtual table fixtures require at least one source row.')
  return {
    ...sourceRow,
    id: `VIRTUAL-${String(index + 1).padStart(4, '0')}`,
    title: `Virtualized operational record ${index + 1}`,
    amount: sourceRow.amount + index,
  }
})
const columns = computed(() => [
  columnHelper.accessor('id', {
    header: props.copy.columns.id,
    size: 150,
    meta: { label: props.copy.columns.id, textBehavior: 'nowrap', minWidth: 150 },
  }),
  columnHelper.accessor('title', {
    header: props.copy.columns.title,
    size: 320,
    meta: { label: props.copy.columns.title, textBehavior: 'wrap', minWidth: 280 },
  }),
  columnHelper.accessor('owner', {
    header: props.copy.columns.owner,
    size: 180,
    meta: { label: props.copy.columns.owner, textBehavior: 'nowrap', minWidth: 160 },
  }),
  columnHelper.accessor('status', {
    header: props.copy.columns.status,
    size: 120,
    meta: { label: props.copy.columns.status, textBehavior: 'nowrap', minWidth: 110 },
  }),
])
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <p class="text-sm text-muted-foreground" data-testid="virtual-row-count">
      1,000 source rows · 320 px viewport
    </p>
    <ProTable
      v-model:pagination="pagination"
      :columns="columns"
      :data="virtualRows"
      :labels="copy.tableLabels"
      :empty-message="copy.messages.noRows"
      :page-size-options="[1000]"
      enable-virtualization
      :virtual-height="320"
      :virtual-overscan="6"
      :enable-column-controls="false"
      :enable-column-ordering="false"
      :enable-column-pinning="false"
      :enable-density="false"
      :enable-fullscreen="false"
      :get-row-id="(row) => row.id"
    >
      <template #cell="{ cell, row }">
        <Badge v-if="cell.column.id === 'status'" variant="outline">
          {{ copy.status[row.original.status] }}
        </Badge>
        <span v-else>{{ cell.getValue() }}</span>
      </template>
    </ProTable>
    <template #note>
      {{ copy.messages.virtualHint }}
    </template>
  </TableExampleCard>
</template>
