import type {
  BackendMenuNode,
  NavigationAbilityRequirement,
  NavigationMenuNode,
  NavigationRouteCandidate,
  ResolvedNavigationTree,
} from './types'
import type { AppAbility, AppAction, AppSubject } from '@/lib/ability'
import IframePage from './IframePage.vue'
import { getNavigationRoutePath, isNavigationRouteName } from './navigation-route-policy'
import {
  evaluateNavigationUrl,
  iframeNavigationAllowedOrigins,
  navigationAllowedOrigins,
} from './navigation-url-policy'
import { BACKEND_MENU_KINDS, MAX_NAVIGATION_DEPTH, MAX_NAVIGATION_NODES } from './types'

const navigationComponents = {
  'dashboard': () => import('@/pages/admin/DashboardPage.vue'),
  'message-center': () => import('@/pages/admin/MessageCenterPage.vue'),
  'components': () => import('@/pages/admin/ComponentsPage.vue'),
  'form-workbench': () => import('@/pages/admin/FormWorkbenchPage.vue'),
  'content-admin': () => import('@/pages/admin/ContentAdminPage.vue'),
  // AI modified: audit readers receive a dedicated allow-listed route without Content access.
  'audit-logs': () => import('@/pages/admin/AuditLogsPage.vue'),
  'users': () => import('@/pages/admin/UsersPage.vue'),
  'roles': () => import('@/pages/admin/RolesPage.vue'),
  'departments': () => import('@/pages/admin/DepartmentsPage.vue'),
  'positions': () => import('@/pages/admin/PositionsPage.vue'),
  'menus': () => import('@/pages/admin/MenusPage.vue'),
  'dictionaries': () => import('@/pages/admin/DictionariesPage.vue'),
  // AI modified: backend menus can select this page only through the fixed local registry.
  'system-config': () => import('@/pages/admin/SystemConfigPage.vue'),
  'system-parameters': () => import('@/pages/admin/SystemParametersPage.vue'),
  // AI modified: monitoring remains backend-driven without accepting arbitrary import paths.
  'monitoring': () => import('@/pages/admin/MonitoringPage.vue'),
  'profile': () => import('@/pages/account/ProfilePage.vue'),
  'change-password': () => import('@/pages/account/ChangePasswordPage.vue'),
  'iframe': IframePage,
} as const

export type NavigationComponentKey = keyof typeof navigationComponents

const navigationComponentKeys = new Set<string>(Object.keys(navigationComponents))
const navigationMenuKinds = new Set<string>(BACKEND_MENU_KINDS)
const navigationActions = new Set<AppAction>(['manage', 'read', 'create', 'update', 'delete'])
const navigationSubjects = new Set<AppSubject>([
  'all',
  'Dashboard',
  'User',
  'Content',
  'Analytics',
  'Settings',
  'RolePolicy',
  'Monitoring',
  'AuditLog',
])
interface NavigationTreeContext {
  ability: AppAbility
  parentPath: string
  breadcrumbs: Array<{ labelKey: string, to?: string }>
  routeNames: Set<string>
  routePaths: Set<string>
  deniedPaths: Set<string>
  menuIds: Set<string>
  visitedNodes: WeakSet<BackendMenuNode>
  depth: number
  nodeBudget: { remaining: number }
}

interface ResolvedNavigationBranch {
  menus: NavigationMenuNode[]
  routes: NavigationRouteCandidate[]
}

function isNavigationComponentKey(componentKey: string): componentKey is NavigationComponentKey {
  return navigationComponentKeys.has(componentKey)
}

function getAbilityRequirement(
  requirement: NavigationAbilityRequirement | undefined,
): NavigationAbilityRequirement | undefined {
  if (!requirement)
    return undefined

  if (!navigationActions.has(requirement.action) || !navigationSubjects.has(requirement.subject))
    return undefined

  return { action: requirement.action, subject: requirement.subject }
}

function hasValidAbilityContract(requirement: NavigationAbilityRequirement | undefined): boolean {
  return requirement === undefined || getAbilityRequirement(requirement) !== undefined
}

function getPermissionIdentifier(permissionIdentifier: string | undefined): string | undefined {
  if (!permissionIdentifier)
    return undefined
  return /^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*){2,}$/.test(permissionIdentifier)
    ? permissionIdentifier
    : undefined
}

function getSafeHttpUrl(
  url: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): string | undefined {
  const navigationDecision = evaluateNavigationUrl(url, {
    baseOrigin: typeof window === 'undefined' ? undefined : window.location.origin,
    allowedOrigins,
  })

  // AI modified: runtime navigation now uses the same parsed-origin policy as save validation.
  return navigationDecision.isAllowed ? navigationDecision.safeUrl : undefined
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean'
}

function isOptionalOrder(value: unknown): value is number | undefined {
  return value === undefined || (Number.isInteger(value) && (value as number) >= 0)
}

function isBackendMenuNode(value: unknown): value is BackendMenuNode {
  if (typeof value !== 'object' || value === null)
    return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string'
    && typeof candidate.titleKey === 'string'
    && typeof candidate.kind === 'string'
    && navigationMenuKinds.has(candidate.kind)
    && isOptionalString(candidate.path)
    && isOptionalString(candidate.routeName)
    && isOptionalString(candidate.componentKey)
    && isOptionalString(candidate.icon)
    && isOptionalString(candidate.externalUrl)
    && isOptionalString(candidate.iframeUrl)
    && isOptionalBoolean(candidate.hidden)
    && isOptionalOrder(candidate.order)
    && isOptionalBoolean(candidate.keepAlive)
    && isOptionalString(candidate.cacheKey)
    && isOptionalString(candidate.permissionIdentifier)
    && (candidate.children === undefined || Array.isArray(candidate.children))
  )
}

function getNavigationComponent(componentKey: string | undefined) {
  if (!componentKey || !isNavigationComponentKey(componentKey))
    return undefined

  return navigationComponents[componentKey]
}

function addProtectedPaths(
  backendNode: BackendMenuNode,
  parentPath: string,
  deniedPaths: Set<string>,
): void {
  const pendingNodes: Array<{ node: BackendMenuNode, parentPath: string }> = [
    { node: backendNode, parentPath },
  ]
  const visitedNodes = new WeakSet<BackendMenuNode>()
  let remainingNodes = MAX_NAVIGATION_NODES

  while (pendingNodes.length > 0 && remainingNodes > 0) {
    const current = pendingNodes.pop()
    if (!current || visitedNodes.has(current.node))
      continue
    visitedNodes.add(current.node)
    remainingNodes -= 1

    const fullPath = getNavigationRoutePath(current.node.path, current.parentPath)
    if (fullPath && typeof current.node.routeName === 'string' && current.node.routeName.trim())
      deniedPaths.add(fullPath)

    const childParentPath = fullPath ?? current.parentPath
    for (const childNode of [...(current.node.children ?? [])].reverse()) {
      if (isBackendMenuNode(childNode))
        pendingNodes.push({ node: childNode, parentPath: childParentPath })
    }
  }
}

function resolveNavigationBranch(
  backendNodes: readonly unknown[],
  context: NavigationTreeContext,
): ResolvedNavigationBranch {
  if (context.depth > MAX_NAVIGATION_DEPTH || context.nodeBudget.remaining <= 0) {
    return { menus: [], routes: [] }
  }

  const menus: NavigationMenuNode[] = []
  const routes: NavigationRouteCandidate[] = []
  const orderedNodes = backendNodes
    .slice(0, MAX_NAVIGATION_NODES)
    .filter(isBackendMenuNode)
    .map((backendNode, sourceIndex) => ({ backendNode, sourceIndex }))
    .sort(
      (leftNode, rightNode) =>
        (leftNode.backendNode.order ?? 0) - (rightNode.backendNode.order ?? 0)
        || leftNode.sourceIndex - rightNode.sourceIndex,
    )

  for (const { backendNode } of orderedNodes) {
    if (context.nodeBudget.remaining <= 0)
      break
    // AI modified: one response cannot register the same menu twice or recurse through a cyclic object graph.
    if (context.visitedNodes.has(backendNode) || context.menuIds.has(backendNode.id))
      continue
    context.visitedNodes.add(backendNode)
    context.menuIds.add(backendNode.id)
    context.nodeBudget.remaining -= 1

    const permissionIdentifier = getPermissionIdentifier(backendNode.permissionIdentifier)
    if (
      !backendNode.id
      || !backendNode.titleKey
      || !hasValidAbilityContract(backendNode.requiredAbility)
      || (backendNode.permissionIdentifier !== undefined && !permissionIdentifier)
    ) {
      continue
    }

    const requiredAbility = getAbilityRequirement(backendNode.requiredAbility)
    if (requiredAbility && !context.ability.can(requiredAbility.action, requiredAbility.subject)) {
      addProtectedPaths(backendNode, context.parentPath, context.deniedPaths)
      continue
    }

    const fullPath = getNavigationRoutePath(backendNode.path, context.parentPath)
    const breadcrumb
      = backendNode.kind === 'menu' && fullPath
        ? { labelKey: backendNode.titleKey, to: fullPath }
        : { labelKey: backendNode.titleKey }
    const childBranch = resolveNavigationBranch(backendNode.children ?? [], {
      ...context,
      parentPath: fullPath ?? context.parentPath,
      breadcrumbs: [...context.breadcrumbs, breadcrumb],
      depth: context.depth + 1,
    })

    let href: string | undefined
    if (backendNode.kind === 'external') {
      href = getSafeHttpUrl(backendNode.externalUrl, navigationAllowedOrigins)
      if (!href)
        continue
    }

    let routeCandidate: NavigationRouteCandidate | undefined
    if (backendNode.kind === 'menu' || backendNode.kind === 'iframe') {
      const component = getNavigationComponent(backendNode.componentKey)
      const routeName = backendNode.routeName?.trim()
      const iframeUrl
        = backendNode.kind === 'iframe'
          ? getSafeHttpUrl(backendNode.iframeUrl, iframeNavigationAllowedOrigins)
          : undefined
      const isLeaf = childBranch.menus.length === 0

      if (isLeaf) {
        if (!fullPath || !isNavigationRouteName(routeName) || !component)
          continue
        if (backendNode.kind === 'iframe' && !iframeUrl)
          continue
        if (context.routeNames.has(routeName) || context.routePaths.has(fullPath))
          continue

        context.routeNames.add(routeName)
        context.routePaths.add(fullPath)
        const cacheKey = backendNode.cacheKey?.trim() || undefined

        // AI modified: componentKey resolves only through this registry; backend values never become import paths.
        routeCandidate = {
          routeName,
          fullPath,
          route: {
            path: fullPath.slice(1),
            name: routeName,
            component,
            meta: {
              titleKey: backendNode.titleKey,
              requiresAuth: true,
              requiredAbility: requiredAbility
                ? [requiredAbility.action, requiredAbility.subject]
                : undefined,
              permissionIdentifier,
              breadcrumb: [...context.breadcrumbs, { labelKey: backendNode.titleKey }],
              hidden: backendNode.hidden ?? false,
              order: backendNode.order ?? 0,
              icon: backendNode.icon,
              menuKind: backendNode.kind,
              keepAlive: backendNode.keepAlive ?? false,
              cacheKey,
              tab: true,
              iframeUrl,
              isDynamic: true,
            },
          },
        }
      }
    }

    const hasDestination = Boolean(routeCandidate || href)
    if (!hasDestination && childBranch.menus.length === 0)
      continue

    menus.push({
      id: backendNode.id,
      kind: backendNode.kind,
      titleKey: backendNode.titleKey,
      icon: backendNode.icon,
      hidden: backendNode.hidden ?? false,
      order: backendNode.order ?? 0,
      to: routeCandidate?.fullPath,
      href,
      routeName: routeCandidate?.routeName,
      keepAlive: backendNode.keepAlive ?? false,
      cacheKey: backendNode.cacheKey?.trim() || undefined,
      requiredAbility,
      permissionIdentifier,
      children: childBranch.menus,
    })

    if (routeCandidate)
      routes.push(routeCandidate)
    routes.push(...childBranch.routes)
  }

  return { menus, routes }
}

/**
 * Resolves the backend DTO into menu and route contracts. CASL filtering here is
 * for frontend UX only; every protected API must still authorize on the backend.
 */
export function resolveBackendNavigation(
  backendMenus: BackendMenuNode[],
  ability: AppAbility,
): ResolvedNavigationTree {
  const deniedPaths = new Set<string>()
  const resolvedBranch = resolveNavigationBranch(backendMenus, {
    ability,
    parentPath: '',
    breadcrumbs: [],
    routeNames: new Set<string>(),
    routePaths: new Set<string>(),
    deniedPaths,
    menuIds: new Set<string>(),
    visitedNodes: new WeakSet<BackendMenuNode>(),
    depth: 1,
    nodeBudget: { remaining: MAX_NAVIGATION_NODES },
  })

  return {
    menus: resolvedBranch.menus,
    routes: resolvedBranch.routes,
    deniedPaths: [...deniedPaths],
  }
}
