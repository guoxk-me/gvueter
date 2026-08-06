<script setup lang="ts">
import type { PaginationState } from '@tanstack/vue-table'
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, shallowRef } from 'vue'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { getTableExampleScenario, TABLE_WORK_ORDERS } from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const columnHelper = createColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('client-pagination')
const pagination = shallowRef<PaginationState>({ pageIndex: 0, pageSize: 5 })
const rows = TABLE_WORK_ORDERS.slice(0, 13)
const columns = computed(() => [
  columnHelper.accessor('id', {
    header: props.copy.columns.id,
    meta: { textBehavior: 'nowrap', minWidth: 120 },
  }),
  columnHelper.accessor('title', {
    header: props.copy.columns.title,
    meta: { textBehavior: 'wrap', minWidth: 240 },
  }),
  columnHelper.accessor('owner', {
    header: props.copy.columns.owner,
    meta: { textBehavior: 'nowrap', minWidth: 150 },
  }),
  columnHelper.accessor('status', {
    header: props.copy.columns.status,
    meta: { textBehavior: 'nowrap', minWidth: 110 },
  }),
])
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <p class="text-sm text-muted-foreground" role="status" data-testid="client-pagination-state">
      pageIndex={{ pagination.pageIndex }} · pageSize={{ pagination.pageSize }} · rows={{
        rows.length
      }}
    </p>
    <!-- AI modified: this controlled snapshot demonstrates the same pagination object a page can synchronize to the URL. -->
    <DataTable
      v-model:pagination="pagination"
      :columns="columns"
      :data="rows"
      :empty-message="copy.messages.noRows"
      :default-page-size="5"
      :page-size-options="[5, 10, 20]"
      :get-row-id="(row) => row.id"
    >
      <template #cell="{ cell, row }">
        <Badge v-if="cell.column.id === 'status'" variant="outline">
          {{ copy.status[row.original.status] }}
        </Badge>
        <span v-else>{{ cell.getValue() }}</span>
      </template>
    </DataTable>
  </TableExampleCard>
</template>
