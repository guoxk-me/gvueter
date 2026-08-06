<script setup lang="ts">
import type { StatusTone } from '@/components/admin'
import type { ScheduledJob, ScheduledJobStatus } from '@/features/monitoring/types'
import { Play } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction, StatusTag } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel, getNumberLabel } from '@/lib/display-format'

const props = defineProps<{
  jobs: ScheduledJob[]
  isLoading: boolean
  canManage: boolean
  isRunning: boolean
  runningJobId?: string
}>()

const emit = defineEmits<{
  run: [job: ScheduledJob]
}>()

const { t, locale } = useI18n()
const columnHelper = createColumnHelper<ScheduledJob>()
const columns = computed(() => [
  columnHelper.accessor('nameKey', { header: t('monitoring.jobsTable.job') }),
  columnHelper.accessor('schedule', { header: t('monitoring.jobsTable.schedule') }),
  columnHelper.accessor('status', { header: t('monitoring.jobsTable.status') }),
  columnHelper.accessor('lastRunAt', { header: t('monitoring.jobsTable.lastRun') }),
  columnHelper.accessor('nextRunAt', { header: t('monitoring.jobsTable.nextRun') }),
  columnHelper.accessor('lastDurationMs', { header: t('monitoring.jobsTable.duration') }),
  ...(props.canManage
    ? [columnHelper.display({ id: 'actions', header: t('common.actions'), enableSorting: false })]
    : []),
])

function getStatusTone(status: ScheduledJobStatus): StatusTone {
  return {
    failed: 'destructive',
    idle: 'success',
    running: 'primary',
  }[status] as StatusTone
}

function getTimeLabel(timestamp: string): string {
  // AI modified: job scheduling timestamps use the shared display timezone.
  return getDateTimeLabel(timestamp, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getDurationLabel(durationMs: number): string {
  return getNumberLabel(durationMs, { locale: locale.value })
}
</script>

<template>
  <DataTable
    :columns="columns"
    :data="jobs"
    :is-loading="isLoading"
    :empty-message="t('monitoring.jobsTable.empty')"
    :get-row-id="(job) => job.id"
  >
    <template #cell="{ cell, row }">
      <div v-if="cell.column.id === 'nameKey'" class="min-w-48">
        <p class="font-medium">
          {{ t(row.original.nameKey) }}
        </p>
        <p v-if="row.original.errorSummaryKey" class="mt-1 text-xs text-destructive">
          {{ t(row.original.errorSummaryKey) }}
        </p>
      </div>
      <code v-else-if="cell.column.id === 'schedule'" class="text-xs">
        {{ row.original.schedule }}
      </code>
      <StatusTag
        v-else-if="cell.column.id === 'status'"
        :label="t(`monitoring.jobStatuses.${row.original.status}`)"
        :tone="getStatusTone(row.original.status)"
      />
      <span v-else-if="cell.column.id === 'lastRunAt'">
        {{ getTimeLabel(row.original.lastRunAt) }}
      </span>
      <span v-else-if="cell.column.id === 'nextRunAt'">
        {{ getTimeLabel(row.original.nextRunAt) }}
      </span>
      <span v-else-if="cell.column.id === 'lastDurationMs'">
        {{ getDurationLabel(row.original.lastDurationMs) }} ms
      </span>
      <ConfirmAction
        v-else-if="cell.column.id === 'actions'"
        :title="t('monitoring.jobsTable.runTitle')"
        :description="t('monitoring.jobsTable.runDescription', { job: t(row.original.nameKey) })"
        :trigger-label="t('monitoring.jobsTable.runNow')"
        :confirm-label="t('monitoring.jobsTable.runNow')"
        :cancel-label="t('common.cancel')"
        :pending-label="t('common.loading')"
        :is-pending="isRunning && runningJobId === row.original.id"
        @confirm="emit('run', row.original)"
      >
        <template #trigger>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            :disabled="isRunning"
            :aria-label="t('monitoring.jobsTable.runNow')"
          >
            <Play class="size-4" aria-hidden="true" />
          </Button>
        </template>
      </ConfirmAction>
    </template>
  </DataTable>
</template>
