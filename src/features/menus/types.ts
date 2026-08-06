import type { BackendMenuKind, NavigationAbilityRequirement } from '@/features/navigation'
import type { AppAction, AppSubject } from '@/lib/ability'

export const MANAGED_MENU_KINDS = [
  'menu',
  'external',
  'iframe',
] as const satisfies readonly BackendMenuKind[]
export const MANAGED_MENU_COMPONENT_KEYS = [
  'dashboard',
  'components',
  'form-workbench',
  'content-admin',
  'audit-logs',
  'users',
  'roles',
  'departments',
  'positions',
  'menus',
  'dictionaries',
  // AI modified: menu editing shares the same allow-listed system configuration component key.
  'system-config',
  'system-parameters',
  'monitoring',
  'profile',
  'change-password',
  'iframe',
] as const
export const MANAGED_MENU_ICON_KEYS = [
  'dashboard',
  'message-center',
  'components',
  'form-workbench',
  'content-admin',
  'users',
  'roles',
  'departments',
  'positions',
  'menus',
  'dictionaries',
  'system-config',
  'monitoring',
  'profile',
  'password',
  'external',
  'iframe',
] as const
export const MANAGED_MENU_ACTIONS = [
  'manage',
  'read',
  'create',
  'update',
  'delete',
] as const satisfies readonly AppAction[]
export const MANAGED_MENU_SUBJECTS = [
  'all',
  'Dashboard',
  'User',
  'Content',
  'Analytics',
  'Settings',
  'RolePolicy',
  'Monitoring',
  'AuditLog',
] as const satisfies readonly AppSubject[]

export type ManagedMenuComponentKey = (typeof MANAGED_MENU_COMPONENT_KEYS)[number]
export type ManagedMenuIconKey = (typeof MANAGED_MENU_ICON_KEYS)[number]

export interface ManagedMenuRecord {
  id: string
  parentId: string | null
  titleKey: string
  kind: BackendMenuKind
  path: string
  targetUrl?: string
  routeName: string
  componentKey: ManagedMenuComponentKey | ''
  icon?: ManagedMenuIconKey
  requiredAbility?: NavigationAbilityRequirement
  permissionIdentifier: string
  hidden: boolean
  keepAlive?: boolean
  order: number
}

export interface ManagedMenuInput {
  parentId: string | null
  titleKey: string
  kind: BackendMenuKind
  path: string
  targetUrl: string
  routeName: string
  componentKey: ManagedMenuComponentKey | ''
  icon: ManagedMenuIconKey
  requiredAbility?: NavigationAbilityRequirement
  permissionIdentifier: string
  hidden: boolean
  keepAlive: boolean
  order: number
}

export interface ManagedMenuListResponse {
  items: ManagedMenuRecord[]
}

export const PERMISSION_IDENTIFIER_PATTERN = /^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*){2,}$/

export function isPermissionIdentifier(permissionIdentifier: string): boolean {
  return PERMISSION_IDENTIFIER_PATTERN.test(permissionIdentifier)
}
