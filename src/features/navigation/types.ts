import type { RouteRecordRaw } from 'vue-router'
import type { AppAction, AppSubject } from '@/lib/ability'

export const BACKEND_MENU_KINDS = ['menu', 'external', 'iframe'] as const
export const MAX_NAVIGATION_DEPTH = 8
export const MAX_NAVIGATION_NODES = 500

export type BackendMenuKind = (typeof BACKEND_MENU_KINDS)[number]

export interface NavigationAbilityRequirement {
  action: AppAction
  subject: AppSubject
}

/**
 * Backend-owned navigation contract. Values are still validated at runtime because
 * an HTTP payload cannot be trusted solely because the frontend declared a type.
 */
export interface BackendMenuNode {
  id: string
  kind: BackendMenuKind
  titleKey: string
  path?: string
  routeName?: string
  componentKey?: string
  icon?: string
  externalUrl?: string
  iframeUrl?: string
  hidden?: boolean
  order?: number
  keepAlive?: boolean
  cacheKey?: string
  requiredAbility?: NavigationAbilityRequirement
  /** Stable backend authorization/audit identifier; CASL remains the frontend UX contract. */
  permissionIdentifier?: string
  children?: BackendMenuNode[]
}

export interface BackendMenuResponse {
  menus: BackendMenuNode[]
}

export interface NavigationMenuNode {
  id: string
  kind: BackendMenuKind
  titleKey: string
  icon?: string
  hidden: boolean
  order: number
  to?: string
  href?: string
  routeName?: string
  keepAlive: boolean
  cacheKey?: string
  requiredAbility?: NavigationAbilityRequirement
  permissionIdentifier?: string
  children: NavigationMenuNode[]
}

export interface NavigationRouteCandidate {
  routeName: string
  fullPath: string
  route: RouteRecordRaw
}

export interface ResolvedNavigationTree {
  menus: NavigationMenuNode[]
  routes: NavigationRouteCandidate[]
  deniedPaths: string[]
}
