<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@/components/admin'
import { useAllowedUrlState } from '@/composables/use-allowed-url-state'
import OperationLogPanel from '@/features/content-admin/components/OperationLogPanel.vue'

defineOptions({ name: 'AuditLogsPage' })

const { t } = useI18n()
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
  // AI modified: the standalone audit route accepts detail IDs only after the API lists them.
  allowedOperationLogIds.value = [...operationLogIds]
  isOperationLogStateReady.value = true
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader
      :title="t('contentAdmin.logs.title')"
      :description="t('contentAdmin.logs.description')"
    />
    <OperationLogPanel
      v-model:selected-operation-log-id="selectedOperationLogId"
      :show-header="false"
      @operation-log-options-ready="acceptOperationLogOptions"
    />
  </section>
</template>
