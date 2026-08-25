import type {
  RoleDefinition,
  RoleListResponse,
  UpdateRolePolicyInput,
} from '@/features/roles/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ROLE_DEFINITION_SCHEMA,
  ROLE_LIST_RESPONSE_SCHEMA,
} from '@/features/roles/role-api-contracts'
import { appAbility } from '@/lib/ability'
import { get, put } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'

interface SaveRolePermissionsRequest {
  roleKey: RoleDefinition['key']
  input: UpdateRolePolicyInput
}

const roleQueryKey = ['roles'] as const

export function useRoleManagement() {
  const authStore = useAuthStore()
  const permissionStore = usePermissionStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  const rolesQuery = useQuery({
    queryKey: roleQueryKey,
    queryFn: () =>
      get<RoleListResponse>('/roles', undefined, { responseSchema: ROLE_LIST_RESPONSE_SCHEMA }),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleKey, input }: SaveRolePermissionsRequest) =>
      put<RoleDefinition>(`/roles/${roleKey}`, input, {
        responseSchema: ROLE_DEFINITION_SCHEMA,
      }),
    onSuccess: async (updatedRole) => {
      const isActiveRole = authStore.user?.role === updatedRole.key
      if (isActiveRole) {
        // AI modified: refresh the server snapshot so a role response cannot directly grant browser permissions.
        await authStore.refreshPrincipal()
        if (authStore.principalId && authStore.user) {
          // AI modified: policy refreshes retain the same tenant/user/role ownership key as route bootstrap.
          await permissionStore.reloadNavigation(
            router,
            `${authStore.principalId}:${authStore.user.role}`,
          )
        }

        const activeRoute = router.currentRoute.value
        const routeWithAbility = [...activeRoute.matched]
          .reverse()
          .find(routeRecord => routeRecord.meta.requiredAbility)
        const requiredAbility = routeWithAbility?.meta.requiredAbility
        const isCurrentPageDenied
          = permissionStore.isPathDenied(activeRoute.path)
            || Boolean(requiredAbility && !appAbility.can(requiredAbility[0], requiredAbility[1]))
            || Boolean(
              activeRoute.meta.isDynamic
              && typeof activeRoute.name === 'string'
              && !router.hasRoute(activeRoute.name),
            )
        if (isCurrentPageDenied && activeRoute.name !== 'forbidden')
          await router.replace({ name: 'forbidden', replace: true })
      }
      await queryClient.invalidateQueries({ queryKey: roleQueryKey })
    },
  })

  return {
    roles: computed(() => rolesQuery.data.value?.items ?? []),
    scopeDepartments: computed(() => rolesQuery.data.value?.scopeDepartments ?? []),
    queryError: rolesQuery.error,
    isLoading: rolesQuery.isPending,
    isSaving: updateRoleMutation.isPending,
    saveRolePolicy: updateRoleMutation.mutateAsync,
  }
}
