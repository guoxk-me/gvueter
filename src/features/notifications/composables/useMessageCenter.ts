import type { MaybeRefOrGetter } from 'vue'
import type {
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  MessageCenterFilters,
  MessageCenterResponse,
  NotificationCategoryFilter,
} from '../types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue, watch } from 'vue'
import {
  MARK_ALL_NOTIFICATIONS_READ_RESPONSE_SCHEMA,
  MARK_NOTIFICATION_READ_RESPONSE_SCHEMA,
  MESSAGE_CENTER_RESPONSE_SCHEMA,
} from '@/features/notifications/notification-api-contracts'
import { get, post, put } from '@/lib/http'
import { useNotificationStore } from '@/stores/notification'

export const messageCenterQueryKeyRoot = ['notifications', 'message-center'] as const

export function getMessageCenterQueryKey(filters: MessageCenterFilters) {
  return [...messageCenterQueryKeyRoot, filters] as const
}

interface UseNotificationReadMutationsOptions {
  category: MaybeRefOrGetter<NotificationCategoryFilter>
  onMarkReadSuccess?: (response: MarkNotificationReadResponse) => void
  onMarkAllReadSuccess?: (response: MarkAllNotificationsReadResponse) => void
}

export function useNotificationReadMutations(options: UseNotificationReadMutationsOptions) {
  const queryClient = useQueryClient()
  const notificationStore = useNotificationStore()

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      put<MarkNotificationReadResponse>(
        `/notifications/${encodeURIComponent(notificationId)}/read`,
        undefined,
        { responseSchema: MARK_NOTIFICATION_READ_RESPONSE_SCHEMA },
      ),
    onSuccess: (response) => {
      // AI modified: server-confirmed read state is projected into every notification surface.
      queryClient.setQueriesData<MessageCenterResponse>(
        { queryKey: messageCenterQueryKeyRoot },
        (cachedResponse) =>
          cachedResponse
            ? {
                ...cachedResponse,
                items: cachedResponse.items.map((item) =>
                  item.id === response.item.id ? response.item : item,
                ),
                unreadCount: response.unreadCount,
              }
            : cachedResponse,
      )
      notificationStore.markRead(response.item.id)
      notificationStore.syncUnreadCount(response.unreadCount)
      options.onMarkReadSuccess?.(response)
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      post<MarkAllNotificationsReadResponse>(
        '/notifications/read-all',
        {
          category: toValue(options.category),
        },
        {
          responseSchema: MARK_ALL_NOTIFICATIONS_READ_RESPONSE_SCHEMA,
        },
      ),
    onSuccess: (response) => {
      const markedIds = new Set(response.markedIds)
      queryClient.setQueriesData<MessageCenterResponse>(
        { queryKey: messageCenterQueryKeyRoot },
        (cachedResponse) =>
          cachedResponse
            ? {
                ...cachedResponse,
                items: cachedResponse.items.map((item) =>
                  markedIds.has(item.id) ? { ...item, isRead: true } : item,
                ),
                unreadCount: response.unreadCount,
              }
            : cachedResponse,
      )
      notificationStore.markAllRead(response.markedIds)
      notificationStore.syncUnreadCount(response.unreadCount)
      options.onMarkAllReadSuccess?.(response)
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return {
    markReadMutation,
    markAllReadMutation,
  }
}

export function useMessageCenter(filters: MaybeRefOrGetter<MessageCenterFilters>) {
  const notificationStore = useNotificationStore()
  const activeFilters = computed(() => toValue(filters))
  const messageCenterQuery = useQuery({
    queryKey: computed(() => getMessageCenterQueryKey(activeFilters.value)),
    queryFn: () =>
      get<MessageCenterResponse>(
        '/notifications',
        {
          category: activeFilters.value.category,
          read: activeFilters.value.read,
        },
        {
          responseSchema: MESSAGE_CENTER_RESPONSE_SCHEMA,
        },
      ),
  })

  watch(
    () => messageCenterQuery.data.value?.unreadCount,
    (unreadCount) => {
      if (unreadCount !== undefined) notificationStore.syncUnreadCount(unreadCount)
    },
    { immediate: true },
  )

  const { markReadMutation, markAllReadMutation } = useNotificationReadMutations({
    category: computed(() => activeFilters.value.category),
  })

  return {
    messageCenterQuery,
    markReadMutation,
    markAllReadMutation,
  }
}
