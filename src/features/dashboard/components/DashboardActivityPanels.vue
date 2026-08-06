<script setup lang="ts">
import type { DashboardAnnouncement, DashboardOperation } from '@/features/dashboard/types'
import { Megaphone } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'

defineProps<{
  announcements: DashboardAnnouncement[]
  operations: DashboardOperation[]
}>()

const { locale, t } = useI18n()

// AI modified: managed announcements and audit summaries are server-authored text, not locale keys.
function displayDateTime(dateTime: string): string {
  return getDateTimeLabel(dateTime, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          {{ t('dashboard.announcements.title') }}
        </CardTitle>
        <CardDescription>{{ t('dashboard.announcements.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul class="space-y-3">
          <li
            v-for="announcement in announcements"
            :key="announcement.id"
            class="rounded-lg border border-border p-3"
          >
            <div class="flex items-start gap-3">
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning"
              >
                <Megaphone class="size-4" aria-hidden="true" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-sm font-medium text-foreground">
                    {{ announcement.title }}
                  </p>
                  <Badge :variant="announcement.tone === 'warning' ? 'default' : 'secondary'">
                    {{ t(`dashboard.announcementTones.${announcement.tone}`) }}
                  </Badge>
                </div>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ announcement.body }}
                </p>
                <time
                  class="mt-2 block text-xs text-muted-foreground"
                  :datetime="announcement.publishedAt"
                >
                  {{ displayDateTime(announcement.publishedAt) }}
                </time>
              </div>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          {{ t('dashboard.operations.title') }}
        </CardTitle>
        <CardDescription>{{ t('dashboard.operations.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul class="space-y-4">
          <li v-for="operation in operations" :key="operation.id" class="flex items-start gap-3">
            <Avatar class="size-8">
              <AvatarFallback class="text-xs">
                {{ getInitials(operation.actorName) }}
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-muted-foreground">
                <span class="font-medium text-foreground">{{ operation.actorName }}</span>
                {{ operation.summary }}
              </p>
              <time
                class="mt-0.5 block text-xs text-muted-foreground"
                :datetime="operation.occurredAt"
              >
                {{ displayDateTime(operation.occurredAt) }}
              </time>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
