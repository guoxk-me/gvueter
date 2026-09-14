<script setup lang="ts">
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DataTable } from '@/components/data-table'
import { createDataTableColumnHelper } from '@/components/table-features'
import { Badge } from '@/components/ui/badge'
import { ADMIN_DISPLAY_TIME_ZONE, getCurrencyLabel, getDateTimeLabel } from '@/lib/display-format'
import { getTableExampleScenario, TABLE_WORK_ORDERS } from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const { locale } = useI18n()
const columnHelper = createDataTableColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('basic')
const rows = TABLE_WORK_ORDERS.slice(0, 4)
const columns = computed(() => [
  columnHelper.accessor('id', {
    header: props.copy.columns.id,
    meta: { textBehavior: 'nowrap', minWidth: 120 },
  }),
  columnHelper.accessor('title', {
    header: props.copy.columns.title,
    meta: { textBehavior: 'wrap', minWidth: 220 },
  }),
  columnHelper.accessor('status', {
    header: props.copy.columns.status,
    meta: { textBehavior: 'nowrap', minWidth: 110 },
  }),
  columnHelper.accessor('amount', {
    header: props.copy.columns.amount,
    meta: { textBehavior: 'nowrap', minWidth: 130 },
  }),
  columnHelper.accessor('updatedAt', {
    header: props.copy.columns.updatedAt,
    meta: { textBehavior: 'nowrap', minWidth: 160 },
  }),
])

function statusVariant(status: TableWorkOrder['status']): 'default' | 'destructive' | 'secondary' {
  if (status === 'open')
    return 'default'
  if (status === 'blocked')
    return 'destructive'
  return 'secondary'
}
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <!-- AI modified: business values use the production locale and timezone contract in the basic example. -->
    <DataTable
      data-testid="basic-table"
      :columns="columns"
      :data="rows"
      :empty-message="copy.messages.noRows"
      :default-page-size="5"
      :page-size-options="[5, 10]"
      :get-row-id="(row) => row.id"
    >
      <template #cell="{ cell, row }">
        <Badge v-if="cell.column.id === 'status'" :variant="statusVariant(row.original.status)">
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
        <span v-else-if="cell.column.id === 'updatedAt'">
          {{
            getDateTimeLabel(row.original.updatedAt, {
              locale,
              timeZone: ADMIN_DISPLAY_TIME_ZONE,
              dateStyle: 'medium',
            })
          }}
        </span>
        <span v-else>{{ cell.getValue() }}</span>
      </template>
    </DataTable>
  </TableExampleCard>
</template>
