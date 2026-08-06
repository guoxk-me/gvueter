<script setup lang="ts">
import type { StatusTone } from '@/components/admin'
import type { MonitoringLog, MonitoringLogSeverity } from '@/features/monitoring/types'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { StatusTag } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel, getNumberLabel } from '@/lib/display-format'

defineProps<{
  logs: MonitoringLog[]
  isLoading: boolean
}>()

const { t, locale } = useI18n()
const columnHelper = createColumnHelper<MonitoringLog>()
const columns = computed(() => [
  columnHelper.accessor('occurredAt', { header: t('monitoring.logsTable.occurredAt') }),
  columnHelper.accessor('kind', { header: t('monitoring.logsTable.kind') }),
  columnHelper.accessor('severity', { header: t('monitoring.logsTable.severity') }),
  columnHelper.accessor('actorName', { header: t('monitoring.logsTable.actor') }),
  columnHelper.accessor('ipAddress', { header: t('monitoring.logsTable.ipAddress') }),
  columnHelper.accessor('target', { header: t('monitoring.logsTable.target') }),
  columnHelper.accessor('summaryKey', { header: t('monitoring.logsTable.summary') }),
])

function getTimeLabel(timestamp: string): string {
  // AI modified: monitoring log timestamps and measurements use one display contract.
  return getDateTimeLabel(timestamp, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getMeasurementLabel(measurement: number): string {
  return getNumberLabel(measurement, { locale: locale.value })
}

function getSeverityTone(severity: MonitoringLogSeverity): StatusTone {
  return {
    error: 'destructive',
    info: 'primary',
    warning: 'warning',
  }[severity] as StatusTone
}
</script>

<template>
  <DataTable
    :columns="columns"
    :data="logs"
    :is-loading="isLoading"
    :empty-message="t('monitoring.logsTable.empty')"
    :default-page-size="10"
    :get-row-id="(log) => log.id"
  >
    <template #cell="{ cell, row }">
      <span v-if="cell.column.id === 'occurredAt'" class="whitespace-nowrap text-xs">
        {{ getTimeLabel(row.original.occurredAt) }}
      </span>
      <StatusTag
        v-else-if="cell.column.id === 'kind'"
        :label="t(`monitoring.logKinds.${row.original.kind}`)"
        tone="neutral"
        :dot="false"
      />
      <StatusTag
        v-else-if="cell.column.id === 'severity'"
        :label="t(`monitoring.severities.${row.original.severity}`)"
        :tone="getSeverityTone(row.original.severity)"
      />
      <div v-else-if="cell.column.id === 'actorName'" class="min-w-36">
        <p class="font-medium">
          {{ row.original.actorName }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ row.original.actorIdentifier }}
        </p>
      </div>
      <code v-else-if="cell.column.id === 'ipAddress'" class="text-xs">
        {{ row.original.ipAddress }}
      </code>
      <div v-else-if="cell.column.id === 'target'" class="min-w-44">
        <code class="text-xs">{{ row.original.target }}</code>
        <p v-if="row.original.statusCode" class="mt-1 text-xs text-muted-foreground">
          HTTP {{ getMeasurementLabel(row.original.statusCode) }}
          <template v-if="row.original.durationMs">
            · {{ getMeasurementLabel(row.original.durationMs) }} ms
          </template>
        </p>
      </div>
      <span v-else-if="cell.column.id === 'summaryKey'" class="text-sm text-muted-foreground">
        {{ t(row.original.summaryKey) }}
      </span>
    </template>
  </DataTable>
</template>
