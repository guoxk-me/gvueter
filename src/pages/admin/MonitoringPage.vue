<script setup lang="ts">
import { useAllowedUrlState } from '@/composables/use-allowed-url-state'
import MonitoringWorkspace from '@/features/monitoring/components/MonitoringWorkspace.vue'
import { MONITORING_TABS } from '@/features/monitoring/types'

defineOptions({ name: 'MonitoringPage' })

const activeTab = useAllowedUrlState({
  kind: 'string',
  queryKey: 'monitoringTab',
  allowedStates: MONITORING_TABS,
  defaultState: 'sessions',
  history: 'push',
})
</script>

<template>
  <MonitoringWorkspace v-model:active-tab="activeTab" />
</template>
