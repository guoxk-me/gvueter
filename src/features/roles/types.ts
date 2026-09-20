import type { components } from '@/types/openapi-generated'

export const PERMISSION_ACTIONS = ['read', 'create', 'update', 'delete'] as const
export const PERMISSION_SUBJECTS = [
  'Dashboard',
  'User',
  'Content',
  'Analytics',
  'Settings',
  'RolePolicy',
  'Monitoring',
  'AuditLog',
] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]
export type PermissionSubject = (typeof PERMISSION_SUBJECTS)[number]

export const DATA_SCOPES = ['self', 'department', 'departmentTree', 'custom', 'all'] as const
export type DataScope = (typeof DATA_SCOPES)[number]

// AI modified: role policy wire types come from OpenAPI while permission constants remain local behavior.
export type DataScopeGrant = components['schemas']['DataScopeGrant']
export type RolePermission = components['schemas']['RolePermission']
export type RoleDefinition = components['schemas']['RoleDefinition']
export type RoleListResponse = components['schemas']['RoleListResponse']
export type UpdateRolePolicyInput = components['schemas']['UpdateRolePolicyInput']
