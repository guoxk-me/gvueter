import type { DashboardOverview } from '@/features/dashboard/types'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { DASHBOARD_OVERVIEW_SCHEMA } from '@/features/dashboard/dashboard-api-contracts'
import { useNotificationReadMutations } from '@/features/notifications'
import { get } from '@/lib/http'
import { useNotificationStore } from '@/stores/notification'

export const dashboardOverviewQueryKey = ['dashboard', 'overview'] as const

export function useDashboardOverview() {
  const queryClient = useQueryClient()
  const notificationStore = useNotificationStore()
  const { isUnreadCountAuthoritative, readNotificationIds } = storeToRefs(notificationStore)
  const overviewQuery = useQuery({
    queryKey: dashboardOverviewQueryKey,
    queryFn: () =>
      get<DashboardOverview>('/dashboard/overview', undefined, {
        responseSchema: DASHBOARD_OVERVIEW_SCHEMA,
      }),
    staleTime: 60_000,
  })

  const isEmpty = computed(() => overviewQuery.data.value?.summary.totalUsers === 0)
  const dashboardUnreadCount = computed(
    () =>
      overviewQuery.data.value?.notifications.filter(
        notification => !notificationStore.isRead(notification.id, notification.isRead),
      ).length ?? 0,
  )

  watch(
    () => overviewQuery.data.value?.notifications,
    (notifications) => {
      // AI modified: dashboard data is only a startup fallback; message-center count remains authoritative once loaded.
      if (notifications && !isUnreadCountAuthoritative.value)
        notificationStore.syncNotifications(notifications)
    },
    { immediate: true },
  )

  const { markReadMutation, markAllReadMutation } = useNotificationReadMutations({
    category: 'notification',
    onMarkReadSuccess: (response) => {
      queryClient.setQueryData<DashboardOverview>(dashboardOverviewQueryKey, overview =>
        overview
          ? {
              ...overview,
              notifications: overview.notifications.map(notification =>
                notification.id === response.item.id
                  ? { ...notification, isRead: true }
                  : notification,
              ),
            }
          : overview)
    },
    onMarkAllReadSuccess: () => {
      queryClient.setQueryData<DashboardOverview>(dashboardOverviewQueryKey, overview =>
        overview
          ? {
              ...overview,
              // AI modified: a successful category-wide request proves every dashboard notification is read.
              notifications: overview.notifications.map(notification => ({
                ...notification,
                isRead: true,
              })),
            }
          : overview)
    },
  })

  function markNotificationRead(notificationId: string): void {
    markReadMutation.mutate(notificationId)
  }

  function markAllNotificationsRead(): void {
    markAllReadMutation.mutate()
  }

  return {
    overviewQuery,
    isEmpty,
    readNotificationIds,
    unreadCount: dashboardUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  }
}
