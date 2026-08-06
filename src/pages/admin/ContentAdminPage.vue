<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useAllowedUrlState } from '@/composables/use-allowed-url-state'
import ContentAdminWorkspace from '@/features/content-admin/components/ContentAdminWorkspace.vue'
import { CONTENT_ADMIN_TABS } from '@/features/content-admin/content-admin-navigation'

defineOptions({ name: 'ContentAdminPage' })

const activeTab = useAllowedUrlState({
  kind: 'string',
  queryKey: 'contentTab',
  allowedStates: CONTENT_ADMIN_TABS,
  defaultState: 'announcements',
  history: 'push',
})
const allowedOperationLogIds = shallowRef<readonly string[]>([])
const isOperationLogStateReady = shallowRef(false)
const operationLogState = useAllowedUrlState({
  kind: 'string',
  queryKey: 'operationLog',
  allowedStates: allowedOperationLogIds,
  defaultState: '',
  isReady: isOperationLogStateReady,
  history: 'push',
})
const selectedOperationLogId = computed<string | undefined>({
  get: () => operationLogState.value || undefined,
  set: (operationLogId) => (operationLogState.value = operationLogId ?? ''),
})

function acceptOperationLogOptions(operationLogIds: readonly string[]): void {
  // AI modified: detail deep links become active only after the server list supplies the exact ID allowlist.
  allowedOperationLogIds.value = [...operationLogIds]
  isOperationLogStateReady.value = true
}
</script>

<template>
  <ContentAdminWorkspace
    v-model:active-tab="activeTab"
    v-model:selected-operation-log-id="selectedOperationLogId"
    @operation-log-options-ready="acceptOperationLogOptions"
  />
</template>
