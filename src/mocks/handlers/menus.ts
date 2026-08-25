import type {
  ManagedMenuTargetDecision,
  ManagedMenuTargetFields,
} from '@/features/menus/menu-target-contract'
import type {
  ManagedMenuIconKey,
  ManagedMenuInput,
  ManagedMenuListResponse,
  ManagedMenuRecord,
} from '@/features/menus/types'
import type { BackendMenuNode } from '@/features/navigation'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { MANAGED_MENU_INPUT_SCHEMA } from '@/features/menus/menu-api-contracts'
import { canManagedMenuHaveChildren } from '@/features/menus/menu-hierarchy'
import { getManagedMenuTargetDecision } from '@/features/menus/menu-target-contract'
import { navigationAllowedOrigins } from '@/features/navigation/navigation-url-policy'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'

const initialManagedMenus: ManagedMenuRecord[] = [
  {
    id: 'form-workbench',
    parentId: null,
    titleKey: 'nav.formWorkbench',
    kind: 'menu',
    path: '/form-workbench',
    routeName: 'form-workbench',
    componentKey: 'form-workbench',
    requiredAbility: { action: 'read', subject: 'Content' },
    permissionIdentifier: 'workspace:form:read',
    hidden: false,
    order: 25,
  },
  {
    id: 'content-admin',
    parentId: null,
    titleKey: 'nav.contentAdmin',
    kind: 'menu',
    path: '/content-admin',
    routeName: 'content-admin',
    componentKey: 'content-admin',
    requiredAbility: { action: 'read', subject: 'Content' },
    permissionIdentifier: 'content:administration:read',
    hidden: false,
    order: 27,
  },
  {
    id: 'administration',
    parentId: null,
    titleKey: 'nav.administration',
    kind: 'menu',
    path: '',
    routeName: '',
    componentKey: '',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:administration:read',
    hidden: false,
    order: 30,
  },
  {
    id: 'users',
    parentId: 'administration',
    titleKey: 'nav.users',
    kind: 'menu',
    path: '/users',
    routeName: 'users',
    componentKey: 'users',
    requiredAbility: { action: 'read', subject: 'User' },
    permissionIdentifier: 'system:user:read',
    hidden: false,
    order: 10,
  },
  {
    id: 'roles',
    parentId: 'administration',
    titleKey: 'nav.roles',
    kind: 'menu',
    path: '/roles',
    routeName: 'roles',
    componentKey: 'roles',
    requiredAbility: { action: 'read', subject: 'RolePolicy' },
    permissionIdentifier: 'system:role:read',
    hidden: false,
    order: 20,
  },
  {
    id: 'departments',
    parentId: 'administration',
    titleKey: 'nav.departments',
    kind: 'menu',
    path: '/departments',
    routeName: 'departments',
    componentKey: 'departments',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:department:read',
    hidden: false,
    order: 30,
  },
  {
    id: 'positions',
    parentId: 'administration',
    titleKey: 'nav.positions',
    kind: 'menu',
    path: '/positions',
    routeName: 'positions',
    componentKey: 'positions',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:position:read',
    hidden: false,
    order: 40,
  },
  {
    id: 'menus',
    parentId: 'administration',
    titleKey: 'nav.menus',
    kind: 'menu',
    path: '/menus',
    routeName: 'menus',
    componentKey: 'menus',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:menu:read',
    hidden: false,
    order: 50,
  },
  {
    id: 'dictionaries',
    parentId: 'administration',
    titleKey: 'nav.dictionaries',
    kind: 'menu',
    path: '/dictionaries',
    routeName: 'dictionaries',
    componentKey: 'dictionaries',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:dictionary:read',
    hidden: false,
    order: 60,
  },
  {
    id: 'system-config',
    parentId: 'administration',
    titleKey: 'nav.systemConfig',
    kind: 'menu',
    path: '/system-config',
    routeName: 'system-config',
    componentKey: 'system-config',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:config:read',
    hidden: false,
    order: 70,
  },
  {
    id: 'system-parameters',
    parentId: 'administration',
    titleKey: 'nav.systemParameters',
    kind: 'menu',
    path: '/system-config/parameters',
    routeName: 'system-parameters',
    componentKey: 'system-parameters',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:parameter:read',
    hidden: false,
    order: 80,
  },
  // AI modified: the default fixture proves that real navigation remains usable through four levels.
  {
    id: 'security-center',
    parentId: 'administration',
    titleKey: 'nav.securityCenter',
    kind: 'menu',
    path: '',
    routeName: '',
    componentKey: '',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:security:read',
    hidden: false,
    order: 90,
  },
  {
    id: 'audit-controls',
    parentId: 'security-center',
    titleKey: 'nav.auditControls',
    kind: 'menu',
    path: '',
    routeName: '',
    componentKey: '',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:audit:read',
    hidden: false,
    order: 10,
  },
  {
    id: 'audit-events',
    parentId: 'audit-controls',
    titleKey: 'nav.auditEvents',
    kind: 'menu',
    path: '/system-config/audit-events',
    routeName: 'audit-events',
    componentKey: 'system-config',
    requiredAbility: { action: 'read', subject: 'Settings' },
    permissionIdentifier: 'system:audit-event:read',
    hidden: false,
    order: 10,
  },
  {
    id: 'monitoring',
    parentId: null,
    titleKey: 'nav.monitoring',
    kind: 'menu',
    path: '/monitoring',
    routeName: 'monitoring',
    componentKey: 'monitoring',
    requiredAbility: { action: 'read', subject: 'Monitoring' },
    permissionIdentifier: 'system:monitoring:read',
    hidden: false,
    order: 35,
  },
  {
    id: 'audit-logs',
    parentId: null,
    titleKey: 'nav.auditLogs',
    kind: 'menu',
    path: '/audit-logs',
    routeName: 'audit-logs',
    componentKey: 'audit-logs',
    requiredAbility: { action: 'read', subject: 'AuditLog' },
    permissionIdentifier: 'system:audit-log:read',
    icon: 'content-admin',
    hidden: false,
    order: 36,
  },
]

const mockManagedMenus: ManagedMenuRecord[] = initialManagedMenus.map(menu => ({
  ...menu,
  requiredAbility: menu.requiredAbility ? { ...menu.requiredAbility } : undefined,
}))
let nextManagedMenuId = 1
const MAX_MOCK_MANAGED_MENUS = 500

const menuPresentationByComponent: Partial<
  Record<string, { icon: ManagedMenuIconKey, cacheKey: string }>
> = {
  'form-workbench': { icon: 'form-workbench', cacheKey: 'FormWorkbenchPage' },
  'content-admin': { icon: 'content-admin', cacheKey: 'ContentAdminPage' },
  // AI modified: the dedicated audit route participates in dynamic KeepAlive metadata.
  'audit-logs': { icon: 'content-admin', cacheKey: 'AuditLogsPage' },
  'users': { icon: 'users', cacheKey: 'UsersPage' },
  'roles': { icon: 'roles', cacheKey: 'RolesPage' },
  'departments': { icon: 'departments', cacheKey: 'DepartmentsPage' },
  'positions': { icon: 'positions', cacheKey: 'PositionsPage' },
  'menus': { icon: 'menus', cacheKey: 'MenusPage' },
  'dictionaries': { icon: 'dictionaries', cacheKey: 'DictionariesPage' },
  'system-config': { icon: 'system-config', cacheKey: 'SystemConfigPage' },
  'system-parameters': { icon: 'system-config', cacheKey: 'SystemParametersPage' },
  'monitoring': { icon: 'monitoring', cacheKey: 'MonitoringPage' },
}

function copyManagedMenu(menu: ManagedMenuRecord): ManagedMenuRecord {
  const presentation = menuPresentationByComponent[menu.componentKey]
  return {
    ...menu,
    targetUrl: menu.targetUrl ?? '',
    icon: menu.icon ?? presentation?.icon ?? (menu.id === 'administration' ? 'roles' : undefined),
    keepAlive: menu.keepAlive ?? Boolean(presentation),
    requiredAbility: menu.requiredAbility ? { ...menu.requiredAbility } : undefined,
  }
}

function getManagedMenuNode(menu: ManagedMenuRecord): BackendMenuNode {
  const children = mockManagedMenus
    .filter(candidate => candidate.parentId === menu.id)
    .map(getManagedMenuNode)
  const presentation = menuPresentationByComponent[menu.componentKey]

  return {
    id: menu.id,
    kind: menu.kind,
    titleKey: menu.titleKey,
    path: menu.kind === 'external' ? undefined : menu.path || undefined,
    routeName: menu.routeName || undefined,
    componentKey: menu.componentKey || undefined,
    externalUrl: menu.kind === 'external' ? menu.targetUrl || undefined : undefined,
    iframeUrl: menu.kind === 'iframe' ? menu.targetUrl || undefined : undefined,
    icon: menu.icon ?? presentation?.icon ?? (menu.id === 'administration' ? 'roles' : undefined),
    hidden: menu.hidden,
    order: menu.order,
    keepAlive: menu.keepAlive ?? Boolean(presentation),
    cacheKey: (menu.keepAlive ?? Boolean(presentation)) ? presentation?.cacheKey : undefined,
    requiredAbility: menu.requiredAbility ? { ...menu.requiredAbility } : undefined,
    permissionIdentifier: menu.permissionIdentifier,
    children: children.length ? children : undefined,
  }
}

/** Projects the editable backend records into the exact contract consumed by dynamic routing. */
export function getManagedBackendMenus(): BackendMenuNode[] {
  // AI modified: navigation now reads the same mutable source as menu management.
  return mockManagedMenus.filter(menu => menu.parentId === null).map(getManagedMenuNode)
}

function getManagedMenu(menuId: string | readonly string[]): ManagedMenuRecord | undefined {
  return mockManagedMenus.find(menu => menu.id === String(menuId))
}

function menuBranchContains(menuId: string, candidateId: string): boolean {
  const pendingMenuIds = [menuId]
  const visitedMenuIds = new Set<string>()
  while (pendingMenuIds.length > 0) {
    const parentId = pendingMenuIds.pop()
    if (!parentId || visitedMenuIds.has(parentId))
      continue
    visitedMenuIds.add(parentId)
    for (const childMenu of mockManagedMenus.filter(menu => menu.parentId === parentId)) {
      if (childMenu.id === candidateId)
        return true
      pendingMenuIds.push(childMenu.id)
    }
  }
  return false
}

function invalidMenuTargetResponse(fieldErrors: ManagedMenuTargetDecision['fieldErrors']) {
  return HttpResponse.json<ApiResponse<{ fieldErrors: ManagedMenuTargetDecision['fieldErrors'] }>>(
    {
      code: 'MENU_TARGET_INVALID',
      message: '菜单目标字段契约无效',
      data: { fieldErrors },
    },
    { status: 422 },
  )
}

function invalidMenuPlacementResponse(
  fieldErrors: Partial<Record<'order' | 'parentId', string>>,
  code = 'MENU_PLACEMENT_INVALID',
) {
  return HttpResponse.json<ApiResponse<{ fieldErrors: typeof fieldErrors }>>(
    {
      code,
      message: '菜单层级或同级顺序无效',
      data: { fieldErrors },
    },
    { status: 422 },
  )
}

// AI modified: the API rechecks parent capability and sibling order to close stale-editor races.
function getMenuPlacementResponse(input: ManagedMenuInput, menuId?: string) {
  if (input.parentId) {
    const parentMenu = getManagedMenu(input.parentId)
    if (!parentMenu)
      return invalidMenuPlacementResponse({ parentId: 'MENU_PARENT_NOT_FOUND' })
    if (!canManagedMenuHaveChildren(parentMenu))
      return invalidMenuPlacementResponse({ parentId: 'MENU_PARENT_CANNOT_HAVE_CHILDREN' })
  }

  const hasOrderConflict = mockManagedMenus.some(
    menu => menu.id !== menuId && menu.parentId === input.parentId && menu.order === input.order,
  )
  return hasOrderConflict
    ? invalidMenuPlacementResponse({ order: 'MENU_ORDER_CONFLICT' })
    : undefined
}

function getMenuTargetDecision(
  input: ManagedMenuTargetFields,
  requestUrl: string,
): ManagedMenuTargetDecision {
  // AI modified: Mock persistence consumes the same target and URL policy as the editor.
  return getManagedMenuTargetDecision(input, {
    baseOrigin: new URL(requestUrl).origin,
    allowedOrigins: navigationAllowedOrigins,
  })
}

export function resetMockManagedMenus(): void {
  mockManagedMenus.splice(
    0,
    mockManagedMenus.length,
    ...initialManagedMenus.map(menu => copyManagedMenu(menu)),
  )
  nextManagedMenuId = 1
}

export const listManagedMenusHandler = http.get('/api/system-menus', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'Settings')
  if (!authentication.isAuthenticated)
    return authentication.response

  return HttpResponse.json<ApiResponse<ManagedMenuListResponse>>({
    code: 0,
    message: 'success',
    data: { items: mockManagedMenus.map(copyManagedMenu) },
  })
})

export const createManagedMenuHandler = http.post<never, ManagedMenuInput>(
  '/api/system-menus',
  async ({ request }) => {
    // AI modified: menu configuration honors the editable Settings action policy.
    const authentication = authorizeMockPermission(request, 'create', 'Settings')
    if (!authentication.isAuthenticated)
      return authentication.response

    const requestBody = await readMockJsonBody(request, MANAGED_MENU_INPUT_SCHEMA, {
      code: 'INVALID_MENU',
      message: '菜单或权限标识契约无效',
    })
    if (!requestBody.isValid)
      return requestBody.response
    const input = requestBody.body
    const targetDecision = getMenuTargetDecision(input, request.url)
    if (!targetDecision.isValid)
      return invalidMenuTargetResponse(targetDecision.fieldErrors)
    const placementResponse = getMenuPlacementResponse(input)
    if (placementResponse)
      return placementResponse
    if (mockManagedMenus.length >= MAX_MOCK_MANAGED_MENUS) {
      // AI modified: menu creation cannot exceed the navigation and management response budgets.
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'MENU_CAPACITY_REACHED', message: '菜单数量已达到演示环境上限', data: null },
        { status: 409 },
      )
    }

    const menu: ManagedMenuRecord = {
      id: `managed-menu-${nextManagedMenuId++}`,
      ...input,
      titleKey: input.titleKey.trim(),
      path: input.path.trim(),
      targetUrl: input.targetUrl.trim(),
      routeName: input.routeName.trim(),
      permissionIdentifier: input.permissionIdentifier.trim(),
      requiredAbility: input.requiredAbility ? { ...input.requiredAbility } : undefined,
    }
    mockManagedMenus.push(menu)
    return HttpResponse.json<ApiResponse<ManagedMenuRecord>>({
      code: 0,
      message: 'created',
      data: copyManagedMenu(menu),
    })
  },
)

export const updateManagedMenuHandler = http.put<{ menuId: string }, ManagedMenuInput>(
  '/api/system-menus/:menuId',
  async ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'update', 'Settings')
    if (!authentication.isAuthenticated)
      return authentication.response

    const menu = getManagedMenu(params.menuId)
    if (!menu) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'MENU_NOT_FOUND', message: '菜单不存在', data: null },
        { status: 404 },
      )
    }

    const requestBody = await readMockJsonBody(request, MANAGED_MENU_INPUT_SCHEMA, {
      code: 'INVALID_MENU',
      message: '菜单或权限标识契约无效',
    })
    if (!requestBody.isValid)
      return requestBody.response
    const input = requestBody.body
    const targetDecision = getMenuTargetDecision(input, request.url)
    if (!targetDecision.isValid)
      return invalidMenuTargetResponse(targetDecision.fieldErrors)
    if (
      input.parentId === menu.id
      || (input.parentId && menuBranchContains(menu.id, input.parentId))
    ) {
      return invalidMenuPlacementResponse({ parentId: 'MENU_CYCLE' }, 'MENU_CYCLE')
    }
    const placementResponse = getMenuPlacementResponse(input, menu.id)
    if (placementResponse)
      return placementResponse
    const hasChildren = mockManagedMenus.some(candidate => candidate.parentId === menu.id)
    const remainsGroup
      = input.kind === 'menu' && !input.path.trim() && !input.routeName.trim() && !input.componentKey
    if (hasChildren && !remainsGroup) {
      return invalidMenuPlacementResponse(
        { parentId: 'MENU_PARENT_TARGET_CONFLICT' },
        'MENU_PARENT_TARGET_CONFLICT',
      )
    }

    Object.assign(menu, {
      ...input,
      titleKey: input.titleKey.trim(),
      path: input.path.trim(),
      targetUrl: input.targetUrl.trim(),
      routeName: input.routeName.trim(),
      permissionIdentifier: input.permissionIdentifier.trim(),
      requiredAbility: input.requiredAbility ? { ...input.requiredAbility } : undefined,
    })
    return HttpResponse.json<ApiResponse<ManagedMenuRecord>>({
      code: 0,
      message: 'updated',
      data: copyManagedMenu(menu),
    })
  },
)

export const deleteManagedMenuHandler = http.delete<{ menuId: string }>(
  '/api/system-menus/:menuId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'delete', 'Settings')
    if (!authentication.isAuthenticated)
      return authentication.response

    const menu = getManagedMenu(params.menuId)
    if (!menu) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'MENU_NOT_FOUND', message: '菜单不存在', data: null },
        { status: 404 },
      )
    }
    if (mockManagedMenus.some(candidate => candidate.parentId === menu.id)) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'MENU_HAS_CHILDREN', message: '请先处理下级菜单', data: null },
        { status: 409 },
      )
    }

    mockManagedMenus.splice(mockManagedMenus.indexOf(menu), 1)
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'deleted', data: null })
  },
)

export const managedMenuHandlers = [
  listManagedMenusHandler,
  createManagedMenuHandler,
  updateManagedMenuHandler,
  deleteManagedMenuHandler,
]
