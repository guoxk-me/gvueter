<script setup lang="ts">
import type { Component } from 'vue'
import type { DashboardSummary } from '@/features/dashboard/types'
import { ListTodo, LogIn, UserCheck, Users } from '@lucide/vue'
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { MetricCard } from '@/components/admin'
import { getNumberLabel, getPercentageLabel } from '@/lib/display-format'

const props = defineProps<{
  summary: DashboardSummary
}>()

const { locale, t } = useI18n()
const sectionHeadingId = `${useId()}-dashboard-metrics`

interface MetricPresentation {
  id: string
  title: string
  value: string
  description: string
  icon: Component
  iconClass: string
}

const metricCards = computed<MetricPresentation[]>(() => {
  // AI modified: dashboard metrics retain numeric values until the locale-aware display boundary.
  const displayCount = (count: number) => getNumberLabel(count, { locale: locale.value })

  return [
    {
      id: 'total-users',
      title: t('dashboard.metrics.totalUsers'),
      value: displayCount(props.summary.totalUsers),
      description: t('dashboard.metrics.recentRegistrations', {
        count: displayCount(props.summary.registrationsLast30Days),
      }),
      icon: Users,
      iconClass: 'text-primary bg-primary/10',
    },
    {
      id: 'active-users',
      title: t('dashboard.metrics.activeRate'),
      value: getPercentageLabel(props.summary.activeUserRate, {
        locale: locale.value,
        maximumFractionDigits: 1,
      }),
      description: t('dashboard.metrics.activeAccounts', {
        active: displayCount(props.summary.activeUsers),
        total: displayCount(props.summary.totalUsers),
      }),
      icon: UserCheck,
      iconClass: 'text-success bg-success/10',
    },
    {
      id: 'successful-logins',
      title: t('dashboard.metrics.successfulLogins'),
      value: displayCount(props.summary.successfulLogins24Hours),
      description: t('dashboard.metrics.loginAccounts', {
        count: displayCount(props.summary.uniqueLoginUsers24Hours),
      }),
      icon: LogIn,
      iconClass: 'text-info bg-info/10',
    },
    {
      id: 'open-tasks',
      title: t('dashboard.metrics.openTasks'),
      value: displayCount(props.summary.openTasks),
      description: t('dashboard.metrics.dueSoon', {
        count: displayCount(props.summary.tasksDueSoon),
      }),
      icon: ListTodo,
      iconClass: 'text-warning bg-warning/10',
    },
  ]
})
</script>

<template>
  <section :aria-labelledby="sectionHeadingId" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <!-- AI modified: the metric card h3 headings now follow an explicit section h2. -->
    <h2 :id="sectionHeadingId" class="sr-only">
      {{ t('dashboard.metrics.sectionLabel') }}
    </h2>
    <MetricCard
      v-for="metric in metricCards"
      :key="metric.id"
      :title="metric.title"
      :value="metric.value"
      :description="metric.description"
      :icon="metric.icon"
      :icon-class="metric.iconClass"
    />
  </section>
</template>
