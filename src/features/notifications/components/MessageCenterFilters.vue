<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type {
  MessageCenterFilters,
  NotificationCategoryFilter,
  NotificationReadFilter,
} from '../types'
import { useI18n } from 'vue-i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = defineProps<{
  filters: MessageCenterFilters
}>()

const emit = defineEmits<{
  change: [filters: MessageCenterFilters]
}>()

const { t } = useI18n()

function changeCategory(value: AcceptableValue): void {
  if (value !== 'all' && value !== 'notification' && value !== 'task' && value !== 'announcement')
    return
  emit('change', { category: value satisfies NotificationCategoryFilter, read: props.filters.read })
}

function changeReadFilter(value: AcceptableValue): void {
  if (value !== 'all' && value !== 'unread' && value !== 'read')
    return
  emit('change', { category: props.filters.category, read: value satisfies NotificationReadFilter })
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-muted-foreground" for="message-center-category">
        {{ t('messageCenter.filters.category') }}
      </label>
      <Select :model-value="filters.category" @update:model-value="changeCategory">
        <SelectTrigger id="message-center-category" class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {{ t('messageCenter.categories.all') }}
          </SelectItem>
          <SelectItem value="notification">
            {{ t('messageCenter.categories.notification') }}
          </SelectItem>
          <SelectItem value="task">
            {{ t('messageCenter.categories.task') }}
          </SelectItem>
          <SelectItem value="announcement">
            {{ t('messageCenter.categories.announcement') }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-muted-foreground" for="message-center-read-filter">
        {{ t('messageCenter.filters.readState') }}
      </label>
      <Select :model-value="filters.read" @update:model-value="changeReadFilter">
        <SelectTrigger id="message-center-read-filter" class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {{ t('messageCenter.readStates.all') }}
          </SelectItem>
          <SelectItem value="unread">
            {{ t('messageCenter.readStates.unread') }}
          </SelectItem>
          <SelectItem value="read">
            {{ t('messageCenter.readStates.read') }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
