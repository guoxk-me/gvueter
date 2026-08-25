import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

interface NotificationReadProjection {
  id: string
  isRead: boolean
}

export const useNotificationStore = defineStore(
  'notification',
  () => {
    const principalId = shallowRef<string | null>(null)
    const unreadCount = shallowRef(0)
    const isUnreadCountAuthoritative = shallowRef(false)
    const readNotificationIds = ref<string[]>([])

    function resetProjection(): void {
      unreadCount.value = 0
      isUnreadCountAuthoritative.value = false
      readNotificationIds.value = []
    }

    function bindPrincipal(nextPrincipalId: string | null): void {
      if (principalId.value === nextPrincipalId) {
        if (nextPrincipalId === null)
          resetProjection()
        return
      }

      // AI modified: persisted read state belongs to exactly one authenticated principal.
      principalId.value = nextPrincipalId
      resetProjection()
    }

    function syncNotifications(notifications: readonly NotificationReadProjection[]): void {
      unreadCount.value = notifications.filter(
        notification =>
          !notification.isRead && !readNotificationIds.value.includes(notification.id),
      ).length
    }

    function syncUnreadCount(serverUnreadCount: number): void {
      // AI modified: the server count is authoritative while payloads remain in Vue Query.
      unreadCount.value = Math.max(0, Math.trunc(serverUnreadCount))
      isUnreadCountAuthoritative.value = true
    }

    function incrementUnreadCount(): void {
      unreadCount.value += 1
    }

    function markRead(notificationId: string): void {
      if (readNotificationIds.value.includes(notificationId))
        return

      // AI modified: only cross-page read state is persisted; message payloads remain query-owned.
      readNotificationIds.value.push(notificationId)
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    function markAllRead(notificationIds: readonly string[]): void {
      const newlyReadCount = notificationIds.filter(
        notificationId => !readNotificationIds.value.includes(notificationId),
      ).length
      readNotificationIds.value = Array.from(
        new Set([...readNotificationIds.value, ...notificationIds]),
      )
      unreadCount.value = Math.max(0, unreadCount.value - newlyReadCount)
    }

    function isRead(notificationId: string, isServerRead = false): boolean {
      return isServerRead || readNotificationIds.value.includes(notificationId)
    }

    return {
      principalId,
      unreadCount,
      isUnreadCountAuthoritative,
      readNotificationIds,
      bindPrincipal,
      resetProjection,
      syncNotifications,
      syncUnreadCount,
      incrementUnreadCount,
      markRead,
      markAllRead,
      isRead,
    }
  },
  {
    persist: {
      key: 'admin-notifications',
      pick: ['principalId', 'readNotificationIds', 'unreadCount'],
    },
  },
)
