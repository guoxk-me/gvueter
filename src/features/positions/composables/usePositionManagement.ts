import type { Ref } from 'vue'
import type {
  PositionInput,
  PositionListFilters,
  PositionListResponse,
  PositionRecord,
} from '@/features/positions/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  POSITION_LIST_RESPONSE_SCHEMA,
  POSITION_RECORD_SCHEMA,
} from '@/features/positions/position-api-contracts'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { del, get, post, put } from '@/lib/http'

interface PositionChangeRequest {
  position?: PositionRecord
  input: PositionInput
}

const positionQueryKey = ['positions'] as const

export function usePositionManagement(filters: Ref<PositionListFilters>) {
  const queryClient = useQueryClient()
  const positionsQuery = useQuery({
    queryKey: computed(() => [...positionQueryKey, filters.value.keyword, filters.value.status]),
    queryFn: () =>
      get<PositionListResponse>(
        '/positions',
        {
          keyword: filters.value.keyword || undefined,
          status: filters.value.status === 'all' ? undefined : filters.value.status,
        },
        {
          responseSchema: POSITION_LIST_RESPONSE_SCHEMA,
        },
      ),
  })
  const savePositionMutation = useMutation({
    mutationFn: ({ position, input }: PositionChangeRequest) =>
      position
        ? put<PositionRecord>(`/positions/${position.id}`, input, {
            responseSchema: POSITION_RECORD_SCHEMA,
          })
        : post<PositionRecord>('/positions', input, {
            responseSchema: POSITION_RECORD_SCHEMA,
          }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: positionQueryKey }),
  })
  const deletePositionMutation = useMutation({
    mutationFn: (position: PositionRecord) =>
      del<null>(`/positions/${position.id}`, { responseSchema: EMPTY_RESPONSE_SCHEMA }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: positionQueryKey }),
  })

  return {
    positions: computed(() => positionsQuery.data.value?.items ?? []),
    total: computed(() => positionsQuery.data.value?.total ?? 0),
    queryError: positionsQuery.error,
    isLoading: positionsQuery.isPending,
    isSaving: savePositionMutation.isPending,
    isDeleting: deletePositionMutation.isPending,
    savePosition: savePositionMutation.mutateAsync,
    deletePosition: deletePositionMutation.mutateAsync,
  }
}
