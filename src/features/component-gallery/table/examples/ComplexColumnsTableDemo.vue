<script setup lang="ts">
import type { ColumnOrderState, ColumnPinningState, VisibilityState } from '@tanstack/vue-table'
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import type { ProTableDensity } from '@/components/pro-table'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ProTable } from '@/components/pro-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBrowserStorage, safeStorageGet, safeStorageSet } from '@/lib/browser-storage'
import { ADMIN_DISPLAY_TIME_ZONE, getCurrencyLabel, getDateTimeLabel } from '@/lib/display-format'
import { getTableExampleScenario, TABLE_WORK_ORDERS } from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

interface ColumnPreferences {
  version: 1
  density: ProTableDensity
  visibility: VisibilityState
  order: ColumnOrderState
  pinning: ColumnPinningState
}

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const preferenceKey = 'gvueter:gallery:table-columns:v1'
const columnIds = [
  'id',
  'title',
  'owner',
  'status',
  'priority',
  'region',
  'amount',
  'updatedAt',
] as const
const defaultPreferences: ColumnPreferences = {
  version: 1,
  density: 'compact',
  visibility: {},
  order: [],
  pinning: { left: ['id'], right: [] },
}
const restoredPreferences = readColumnPreferences()
const { locale } = useI18n()
const columnHelper = createColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('complex-columns')
const density = shallowRef<ProTableDensity>(restoredPreferences.density)
const columnVisibility = shallowRef<VisibilityState>({ ...restoredPreferences.visibility })
const columnOrder = shallowRef<ColumnOrderState>([...restoredPreferences.order])
const columnPinning = shallowRef<ColumnPinningState>({
  left: [...(restoredPreferences.pinning.left ?? [])],
  right: [...(restoredPreferences.pinning.right ?? [])],
})
const preferenceStatus = shallowRef(props.copy.preferences.saved)
const preferenceSummary = computed(() =>
  JSON.stringify({
    density: density.value,
    visibility: columnVisibility.value,
    order: columnOrder.value,
    pinning: columnPinning.value,
  }),
)
const columns = computed(() => [
  columnHelper.accessor('id', {
    header: props.copy.columns.id,
    size: 140,
    meta: { label: props.copy.columns.id, textBehavior: 'nowrap', minWidth: 140 },
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
  columnHelper.accessor('priority', {
    header: props.copy.columns.priority,
    size: 120,
    meta: { label: props.copy.columns.priority, textBehavior: 'nowrap', minWidth: 110 },
  }),
  columnHelper.accessor('region', {
    header: props.copy.columns.region,
    size: 170,
    meta: { label: props.copy.columns.region, textBehavior: 'nowrap', minWidth: 150 },
  }),
  columnHelper.accessor('amount', {
    header: props.copy.columns.amount,
    size: 150,
    meta: { label: props.copy.columns.amount, textBehavior: 'nowrap', minWidth: 140 },
  }),
  columnHelper.accessor('updatedAt', {
    header: props.copy.columns.updatedAt,
    size: 180,
    meta: { label: props.copy.columns.updatedAt, textBehavior: 'nowrap', minWidth: 170 },
  }),
])

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function hasAllowedColumnIds(candidate: unknown): candidate is string[] {
  return (
    Array.isArray(candidate)
    && candidate.every(
      columnId =>
        typeof columnId === 'string' && columnIds.includes(columnId as (typeof columnIds)[number]),
    )
    && new Set(candidate).size === candidate.length
  )
}

function readColumnPreferences(): ColumnPreferences {
  try {
    const preferenceText = safeStorageGet(getBrowserStorage('local'), preferenceKey)
    if (!preferenceText)
      return defaultPreferences
    const candidate: unknown = JSON.parse(preferenceText)
    if (!isRecord(candidate) || candidate.version !== 1)
      return defaultPreferences
    if (!['compact', 'standard', 'comfortable'].includes(String(candidate.density)))
      return defaultPreferences
    if (
      !isRecord(candidate.visibility)
      || !isRecord(candidate.pinning)
      || !Array.isArray(candidate.order)
    ) {
      return defaultPreferences
    }
    if (
      !Object.entries(candidate.visibility).every(
        ([columnId, isVisible]) =>
          columnIds.includes(columnId as (typeof columnIds)[number])
          && typeof isVisible === 'boolean',
      )
    ) {
      return defaultPreferences
    }
    if (
      !hasAllowedColumnIds(candidate.order)
      || !hasAllowedColumnIds(candidate.pinning.left)
      || !hasAllowedColumnIds(candidate.pinning.right)
    ) {
      return defaultPreferences
    }

    // AI modified: persisted browser input is accepted only after a versioned allowlist check.
    return {
      version: 1,
      density: candidate.density as ProTableDensity,
      visibility: candidate.visibility as VisibilityState,
      order: candidate.order,
      pinning: { left: candidate.pinning.left, right: candidate.pinning.right },
    }
  }
  catch {
    return defaultPreferences
  }
}

function saveColumnPreferences(): void {
  const preferences: ColumnPreferences = {
    version: 1,
    density: density.value,
    visibility: columnVisibility.value,
    order: columnOrder.value,
    pinning: columnPinning.value,
  }
  // AI modified: column controls stay usable when browser persistence is blocked or full.
  if (safeStorageSet(getBrowserStorage('local'), preferenceKey, JSON.stringify(preferences))) {
    preferenceStatus.value = props.copy.preferences.saved
  }
}

function restoreDefaultColumns(): void {
  density.value = defaultPreferences.density
  columnVisibility.value = {}
  columnOrder.value = []
  columnPinning.value = { left: ['id'], right: [] }
  preferenceStatus.value = props.copy.preferences.reset
  // AI modified: resetting every controlled preference prevents hidden stale pin/order state from surviving.
}

watch([density, columnVisibility, columnOrder, columnPinning], saveColumnPreferences, {
  deep: true,
  flush: 'post',
})
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <div
      class="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
    >
      <span role="status" data-testid="column-preference-status">{{ preferenceStatus }}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="reset-columns"
        @click="restoreDefaultColumns"
      >
        {{ copy.preferences.reset }}
      </Button>
      <code class="w-full break-all text-xs" data-testid="column-preferences">{{
        preferenceSummary
      }}</code>
    </div>
    <!-- AI modified: every complex-column preference remains controlled so a real page can replace localStorage with an account store. -->
    <ProTable
      v-model:density="density"
      v-model:column-visibility="columnVisibility"
      v-model:column-order="columnOrder"
      v-model:column-pinning="columnPinning"
      :columns="columns"
      :data="TABLE_WORK_ORDERS.slice(0, 12)"
      :labels="copy.tableLabels"
      :empty-message="copy.messages.noRows"
      :page-size-options="[5, 10, 20]"
      :enable-fullscreen="false"
      :get-row-id="(row) => row.id"
    >
      <template #cell="{ cell, row }">
        <Badge v-if="cell.column.id === 'status'" variant="outline">
          {{ copy.status[row.original.status] }}
        </Badge>
        <Badge
          v-else-if="cell.column.id === 'priority'"
          :variant="row.original.priority === 'high' ? 'destructive' : 'secondary'"
        >
          {{ copy.priority[row.original.priority] }}
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
    </ProTable>
  </TableExampleCard>
</template>
