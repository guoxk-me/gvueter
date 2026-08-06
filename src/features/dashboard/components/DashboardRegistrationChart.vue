<script setup lang="ts">
import type { RegistrationTrendPoint } from '@/features/dashboard/types'
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel, getNumberLabel } from '@/lib/display-format'

const props = defineProps<{
  points: RegistrationTrendPoint[]
}>()

const { locale, t } = useI18n()
const chartConfig = computed(() => ({
  users: {
    label: t('dashboard.charts.totalRegisteredUsers'),
    color: 'var(--chart-1)',
  },
}))

function getWeekIndex(point: RegistrationTrendPoint): number {
  return point.weekIndex
}

function getTotalUsers(point: RegistrationTrendPoint): number {
  return point.totalUsers
}

function displayWeek(weekIndex: number | Date): string {
  if (typeof weekIndex !== 'number') return ''
  const point = props.points.find((candidate) => candidate.weekIndex === weekIndex)
  return point
    ? getDateTimeLabel(point.weekStart, {
        locale: locale.value,
        timeZone: ADMIN_DISPLAY_TIME_ZONE,
        month: 'short',
        day: 'numeric',
      })
    : ''
}

function displayUsers(userCount: number | Date): string {
  // AI modified: chart axes and screen-reader summaries share locale-aware numeric labels.
  return typeof userCount === 'number' ? getNumberLabel(userCount, { locale: locale.value }) : ''
}
</script>

<template>
  <!-- AI modified: allow the Unovis grid item to shrink below its SVG intrinsic width on mobile. -->
  <Card class="min-w-0">
    <CardHeader>
      <CardTitle class="text-base">
        {{ t('dashboard.charts.registrationTrend') }}
      </CardTitle>
      <CardDescription>{{ t('dashboard.charts.registrationTrendDescription') }}</CardDescription>
    </CardHeader>
    <CardContent class="min-w-0">
      <ChartContainer v-slot="{ revision }" :config="chartConfig" class="h-64" aria-hidden="true">
        <VisXYContainer :key="revision" :data="points" :height="256">
          <VisLine
            :data="points"
            :x="getWeekIndex"
            :y="getTotalUsers"
            color="var(--chart-1)"
            :line-width="3"
          />
          <VisAxis
            type="x"
            :tick-values="points.map((point) => point.weekIndex)"
            :tick-format="displayWeek"
            :grid-line="false"
          />
          <VisAxis type="y" :tick-format="displayUsers" :num-ticks="4" :tick-line="false" />
        </VisXYContainer>
      </ChartContainer>

      <dl class="sr-only">
        <template v-for="point in points" :key="point.weekStart">
          <dt>{{ displayWeek(point.weekIndex) }}</dt>
          <dd>
            {{
              t('dashboard.charts.registrationPoint', {
                total: displayUsers(point.totalUsers),
                registered: displayUsers(point.registeredUsers),
              })
            }}
          </dd>
        </template>
      </dl>
    </CardContent>
  </Card>
</template>
