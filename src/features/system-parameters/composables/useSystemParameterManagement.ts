import type { Ref } from 'vue'
import type {
  SystemParameterInput,
  SystemParameterListFilters,
  SystemParameterRecord,
} from '../types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  createSystemParameter,
  deleteSystemParameter,
  listSystemParameters,
  updateSystemParameter,
} from '../api'

interface SystemParameterChangeRequest {
  parameter?: SystemParameterRecord
  input: SystemParameterInput
}

const systemParameterQueryKey = ['system-parameters'] as const

export function useSystemParameterManagement(filters: Ref<SystemParameterListFilters>) {
  const queryClient = useQueryClient()
  const parametersQuery = useQuery({
    queryKey: computed(() => [
      ...systemParameterQueryKey,
      filters.value.keyword,
      filters.value.status,
    ]),
    queryFn: () => listSystemParameters(filters.value),
  })
  const saveParameterMutation = useMutation({
    mutationFn: ({ parameter, input }: SystemParameterChangeRequest) =>
      parameter ? updateSystemParameter(parameter.id, input) : createSystemParameter(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: systemParameterQueryKey }),
  })
  const deleteParameterMutation = useMutation({
    mutationFn: (parameter: SystemParameterRecord) => deleteSystemParameter(parameter.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: systemParameterQueryKey }),
  })

  return {
    parameters: computed(() => parametersQuery.data.value?.items ?? []),
    total: computed(() => parametersQuery.data.value?.total ?? 0),
    queryError: parametersQuery.error,
    isLoading: parametersQuery.isPending,
    isSaving: saveParameterMutation.isPending,
    isDeleting: deleteParameterMutation.isPending,
    saveParameter: saveParameterMutation.mutateAsync,
    deleteParameter: deleteParameterMutation.mutateAsync,
  }
}
