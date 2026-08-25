import type { QueryClient, QueryKey } from '@tanstack/vue-query'
import type { NotificationTransport } from '../notification-transport'
import type {
  MessageCenterFilters,
  MessageCenterResponse,
  NotificationRealtimeEvent,
  NotificationUnreadResponse,
} from '../types'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { NOTIFICATION_UNREAD_RESPONSE_SCHEMA } from '@/features/notifications/notification-api-contracts'
import { get } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { messageCenterQueryKeyRoot } from './useMessageCenter'

export const notificationUnreadQueryKey = ['notifications', 'unread-count'] as const
const categoryFilters = new Set<string>(['all', 'notification', 'task', 'announcement'])
const readFilters = new Set<string>(['all', 'unread', 'read'])

function isCategoryFilter(value: string): value is MessageCenterFilters['category'] {
  return categoryFilters.has(value)
}

function isReadFilter(value: string): value is MessageCenterFilters['read'] {
  return readFilters.has(value)
}

function isMessageCenterResponse(value: unknown): value is MessageCenterResponse {
  return (
    typeof value === 'object'
    && value !== null
    && 'items' in value
    && Array.isArray(value.items)
    && 'total' in value
    && typeof value.total === 'number'
    && 'unreadCount' in value
    && typeof value.unreadCount === 'number'
  )
}

function getFiltersFromQueryKey(queryKey: QueryKey): MessageCenterFilters | undefined {
  const filters = queryKey[2]
  if (
    typeof filters !== 'object'
    || filters === null
    || !('category' in filters)
    || typeof filters.category !== 'string'
    || !('read' in filters)
    || typeof filters.read !== 'string'
  ) {
    return undefined
  }

  return isCategoryFilter(filters.category) && isReadFilter(filters.read)
    ? {
        category: filters.category,
        read: filters.read,
      }
    : undefined
}

function eventMatchesFilters(
  event: NotificationRealtimeEvent,
  filters: MessageCenterFilters,
): boolean {
  const categoryMatches
    = filters.category === 'all' || filters.category === event.notification.category
  const readMatches
    = filters.read === 'all'
      || (filters.read === 'read' && event.notification.isRead)
      || (filters.read === 'unread' && !event.notification.isRead)
  return categoryMatches && readMatches
}

export function applyNotificationEventToCache(
  queryClient: QueryClient,
  event: NotificationRealtimeEvent,
): boolean {
  const cachedQueries = queryClient.getQueryCache().findAll({ queryKey: messageCenterQueryKeyRoot })
  const isKnownNotification = cachedQueries.some(
    query =>
      isMessageCenterResponse(query.state.data)
      && query.state.data.items.some(item => item.id === event.notification.id),
  )
  if (isKnownNotification)
    return false

  const unreadIncrease = event.notification.isRead ? 0 : 1
  for (const query of cachedQueries) {
    const cachedResponse = query.state.data
    const filters = getFiltersFromQueryKey(query.queryKey)
    if (!isMessageCenterResponse(cachedResponse) || !filters)
      continue

    const shouldInsert = eventMatchesFilters(event, filters)
    queryClient.setQueryData<MessageCenterResponse>(query.queryKey, {
      ...cachedResponse,
      items: shouldInsert ? [event.notification, ...cachedResponse.items] : cachedResponse.items,
      total: shouldInsert ? cachedResponse.total + 1 : cachedResponse.total,
      unreadCount: cachedResponse.unreadCount + unreadIncrease,
    })
  }

  const cachedUnreadCount = queryClient.getQueryData<NotificationUnreadResponse>(
    notificationUnreadQueryKey,
  )
  if (cachedUnreadCount) {
    queryClient.setQueryData<NotificationUnreadResponse>(notificationUnreadQueryKey, {
      unreadCount: cachedUnreadCount.unreadCount + unreadIncrease,
    })
  }
  return true
}

export function useNotificationUnreadCount() {
  const authStore = useAuthStore()
  const notificationStore = useNotificationStore()
  const unreadQuery = useQuery({
    queryKey: notificationUnreadQueryKey,
    queryFn: () =>
      get<NotificationUnreadResponse>('/notifications/unread-count', undefined, {
        responseSchema: NOTIFICATION_UNREAD_RESPONSE_SCHEMA,
      }),
    enabled: computed(() => authStore.isAuthenticated),
    staleTime: 30_000,
  })

  watch(
    () => unreadQuery.data.value?.unreadCount,
    (unreadCount) => {
      if (unreadCount !== undefined)
        notificationStore.syncUnreadCount(unreadCount)
    },
    { immediate: true },
  )

  return unreadQuery
}

export type NotificationTransportFactory = (sessionToken: string) => NotificationTransport

export function useNotificationRealtime(createTransport: NotificationTransportFactory): void {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const notificationStore = useNotificationStore()
  let activeTransport: NotificationTransport | undefined
  let connectionRevision = 0
  let isMounted = false

  function replaceTransport(sessionToken: string | null, principalId: string | null): void {
    // AI modified: rotate the connection before changing principals so late events stay session-bound.
    const nextRevision = ++connectionRevision
    activeTransport?.stop()
    activeTransport = undefined
    if (!sessionToken || !principalId)
      return

    const nextTransport = createTransport(sessionToken)
    activeTransport = nextTransport
    nextTransport.start((event) => {
      if (
        nextRevision !== connectionRevision
        || authStore.token !== sessionToken
        || authStore.principalId !== principalId
      ) {
        return
      }
      if (!applyNotificationEventToCache(queryClient, event))
        return
      if (!event.notification.isRead)
        notificationStore.incrementUnreadCount()
    })
  }

  watch([() => authStore.token, () => authStore.principalId], ([sessionToken, principalId]) => {
    if (isMounted)
      replaceTransport(sessionToken, principalId)
  })

  onMounted(() => {
    isMounted = true
    replaceTransport(authStore.token, authStore.principalId)
  })
  onBeforeUnmount(() => {
    isMounted = false
    connectionRevision += 1
    activeTransport?.stop()
    activeTransport = undefined
  })
}
