import type {
  ManagedMenuInput,
  ManagedMenuListResponse,
  ManagedMenuRecord,
} from '@/features/menus/types'
import type { BackendMenuResponse } from '@/features/navigation'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import MenuFormDialog from '@/features/menus/components/MenuFormDialog.vue'
import { MANAGED_MENU_INPUT_SCHEMA } from '@/features/menus/menu-api-contracts'
import {
  canManagedMenuHaveChildren,
  getManagedMenuAncestors,
  getManagedMenuOrderPreview,
  getManagedMenuRows,
} from '@/features/menus/menu-hierarchy'
import { isPermissionIdentifier } from '@/features/menus/types'
import { i18n, setLocale } from '@/i18n'
import { del, get, post, put } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { resetMockManagedMenus } from '@/mocks/handlers/menus'

const newMenu: ManagedMenuInput = {
  parentId: 'administration',
  titleKey: 'nav.auditLogs',
  kind: 'menu',
  // AI modified: this CRUD fixture stays distinct from the built-in audit-log destination.
  path: '/audit-log-archive',
  targetUrl: '',
  routeName: 'audit-log-archive',
  componentKey: 'system-parameters',
  icon: 'menus',
  requiredAbility: { action: 'read', subject: 'Settings' },
  permissionIdentifier: 'system:audit-log:read',
  hidden: true,
  keepAlive: false,
  order: 65,
}

describe('menu and permission identifier management', () => {
  beforeEach(() => {
    resetMockManagedMenus()
    localStorage.removeItem('auth_token')
    sessionStorage.setItem('auth_token', generateMockToken(1))
    setLocale('en-US')
  })
  afterEach(() => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
    document.body.innerHTML = ''
  })

  it('validates permission identifiers and exposes ordered hierarchy rows', async () => {
    expect(isPermissionIdentifier('system:menu:update')).toBe(true)
    expect(isPermissionIdentifier('menu:update')).toBe(false)
    expect(isPermissionIdentifier('System:Menu:Update')).toBe(false)

    const response = await get<ManagedMenuListResponse>('/system-menus')
    const rows = getManagedMenuRows(response.items)
    expect(rows.find(menu => menu.id === 'administration')).toMatchObject({ depth: 0 })
    expect(rows.find(menu => menu.id === 'form-workbench')).toMatchObject({ depth: 0, order: 25 })
    expect(rows.find(menu => menu.id === 'content-admin')).toMatchObject({ depth: 0, order: 27 })
    expect(rows.find(menu => menu.id === 'monitoring')).toMatchObject({ depth: 0, order: 35 })
    expect(rows.find(menu => menu.id === 'audit-logs')).toMatchObject({ depth: 0, order: 36 })
    expect(rows.find(menu => menu.id === 'departments')).toMatchObject({ depth: 1, order: 30 })
    expect(rows.find(menu => menu.id === 'security-center')).toMatchObject({
      depth: 1,
      order: 90,
    })
    expect(rows.find(menu => menu.id === 'audit-controls')).toMatchObject({ depth: 2, order: 10 })
    expect(rows.find(menu => menu.id === 'audit-events')).toMatchObject({ depth: 3, order: 10 })

    const securityCenter = response.items.find(menu => menu.id === 'security-center')
    const users = response.items.find(menu => menu.id === 'users')
    expect(securityCenter && canManagedMenuHaveChildren(securityCenter)).toBe(true)
    expect(users && canManagedMenuHaveChildren(users)).toBe(false)
    expect(
      getManagedMenuAncestors(response.items, 'audit-controls').map(menu => menu.id),
    ).toEqual(['administration', 'security-center', 'audit-controls'])
    expect(
      getManagedMenuOrderPreview(response.items, undefined, 'security-center', 20),
    ).toMatchObject({
      previousMenu: expect.objectContaining({ id: 'audit-controls' }),
      position: 2,
      siblingCount: 2,
      hasOrderConflict: false,
    })
  })

  it('shows the complete hierarchy and sibling placement in the menu editor', async () => {
    const response = await get<ManagedMenuListResponse>('/system-menus')
    const auditEvents = response.items.find(menu => menu.id === 'audit-events')
    expect(auditEvents).toBeDefined()
    if (!auditEvents)
      throw new Error('Expected the audit events fixture')

    const wrapper = mount(MenuFormDialog, {
      attachTo: document.body,
      props: {
        open: true,
        menu: auditEvents,
        menus: response.items,
        isSaving: false,
      },
      global: { plugins: [i18n] },
    })
    await nextTick()

    const preview = document.body.querySelector('[data-testid="menu-hierarchy-preview"]')
    expect(preview?.textContent).toContain('Administration')
    expect(preview?.textContent).toContain('Security Center')
    expect(preview?.textContent).toContain('Audit Controls')
    expect(preview?.textContent).toContain('nav.auditEvents')
    expect(preview?.textContent).toContain('Sibling position 1 of 1')
    wrapper.unmount()
  })

  it('creates, edits, and deletes a permission identifier contract', async () => {
    const createdMenu = await post<ManagedMenuRecord>('/system-menus', newMenu)
    expect(createdMenu).toMatchObject(newMenu)

    const updatedMenu = await put<ManagedMenuRecord>(`/system-menus/${createdMenu.id}`, {
      ...newMenu,
      permissionIdentifier: 'system:audit-log:update',
      requiredAbility: { action: 'update', subject: 'Settings' },
    })
    expect(updatedMenu).toMatchObject({
      permissionIdentifier: 'system:audit-log:update',
      requiredAbility: { action: 'update', subject: 'Settings' },
    })

    await del(`/system-menus/${createdMenu.id}`)
    const response = await get<ManagedMenuListResponse>('/system-menus')
    expect(response.items.some(menu => menu.id === createdMenu.id)).toBe(false)
  })

  it('keeps server-owned record fields out of the managed-menu wire request', () => {
    // AI modified: edit records are not wire DTOs; extra server fields must be removed before submission.
    const request = MANAGED_MENU_INPUT_SCHEMA.parse({
      ...newMenu,
      id: 'server-owned',
      createdAt: '2026-01-01T00:00:00Z',
    })
    expect(request).toEqual(newMenu)
  })

  it('projects managed changes into the live navigation endpoint', async () => {
    const response = await get<ManagedMenuListResponse>('/system-menus')
    const usersMenu = response.items.find(menu => menu.id === 'users')
    expect(usersMenu).toBeDefined()
    if (!usersMenu)
      throw new Error('Expected the managed users menu fixture')

    await put(`/system-menus/${usersMenu.id}`, {
      ...usersMenu,
      hidden: true,
      order: 5,
    })

    const navigation = await get<BackendMenuResponse>('/navigation')
    const administration = navigation.menus.find(menu => menu.id === 'administration')
    expect(administration?.children?.find(menu => menu.id === 'users')).toMatchObject({
      hidden: true,
      order: 5,
      path: '/users',
      permissionIdentifier: 'system:user:read',
    })

    const externalMenu = await post<ManagedMenuRecord>('/system-menus', {
      ...newMenu,
      parentId: null,
      kind: 'external',
      path: '',
      targetUrl: '/embedded-help.html?source=managed-menu',
      routeName: '',
      componentKey: '',
      icon: 'external',
    })
    const navigationAfterCreate = await get<BackendMenuResponse>('/navigation')
    expect(navigationAfterCreate.menus.find(menu => menu.id === externalMenu.id)).toMatchObject({
      externalUrl: '/embedded-help.html?source=managed-menu',
      icon: 'external',
    })
  })

  it('enforces mutually exclusive menu targets with field-locatable 422 errors', async () => {
    await expect(
      post('/system-menus', {
        ...newMenu,
        componentKey: '',
      }),
    ).rejects.toMatchObject({
      code: 'MENU_TARGET_INVALID',
      status: 422,
      details: { fieldErrors: { componentKey: 'COMPONENT_REQUIRED' } },
    })

    await expect(
      post('/system-menus', {
        ...newMenu,
        kind: 'external',
        targetUrl: '/embedded-help.html',
        routeName: '',
        componentKey: '',
        icon: 'external',
      }),
    ).rejects.toMatchObject({
      code: 'MENU_TARGET_INVALID',
      status: 422,
      details: { fieldErrors: { path: 'ROUTE_FIELD_NOT_ALLOWED' } },
    })

    const groupMenu = await post<ManagedMenuRecord>('/system-menus', {
      ...newMenu,
      path: '',
      routeName: '',
      componentKey: '',
    })
    expect(groupMenu).toMatchObject({ path: '', routeName: '', componentKey: '' })

    const iframeMenu = await post<ManagedMenuRecord>('/system-menus', {
      ...newMenu,
      order: 66,
      kind: 'iframe',
      path: '/embedded-audit',
      routeName: 'embedded-audit',
      componentKey: 'iframe',
      targetUrl: '/embedded-help.html?source=menu',
      icon: 'iframe',
    })
    const navigation = await get<BackendMenuResponse>('/navigation')
    const administration = navigation.menus.find(menu => menu.id === 'administration')
    expect(administration?.children?.find(menu => menu.id === iframeMenu.id)).toMatchObject({
      kind: 'iframe',
      path: '/embedded-audit',
      iframeUrl: '/embedded-help.html?source=menu',
      componentKey: 'iframe',
    })
  })

  it('rejects malformed identifiers and non-admin writes', async () => {
    await expect(
      post('/system-menus', {
        ...newMenu,
        permissionIdentifier: 'menu:read',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_MENU', status: 400 })

    await expect(
      post('/system-menus', {
        ...newMenu,
        kind: 'external',
        path: '',
        targetUrl: 'javascript:alert(1)',
        routeName: '',
        componentKey: '',
        icon: 'external',
      }),
    ).rejects.toMatchObject({
      code: 'MENU_TARGET_INVALID',
      status: 422,
      details: { fieldErrors: { targetUrl: 'UNSUPPORTED_PROTOCOL' } },
    })

    await expect(
      post('/system-menus', {
        ...newMenu,
        kind: 'external',
        path: '',
        targetUrl: 'https://evil.example/phishing',
        routeName: '',
        componentKey: '',
        icon: 'external',
      }),
    ).rejects.toMatchObject({
      code: 'MENU_TARGET_INVALID',
      status: 422,
      details: { fieldErrors: { targetUrl: 'ORIGIN_NOT_ALLOWED' } },
    })

    await expect(
      post('/system-menus', {
        ...newMenu,
        kind: 'iframe',
        targetUrl: String.raw`/\evil.example/phishing`,
        componentKey: 'iframe',
        icon: 'iframe',
      }),
    ).rejects.toMatchObject({
      code: 'MENU_TARGET_INVALID',
      status: 422,
      details: { fieldErrors: { targetUrl: 'ORIGIN_NOT_ALLOWED' } },
    })

    sessionStorage.setItem('auth_token', generateMockToken(2))
    await expect(put('/system-menus/users', newMenu)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })

    sessionStorage.setItem('auth_token', generateMockToken(3))
    await expect(del('/system-menus/users')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })

    await expect(get('/system-menus')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('returns field-locatable errors for unsafe internal route contracts', async () => {
    await expect(
      post('/system-menus', {
        ...newMenu,
        path: '/audit/../secrets',
      }),
    ).rejects.toMatchObject({
      code: 'MENU_TARGET_INVALID',
      status: 422,
      details: { fieldErrors: { path: 'INVALID_PATH' } },
    })

    await expect(
      post('/system-menus', {
        ...newMenu,
        routeName: 'audit events',
      }),
    ).rejects.toMatchObject({
      code: 'MENU_TARGET_INVALID',
      status: 422,
      details: { fieldErrors: { routeName: 'INVALID_ROUTE_NAME' } },
    })

    await expect(
      post('/system-menus', {
        ...newMenu,
        componentKey: 'remote-module',
      }),
    ).rejects.toMatchObject({
      code: 'MENU_TARGET_INVALID',
      status: 422,
      details: { fieldErrors: { componentKey: 'UNKNOWN_COMPONENT' } },
    })
  })

  it('enforces parent, cycle, and sibling order constraints at the API boundary', async () => {
    await expect(
      post('/system-menus', {
        ...newMenu,
        parentId: 'users',
      }),
    ).rejects.toMatchObject({
      code: 'MENU_PLACEMENT_INVALID',
      status: 422,
      details: { fieldErrors: { parentId: 'MENU_PARENT_CANNOT_HAVE_CHILDREN' } },
    })

    await expect(
      post('/system-menus', {
        ...newMenu,
        order: 50,
      }),
    ).rejects.toMatchObject({
      code: 'MENU_PLACEMENT_INVALID',
      status: 422,
      details: { fieldErrors: { order: 'MENU_ORDER_CONFLICT' } },
    })

    const response = await get<ManagedMenuListResponse>('/system-menus')
    const securityCenter = response.items.find(menu => menu.id === 'security-center')
    expect(securityCenter).toBeDefined()
    if (!securityCenter)
      throw new Error('Expected the security center fixture')

    await expect(
      put('/system-menus/security-center', {
        ...securityCenter,
        parentId: 'audit-controls',
        targetUrl: '',
        icon: securityCenter.icon ?? 'menus',
        keepAlive: securityCenter.keepAlive ?? false,
      }),
    ).rejects.toMatchObject({
      code: 'MENU_CYCLE',
      status: 422,
      details: { fieldErrors: { parentId: 'MENU_CYCLE' } },
    })

    await expect(
      put('/system-menus/security-center', {
        ...securityCenter,
        path: '/security-center',
        routeName: 'security-center',
        componentKey: 'system-config',
        targetUrl: '',
        icon: securityCenter.icon ?? 'menus',
        keepAlive: securityCenter.keepAlive ?? false,
      }),
    ).rejects.toMatchObject({
      code: 'MENU_PARENT_TARGET_CONFLICT',
      status: 422,
    })
  })
})
