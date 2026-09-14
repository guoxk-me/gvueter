<script setup lang="ts">
import type { StatusTone } from '@/components/admin'
import type { CacheHealth, CacheHealthStatus } from '@/features/monitoring/types'
import { Eraser } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction, StatusTag } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { createDataTableColumnHelper } from '@/components/table-features'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ADMIN_DISPLAY_TIME_ZONE,
  getDateTimeLabel,
  getFileSizeLabel,
  getNumberLabel,
  getPercentageLabel,
} from '@/lib/display-format'

const props = defineProps<{
  caches: CacheHealth[]
  isLoading: boolean
  canManage: boolean
  isClearing: boolean
  clearingCacheName?: string
}>()

const emit = defineEmits<{
  clear: [cache: CacheHealth]
}>()

const { t, locale } = useI18n()
const columnHelper = createDataTableColumnHelper<CacheHealth>()
const columns = computed(() => [
  columnHelper.accessor('name', { header: t('monitoring.cachesTable.cache') }),
  columnHelper.accessor('driver', { header: t('monitoring.cachesTable.driver') }),
  columnHelper.accessor('status', { header: t('monitoring.cachesTable.status') }),
  columnHelper.accessor('entryCount', { header: t('monitoring.cachesTable.entries') }),
  columnHelper.accessor('hitRate', { header: t('monitoring.cachesTable.hitRate') }),
  columnHelper.accessor('sizeBytes', { header: t('monitoring.cachesTable.size') }),
  columnHelper.accessor('lastClearedAt', { header: t('monitoring.cachesTable.lastCleared') }),
  ...(props.canManage
    ? [columnHelper.display({ id: 'actions', header: t('common.actions'), enableSorting: false })]
    : []),
])

function getStatusTone(status: CacheHealthStatus): StatusTone {
  return status === 'healthy' ? 'success' : 'warning'
}

function getTimeLabel(timestamp: string): string {
  // AI modified: monitoring values use locale-aware output without toFixed string coercion.
  return getDateTimeLabel(timestamp, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getSizeLabel(sizeBytes: number): string {
  return getFileSizeLabel(sizeBytes, { locale: locale.value })
}

function getEntryCountLabel(entryCount: number): string {
  return getNumberLabel(entryCount, { locale: locale.value })
}

function getHitRateLabel(hitRate: number): string {
  return getPercentageLabel(hitRate, {
    locale: locale.value,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}
</script>

<template>
  <DataTable
    :columns="columns"
    :data="caches"
    :is-loading="isLoading"
    :empty-message="t('monitoring.cachesTable.empty')"
    :get-row-id="(cache) => cache.name"
  >
    <template #cell="{ cell, row }">
      <code v-if="cell.column.id === 'name'" class="text-xs font-semibold">
        {{ row.original.name }}
      </code>
      <Badge v-else-if="cell.column.id === 'driver'" variant="secondary">
        {{ row.original.driver }}
      </Badge>
      <StatusTag
        v-else-if="cell.column.id === 'status'"
        :label="t(`monitoring.cacheStatuses.${row.original.status}`)"
        :tone="getStatusTone(row.original.status)"
      />
      <span v-else-if="cell.column.id === 'entryCount'">{{
        getEntryCountLabel(row.original.entryCount)
      }}</span>
      <span v-else-if="cell.column.id === 'hitRate'">{{
        getHitRateLabel(row.original.hitRate)
      }}</span>
      <span v-else-if="cell.column.id === 'sizeBytes'">{{
        getSizeLabel(row.original.sizeBytes)
      }}</span>
      <span v-else-if="cell.column.id === 'lastClearedAt'">
        {{ getTimeLabel(row.original.lastClearedAt) }}
      </span>
      <ConfirmAction
        v-else-if="cell.column.id === 'actions'"
        :title="t('monitoring.cachesTable.clearTitle')"
        :description="t('monitoring.cachesTable.clearDescription', { cache: row.original.name })"
        :trigger-label="t('monitoring.cachesTable.clear')"
        :confirm-label="t('monitoring.cachesTable.clear')"
        :cancel-label="t('common.cancel')"
        :pending-label="t('common.loading')"
        confirm-variant="destructive"
        :is-pending="isClearing && clearingCacheName === row.original.name"
        @confirm="emit('clear', row.original)"
      >
        <template #trigger>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            :disabled="isClearing"
            :aria-label="t('monitoring.cachesTable.clear')"
          >
            <Eraser class="size-4 text-destructive" aria-hidden="true" />
          </Button>
        </template>
      </ConfirmAction>
    </template>
  </DataTable>
</template>
