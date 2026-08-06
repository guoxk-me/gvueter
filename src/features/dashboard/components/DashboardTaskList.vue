<script setup lang="ts">
import type { BadgeVariants } from '@/components/ui/badge'
import type { DashboardTask, DashboardTaskPriority } from '@/features/dashboard/types'
import { CalendarClock } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'

defineProps<{
  tasks: DashboardTask[]
}>()

const { locale, t } = useI18n()

function getPriorityVariant(priority: DashboardTaskPriority): BadgeVariants['variant'] {
  switch (priority) {
    case 'critical':
      return 'destructive'
    case 'high':
      return 'default'
    case 'medium':
      return 'secondary'
    default:
      return 'outline'
  }
}

function displayDueAt(dueAt: string): string {
  // AI modified: task due dates use the dashboard's explicit business timezone.
  return getDateTimeLabel(dueAt, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">
        {{ t('dashboard.workQueue.title') }}
      </CardTitle>
      <CardDescription>{{ t('dashboard.workQueue.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <ul class="divide-y divide-border">
        <li v-for="task in tasks" :key="task.id" class="space-y-2 py-3 first:pt-0 last:pb-0">
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-medium text-foreground">
              {{ t(task.titleKey) }}
            </p>
            <Badge :variant="getPriorityVariant(task.priority)">
              {{ t(`dashboard.priorities.${task.priority}`) }}
            </Badge>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{{ task.assigneeName }}</span>
            <span class="flex items-center gap-1">
              <CalendarClock class="size-3.5" aria-hidden="true" />
              <time :datetime="task.dueAt">{{ displayDueAt(task.dueAt) }}</time>
            </span>
            <Badge variant="outline">
              {{ t(`dashboard.taskStatuses.${task.status}`) }}
            </Badge>
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
