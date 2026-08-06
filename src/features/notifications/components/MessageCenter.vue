<script setup lang="ts">
import type { MessageCenterFilters } from '../types'
import { CheckCheck } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { AsyncState, EmptyState, PageHeader } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotificationStore } from '@/stores/notification'
import { useMessageCenter } from '../composables/useMessageCenter'
import MessageCenterFiltersPanel from './MessageCenterFilters.vue'
import MessageCenterList from './MessageCenterList.vue'

const { t } = useI18n()
const notificationStore = useNotificationStore()
const { readNotificationIds, unreadCount } = storeToRefs(notificationStore)
const category = shallowRef<MessageCenterFilters['category']>('all')
const read = shallowRef<MessageCenterFilters['read']>('all')
const filters = computed<MessageCenterFilters>(() => ({
  category: category.value,
  read: read.value,
}))
const { messageCenterQuery, markReadMutation, markAllReadMutation } = useMessageCenter(filters)

const visibleItems = computed(() => {
  const items = messageCenterQuery.data.value?.items ?? []
  return items.filter((item) => {
    const itemIsRead = notificationStore.isRead(item.id, item.isRead)
    return (
      read.value === 'all' ||
      (read.value === 'read' && itemIsRead) ||
      (read.value === 'unread' && !itemIsRead)
    )
  })
})
const loadError = computed(() => {
  const error = messageCenterQuery.error.value
  return error instanceof Error ? error : null
})

function changeFilters(nextFilters: MessageCenterFilters): void {
  category.value = nextFilters.category
  read.value = nextFilters.read
}

function markRead(notificationId: string): void {
  markReadMutation.mutate(notificationId, {
    onSuccess: () => toast.success(t('messageCenter.markReadSuccess')),
  })
}

function markAllRead(): void {
  markAllReadMutation.mutate(undefined, {
    onSuccess: () => toast.success(t('messageCenter.markAllReadSuccess')),
  })
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader :title="t('messageCenter.title')" :description="t('messageCenter.description')">
      <template #actions>
        <Button
          type="button"
          variant="outline"
          :disabled="unreadCount === 0 || markAllReadMutation.isPending.value"
          @click="markAllRead"
        >
          <CheckCheck class="size-4" aria-hidden="true" />
          {{ t('messageCenter.markAllRead') }}
        </Button>
      </template>
    </PageHeader>

    <Card>
      <CardHeader>
        <MessageCenterFiltersPanel :filters="filters" @change="changeFilters" />
      </CardHeader>
      <CardContent>
        <AsyncState
          :is-loading="messageCenterQuery.isPending.value"
          :error="loadError"
          :error-title="t('messageCenter.loadError')"
          :retry-label="t('common.retry')"
          @retry="messageCenterQuery.refetch()"
        >
          <template #loading>
            <div class="space-y-4" aria-busy="true">
              <Skeleton v-for="index in 4" :key="index" class="h-24" />
            </div>
          </template>
          <EmptyState
            v-if="visibleItems.length === 0"
            :title="t('messageCenter.emptyTitle')"
            :description="t('messageCenter.emptyDescription')"
          />
          <MessageCenterList
            v-else
            :items="visibleItems"
            :read-notification-ids="readNotificationIds"
            :is-marking-read="markReadMutation.isPending.value"
            @mark-read="markRead"
          />
        </AsyncState>
      </CardContent>
    </Card>
  </section>
</template>
