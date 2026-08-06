<script setup lang="ts">
import type { StatusTone } from '@/components/admin'
import type { ServiceHealth, ServiceHealthStatus } from '@/features/monitoring/types'
import { useI18n } from 'vue-i18n'
import { StatusTag } from '@/components/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ADMIN_DISPLAY_TIME_ZONE,
  getDateTimeLabel,
  getNumberLabel,
  getPercentageLabel,
} from '@/lib/display-format'

defineProps<{ services: ServiceHealth[] }>()

const { t, locale } = useI18n()

function getStatusTone(status: ServiceHealthStatus): StatusTone {
  return {
    degraded: 'warning',
    healthy: 'success',
    outage: 'destructive',
  }[status] as StatusTone
}

function getTimeLabel(timestamp: string): string {
  // AI modified: service health measurements use the active locale and explicit timezone.
  return getDateTimeLabel(timestamp, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getUptimeLabel(uptimePercentage: number): string {
  return getPercentageLabel(uptimePercentage, {
    locale: locale.value,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getLatencyLabel(latencyMs: number): string {
  return getNumberLabel(latencyMs, { locale: locale.value })
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <Card v-for="service in services" :key="service.id">
      <CardHeader class="flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle class="text-base">
          {{ t(service.nameKey) }}
        </CardTitle>
        <StatusTag
          :label="t(`monitoring.serviceStatuses.${service.status}`)"
          :tone="getStatusTone(service.status)"
        />
      </CardHeader>
      <CardContent class="space-y-3 text-sm">
        <dl class="grid grid-cols-2 gap-2">
          <div>
            <dt class="text-xs text-muted-foreground">
              {{ t('monitoring.services.uptime') }}
            </dt>
            <dd class="font-semibold">
              {{ getUptimeLabel(service.uptimePercentage) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              {{ t('monitoring.services.latency') }}
            </dt>
            <dd class="font-semibold">{{ getLatencyLabel(service.latencyMs) }} ms</dd>
          </div>
        </dl>
        <p class="text-xs text-muted-foreground">
          {{ t('monitoring.services.lastChecked', { time: getTimeLabel(service.lastCheckedAt) }) }}
        </p>
        <p v-if="service.errorSummaryKey" class="rounded-md bg-warning/10 p-2 text-xs text-warning">
          {{ t(service.errorSummaryKey) }}
        </p>
      </CardContent>
    </Card>
  </div>
</template>
