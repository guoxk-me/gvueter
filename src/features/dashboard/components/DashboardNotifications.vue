<script setup lang="ts">
import type { DashboardNotification } from '@/features/dashboard/types'
import { Bell, Check, CheckCheck } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel, getNumberLabel } from '@/lib/display-format'

const props = defineProps<{
  notifications: DashboardNotification[]
  readNotificationIds: string[]
  unreadCount: number
}>()

const emit = defineEmits<{
  markRead: [notificationId: string]
  markAllRead: []
}>()

const { locale, t } = useI18n()

function isRead(notification: DashboardNotification): boolean {
  return notification.isRead || props.readNotificationIds.includes(notification.id)
}

function displayDateTime(dateTime: string): string {
  // AI modified: notification timestamps and counts use explicit locale-aware output.
  return getDateTimeLabel(dateTime, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function displayCount(count: number): string {
  return getNumberLabel(count, { locale: locale.value })
}
</script>

<template>
  <Card id="notifications" class="scroll-mt-20">
    <CardHeader class="flex-row items-start justify-between gap-4">
      <div>
        <CardTitle class="flex items-center gap-2 text-base">
          <Bell class="size-4 text-primary" aria-hidden="true" />
          {{ t('dashboard.notifications.title') }}
          <!-- AI modified: unread totals use the shared badge instead of a hand-styled status pill. -->
          <Badge>
            {{ displayCount(unreadCount) }}
          </Badge>
        </CardTitle>
        <CardDescription class="mt-1">
          {{ t('dashboard.notifications.description') }}
        </CardDescription>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        :disabled="unreadCount === 0"
        @click="emit('markAllRead')"
      >
        <CheckCheck data-icon="inline-start" aria-hidden="true" />
        {{ t('dashboard.notifications.markAllRead') }}
      </Button>
    </CardHeader>
    <CardContent>
      <!-- AI modified: shared separators preserve list boundaries without custom divide utilities. -->
      <ul>
        <li v-for="(notification, notificationIndex) in notifications" :key="notification.id">
          <Separator v-if="notificationIndex > 0" />
          <div
            class="flex items-start gap-3 py-3"
            :class="{
              'pt-0': notificationIndex === 0,
              'pb-0': notificationIndex === notifications.length - 1,
              'opacity-65': isRead(notification),
            }"
          >
            <span
              class="mt-1 size-2 shrink-0 rounded-full"
              :class="isRead(notification) ? 'bg-muted-foreground/35' : 'bg-primary'"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-foreground">
                {{ t(notification.titleKey) }}
              </p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {{ t(notification.bodyKey) }}
              </p>
              <time
                class="mt-1 block text-xs text-muted-foreground"
                :datetime="notification.createdAt"
              >
                {{ displayDateTime(notification.createdAt) }}
              </time>
            </div>
            <Button
              v-if="!isRead(notification)"
              type="button"
              variant="ghost"
              size="icon-sm"
              :aria-label="
                t('dashboard.notifications.markRead', { title: t(notification.titleKey) })
              "
              @click="emit('markRead', notification.id)"
            >
              <Check data-icon="inline-start" aria-hidden="true" />
            </Button>
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
