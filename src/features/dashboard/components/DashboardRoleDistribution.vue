<script setup lang="ts">
import type { RoleDistributionEntry } from '@/features/dashboard/types'
import type { UserRole } from '@/features/users/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartAxis, ChartBar, ChartContainer, ChartXYContainer } from '@/components/ui/chart'
import { getNumberLabel, getPercentageLabel } from '@/lib/display-format'

const props = defineProps<{
  entries: RoleDistributionEntry[]
}>()

const { locale, t } = useI18n()
const roleColors: Record<UserRole, string> = {
  admin: 'var(--chart-1)',
  editor: 'var(--chart-2)',
  viewer: 'var(--chart-3)',
}

const chartConfig = computed(() => ({
  admin: { label: t('dashboard.roles.admin'), color: roleColors.admin },
  editor: { label: t('dashboard.roles.editor'), color: roleColors.editor },
  viewer: { label: t('dashboard.roles.viewer'), color: roleColors.viewer },
}))

function getRoleIndex(entry: RoleDistributionEntry): number {
  return props.entries.indexOf(entry)
}

function getRoleCount(entry: RoleDistributionEntry): number {
  return entry.userCount
}

function getRoleColor(entry: RoleDistributionEntry): string {
  return roleColors[entry.role]
}

function displayRole(roleIndex: number | Date): string {
  if (typeof roleIndex !== 'number')
    return ''
  const role = props.entries[roleIndex]?.role
  return role ? t(`dashboard.roles.${role}`) : ''
}

function displayCount(userCount: number | Date): string {
  // AI modified: chart axes and percentage summaries share the production Intl contract.
  return typeof userCount === 'number' ? getNumberLabel(userCount, { locale: locale.value }) : ''
}

function displayPercentage(percentage: number): string {
  return getPercentageLabel(percentage, {
    locale: locale.value,
    maximumFractionDigits: 1,
  })
}
</script>

<template>
  <Card class="min-w-0">
    <CardHeader>
      <CardTitle class="text-base">
        {{ t('dashboard.charts.roleDistribution') }}
      </CardTitle>
      <CardDescription>{{ t('dashboard.charts.roleDistributionDescription') }}</CardDescription>
    </CardHeader>
    <CardContent class="min-w-0 space-y-4">
      <ChartContainer v-slot="{ revision }" :config="chartConfig" class="h-52" aria-hidden="true">
        <ChartXYContainer :key="revision" :data="entries" :height="208">
          <ChartBar
            :data="entries"
            :x="getRoleIndex"
            :y="getRoleCount"
            :color="getRoleColor"
            :rounded-corners="4"
            :bar-padding="0.35"
          />
          <ChartAxis
            type="x"
            :tick-values="entries.map((_, index) => index)"
            :tick-format="displayRole"
            :grid-line="false"
          />
          <ChartAxis type="y" :tick-format="displayCount" :num-ticks="4" :tick-line="false" />
        </ChartXYContainer>
      </ChartContainer>

      <ul class="grid gap-2 sm:grid-cols-3" :aria-label="t('dashboard.charts.roleDistribution')">
        <li
          v-for="entry in entries"
          :key="entry.role"
          class="rounded-md border border-border p-2.5"
        >
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              class="size-2.5 rounded-sm"
              :style="{ backgroundColor: getRoleColor(entry) }"
              aria-hidden="true"
            />
            {{ t(`dashboard.roles.${entry.role}`) }}
          </div>
          <p class="mt-1 text-sm font-semibold text-foreground">
            {{ displayCount(entry.userCount) }} · {{ displayPercentage(entry.percentage) }}
          </p>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
