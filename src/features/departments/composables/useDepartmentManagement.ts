import type {
  DepartmentInput,
  DepartmentListResponse,
  DepartmentRecord,
} from '@/features/departments/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  DEPARTMENT_LIST_RESPONSE_SCHEMA,
  DEPARTMENT_RECORD_SCHEMA,
} from '@/features/departments/department-api-contracts'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { del, get, post, put } from '@/lib/http'

interface DepartmentChangeRequest {
  department?: DepartmentRecord
  input: DepartmentInput
}

const departmentQueryKey = ['departments'] as const

export function useDepartmentManagement() {
  const queryClient = useQueryClient()
  const departmentsQuery = useQuery({
    queryKey: departmentQueryKey,
    queryFn: () =>
      get<DepartmentListResponse>('/departments', undefined, {
        responseSchema: DEPARTMENT_LIST_RESPONSE_SCHEMA,
      }),
  })
  const saveDepartmentMutation = useMutation({
    mutationFn: ({ department, input }: DepartmentChangeRequest) =>
      department
        ? put<DepartmentRecord>(`/departments/${department.id}`, input, {
            responseSchema: DEPARTMENT_RECORD_SCHEMA,
          })
        : post<DepartmentRecord>('/departments', input, {
            responseSchema: DEPARTMENT_RECORD_SCHEMA,
          }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentQueryKey }),
  })
  const deleteDepartmentMutation = useMutation({
    mutationFn: (department: DepartmentRecord) =>
      del<null>(`/departments/${department.id}`, { responseSchema: EMPTY_RESPONSE_SCHEMA }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentQueryKey }),
  })

  return {
    departments: computed(() => departmentsQuery.data.value?.items ?? []),
    queryError: departmentsQuery.error,
    isLoading: departmentsQuery.isPending,
    isSaving: saveDepartmentMutation.isPending,
    isDeleting: deleteDepartmentMutation.isPending,
    saveDepartment: saveDepartmentMutation.mutateAsync,
    deleteDepartment: deleteDepartmentMutation.mutateAsync,
  }
}
