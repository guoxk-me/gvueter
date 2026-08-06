import type { Ref } from 'vue'
import type {
  OperationLogFilters,
  OperationLogListResponse,
  OperationLogRecord,
} from '@/features/content-admin/types/operation-logs'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  OPERATION_LOG_LIST_RESPONSE_SCHEMA,
  OPERATION_LOG_RECORD_SCHEMA,
} from '@/features/content-admin/content-admin-api-contracts'
import { get } from '@/lib/http'

export function useOperationLogs(
  filters: Ref<OperationLogFilters>,
  selectedOperationLogId: Ref<string | undefined>,
) {
  const operationLogsQuery = useQuery({
    queryKey: computed(() => ['operation-logs', { ...filters.value }]),
    queryFn: () =>
      get<OperationLogListResponse>(
        '/operation-logs',
        {
          ...filters.value,
          outcome: filters.value.outcome === 'all' ? undefined : filters.value.outcome,
        },
        {
          responseSchema: OPERATION_LOG_LIST_RESPONSE_SCHEMA,
        },
      ),
  })
  const operationLogDetailQuery = useQuery({
    queryKey: computed(() => ['operation-log-detail', selectedOperationLogId.value]),
    queryFn: () =>
      selectedOperationLogId.value
        ? get<OperationLogRecord>(`/operation-logs/${selectedOperationLogId.value}`, undefined, {
            responseSchema: OPERATION_LOG_RECORD_SCHEMA,
          })
        : Promise.reject(new Error('No operation log is selected')),
    enabled: computed(() => Boolean(selectedOperationLogId.value)),
  })

  return {
    operationLogs: computed(() => operationLogsQuery.data.value?.items ?? []),
    total: computed(() => operationLogsQuery.data.value?.total ?? 0),
    selectedOperationLog: operationLogDetailQuery.data,
    queryError: operationLogsQuery.error,
    detailError: operationLogDetailQuery.error,
    isLoading: operationLogsQuery.isPending,
    isLoadingDetail: operationLogDetailQuery.isPending,
  }
}
