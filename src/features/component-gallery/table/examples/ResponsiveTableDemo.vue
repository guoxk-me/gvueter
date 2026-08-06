<script setup lang="ts">
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed } from 'vue'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { getTableExampleScenario, TABLE_WORK_ORDERS } from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const columnHelper = createColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('responsive')
const columns = computed(() => [
  columnHelper.accessor('id', {
    header: props.copy.columns.id,
    meta: { textBehavior: 'nowrap', minWidth: 120 },
  }),
  columnHelper.accessor('title', {
    header: props.copy.columns.title,
    meta: { textBehavior: 'wrap', minWidth: 280 },
  }),
  columnHelper.accessor('owner', {
    header: props.copy.columns.owner,
    meta: { textBehavior: 'nowrap', minWidth: 160 },
  }),
  columnHelper.accessor('status', {
    header: props.copy.columns.status,
    meta: { textBehavior: 'nowrap', minWidth: 110 },
  }),
  columnHelper.accessor('region', {
    header: props.copy.columns.region,
    meta: { textBehavior: 'nowrap', minWidth: 150 },
  }),
])
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <!-- AI modified: the fixed narrow frame proves overflow ownership without viewport-specific column duplication. -->
    <div class="w-full max-w-[360px] min-w-0 overflow-hidden" data-testid="responsive-table-frame">
      <DataTable
        :columns="columns"
        :data="TABLE_WORK_ORDERS.slice(0, 5)"
        :empty-message="copy.messages.noRows"
        :default-page-size="5"
        :page-size-options="[5, 10]"
        :get-row-id="(row) => row.id"
      >
        <template #cell="{ cell, row }">
          <Badge v-if="cell.column.id === 'status'" variant="outline">
            {{ copy.status[row.original.status] }}
          </Badge>
          <span v-else>{{ cell.getValue() }}</span>
        </template>
      </DataTable>
    </div>
    <template #note>
      {{ copy.messages.responsiveHint }}
    </template>
  </TableExampleCard>
</template>
