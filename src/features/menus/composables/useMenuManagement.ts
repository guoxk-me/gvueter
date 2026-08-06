import type {
  ManagedMenuInput,
  ManagedMenuListResponse,
  ManagedMenuRecord,
} from '@/features/menus/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  MANAGED_MENU_LIST_RESPONSE_SCHEMA,
  MANAGED_MENU_RECORD_SCHEMA,
} from '@/features/menus/menu-api-contracts'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { del, get, post, put } from '@/lib/http'
import { usePermissionStore } from '@/stores/permission'

interface ManagedMenuChangeRequest {
  menu?: ManagedMenuRecord
  input: ManagedMenuInput
}

const managedMenuQueryKey = ['system-menus'] as const

export function useMenuManagement() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const permissionStore = usePermissionStore()
  async function refreshManagedNavigation(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: managedMenuQueryKey })
    if (permissionStore.principalKey) {
      // AI modified: applying a menu contract immediately refreshes its live menu and route projection.
      await permissionStore.reloadNavigation(router, permissionStore.principalKey)
    }
  }

  const menusQuery = useQuery({
    queryKey: managedMenuQueryKey,
    queryFn: () =>
      get<ManagedMenuListResponse>('/system-menus', undefined, {
        responseSchema: MANAGED_MENU_LIST_RESPONSE_SCHEMA,
      }),
  })
  const saveMenuMutation = useMutation({
    mutationFn: ({ menu, input }: ManagedMenuChangeRequest) =>
      menu
        ? put<ManagedMenuRecord>(`/system-menus/${menu.id}`, input, {
            responseSchema: MANAGED_MENU_RECORD_SCHEMA,
          })
        : post<ManagedMenuRecord>('/system-menus', input, {
            responseSchema: MANAGED_MENU_RECORD_SCHEMA,
          }),
    onSuccess: refreshManagedNavigation,
  })
  const deleteMenuMutation = useMutation({
    mutationFn: (menu: ManagedMenuRecord) =>
      del<null>(`/system-menus/${menu.id}`, { responseSchema: EMPTY_RESPONSE_SCHEMA }),
    onSuccess: refreshManagedNavigation,
  })

  return {
    menus: computed(() => menusQuery.data.value?.items ?? []),
    queryError: menusQuery.error,
    isLoading: menusQuery.isPending,
    isSaving: saveMenuMutation.isPending,
    isDeleting: deleteMenuMutation.isPending,
    saveMenu: saveMenuMutation.mutateAsync,
    deleteMenu: deleteMenuMutation.mutateAsync,
  }
}
