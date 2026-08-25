import type { VueWrapper } from '@vue/test-utils'
import type {
  RoleDefinition,
  RoleListResponse,
  UpdateRolePolicyInput,
} from '@/features/roles/types'
import type { AuthenticatedPrincipal } from '@/types/auth'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import RolePermissionMatrix from '@/features/roles/components/RolePermissionMatrix.vue'
import RolesWorkspace from '@/features/roles/components/RolesWorkspace.vue'
import {
  getRoleAuthorizationSnapshot,
  getRoleDefinitions,
  updateRolePolicy,
} from '@/features/roles/role-policy'
import { PERMISSION_ACTIONS, PERMISSION_SUBJECTS } from '@/features/roles/types'
import { i18n, setLocale } from '@/i18n'
import { appAbility, defineAbilityFor, updateAbility } from '@/lib/ability'
import { get, put } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { server } from '@/mocks/node'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'
import { usePermissionStore } from '@/stores/permission'

describe('role management API', () => {
  beforeEach(() => sessionStorage.setItem('auth_token', generateMockToken(1)))
  afterEach(() => sessionStorage.removeItem('auth_token'))

  it('lists the built-in roles', async () => {
    const roles = await get<RoleListResponse>('/roles')

    expect(roles.items.map(role => role.key)).toEqual(['admin', 'editor', 'viewer'])
    expect(roles.items.find(role => role.key === 'admin')?.permissions).toHaveLength(
      PERMISSION_ACTIONS.length * PERMISSION_SUBJECTS.length,
    )
    expect(roles.items.find(role => role.key === 'editor')?.dataScope.scope).toBe(
      'departmentTree',
    )
  })

  it('rejects role reads from non-administrators at the API boundary', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))

    await expect(get<RoleListResponse>('/roles')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('uses the RolePolicy grant for both page data and policy writes', async () => {
    await put<RoleDefinition>('/roles/editor', {
      permissions: [
        { action: 'read', subject: 'Dashboard' },
        { action: 'read', subject: 'RolePolicy' },
        { action: 'update', subject: 'RolePolicy' },
      ],
      dataScope: { scope: 'departmentTree' },
    })
    sessionStorage.setItem('auth_token', generateMockToken(2))

    await expect(get<RoleListResponse>('/roles')).resolves.toMatchObject({
      items: expect.arrayContaining([expect.objectContaining({ key: 'editor' })]),
    })
    await expect(
      put<RoleDefinition>('/roles/viewer', {
        permissions: [{ action: 'read', subject: 'Dashboard' }],
        dataScope: { scope: 'self' },
      }),
    ).resolves.toMatchObject({ key: 'viewer' })
  })

  it('rejects admin policies missing either recovery permission without changing the role', async () => {
    const invalidPermissionSets: RoleDefinition['permissions'][] = [
      [{ action: 'update', subject: 'RolePolicy' }],
      [{ action: 'read', subject: 'RolePolicy' }],
      [],
    ]

    for (const permissions of invalidPermissionSets) {
      await expect(
        put<RoleDefinition>('/roles/admin', {
          permissions,
          dataScope: { scope: 'all' },
        }),
      ).rejects.toMatchObject({
        code: 'ADMIN_ROLE_RECOVERY_REQUIRED',
        status: 409,
      })
    }

    const roles = await get<RoleListResponse>('/roles')
    expect(roles.items.find(role => role.key === 'admin')?.permissions).toHaveLength(
      PERMISSION_ACTIONS.length * PERMISSION_SUBJECTS.length,
    )
  })

  it('preserves the admin recovery invariant for direct policy-state callers', () => {
    expect(
      updateRolePolicy('admin', {
        permissions: [{ action: 'read', subject: 'RolePolicy' }],
        dataScope: { scope: 'self' },
      }),
    ).toBeUndefined()

    const adminRole = getRoleDefinitions().find(role => role.key === 'admin')
    expect(adminRole?.permissions).toHaveLength(
      PERMISSION_ACTIONS.length * PERMISSION_SUBJECTS.length,
    )
    expect(adminRole?.dataScope).toEqual({ scope: 'all' })
  })

  it('allows admin policy updates that retain the complete recovery path', async () => {
    const recoveryPermissions: RoleDefinition['permissions'] = [
      { action: 'read', subject: 'RolePolicy' },
      { action: 'update', subject: 'RolePolicy' },
    ]

    const updatedRole = await put<RoleDefinition>('/roles/admin', {
      permissions: recoveryPermissions,
      dataScope: { scope: 'all' },
    })
    expect(updatedRole.permissions).toEqual(recoveryPermissions)
    await expect(get<RoleListResponse>('/roles')).resolves.toBeDefined()
    await expect(
      put<RoleDefinition>('/roles/admin', {
        permissions: [...recoveryPermissions, { action: 'read', subject: 'Dashboard' }],
        dataScope: { scope: 'all' },
      }),
    ).resolves.toMatchObject({
      permissions: expect.arrayContaining(recoveryPermissions),
    })
  })

  it('updates a role policy and applies it to future ability checks', async () => {
    const updatedRole = await put<RoleDefinition>('/roles/editor', {
      permissions: [
        { action: 'read', subject: 'Dashboard' },
        { action: 'read', subject: 'Settings' },
      ],
      dataScope: { scope: 'departmentTree' },
    })

    expect(updatedRole.permissions).toEqual([
      { action: 'read', subject: 'Dashboard' },
      { action: 'read', subject: 'Settings' },
    ])

    const editorUser = {
      id: 2,
      name: 'Editor',
      email: 'editor@example.com',
      role: 'editor',
      status: 'active',
      createdAt: '2026-01-01T08:00:00.000Z',
    } as const
    const editorAuthorization = getRoleAuthorizationSnapshot(editorUser.role)
    const editorAbility = defineAbilityFor(editorUser, editorAuthorization)
    expect(editorAbility.can('read', 'Settings')).toBe(true)
    expect(editorAbility.can('create', 'Content')).toBe(false)

    updateAbility(editorUser, editorAuthorization)
    expect(appAbility.can('read', 'Settings')).toBe(true)
  })

  it('updates custom data scope and applies it at the user API boundary', async () => {
    const updatedRole = await put<RoleDefinition>('/roles/editor', {
      permissions: [
        { action: 'read', subject: 'Dashboard' },
        { action: 'read', subject: 'User' },
      ],
      dataScope: { scope: 'custom', departmentIds: ['finance'] },
    })
    expect(updatedRole.dataScope).toEqual({ scope: 'custom', departmentIds: ['finance'] })

    sessionStorage.setItem('auth_token', generateMockToken(2))
    const users = await get<import('@/features/users/types').UserListResponse>('/users')
    expect(users.items).toHaveLength(2)
    expect(users.items.map(user => user.id).sort()).toEqual([3, 8])
    expect(users.items.every(user => user.departmentId === undefined)).toBe(true)
  })

  it('rejects custom scopes with unknown departments', async () => {
    await expect(
      put('/roles/editor', {
        permissions: [{ action: 'read', subject: 'User' }],
        dataScope: { scope: 'custom', departmentIds: ['missing-department'] },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_DATA_SCOPE', status: 400 })
  })
})

describe('role permission matrix modes', () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale('en-US')
  })
  afterEach(() => localStorage.clear())

  const editorRole: RoleDefinition = {
    key: 'editor',
    permissions: [
      { action: 'read', subject: 'Dashboard' },
      { action: 'update', subject: 'Content' },
    ],
    dataScope: { scope: 'departmentTree' },
  }

  function getButtonByText(wrapper: VueWrapper, label: string) {
    const button = wrapper.findAll('button').find(candidate => candidate.text().includes(label))
    if (!button)
      throw new Error(`Missing button: ${label}`)
    return button
  }

  it('supports editable bulk grant and clear operations through the public save event', async () => {
    const wrapper = mount(RolePermissionMatrix, {
      props: {
        role: editorRole,
        canEdit: true,
        isSaving: false,
        departments: [],
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.get('[data-testid="role-policy-layers"]').text()).toContain('Route')
    await getButtonByText(wrapper, 'Clear all').trigger('click')
    await getButtonByText(wrapper, 'Save role policy').trigger('click')
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ permissions: [] })

    await getButtonByText(wrapper, 'Grant all').trigger('click')
    await getButtonByText(wrapper, 'Save role policy').trigger('click')
    const saveEvents = wrapper.emitted('save') as [UpdateRolePolicyInput][] | undefined
    const grantedPolicy = saveEvents?.[1]?.[0]
    expect(grantedPolicy?.permissions).toHaveLength(
      PERMISSION_ACTIONS.length * PERMISSION_SUBJECTS.length,
    )
  })

  it('locks the admin recovery grants and retains them when clearing the policy', async () => {
    const adminRole: RoleDefinition = {
      key: 'admin',
      permissions: [
        { action: 'read', subject: 'Dashboard' },
        { action: 'read', subject: 'RolePolicy' },
        { action: 'update', subject: 'RolePolicy' },
      ],
      dataScope: { scope: 'all' },
    }
    const wrapper = mount(RolePermissionMatrix, {
      props: {
        role: adminRole,
        canEdit: true,
        isSaving: false,
        departments: [],
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('must retain read and update access to role policies')
    expect(wrapper.get('#admin-read-RolePolicy').attributes('disabled')).toBeDefined()
    expect(wrapper.get('#admin-update-RolePolicy').attributes('disabled')).toBeDefined()

    await getButtonByText(wrapper, 'Clear all').trigger('click')
    await getButtonByText(wrapper, 'Save role policy').trigger('click')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      permissions: [
        { action: 'read', subject: 'RolePolicy' },
        { action: 'update', subject: 'RolePolicy' },
      ],
      dataScope: { scope: 'all' },
    })
  })

  it('renders reviewer matrices as read-only', async () => {
    const reviewerWrapper = mount(RolePermissionMatrix, {
      props: {
        role: editorRole,
        canEdit: false,
        isSaving: false,
        departments: [],
      },
      global: { plugins: [i18n] },
    })
    expect(reviewerWrapper.text()).toContain('can review this policy but cannot modify it')
    expect(getButtonByText(reviewerWrapper, 'Grant all').attributes('disabled')).toBeDefined()
  })

  it('refreshes ability, menus, routes, and the current page when the active role changes', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(1))
    await put<RoleDefinition>('/roles/editor', {
      permissions: [
        { action: 'read', subject: 'Dashboard' },
        { action: 'read', subject: 'Settings' },
        { action: 'read', subject: 'RolePolicy' },
        { action: 'update', subject: 'RolePolicy' },
      ],
      dataScope: { scope: 'departmentTree' },
    })

    const pinia = createPinia()
    setActivePinia(pinia)
    const authStore = useAuthStore()
    authStore.setToken(generateMockToken(2))
    const editorUser = {
      id: 2,
      name: 'Editor',
      email: 'editor@example.com',
      role: 'editor',
      status: 'active',
      departmentId: 'product',
      departmentPath: 'company/product',
      createdAt: '2026-01-01T08:00:00.000Z',
    } as const
    authStore.setAuthenticatedPrincipal({
      tenantId: null,
      user: editorUser,
      authorization: getRoleAuthorizationSnapshot(editorUser.role),
    })
    await nextTick()

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'admin-root',
          component: RouterView,
          children: [
            {
              path: 'forbidden',
              name: 'forbidden',
              component: { template: '<div>Forbidden</div>' },
            },
            {
              path: ':pathMatch(.*)*',
              name: 'admin-not-found',
              component: { template: '<div>Not found</div>' },
            },
          ],
        },
      ],
    })
    const permissionStore = usePermissionStore()
    await permissionStore.loadNavigation(router, '2:editor')
    await router.push('/roles')
    expect(router.currentRoute.value.name).toBe('roles')

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = mount(RolesWorkspace, {
      global: {
        plugins: [pinia, router, i18n, [VueQueryPlugin, { queryClient }]],
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Super Administrator')
    expect(wrapper.text()).toContain('Full access')

    // AI modified: simulate a real backend response that cannot mutate the browser's policy memory.
    server.use(
      http.put('/api/roles/editor', () =>
        HttpResponse.json({
          code: 0,
          message: 'updated',
          data: {
            key: 'editor',
            permissions: [],
            dataScope: { scope: 'departmentTree' },
          } satisfies RoleDefinition,
        })),
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          code: 0,
          message: 'success',
          data: {
            tenantId: null,
            user: editorUser,
            authorization: {
              contractVersion: 1,
              policyVersion: 'server-policy-revoked',
              grants: [],
              dataScope: { scope: 'departmentTree' },
            },
          } satisfies AuthenticatedPrincipal,
        })),
    )

    await getButtonByText(wrapper, 'Content Editor').trigger('click')
    await getButtonByText(wrapper, 'Clear all').trigger('click')
    await getButtonByText(wrapper, 'Save role policy').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(appAbility.can('read', 'RolePolicy')).toBe(false)
    expect(router.hasRoute('roles')).toBe(false)
    expect(useMenuStore().visibleMenuLeaves.some(menu => menu.to === '/roles')).toBe(false)
    expect(router.currentRoute.value.name).toBe('forbidden')
  })
})
