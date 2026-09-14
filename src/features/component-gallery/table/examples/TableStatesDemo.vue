<script setup lang="ts">
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import { computed, shallowRef } from 'vue'
import { AsyncState } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { createDataTableColumnHelper } from '@/components/table-features'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getTableExampleScenario, TABLE_WORK_ORDERS } from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

type DemoState = 'ready' | 'loading' | 'empty' | 'error'

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const columnHelper = createDataTableColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('states')
const demoState = shallowRef<DemoState>('ready')
const visibleRows = computed(() =>
  demoState.value === 'empty' ? [] : TABLE_WORK_ORDERS.slice(0, 4),
)
const columns = computed(() => [
  columnHelper.accessor('id', {
    header: props.copy.columns.id,
    meta: { textBehavior: 'nowrap', minWidth: 120 },
  }),
  columnHelper.accessor('title', {
    header: props.copy.columns.title,
    meta: { textBehavior: 'wrap', minWidth: 240 },
  }),
  columnHelper.accessor('status', {
    header: props.copy.columns.status,
    meta: { textBehavior: 'nowrap', minWidth: 110 },
  }),
])

const stateOptions = computed<readonly { id: DemoState, label: string }[]>(() => [
  { id: 'ready', label: props.copy.actions.ready },
  { id: 'loading', label: props.copy.actions.loading },
  { id: 'empty', label: props.copy.actions.empty },
  { id: 'error', label: props.copy.actions.error },
])
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <div class="flex flex-wrap gap-2" aria-label="Table state">
      <Button
        v-for="stateOption in stateOptions"
        :key="stateOption.id"
        type="button"
        size="sm"
        :variant="demoState === stateOption.id ? 'default' : 'outline'"
        :aria-pressed="demoState === stateOption.id"
        :data-testid="`table-state-${stateOption.id}`"
        @click="demoState = stateOption.id"
      >
        {{ stateOption.label }}
      </Button>
    </div>
    <p class="sr-only" role="status" data-testid="active-table-state">
      {{ demoState }}
    </p>

    <!-- AI modified: error recovery wraps the same table whose loading and empty states remain native. -->
    <AsyncState
      :error="demoState === 'error' ? copy.messages.errorDescription : null"
      :error-title="copy.messages.errorTitle"
      :retry-label="copy.actions.retry"
      @retry="demoState = 'ready'"
    >
      <DataTable
        :columns="columns"
        :data="visibleRows"
        :empty-message="copy.messages.emptyDescription"
        :is-loading="demoState === 'loading'"
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
    </AsyncState>
  </TableExampleCard>
</template>
