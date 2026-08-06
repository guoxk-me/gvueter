<script setup lang="ts">
import type { DashboardOverview } from '@/features/dashboard/types'
import DashboardActivityPanels from './DashboardActivityPanels.vue'
import DashboardDepartmentRanking from './DashboardDepartmentRanking.vue'
import DashboardMetricGrid from './DashboardMetricGrid.vue'
import DashboardNotifications from './DashboardNotifications.vue'
import DashboardQuickActions from './DashboardQuickActions.vue'
import DashboardRegistrationChart from './DashboardRegistrationChart.vue'
import DashboardRoleDistribution from './DashboardRoleDistribution.vue'
import DashboardTaskList from './DashboardTaskList.vue'

defineProps<{
  overview: DashboardOverview
  readNotificationIds: string[]
  unreadCount: number
}>()

const emit = defineEmits<{
  markNotificationRead: [notificationId: string]
  markAllNotificationsRead: []
}>()
</script>

<template>
  <div class="space-y-6">
    <DashboardMetricGrid :summary="overview.summary" />

    <div class="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <DashboardRegistrationChart :points="overview.registrationTrend" />
      <DashboardRoleDistribution :entries="overview.roleDistribution" />
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <DashboardDepartmentRanking :entries="overview.departmentRanking" />
      <DashboardQuickActions :actions="overview.quickActions" />
      <DashboardNotifications
        :notifications="overview.notifications"
        :read-notification-ids="readNotificationIds"
        :unread-count="unreadCount"
        @mark-read="emit('markNotificationRead', $event)"
        @mark-all-read="emit('markAllNotificationsRead')"
      />
    </div>

    <DashboardTaskList :tasks="overview.tasks" />
    <DashboardActivityPanels
      :announcements="overview.announcements"
      :operations="overview.recentOperations"
    />
  </div>
</template>
