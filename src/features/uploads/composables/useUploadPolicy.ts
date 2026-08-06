import type { UploadPolicy } from '@/features/uploads/types'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { UPLOAD_POLICY_SCHEMA } from '@/features/uploads/upload-policy-api-contracts'
import { get } from '@/lib/http'

export const uploadPolicyQueryKey = ['upload-policy'] as const

export function useUploadPolicy() {
  const policyQuery = useQuery({
    queryKey: uploadPolicyQueryKey,
    queryFn: () =>
      get<UploadPolicy>('/uploads/policy', undefined, { responseSchema: UPLOAD_POLICY_SCHEMA }),
  })

  return {
    policy: computed(() => policyQuery.data.value),
    queryError: policyQuery.error,
    isLoading: policyQuery.isPending,
    refresh: policyQuery.refetch,
  }
}
