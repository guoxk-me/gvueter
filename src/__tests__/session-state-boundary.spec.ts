import { QueryClient } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import {
  FORM_WORKBENCH_DRAFT_KEY,
  getFormWorkbenchDraftKey,
} from '@/features/form-workbench/composables/useFormWorkbenchDraft'
import { notifySessionInvalidated, resetSessionInvalidation } from '@/lib/request-policy'
import {
  notifySessionPrincipalChanged,
  registerSessionBoundaryHandler,
} from '@/lib/session-boundary'
import { registerSessionStateBoundary } from '@/lib/session-state-boundary'
import { generateMockToken, mockUsers } from '@/mocks/data/users'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { usePermissionStore } from '@/stores/permission'
import { useTabsStore } from '@/stores/tabs'
import { getTestPrincipal, loginWithCaptcha } from './auth-test-helpers'

function createPersistedPinia() {
  const pinia = createPinia().use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  return pinia
}

let unregisterBoundary: (() => void) | undefined

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  resetSessionInvalidation()
})

afterEach(() => {
  unregisterBoundary?.()
  unregisterBoundary = undefined
  resetSessionInvalidation()
})

describe('principal-scoped application state', () => {
  it('continues notifying later boundary handlers when one handler fails', () => {
    const successfulHandler = vi.fn()
    const unregisterFailingHandler = registerSessionBoundaryHandler(
      'test-failing-projection',
      () => {
        throw new Error('projection cleanup failed')
      },
    )
    const unregisterSuccessfulHandler = registerSessionBoundaryHandler(
      'test-successful-projection',
      successfulHandler,
    )

    expect(() =>
      notifySessionPrincipalChanged({
        previousPrincipalId: 'tenant-a:1',
        principalId: 'tenant-b:2',
        reason: 'principal-changed',
      }),
    ).not.toThrow()
    expect(successfulHandler).toHaveBeenCalledOnce()

    unregisterFailingHandler()
    unregisterSuccessfulHandler()
  })

  it('isolates a failed query cleanup from the remaining application projections', () => {
    const pinia = createPinia()
    const queryClient = new QueryClient()
    setActivePinia(pinia)
    vi.spyOn(queryClient, 'clear').mockImplementation(() => {
      throw new Error('query cleanup failed')
    })
    unregisterBoundary = registerSessionStateBoundary({ pinia, queryClient })
    const notificationStore = useNotificationStore(pinia)
    const permissionStore = usePermissionStore(pinia)
    const tabsStore = useTabsStore(pinia)
    vi.spyOn(permissionStore, 'unloadNavigation').mockImplementation(() => {
      throw new Error('navigation cleanup failed')
    })

    expect(() =>
      notifySessionPrincipalChanged({
        previousPrincipalId: 'tenant-a:1',
        principalId: 'tenant-b:2',
        reason: 'principal-changed',
      }),
    ).not.toThrow()
    expect(notificationStore.principalId).toBe('tenant-b:2')
    expect(tabsStore.boundPrincipalId).toBe('tenant-b:2')
  })

  it('clears remote state and notification projections only when the principal changes', () => {
    const pinia = createPinia()
    const queryClient = new QueryClient()
    setActivePinia(pinia)
    unregisterBoundary = registerSessionStateBoundary({ pinia, queryClient })
    const authStore = useAuthStore(pinia)
    const notificationStore = useNotificationStore(pinia)
    const permissionStore = usePermissionStore(pinia)
    const tabsStore = useTabsStore(pinia)
    const { password: _adminPassword, ...admin } = mockUsers[0]!
    const { password: _editorPassword, ...editor } = mockUsers[1]!

    authStore.setUser(admin)
    queryClient.setQueryData(['users'], { items: [admin] })
    notificationStore.syncUnreadCount(3)
    notificationStore.markRead('notification-admin')
    sessionStorage.setItem(getFormWorkbenchDraftKey(String(admin.id)), '{"title":"admin"}')
    tabsStore.openTab({
      id: '/admin-profile',
      routeName: 'profile',
      fullPath: '/admin-profile',
      isKeepAlive: false,
      isAffix: false,
    })
    permissionStore.principalKey = '1:admin'
    permissionStore.isReady = true

    authStore.setUser({ ...admin, name: 'Renamed administrator' })
    expect(queryClient.getQueryData(['users'])).toEqual({ items: [admin] })
    expect(notificationStore.readNotificationIds).toEqual(['notification-admin'])
    expect(tabsStore.tabs.map((tab) => tab.id)).toEqual(['/admin-profile'])
    expect(permissionStore.principalKey).toBe('1:admin')

    authStore.setUser(editor)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(notificationStore.principalId).toBe(String(editor.id))
    expect(notificationStore.readNotificationIds).toEqual([])
    expect(notificationStore.unreadCount).toBe(0)
    expect(notificationStore.isUnreadCountAuthoritative).toBe(false)
    expect(permissionStore.principalKey).toBeNull()
    expect(permissionStore.isReady).toBe(false)
    expect(tabsStore.boundPrincipalId).toBe(String(editor.id))
    expect(tabsStore.tabs).toEqual([])
    expect(sessionStorage.getItem(getFormWorkbenchDraftKey(String(admin.id)))).toBeNull()

    authStore.setUser(admin)
    expect(tabsStore.tabs.map((tab) => tab.id)).toEqual(['/admin-profile'])
  })

  it('clears privileged projections when the backend policy version changes for the same user', () => {
    const pinia = createPinia()
    const queryClient = new QueryClient()
    setActivePinia(pinia)
    unregisterBoundary = registerSessionStateBoundary({ pinia, queryClient })
    const authStore = useAuthStore(pinia)
    const { password: _password, ...admin } = mockUsers[0]!
    const principal = getTestPrincipal(admin)

    authStore.setToken(generateMockToken(admin.id))
    authStore.setAuthenticatedPrincipal(principal)
    queryClient.setQueryData(['roles'], { role: 'admin' })
    usePermissionStore(pinia).isReady = true

    authStore.setAuthenticatedPrincipal({
      ...principal,
      authorization: {
        ...principal.authorization,
        policyVersion: `${principal.authorization.policyVersion}-next`,
      },
    })

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(usePermissionStore(pinia).isReady).toBe(false)
  })

  it('clears principal-scoped state after an explicit logout', async () => {
    const pinia = createPinia()
    const queryClient = new QueryClient()
    setActivePinia(pinia)
    unregisterBoundary = registerSessionStateBoundary({ pinia, queryClient })
    const authStore = useAuthStore(pinia)
    const notificationStore = useNotificationStore(pinia)
    const { password: _password, ...admin } = mockUsers[0]!

    authStore.setToken(generateMockToken(admin.id))
    authStore.setUser(admin)
    queryClient.setQueryData(['dashboard'], { totalUsers: 8 })
    notificationStore.syncUnreadCount(2)
    notificationStore.markRead('notification-admin')
    sessionStorage.setItem(getFormWorkbenchDraftKey(String(admin.id)), '{"title":"admin"}')

    await authStore.logout()

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(notificationStore.principalId).toBeNull()
    expect(notificationStore.readNotificationIds).toEqual([])
    expect(notificationStore.unreadCount).toBe(0)
    expect(useTabsStore(pinia).boundPrincipalId).toBeNull()
    expect(sessionStorage.getItem(getFormWorkbenchDraftKey(String(admin.id)))).toBeNull()
  })

  it('treats a tenant change as a new principal for the same account', async () => {
    const pinia = createPinia()
    const queryClient = new QueryClient()
    setActivePinia(pinia)
    unregisterBoundary = registerSessionStateBoundary({ pinia, queryClient })
    const authStore = useAuthStore(pinia)
    const notificationStore = useNotificationStore(pinia)

    await loginWithCaptcha(authStore, 'admin@example.com', 'admin123', {
      tenantId: 'tenant-a',
    })
    queryClient.setQueryData(['users'], { tenantId: 'tenant-a' })
    notificationStore.syncUnreadCount(2)
    notificationStore.markRead('tenant-a-notification')

    await loginWithCaptcha(authStore, 'admin@example.com', 'admin123', {
      tenantId: 'tenant-b',
    })

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(notificationStore.principalId).toBe('tenant-b:1')
    expect(notificationStore.readNotificationIds).toEqual([])
    expect(notificationStore.unreadCount).toBe(0)
    expect(useTabsStore(pinia).boundPrincipalId).toBe('tenant-b:1')
  })

  it('removes ownerless legacy browser state when the boundary is registered', () => {
    localStorage.setItem(FORM_WORKBENCH_DRAFT_KEY, '{"title":"previous account"}')
    sessionStorage.setItem(FORM_WORKBENCH_DRAFT_KEY, '{"title":"previous account"}')
    localStorage.setItem('admin-tabs', '{"tabs":[]}')
    const pinia = createPinia()
    const queryClient = new QueryClient()
    setActivePinia(pinia)

    unregisterBoundary = registerSessionStateBoundary({ pinia, queryClient })

    expect(localStorage.getItem(FORM_WORKBENCH_DRAFT_KEY)).toBeNull()
    expect(sessionStorage.getItem(FORM_WORKBENCH_DRAFT_KEY)).toBeNull()
    expect(localStorage.getItem('admin-tabs')).toBeNull()
  })

  it('discards a stale anonymous projection when no session can be restored', async () => {
    const pinia = createPinia()
    const queryClient = new QueryClient()
    setActivePinia(pinia)
    unregisterBoundary = registerSessionStateBoundary({ pinia, queryClient })
    const authStore = useAuthStore(pinia)
    const notificationStore = useNotificationStore(pinia)

    notificationStore.syncUnreadCount(2)
    notificationStore.markRead('legacy-notification')

    await authStore.restoreSession()

    expect(notificationStore.principalId).toBeNull()
    expect(notificationStore.readNotificationIds).toEqual([])
    expect(notificationStore.unreadCount).toBe(0)
  })

  it('clears principal-scoped state when a 401 invalidates the session', async () => {
    const pinia = createPinia()
    const queryClient = new QueryClient()
    setActivePinia(pinia)
    unregisterBoundary = registerSessionStateBoundary({ pinia, queryClient })
    const authStore = useAuthStore(pinia)
    const notificationStore = useNotificationStore(pinia)
    const { password: _password, ...admin } = mockUsers[0]!

    authStore.setToken(generateMockToken(admin.id))
    authStore.setUser(admin)
    queryClient.setQueryData(['monitoring'], { services: ['api'] })
    notificationStore.syncUnreadCount(1)

    await notifySessionInvalidated({
      status: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Expired session',
    })

    expect(authStore.isAuthenticated).toBe(false)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(notificationStore.principalId).toBeNull()
    expect(notificationStore.unreadCount).toBe(0)
  })

  it('restores a projection only for the same persisted principal', async () => {
    const { password: _adminPassword, ...admin } = mockUsers[0]!
    const { password: _editorPassword, ...editor } = mockUsers[1]!
    const firstPinia = createPersistedPinia()
    const firstQueryClient = new QueryClient()
    setActivePinia(firstPinia)
    unregisterBoundary = registerSessionStateBoundary({
      pinia: firstPinia,
      queryClient: firstQueryClient,
    })
    const firstAuthStore = useAuthStore(firstPinia)
    const firstNotificationStore = useNotificationStore(firstPinia)

    firstAuthStore.setUser(admin)
    firstNotificationStore.syncUnreadCount(2)
    firstNotificationStore.markRead('notification-admin')
    await nextTick()

    expect(JSON.parse(localStorage.getItem('admin-notifications') ?? '{}')).toMatchObject({
      principalId: String(admin.id),
      readNotificationIds: ['notification-admin'],
      unreadCount: 1,
    })

    unregisterBoundary()
    const restoredPinia = createPersistedPinia()
    const restoredQueryClient = new QueryClient()
    setActivePinia(restoredPinia)
    unregisterBoundary = registerSessionStateBoundary({
      pinia: restoredPinia,
      queryClient: restoredQueryClient,
    })
    const restoredAuthStore = useAuthStore(restoredPinia)
    const restoredNotificationStore = useNotificationStore(restoredPinia)

    restoredAuthStore.setUser(admin)
    expect(restoredNotificationStore.readNotificationIds).toEqual(['notification-admin'])
    expect(restoredNotificationStore.unreadCount).toBe(1)

    restoredAuthStore.setUser(editor)
    expect(restoredNotificationStore.principalId).toBe(String(editor.id))
    expect(restoredNotificationStore.readNotificationIds).toEqual([])
    expect(restoredNotificationStore.unreadCount).toBe(0)
  })
})
