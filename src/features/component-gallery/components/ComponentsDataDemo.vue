<script setup lang="ts">
import { Activity, DollarSign, ShoppingCart, Users } from '@lucide/vue'
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MetricCard } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import {
  ADMIN_DISPLAY_TIME_ZONE,
  getCurrencyLabel,
  getDateTimeLabel,
  getNumberLabel,
  getPercentageLabel,
} from '@/lib/display-format'
import ComponentDemoCard from './ComponentDemoCard.vue'

interface DemoOrder {
  id: string
  customer: string
  total: string
  status: string
}

interface ConversionPoint {
  day: number
  rate: number
}

const { locale, t } = useI18n()

// AI modified: demo metrics keep numeric source values and project them through the production Intl contract.
const metricCards = computed(() => [
  {
    title: t('components.data.revenue'),
    value: getCurrencyLabel(128_430, {
      locale: locale.value,
      currency: 'CNY',
      maximumFractionDigits: 0,
    }),
    change: getPercentageLabel(8.2, {
      locale: locale.value,
      maximumFractionDigits: 1,
      signDisplay: 'always',
    }),
    trend: 'positive' as const,
    icon: DollarSign,
  },
  {
    title: t('components.data.orders'),
    value: getNumberLabel(3_842, { locale: locale.value }),
    change: getPercentageLabel(4.7, {
      locale: locale.value,
      maximumFractionDigits: 1,
      signDisplay: 'always',
    }),
    trend: 'positive' as const,
    icon: ShoppingCart,
  },
  {
    title: t('components.data.activeUsers'),
    value: getNumberLabel(24_521, { locale: locale.value }),
    change: getPercentageLabel(12.5, {
      locale: locale.value,
      maximumFractionDigits: 1,
      signDisplay: 'always',
    }),
    trend: 'positive' as const,
    icon: Users,
  },
  {
    title: t('components.data.conversion'),
    value: getPercentageLabel(6.4, { locale: locale.value, maximumFractionDigits: 1 }),
    change: getPercentageLabel(-0.8, {
      locale: locale.value,
      maximumFractionDigits: 1,
      signDisplay: 'always',
    }),
    trend: 'negative' as const,
    icon: Activity,
  },
])

const conversionTrend: ConversionPoint[] = [
  { day: 1, rate: 5.8 },
  { day: 2, rate: 6.1 },
  { day: 3, rate: 5.9 },
  { day: 4, rate: 6.5 },
  { day: 5, rate: 6.3 },
  { day: 6, rate: 6.8 },
  { day: 7, rate: 7.2 },
]

const trendChartConfig = computed(() => ({
  conversion: {
    label: t('components.data.conversion'),
    color: 'var(--chart-1)',
  },
}))

const demoOrders = computed<DemoOrder[]>(() => [
  {
    id: '#1092',
    customer: 'Avery Chen',
    total: getCurrencyLabel(3_480, {
      locale: locale.value,
      currency: 'CNY',
      maximumFractionDigits: 0,
    }),
    status: 'Paid',
  },
  {
    id: '#1091',
    customer: 'Skyler Li',
    total: getCurrencyLabel(1_260, {
      locale: locale.value,
      currency: 'CNY',
      maximumFractionDigits: 0,
    }),
    status: 'Processing',
  },
  {
    id: '#1090',
    customer: 'Jordan Wu',
    total: getCurrencyLabel(860, {
      locale: locale.value,
      currency: 'CNY',
      maximumFractionDigits: 0,
    }),
    status: 'Refunded',
  },
])

const orderColumns = computed(() => [
  { accessorKey: 'id', header: t('components.data.order') },
  { accessorKey: 'customer', header: t('components.data.customer') },
  { accessorKey: 'total', header: t('components.data.total') },
  { accessorKey: 'status', header: t('components.data.status') },
])

function getConversionDay(point: ConversionPoint): number {
  return point.day
}

function getConversionRate(point: ConversionPoint): number {
  return point.rate
}

function displayConversionDay(day: number | Date): string {
  if (typeof day !== 'number') return ''

  const point = conversionTrend.find((candidate) => candidate.day === day)
  return point
    ? getDateTimeLabel(Date.UTC(2026, 6, point.day + 5), {
        locale: locale.value,
        timeZone: ADMIN_DISPLAY_TIME_ZONE,
        weekday: 'short',
      })
    : ''
}

function displayConversionRate(rate: number | Date): string {
  return typeof rate === 'number'
    ? getPercentageLabel(rate, { locale: locale.value, maximumFractionDigits: 1 })
    : ''
}
</script>

<template>
  <div class="space-y-4">
    <ComponentDemoCard
      :title="t('components.data.metricsTitle')"
      :description="t('components.data.metricsDescription')"
    >
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          v-for="metricCard in metricCards"
          :key="metricCard.title"
          v-bind="metricCard"
          :description="t('dashboard.comparedToLastMonth')"
        />
      </div>
      <template #usage>
        &lt;MetricCard title="Revenue" value="¥128,430" trend="positive" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.data.chartTitle')"
      :description="t('components.data.chartDescription')"
    >
      <ChartContainer v-slot="{ revision }" :config="trendChartConfig" class="h-64">
        <VisXYContainer :key="revision" :data="conversionTrend" :height="256">
          <VisLine
            :data="conversionTrend"
            :x="getConversionDay"
            :y="getConversionRate"
            color="var(--chart-1)"
            :line-width="3"
          />
          <VisAxis
            type="x"
            :tick-values="conversionTrend.map((point) => point.day)"
            :tick-format="displayConversionDay"
            :grid-line="false"
          />
          <VisAxis
            type="y"
            :tick-format="displayConversionRate"
            :num-ticks="4"
            :tick-line="false"
          />
          <ChartTooltip />
        </VisXYContainer>
      </ChartContainer>
      <template #usage> &lt;VisLine :data="trend" :x="getDay" :y="getRate" /&gt; </template>
    </ComponentDemoCard>

    <div class="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <ComponentDemoCard
        :title="t('components.data.tableTitle')"
        :description="t('components.data.tableDescription')"
      >
        <DataTable
          :columns="orderColumns"
          :data="demoOrders"
          :empty-message="t('common.noData')"
          :default-page-size="5"
          :page-size-options="[5, 10]"
        />
        <template #usage> &lt;DataTable :columns="columns" :data="orders" /&gt; </template>
      </ComponentDemoCard>

      <ComponentDemoCard
        :title="t('components.data.identityTitle')"
        :description="t('components.data.identityDescription')"
      >
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <Avatar class="size-11">
              <AvatarFallback>AC</AvatarFallback>
            </Avatar>
            <div>
              <p class="text-sm font-medium">Avery Chen</p>
              <p class="text-xs text-muted-foreground">avery@example.com</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Badge>Paid</Badge>
            <Badge variant="secondary"> Processing </Badge>
            <Badge variant="destructive"> Refunded </Badge>
            <Badge variant="outline"> Draft </Badge>
          </div>
          <div
            class="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground"
          >
            {{ t('components.data.statusHint') }}
          </div>
        </div>
      </ComponentDemoCard>
    </div>
  </div>
</template>
