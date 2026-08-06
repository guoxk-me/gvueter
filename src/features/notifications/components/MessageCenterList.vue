<script setup lang="ts">
import type { Component } from 'vue'
import type { MessageCenterItem, NotificationCategory, NotificationTone } from '../types'
import { Bell, Check, ListTodo, Megaphone } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import StatusTag from '@/components/admin/StatusTag.vue'
import { Button } from '@/components/ui/button'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'

const props = defineProps<{
  items: readonly MessageCenterItem[]
  readNotificationIds: readonly string[]
  isMarkingRead?: boolean
}>()

const emit = defineEmits<{
  markRead: [notificationId: string]
}>()

const { locale, t } = useI18n()
const categoryIcons: Record<NotificationCategory, Component> = {
  notification: Bell,
  task: ListTodo,
  announcement: Megaphone,
}
const toneClasses: Record<NotificationTone, string> = {
  info: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
}

function isRead(item: MessageCenterItem): boolean {
  return item.isRead || props.readNotificationIds.includes(item.id)
}

function displayDateTime(createdAt: string): string {
  // AI modified: message timestamps remain stable when the device timezone changes.
  return getDateTimeLabel(createdAt, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <ul class="divide-y divide-border" :aria-label="t('messageCenter.listLabel')">
    <li
      v-for="item in items"
      :key="item.id"
      class="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
      :class="isRead(item) ? 'opacity-65' : ''"
    >
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-lg"
        :class="toneClasses[item.tone]"
      >
        <component :is="categoryIcons[item.category]" class="size-4" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1 space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <p class="font-medium text-foreground">
            {{ t(item.titleKey) }}
          </p>
          <StatusTag
            :label="t(`messageCenter.categories.${item.category}`)"
            :tone="item.tone === 'info' ? 'primary' : item.tone"
            :dot="false"
          />
          <span
            v-if="!isRead(item)"
            class="size-2 rounded-full bg-primary"
            :title="t('messageCenter.unread')"
          />
        </div>
        <p class="text-sm leading-6 text-muted-foreground">
          {{ t(item.bodyKey) }}
        </p>
        <time class="block text-xs text-muted-foreground" :datetime="item.createdAt">
          {{ displayDateTime(item.createdAt) }}
        </time>
      </div>
      <Button
        v-if="!isRead(item)"
        type="button"
        variant="ghost"
        size="icon-sm"
        :disabled="isMarkingRead"
        :aria-label="t('messageCenter.markReadItem', { title: t(item.titleKey) })"
        @click="emit('markRead', item.id)"
      >
        <Check class="size-4" aria-hidden="true" />
      </Button>
    </li>
  </ul>
</template>
