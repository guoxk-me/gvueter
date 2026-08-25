<script setup lang="ts">
import type { RowSelectionState } from '@tanstack/vue-table'
import type { CsvExportColumn, DateRangePreset, DateRangeValue } from '@/components/admin'
import { Archive, RefreshCw } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { AsyncState, BulkActionBar, CsvExportButton, DateRangePicker } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ComponentDemoCard from './ComponentDemoCard.vue'

interface OperationRecord {
  id: string
  name: string
  owner: string
  status: 'active' | 'draft' | 'paused'
  updatedAt: string
}

const demoRecords: OperationRecord[] = [
  {
    id: 'cmp-001',
    name: 'Q3 growth campaign',
    owner: 'Avery Chen',
    status: 'active',
    updatedAt: '2026-07-10',
  },
  {
    id: 'cmp-002',
    name: 'Onboarding refresh',
    owner: 'Jordan Wu',
    status: 'draft',
    updatedAt: '2026-07-09',
  },
  {
    id: 'cmp-003',
    name: 'Partner launch',
    owner: 'Skyler Li',
    status: 'paused',
    updatedAt: '2026-07-08',
  },
  {
    id: 'cmp-004',
    name: 'Retention initiative',
    owner: 'Avery Chen',
    status: 'active',
    updatedAt: '2026-07-06',
  },
]

const { t } = useI18n()
const selectedRange = shallowRef<DateRangeValue | null>(null)
const selectedRowIds = shallowRef<RowSelectionState>({})

const datePresets = computed<readonly DateRangePreset[]>(() => {
  const today = dayjs()
  return [
    {
      label: t('components.operations.last7Days'),
      value: {
        start: today.subtract(6, 'day').format('YYYY-MM-DD'),
        end: today.format('YYYY-MM-DD'),
      },
    },
    {
      label: t('components.operations.last30Days'),
      value: {
        start: today.subtract(29, 'day').format('YYYY-MM-DD'),
        end: today.format('YYYY-MM-DD'),
      },
    },
  ]
})

const recordsQuery = useQuery({
  queryKey: computed(() => [
    'component-demo-records',
    selectedRange.value?.start ?? '',
    selectedRange.value?.end ?? '',
  ]),
  queryFn: loadOperationRecords,
})

const records = computed(() => recordsQuery.data.value ?? [])
const selectedRecords = computed(() =>
  records.value.filter(record => selectedRowIds.value[record.id]),
)
const recordsForExport = computed(() =>
  selectedRecords.value.length > 0 ? selectedRecords.value : records.value,
)
const queryError = computed(() =>
  recordsQuery.error.value instanceof Error ? recordsQuery.error.value.message : null,
)

const recordColumns = computed(() => [
  { accessorKey: 'name', header: t('components.operations.name') },
  { accessorKey: 'owner', header: t('components.operations.owner') },
  { accessorKey: 'status', header: t('components.operations.status') },
  { accessorKey: 'updatedAt', header: t('components.operations.updatedAt') },
])

const exportColumns = computed<readonly CsvExportColumn<OperationRecord>[]>(() => [
  { label: t('components.operations.name'), getValue: record => record.name },
  { label: t('components.operations.owner'), getValue: record => record.owner },
  {
    label: t('components.operations.status'),
    getValue: record => t(`components.operations.${record.status}`),
  },
  { label: t('components.operations.updatedAt'), getValue: record => record.updatedAt },
])

watch(selectedRange, () => {
  // AI modified: do not retain a selection after the query filter has changed.
  clearSelection()
})

async function loadOperationRecords(): Promise<OperationRecord[]> {
  await new Promise(resolve => window.setTimeout(resolve, 300))
  return demoRecords
}

function clearSelection(): void {
  selectedRowIds.value = {}
}

function archiveSelectedRecords(): void {
  if (selectedRecords.value.length === 0)
    return

  toast.success(t('components.operations.archived', { count: selectedRecords.value.length }))
  clearSelection()
}

function announceExport(rowCount: number): void {
  toast.success(t('components.operations.exported', { count: rowCount }))
}

async function refreshRecords(): Promise<void> {
  await recordsQuery.refetch()
}

function statusVariant(status: OperationRecord['status']): 'default' | 'secondary' | 'outline' {
  if (status === 'active')
    return 'default'
  if (status === 'paused')
    return 'outline'
  return 'secondary'
}
</script>

<template>
  <div class="space-y-4">
    <ComponentDemoCard
      :title="t('components.operations.dateRangeTitle')"
      :description="t('components.operations.dateRangeDescription')"
    >
      <DateRangePicker
        v-model="selectedRange"
        :presets="datePresets"
        :placeholder="t('components.operations.selectRange')"
        :start-label="t('components.operations.startDate')"
        :end-label="t('components.operations.endDate')"
        :apply-label="t('components.operations.applyRange')"
        :clear-label="t('components.operations.clearRange')"
        :invalid-range-label="t('components.operations.invalidRange')"
      />
      <template #usage>
        &lt;DateRangePicker v-model="dateRange" :presets="presets" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.operations.resourceTitle')"
      :description="t('components.operations.resourceDescription')"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted-foreground">
          {{ t('components.operations.queryState') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <CsvExportButton
            :rows="recordsForExport"
            :columns="exportColumns"
            file-name="component-center-records.csv"
            :label="
              selectedRecords.length
                ? t('components.operations.exportSelected')
                : t('components.operations.exportAll')
            "
            @export="announceExport"
          />
          <Button
            variant="outline"
            :disabled="recordsQuery.isFetching.value"
            @click="refreshRecords"
          >
            <RefreshCw
              class="mr-2 size-4"
              :class="recordsQuery.isFetching.value ? 'animate-spin' : undefined"
              aria-hidden="true"
            />
            {{ t('common.refresh') }}
          </Button>
        </div>
      </div>

      <BulkActionBar
        :selected-count="selectedRecords.length"
        :selection-label="t('components.operations.selected')"
        :clear-label="t('components.operations.clearSelection')"
        @clear="clearSelection"
      >
        <Button type="button" size="sm" @click="archiveSelectedRecords">
          <Archive class="mr-1.5 size-4" aria-hidden="true" />
          {{ t('components.operations.archive') }}
        </Button>
      </BulkActionBar>

      <AsyncState
        :is-loading="recordsQuery.isPending.value"
        :error="queryError"
        :error-title="t('components.operations.queryErrorTitle')"
        :retry-label="t('common.refresh')"
        @retry="refreshRecords"
      >
        <DataTable
          v-model:selected-row-ids="selectedRowIds"
          :columns="recordColumns"
          :data="records"
          :empty-message="t('common.noData')"
          :enable-row-selection="true"
          :get-row-id="(record) => record.id"
          :default-page-size="5"
        >
          <template #cell="{ cell, row }">
            <Badge v-if="cell.column.id === 'status'" :variant="statusVariant(row.original.status)">
              {{ t(`components.operations.${row.original.status}`) }}
            </Badge>
            <span v-else>{{ cell.getValue() }}</span>
          </template>
        </DataTable>
      </AsyncState>
      <template #usage>
        useQuery(...) + &lt;DataTable v-model:selected-row-ids="selected" /&gt;
      </template>
    </ComponentDemoCard>
  </div>
</template>
