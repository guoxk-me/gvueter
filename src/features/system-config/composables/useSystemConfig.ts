import type { SystemConfig, SystemConfigInput } from '@/features/system-config/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { SYSTEM_CONFIG_SCHEMA } from '@/features/system-config/system-config-api-contracts'
import { uploadPolicyQueryKey } from '@/features/uploads'
import { get, put } from '@/lib/http'

const systemConfigQueryKey = ['system-config'] as const

export function useSystemConfig() {
  const queryClient = useQueryClient()
  const configQuery = useQuery({
    queryKey: systemConfigQueryKey,
    queryFn: () =>
      get<SystemConfig>('/system-config', undefined, { responseSchema: SYSTEM_CONFIG_SCHEMA }),
  })
  const saveConfigMutation = useMutation({
    mutationFn: (input: SystemConfigInput) =>
      put<SystemConfig>('/system-config', input, { responseSchema: SYSTEM_CONFIG_SCHEMA }),
    onSuccess: (savedConfig) => {
      // AI modified: keep the query cache authoritative without duplicating configuration in Pinia.
      queryClient.setQueryData(systemConfigQueryKey, savedConfig)
      // AI modified: every upload surface refetches the safe projection after an administrator saves.
      void queryClient.invalidateQueries({ queryKey: uploadPolicyQueryKey })
    },
  })

  async function saveConfig(input: SystemConfigInput): Promise<SystemConfig> {
    try {
      return await saveConfigMutation.mutateAsync(input)
    }
    finally {
      // AI modified: clear mutation variables so newly entered secret values are not retained in cache state.
      saveConfigMutation.reset()
    }
  }

  return {
    config: computed(() => configQuery.data.value),
    queryError: configQuery.error,
    isLoading: configQuery.isPending,
    isSaving: saveConfigMutation.isPending,
    refresh: configQuery.refetch,
    saveConfig,
  }
}
