import type { QueryClient } from '@tanstack/vue-query'
import type { Pinia } from 'pinia'
import {
  FORM_WORKBENCH_DRAFT_KEY,
  getFormWorkbenchDraftKey,
} from '@/features/form-workbench/composables/useFormWorkbenchDraft'
import { getBrowserStorage, safeStorageDiscard } from '@/lib/browser-storage'
import { registerSessionBoundaryHandler } from '@/lib/session-boundary'
import { useNotificationStore } from '@/stores/notification'
import { usePermissionStore } from '@/stores/permission'
import { useTabsStore } from '@/stores/tabs'

interface SessionStateBoundaryOptions {
  pinia: Pinia
  queryClient: QueryClient
}

export function registerSessionStateBoundary({
  pinia,
  queryClient,
}: SessionStateBoundaryOptions): () => void {
  const notificationStore = useNotificationStore(pinia)
  const permissionStore = usePermissionStore(pinia)
  const tabsStore = useTabsStore(pinia)
  // AI modified: an ownerless draft from older releases is unsafe under every authenticated identity.
  safeStorageDiscard(getBrowserStorage('local'), FORM_WORKBENCH_DRAFT_KEY)
  safeStorageDiscard(getBrowserStorage('session'), FORM_WORKBENCH_DRAFT_KEY)
  const unregisterQueryCache = registerSessionBoundaryHandler('protected-query-cache', () => {
    // AI modified: all remote state is principal-scoped, so account changes discard active cache entries.
    queryClient.clear()
  })
  const unregisterNotificationProjection = registerSessionBoundaryHandler(
    'notification-projection',
    change => notificationStore.bindPrincipal(change.principalId),
  )
  const unregisterPermissionProjection = registerSessionBoundaryHandler(
    'permission-navigation-projection',
    () => {
      // AI modified: route cleanup is isolated so its failure cannot block scoped tab replacement.
      permissionStore.unloadNavigation()
    },
  )
  const unregisterTabProjection = registerSessionBoundaryHandler(
    'tab-navigation-projection',
    change => tabsStore.bindPrincipal(change.principalId),
  )
  const unregisterWorkbenchDraft = registerSessionBoundaryHandler(
    'form-workbench-draft',
    (change) => {
      if (!change.previousPrincipalId)
        return
      // AI modified: ending or replacing a principal removes its sensitive in-tab workbench draft.
      safeStorageDiscard(
        getBrowserStorage('session'),
        getFormWorkbenchDraftKey(change.previousPrincipalId),
      )
    },
  )

  return () => {
    unregisterQueryCache()
    unregisterNotificationProjection()
    unregisterPermissionProjection()
    unregisterTabProjection()
    unregisterWorkbenchDraft()
  }
}
