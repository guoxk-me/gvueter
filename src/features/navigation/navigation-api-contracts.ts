import type { BackendMenuResponse } from './types'
import type { AppAction, AppSubject } from '@/lib/ability'
import { z } from 'zod'
import { PERMISSION_ACTIONS, PERMISSION_SUBJECTS } from '@/features/roles'
import { BACKEND_MENU_KINDS, MAX_NAVIGATION_DEPTH, MAX_NAVIGATION_NODES } from './types'

const navigationActions = ['manage', ...PERMISSION_ACTIONS] as const satisfies readonly AppAction[]
const navigationSubjects = ['all', ...PERMISSION_SUBJECTS] as const satisfies readonly AppSubject[]
const navigationKinds = new Set<string>(BACKEND_MENU_KINDS)
const allowedActions = new Set<string>(navigationActions)
const allowedSubjects = new Set<string>(navigationSubjects)
const nodePropertyNames = new Set([
  'cacheKey',
  'children',
  'componentKey',
  'externalUrl',
  'hidden',
  'icon',
  'id',
  'iframeUrl',
  'keepAlive',
  'kind',
  'order',
  'path',
  'permissionIdentifier',
  'requiredAbility',
  'routeName',
  'titleKey',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOptionalString(value: unknown, maximumLength: number): boolean {
  return value === undefined || (typeof value === 'string' && value.length <= maximumLength)
}

function isNavigationAbility(value: unknown): boolean {
  return (
    isRecord(value)
    && Object.keys(value).every(
      propertyName => propertyName === 'action' || propertyName === 'subject',
    )
    && typeof value.action === 'string'
    && allowedActions.has(value.action)
    && typeof value.subject === 'string'
    && allowedSubjects.has(value.subject)
  )
}

function isBackendMenuResponse(value: unknown): value is BackendMenuResponse {
  if (
    !isRecord(value)
    || Object.keys(value).length !== 1
    || !Array.isArray(value.menus)
    || value.menus.length > MAX_NAVIGATION_NODES
  ) {
    return false
  }

  const pendingNodes = value.menus.map(node => ({ depth: 1, node }))
  const visitedNodes = new WeakSet<object>()
  const nodeIds = new Set<string>()
  let nodeCount = 0

  while (pendingNodes.length > 0) {
    const current = pendingNodes.pop()
    if (!current || current.depth > MAX_NAVIGATION_DEPTH || !isRecord(current.node))
      return false
    if (visitedNodes.has(current.node))
      return false
    visitedNodes.add(current.node)
    nodeCount += 1
    if (nodeCount > MAX_NAVIGATION_NODES)
      return false

    const node = current.node
    if (
      Object.keys(node).some(propertyName => !nodePropertyNames.has(propertyName))
      || typeof node.id !== 'string'
      || !node.id.trim()
      || node.id.length > 200
      || typeof node.kind !== 'string'
      || !navigationKinds.has(node.kind)
      || typeof node.titleKey !== 'string'
      || !node.titleKey.trim()
      || node.titleKey.length > 200
      || !isOptionalString(node.path, 1_000)
      || !isOptionalString(node.routeName, 200)
      || !isOptionalString(node.componentKey, 200)
      || !isOptionalString(node.icon, 200)
      || !isOptionalString(node.externalUrl, 4_000)
      || !isOptionalString(node.iframeUrl, 4_000)
      || !isOptionalString(node.cacheKey, 200)
      || !isOptionalString(node.permissionIdentifier, 300)
      || (node.hidden !== undefined && typeof node.hidden !== 'boolean')
      || (node.keepAlive !== undefined && typeof node.keepAlive !== 'boolean')
      || (node.order !== undefined && (!Number.isInteger(node.order) || (node.order as number) < 0))
      || (node.requiredAbility !== undefined && !isNavigationAbility(node.requiredAbility))
      || (node.children !== undefined && !Array.isArray(node.children))
    ) {
      return false
    }
    if (nodeIds.has(node.id))
      return false
    nodeIds.add(node.id)

    for (const childNode of node.children ?? []) {
      pendingNodes.push({ depth: current.depth + 1, node: childNode })
    }
  }

  return true
}

// AI modified: iterative validation bounds hostile depth and size before dynamic routes are registered.
export const BACKEND_MENU_RESPONSE_SCHEMA: z.ZodType<BackendMenuResponse>
  = z.custom<BackendMenuResponse>(isBackendMenuResponse, {
    message: 'Navigation exceeds its strict shape, depth, or node budget',
  })
