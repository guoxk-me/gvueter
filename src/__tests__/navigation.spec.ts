import type { Component } from 'vue'
import type { BackendMenuNode } from '@/features/navigation'
import type { ApiResponse } from '@/lib/http'
import type { User } from '@/stores/auth'
import type { AuthorizationSnapshot } from '@/types/auth'
import { http, HttpResponse } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { resolveBackendNavigation } from '@/features/navigation'
import { BACKEND_MENU_RESPONSE_SCHEMA } from '@/features/navigation/navigation-api-contracts'
import { MAX_NAVIGATION_DEPTH, MAX_NAVIGATION_NODES } from '@/features/navigation/types'
import {
  defineAbilityFor as defineAbilityFromSnapshot,
  updateAbility as updateAbilityFromSnapshot,
} from '@/lib/ability'
import { get } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { mockBackendMenus } from '@/mocks/handlers/navigation'
import { server } from '@/mocks/node'
import { setupNavigationAccessGuard } from '@/router'
import adminRoutes from '@/router/routes/admin'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'
import { usePermissionStore } from '@/stores/permission'
import { useTabsStore } from '@/stores/tabs'
import { getTestAuthorization, loginWithCaptcha } from './auth-test-helpers'

const adminUser: User = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-01T08:00:00.000Z',
}

const viewerUser: User = {
  id: 3,
  name: 'Viewer',
  email: 'viewer@example.com',
  role: 'viewer',
  status: 'active',
  createdAt: '2026-01-01T08:00:00.000Z',
}

const auditReaderAuthorization: AuthorizationSnapshot = {
  contractVersion: 1,
  policyVersion: 'audit-reader-policy-1',
  grants: [
    {
      action: 'read',
      subject: 'AuditLog',
      permissionIdentifier: 'system:audit-log:read',
    },
  ],
  dataScope: { scope: 'self' },
}

const TestPage: Component = { template: '<div />' }

function defineAbilityFor(user: User | null) {
  return defineAbilityFromSnapshot(user, user ? getTestAuthorization(user) : null)
}

function updateAbility(user: User | null): void {
  updateAbilityFromSnapshot(user, user ? getTestAuthorization(user) : null)
}

function createNavigationTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/login',
        name: 'login',
        component: TestPage,
        meta: { requiresGuest: true },
      },
      {
        path: '/',
        name: 'admin-root',
        component: RouterView,
        meta: { requiresAuth: true },
        children: [
          {
            path: 'dashboard',
            name: 'dashboard',
            component: TestPage,
            meta: {
              requiresAuth: true,
              requiredAbility: ['read', 'Dashboard'],
            },
          },
          {
            path: 'profile',
            name: 'profile',
            component: TestPage,
            meta: { requiresAuth: true, hidden: true },
          },
          {
            path: 'change-password',
            name: 'change-password',
            component: TestPage,
            meta: { requiresAuth: true, hidden: true },
          },
          {
            path: 'forbidden',
            name: 'forbidden',
            component: TestPage,
            meta: { requiresAuth: true },
          },
          {
            path: ':pathMatch(.*)*',
            name: 'admin-not-found',
            component: TestPage,
            meta: { requiresAuth: true },
          },
        ],
      },
    ],
  })
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setActivePinia(createPinia())
  updateAbility(null)
})

describe('backend navigation contract', () => {
  it('bounds response depth, node count, and ordering before recursive route work', () => {
    let nestedNode: BackendMenuNode = {
      id: 'bounded-leaf',
      kind: 'menu',
      titleKey: 'nav.dashboard',
      path: '/bounded-leaf',
      routeName: 'bounded-leaf',
      componentKey: 'dashboard',
    }
    for (let depth = 0; depth < MAX_NAVIGATION_DEPTH; depth += 1) {
      nestedNode = {
        id: `nested-${depth}`,
        kind: 'menu',
        titleKey: 'nav.resources',
        children: [nestedNode],
      }
    }

    expect(BACKEND_MENU_RESPONSE_SCHEMA.safeParse({ menus: [nestedNode] }).success).toBe(false)
    expect(
      BACKEND_MENU_RESPONSE_SCHEMA.safeParse({
        menus: Array.from({ length: MAX_NAVIGATION_NODES + 1 }, (_, index) => ({
          id: `menu-${index}`,
          kind: 'menu',
          titleKey: 'nav.resources',
        })),
      }).success,
    ).toBe(false)
    expect(
      BACKEND_MENU_RESPONSE_SCHEMA.safeParse({
        menus: [{ id: 'negative-order', kind: 'menu', titleKey: 'nav.resources', order: -1 }],
      }).success,
    ).toBe(false)
    expect(
      BACKEND_MENU_RESPONSE_SCHEMA.safeParse({
        menus: [
          { id: 'duplicate', kind: 'menu', titleKey: 'nav.resources' },
          { id: 'duplicate', kind: 'menu', titleKey: 'nav.dashboard' },
        ],
      }).success,
    ).toBe(false)
  })

  it('filters by CASL while retaining hidden authenticated account routes', () => {
    const viewerNavigation = resolveBackendNavigation(
      mockBackendMenus,
      defineAbilityFor(viewerUser),
    )

    expect(viewerNavigation.routes.map(routeCandidate => routeCandidate.routeName)).toEqual([
      'dashboard',
      'message-center',
      'components',
      'form-workbench',
      'content-admin',
      'monitoring',
      'embedded-documentation',
      'profile',
      'change-password',
    ])
    expect(viewerNavigation.deniedPaths).toEqual([
      '/users',
      '/roles',
      '/departments',
      '/positions',
      '/menus',
      '/dictionaries',
      '/system-config',
      '/system-config/parameters',
      '/system-config/audit-events',
      '/audit-logs',
    ])
    expect(viewerNavigation.menus.some(menuNode => menuNode.id === 'administration')).toBe(false)
    expect(viewerNavigation.menus.find(menuNode => menuNode.id === 'profile')?.hidden).toBe(true)
  })

  it('resolves the audit-log route with AuditLog access and no Content grant', () => {
    const auditReaderNavigation = resolveBackendNavigation(
      mockBackendMenus,
      defineAbilityFromSnapshot(viewerUser, auditReaderAuthorization),
    )
    const auditLogRoute = auditReaderNavigation.routes.find(
      routeCandidate => routeCandidate.routeName === 'audit-logs',
    )

    // AI modified: this route contract proves AuditLog does not inherit the Content boundary.
    expect(auditLogRoute).toMatchObject({
      fullPath: '/audit-logs',
      route: {
        meta: {
          requiredAbility: ['read', 'AuditLog'],
          permissionIdentifier: 'system:audit-log:read',
        },
      },
    })
    expect(
      auditReaderNavigation.routes.some(
        routeCandidate => routeCandidate.routeName === 'content-admin',
      ),
    ).toBe(false)
  })

  it('rejects unknown component keys and unsafe external URLs', () => {
    const unsafeMenus: BackendMenuNode[] = [
      {
        id: 'unsafe-component',
        kind: 'menu',
        titleKey: 'unsafe.component',
        path: '/unsafe-component',
        routeName: 'unsafe-component',
        componentKey: '../../pages/admin/UsersPage.vue',
      },
      {
        id: 'unsafe-external',
        kind: 'external',
        titleKey: 'unsafe.external',
        externalUrl: 'javascript:alert(1)',
      },
      {
        id: 'untrusted-origin',
        kind: 'external',
        titleKey: 'unsafe.origin',
        externalUrl: 'https://evil.example/phishing',
      },
      {
        id: 'backslash-origin-bypass',
        kind: 'external',
        titleKey: 'unsafe.backslash-origin',
        externalUrl: String.raw`/\evil.example/phishing`,
      },
    ]

    const safeNavigation = resolveBackendNavigation(unsafeMenus, defineAbilityFor(adminUser))

    expect(safeNavigation.routes).toEqual([])
    expect(safeNavigation.menus).toEqual([])
  })

  it('rejects malformed fields and duplicate IDs without recursing through cyclic objects', () => {
    const cyclicGroup: BackendMenuNode = {
      id: 'cyclic-group',
      kind: 'menu',
      titleKey: 'nav.administration',
      order: 1,
      children: [],
    }
    const cyclicLeaf: BackendMenuNode = {
      id: 'cyclic-leaf',
      kind: 'menu',
      titleKey: 'nav.dashboard',
      path: '/cyclic-leaf',
      routeName: 'cyclic-leaf',
      componentKey: 'dashboard',
      order: 1,
      children: [cyclicGroup],
    }
    cyclicGroup.children = [cyclicLeaf]

    const untrustedMenus = [
      cyclicGroup,
      {
        ...cyclicLeaf,
        path: '/duplicate-leaf',
        routeName: 'duplicate-leaf',
        children: [],
        order: 2,
      },
      null,
      { id: 'bad-kind', kind: 'script', titleKey: 'nav.dashboard' },
      {
        id: 'bad-path-type',
        kind: 'menu',
        titleKey: 'nav.dashboard',
        path: 42,
        routeName: 'bad-path-type',
        componentKey: 'dashboard',
      },
      {
        id: 'bad-route-syntax',
        kind: 'menu',
        titleKey: 'nav.dashboard',
        path: '/dashboard?admin=true',
        routeName: 'bad-route-syntax',
        componentKey: 'dashboard',
      },
    ] as unknown as BackendMenuNode[]

    const resolvedNavigation = resolveBackendNavigation(untrustedMenus, defineAbilityFor(adminUser))

    expect(resolvedNavigation.routes.map(route => route.routeName)).toEqual(['cyclic-leaf'])
    expect(resolvedNavigation.menus).toHaveLength(1)
    expect(resolvedNavigation.menus[0]?.children.map(menu => menu.id)).toEqual(['cyclic-leaf'])
  })

  it('exposes ordered visible menus without hidden destinations', () => {
    const adminNavigation = resolveBackendNavigation(mockBackendMenus, defineAbilityFor(adminUser))
    const menuStore = useMenuStore()
    menuStore.replaceMenus(adminNavigation.menus)

    expect(menuStore.visibleMenus.map(menuNode => menuNode.id)).toEqual([
      'dashboard',
      'message-center',
      'components',
      'form-workbench',
      'content-admin',
      'administration',
      'monitoring',
      'audit-logs',
      'resources',
    ])
    expect(
      menuStore.visibleMenus
        .find(menuNode => menuNode.id === 'administration')
        ?.children
        .map(menuNode => menuNode.id),
    ).toEqual([
      'users',
      'roles',
      'departments',
      'positions',
      'menus',
      'dictionaries',
      'system-config',
      'system-parameters',
      'security-center',
    ])
    const administrationMenu = menuStore.visibleMenus.find(
      menuNode => menuNode.id === 'administration',
    )
    const usersMenu = administrationMenu?.children.find(menuNode => menuNode.id === 'users')
    expect(usersMenu?.permissionIdentifier).toBe('system:user:read')
    const usersRoute = adminNavigation.routes.find(route => route.routeName === 'users')
    expect(usersRoute?.route.meta?.permissionIdentifier).toBe('system:user:read')
    expect(
      adminNavigation.routes.find(route => route.routeName === 'audit-events')?.fullPath,
    ).toBe('/system-config/audit-events')
    expect(
      menuStore.visibleMenus
        .find(menuNode => menuNode.id === 'resources')
        ?.children
        .map(menuNode => menuNode.id),
    ).toEqual(['documentation', 'embedded-documentation'])
  })
})

describe('dynamic route lifecycle', () => {
  it('requires an authenticated token for the backend menu endpoint', async () => {
    await expect(get('/navigation')).rejects.toThrow(/登录状态无效/)
  })

  it('rejects a malformed navigation payload before registering routes', async () => {
    const testRouter = createNavigationTestRouter()
    const permissionStore = usePermissionStore()
    sessionStorage.setItem('auth_token', generateMockToken(adminUser.id))
    server.use(
      http.get('/api/navigation', () =>
        HttpResponse.json<ApiResponse<unknown>>({
          code: 0,
          message: 'success',
          data: {
            menus: [{ id: 'malformed', kind: 'script', titleKey: 'nav.dashboard' }],
          },
        })),
    )

    // AI modified: one invalid backend node fails the response contract before router mutation.
    await expect(permissionStore.loadNavigation(testRouter, '1:admin')).rejects.toMatchObject({
      code: 'INVALID_API_RESPONSE_DATA',
      category: 'contract',
    })
    expect(permissionStore.isReady).toBe(false)
    expect(testRouter.hasRoute('malformed')).toBe(false)
    expect(useMenuStore().menus).toEqual([])
  })

  it('registers safe routes and unloads routes, menus, and dynamic tabs', async () => {
    const testRouter = createNavigationTestRouter()
    const permissionStore = usePermissionStore()
    const menuStore = useMenuStore()
    const tabsStore = useTabsStore()
    sessionStorage.setItem('auth_token', generateMockToken(adminUser.id))
    updateAbility(adminUser)

    const hasNewRoutes = await permissionStore.loadNavigation(testRouter, '1:admin')
    tabsStore.openTab({
      id: '/users',
      routeName: 'users',
      fullPath: '/users',
      cacheKey: 'UsersPage',
      isKeepAlive: true,
      isAffix: false,
    })

    expect(hasNewRoutes).toBe(true)
    expect(testRouter.hasRoute('users')).toBe(true)
    expect(testRouter.hasRoute('message-center')).toBe(true)
    expect(testRouter.hasRoute('form-workbench')).toBe(true)
    expect(testRouter.hasRoute('content-admin')).toBe(true)
    expect(testRouter.hasRoute('roles')).toBe(true)
    expect(testRouter.hasRoute('departments')).toBe(true)
    expect(testRouter.hasRoute('positions')).toBe(true)
    expect(testRouter.hasRoute('menus')).toBe(true)
    expect(testRouter.hasRoute('dictionaries')).toBe(true)
    expect(testRouter.hasRoute('system-config')).toBe(true)
    expect(testRouter.hasRoute('system-parameters')).toBe(true)
    expect(testRouter.hasRoute('audit-events')).toBe(true)
    expect(testRouter.hasRoute('monitoring')).toBe(true)
    expect(testRouter.hasRoute('audit-logs')).toBe(true)
    expect(testRouter.hasRoute('embedded-documentation')).toBe(true)
    expect(testRouter.hasRoute('documentation')).toBe(false)
    expect(menuStore.menus.length).toBeGreaterThan(0)

    permissionStore.unloadNavigation()

    expect(testRouter.hasRoute('users')).toBe(false)
    expect(testRouter.hasRoute('message-center')).toBe(false)
    expect(testRouter.hasRoute('form-workbench')).toBe(false)
    expect(testRouter.hasRoute('content-admin')).toBe(false)
    expect(testRouter.hasRoute('roles')).toBe(false)
    expect(testRouter.hasRoute('departments')).toBe(false)
    expect(testRouter.hasRoute('positions')).toBe(false)
    expect(testRouter.hasRoute('menus')).toBe(false)
    expect(testRouter.hasRoute('dictionaries')).toBe(false)
    expect(testRouter.hasRoute('system-config')).toBe(false)
    expect(testRouter.hasRoute('system-parameters')).toBe(false)
    expect(testRouter.hasRoute('audit-events')).toBe(false)
    expect(testRouter.hasRoute('monitoring')).toBe(false)
    expect(testRouter.hasRoute('audit-logs')).toBe(false)
    expect(testRouter.hasRoute('dashboard')).toBe(true)
    expect(menuStore.menus).toEqual([])
    expect(tabsStore.tabs.some(tab => tab.routeName === 'users')).toBe(false)
  })

  it('re-enters a first direct dynamic URL once after authenticated assembly', async () => {
    const testRouter = createNavigationTestRouter()
    setupNavigationAccessGuard(testRouter)
    const authStore = useAuthStore()
    await loginWithCaptcha(authStore, 'admin@example.com', 'admin123')
    await nextTick()

    await testRouter.push('/users')

    expect(testRouter.currentRoute.value.name).toBe('users')
    expect(usePermissionStore().isReady).toBe(true)
  })

  it('reloads dynamic navigation when the same account changes tenant', async () => {
    const testRouter = createNavigationTestRouter()
    setupNavigationAccessGuard(testRouter)
    const authStore = useAuthStore()
    await loginWithCaptcha(authStore, 'admin@example.com', 'admin123', {
      tenantId: 'tenant-a',
    })
    await testRouter.push('/users')

    expect(usePermissionStore().principalKey).toBe('tenant-a:1:admin')

    await loginWithCaptcha(authStore, 'admin@example.com', 'admin123', {
      tenantId: 'tenant-b',
    })
    await testRouter.push('/dashboard?tenant=tenant-b')

    // AI modified: user ID and role equality cannot reuse routes from a different tenant.
    expect(usePermissionStore().principalKey).toBe('tenant-b:1:admin')
  })

  it('sends a denied dynamic direct URL to the terminal forbidden route', async () => {
    const testRouter = createNavigationTestRouter()
    setupNavigationAccessGuard(testRouter)
    const authStore = useAuthStore()
    await loginWithCaptcha(authStore, 'viewer@example.com', 'viewer123')
    await nextTick()

    await testRouter.push('/roles')

    expect(testRouter.currentRoute.value.name).toBe('forbidden')
  })

  it('allows an authenticated observer to enter the scoped monitoring route', async () => {
    const testRouter = createNavigationTestRouter()
    setupNavigationAccessGuard(testRouter)
    const authStore = useAuthStore()
    await loginWithCaptcha(authStore, 'viewer@example.com', 'viewer123')
    await nextTick()

    await testRouter.push('/monitoring')

    expect(testRouter.currentRoute.value.name).toBe('monitoring')
  })

  it('allows an audit reader to enter the standalone operation-log route', async () => {
    const testRouter = createNavigationTestRouter()
    setupNavigationAccessGuard(testRouter)
    const authStore = useAuthStore()
    await loginWithCaptcha(authStore, 'editor@example.com', 'editor123')
    await nextTick()

    await testRouter.push('/audit-logs')

    expect(testRouter.currentRoute.value.name).toBe('audit-logs')
  })

  it('unloads dynamic routes, menus, and tabs on the first navigation after logout', async () => {
    const testRouter = createNavigationTestRouter()
    setupNavigationAccessGuard(testRouter)
    const authStore = useAuthStore()
    const tabsStore = useTabsStore()
    await loginWithCaptcha(authStore, 'admin@example.com', 'admin123')
    await nextTick()
    await testRouter.push('/users')
    tabsStore.openTab({
      id: '/users',
      routeName: 'users',
      fullPath: '/users',
      cacheKey: 'UsersPage',
      isKeepAlive: true,
      isAffix: false,
    })

    await authStore.logout()
    await testRouter.push('/login')

    expect(testRouter.hasRoute('users')).toBe(false)
    expect(useMenuStore().menus).toEqual([])
    expect(tabsStore.tabs.some(tab => tab.routeName === 'users')).toBe(false)
  })
})

describe('static account and persisted tab contracts', () => {
  it('keeps profile and change-password authenticated without admin abilities', () => {
    const adminRoot = adminRoutes[0]
    const accountRoutes = adminRoot?.children
      ? adminRoot.children.filter(
          routeRecord => routeRecord.name === 'profile' || routeRecord.name === 'change-password',
        )
      : []

    expect(accountRoutes).toHaveLength(2)
    expect(accountRoutes.every(routeRecord => routeRecord.meta?.requiresAuth)).toBe(true)
    expect(
      accountRoutes.every(routeRecord => routeRecord.meta?.requiredAbility === undefined),
    ).toBe(true)
    expect(accountRoutes.every(routeRecord => routeRecord.meta?.hidden)).toBe(true)
  })

  it('persists tabs and derives a unique KeepAlive include contract', async () => {
    const tabsStore = useTabsStore()
    tabsStore.bindPrincipal('tenant-a:1')
    tabsStore.openTab({
      id: '/dashboard',
      routeName: 'dashboard',
      fullPath: '/dashboard',
      cacheKey: 'DashboardPage',
      isKeepAlive: true,
      isAffix: true,
    })
    tabsStore.openTab({
      id: '/users',
      routeName: 'users',
      fullPath: '/users',
      cacheKey: 'UsersPage',
      isKeepAlive: true,
      isAffix: false,
    })
    tabsStore.openTab({
      id: '/users?status=active',
      routeName: 'users',
      fullPath: '/users?status=active',
      cacheKey: 'UsersPage',
      isKeepAlive: true,
      isAffix: false,
    })
    await nextTick()

    expect(tabsStore.keepAliveInclude).toEqual(['DashboardPage', 'UsersPage'])

    setActivePinia(createPinia())
    const restoredTabsStore = useTabsStore()
    restoredTabsStore.bindPrincipal('tenant-a:1')
    expect(restoredTabsStore.tabs).toHaveLength(3)
    expect(restoredTabsStore.activeTabId).toBe('/users?status=active')
    expect(restoredTabsStore.closeAllTabs()).toBe('/dashboard')
    expect(restoredTabsStore.tabs.map(tab => tab.routeName)).toEqual(['dashboard'])

    restoredTabsStore.bindPrincipal('tenant-b:1')
    // AI modified: persisted page state cannot cross tenant boundaries for the same account.
    expect(restoredTabsStore.tabs).toEqual([])
  })
})
