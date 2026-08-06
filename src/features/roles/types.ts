import type { DepartmentRecord } from '@/features/departments/types'
import type { UserRole } from '@/features/users/types'

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

export interface DataScopeGrant {
  scope: DataScope
  departmentIds?: string[]
}

export interface RolePermission {
  action: PermissionAction
  subject: PermissionSubject
}

export interface RoleDefinition {
  key: UserRole
  permissions: RolePermission[]
  dataScope: DataScopeGrant
}

export interface RoleListResponse {
  items: RoleDefinition[]
  scopeDepartments: DepartmentRecord[]
}

export interface UpdateRolePolicyInput {
  permissions: RolePermission[]
  dataScope: DataScopeGrant
}
