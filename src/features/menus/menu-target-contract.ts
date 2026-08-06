import type { BackendMenuKind } from '@/features/navigation'
import type {
  NavigationUrlPolicy,
  NavigationUrlRejectionReason,
} from '@/features/navigation/navigation-url-policy'
import { MANAGED_MENU_COMPONENT_KEYS } from '@/features/menus/types'
import {
  getNavigationRoutePath,
  isNavigationRouteName,
} from '@/features/navigation/navigation-route-policy'
import { evaluateNavigationUrl } from '@/features/navigation/navigation-url-policy'
import { BACKEND_MENU_KINDS } from '@/features/navigation/types'

const managedMenuKinds = new Set<string>(BACKEND_MENU_KINDS)
const managedMenuComponentKeys = new Set<string>(MANAGED_MENU_COMPONENT_KEYS)

export type ManagedMenuTargetField = 'componentKey' | 'path' | 'routeName' | 'targetUrl'
export type ManagedMenuTargetIssue =
  | NavigationUrlRejectionReason
  | 'COMPONENT_REQUIRED'
  | 'IFRAME_COMPONENT_REQUIRED'
  | 'INVALID_PATH'
  | 'INVALID_ROUTE_NAME'
  | 'PATH_REQUIRED'
  | 'ROUTE_FIELD_NOT_ALLOWED'
  | 'ROUTE_NAME_REQUIRED'
  | 'TARGET_URL_NOT_ALLOWED_FOR_MENU'
  | 'UNKNOWN_COMPONENT'

export interface ManagedMenuTargetFields {
  kind: BackendMenuKind
  path: string
  routeName: string
  componentKey: string
  targetUrl: string
}

export interface ManagedMenuTargetDecision {
  isValid: boolean
  fieldErrors: Partial<Record<ManagedMenuTargetField, ManagedMenuTargetIssue>>
}

export function isManagedMenuTargetFields(value: unknown): value is ManagedMenuTargetFields {
  if (typeof value !== 'object' || value === null) return false
  const fields = value as Record<string, unknown>
  return (
    typeof fields.kind === 'string' &&
    managedMenuKinds.has(fields.kind) &&
    typeof fields.path === 'string' &&
    typeof fields.routeName === 'string' &&
    typeof fields.componentKey === 'string' &&
    typeof fields.targetUrl === 'string'
  )
}

function hasManagedComponent(componentKey: string): boolean {
  return managedMenuComponentKeys.has(componentKey)
}

function addInternalRouteIssues(
  fieldErrors: ManagedMenuTargetDecision['fieldErrors'],
  path: string,
  routeName: string,
  componentKey: string,
): void {
  if (path && !getNavigationRoutePath(path, '')) fieldErrors.path = 'INVALID_PATH'
  if (routeName && !isNavigationRouteName(routeName)) fieldErrors.routeName = 'INVALID_ROUTE_NAME'
  if (componentKey && !hasManagedComponent(componentKey))
    fieldErrors.componentKey = 'UNKNOWN_COMPONENT'
}

export function getManagedMenuTargetDecision(
  fields: ManagedMenuTargetFields,
  urlPolicy: NavigationUrlPolicy,
): ManagedMenuTargetDecision {
  const fieldErrors: ManagedMenuTargetDecision['fieldErrors'] = {}
  const path = fields.path.trim()
  const routeName = fields.routeName.trim()
  const componentKey = fields.componentKey.trim()
  const targetUrl = fields.targetUrl.trim()

  if (fields.kind === 'menu') {
    if (targetUrl) fieldErrors.targetUrl = 'TARGET_URL_NOT_ALLOWED_FOR_MENU'

    const routeFieldCount =
      Number(Boolean(path)) + Number(Boolean(routeName)) + Number(Boolean(componentKey))
    if (routeFieldCount > 0 && routeFieldCount < 3) {
      if (!path) fieldErrors.path = 'PATH_REQUIRED'
      if (!routeName) fieldErrors.routeName = 'ROUTE_NAME_REQUIRED'
      if (!componentKey) fieldErrors.componentKey = 'COMPONENT_REQUIRED'
    }
    if (routeFieldCount === 3) addInternalRouteIssues(fieldErrors, path, routeName, componentKey)
  } else {
    const urlDecision = evaluateNavigationUrl(targetUrl, urlPolicy)
    if (!urlDecision.isAllowed) fieldErrors.targetUrl = urlDecision.reason

    if (fields.kind === 'external') {
      if (path) fieldErrors.path = 'ROUTE_FIELD_NOT_ALLOWED'
      if (routeName) fieldErrors.routeName = 'ROUTE_FIELD_NOT_ALLOWED'
      if (componentKey) fieldErrors.componentKey = 'ROUTE_FIELD_NOT_ALLOWED'
    } else {
      if (!path) fieldErrors.path = 'PATH_REQUIRED'
      if (!routeName) fieldErrors.routeName = 'ROUTE_NAME_REQUIRED'
      if (componentKey !== 'iframe') fieldErrors.componentKey = 'IFRAME_COMPONENT_REQUIRED'
      addInternalRouteIssues(fieldErrors, path, routeName, componentKey)
    }
  }

  // AI modified: every menu kind now has one mutually exclusive target contract before persistence.
  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  }
}
