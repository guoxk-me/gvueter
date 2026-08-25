<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AsyncState, PageHeader } from '@/components/admin'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardOverview from '@/features/dashboard/components/DashboardOverview.vue'
import { useDashboardOverview } from '@/features/dashboard/composables/useDashboardOverview'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'
import { useAuthStore } from '@/stores/auth'

defineOptions({ name: 'DashboardPage' })

const authStore = useAuthStore()
const { locale, t } = useI18n()
const {
  overviewQuery,
  isEmpty,
  readNotificationIds,
  unreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = useDashboardOverview()

const loadError = computed(() => {
  const error = overviewQuery.error.value
  return error instanceof Error ? error : null
})

const lastUpdatedLabel = computed(() => {
  const generatedAt = overviewQuery.data.value?.generatedAt
  if (!generatedAt)
    return null

  // AI modified: keep locale-sensitive freshness formatting deterministic across browser timezones.
  return t('dashboard.lastUpdated', {
    time: getDateTimeLabel(generatedAt, {
      locale: locale.value,
      timeZone: ADMIN_DISPLAY_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
    }),
  })
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('dashboard.title')"
      :description="
        t('dashboard.greeting', { name: authStore.user?.name ?? t('dashboard.userFallback') })
      "
    >
      <p v-if="lastUpdatedLabel" class="text-xs text-muted-foreground">
        {{ lastUpdatedLabel }}
      </p>
    </PageHeader>

    <AsyncState
      :is-loading="overviewQuery.isPending.value"
      :is-empty="isEmpty"
      :error="loadError"
      :empty-title="t('dashboard.emptyTitle')"
      :empty-description="t('dashboard.emptyDescription')"
      :error-title="t('dashboard.loadErrorTitle')"
      :retry-label="t('common.retry')"
      @retry="overviewQuery.refetch()"
    >
      <template #loading>
        <div data-testid="dashboard-loading" class="space-y-4" aria-busy="true">
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton v-for="index in 4" :key="index" class="h-32" />
          </div>
          <div class="grid gap-4 xl:grid-cols-2">
            <Skeleton class="h-80" />
            <Skeleton class="h-80" />
          </div>
        </div>
      </template>

      <DashboardOverview
        v-if="overviewQuery.data.value"
        :overview="overviewQuery.data.value"
        :read-notification-ids="readNotificationIds"
        :unread-count="unreadCount"
        @mark-notification-read="markNotificationRead"
        @mark-all-notifications-read="markAllNotificationsRead"
      />
    </AsyncState>
  </div>
</template>
