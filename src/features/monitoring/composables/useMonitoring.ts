import type { Ref } from 'vue'
import type { MonitoringFilters, MonitoringOverview } from '@/features/monitoring/types'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  CACHE_HEALTH_SCHEMA,
  MONITORING_OVERVIEW_SCHEMA,
  SCHEDULED_JOB_SCHEMA,
} from '@/features/monitoring/monitoring-api-contracts'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { get, post } from '@/lib/http'

export const monitoringQueryKey = ['monitoring'] as const

export function useMonitoring(appliedFilters: Ref<MonitoringFilters>) {
  const queryClient = useQueryClient()
  const overviewQuery = useQuery({
    queryKey: computed(() => [...monitoringQueryKey, appliedFilters.value]),
    queryFn: () =>
      get<MonitoringOverview>(
        '/monitoring/overview',
        {
          keyword: appliedFilters.value.keyword || undefined,
          logKind:
            appliedFilters.value.logKind === 'all' ? undefined : appliedFilters.value.logKind,
          severity:
            appliedFilters.value.severity === 'all' ? undefined : appliedFilters.value.severity,
        },
        {
          responseSchema: MONITORING_OVERVIEW_SCHEMA,
        },
      ),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  async function refreshMonitoring(): Promise<void> {
    await overviewQuery.refetch()
  }

  async function refreshAfterOperation(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: monitoringQueryKey })
  }

  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      post<null>(`/monitoring/sessions/${sessionId}/terminate`, undefined, {
        responseSchema: EMPTY_RESPONSE_SCHEMA,
      }),
    onSuccess: refreshAfterOperation,
  })
  const runJobMutation = useMutation({
    mutationFn: (jobId: string) =>
      post(`/monitoring/jobs/${jobId}/run`, undefined, {
        responseSchema: SCHEDULED_JOB_SCHEMA,
      }),
    onSuccess: refreshAfterOperation,
  })
  const clearCacheMutation = useMutation({
    mutationFn: (cacheName: string) =>
      post(`/monitoring/caches/${cacheName}/clear`, undefined, {
        responseSchema: CACHE_HEALTH_SCHEMA,
      }),
    onSuccess: refreshAfterOperation,
  })

  async function terminateSession(sessionId: string): Promise<boolean> {
    if (terminateSessionMutation.isPending.value) return false
    // AI modified: one mutation instance and a pending guard prevent duplicate operator actions.
    await terminateSessionMutation.mutateAsync(sessionId)
    return true
  }

  async function runJob(jobId: string): Promise<boolean> {
    if (runJobMutation.isPending.value) return false
    await runJobMutation.mutateAsync(jobId)
    return true
  }

  async function clearCache(cacheName: string): Promise<boolean> {
    if (clearCacheMutation.isPending.value) return false
    await clearCacheMutation.mutateAsync(cacheName)
    return true
  }

  return {
    overview: computed(() => overviewQuery.data.value),
    queryError: overviewQuery.error,
    isLoading: overviewQuery.isPending,
    isRefreshing: overviewQuery.isFetching,
    isTerminatingSession: terminateSessionMutation.isPending,
    isRunningJob: runJobMutation.isPending,
    isClearingCache: clearCacheMutation.isPending,
    terminatingSessionId: computed(() => terminateSessionMutation.variables.value),
    runningJobId: computed(() => runJobMutation.variables.value),
    clearingCacheName: computed(() => clearCacheMutation.variables.value),
    refreshMonitoring,
    terminateSession,
    runJob,
    clearCache,
  }
}
