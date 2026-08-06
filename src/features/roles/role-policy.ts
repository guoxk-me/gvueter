import type {
  DataScopeGrant,
  PermissionAction,
  PermissionSubject,
  RoleDefinition,
  RolePermission,
  UpdateRolePolicyInput,
} from './types'
import type { UserRole } from '@/features/users/types'
import type { AuthorizationGrant, AuthorizationSnapshot } from '@/types/auth'
import { PERMISSION_ACTIONS, PERMISSION_SUBJECTS } from './types'

export const ADMIN_ROLE_RECOVERY_PERMISSIONS = [
  { action: 'read', subject: 'RolePolicy' },
  { action: 'update', subject: 'RolePolicy' },
] as const satisfies readonly RolePermission[]

function createPermission(action: PermissionAction, subject: PermissionSubject): RolePermission {
  return { action, subject }
}

function createAllPermissions(): RolePermission[] {
  return PERMISSION_SUBJECTS.flatMap((subject) =>
    PERMISSION_ACTIONS.map((action) => createPermission(action, subject)),
  )
}

function copyRoles(roles: RoleDefinition[]): RoleDefinition[] {
  return roles.map((role) => ({
    ...role,
    dataScope: {
      ...role.dataScope,
      departmentIds: role.dataScope.departmentIds ? [...role.dataScope.departmentIds] : undefined,
    },
    permissions: role.permissions.map((permission) => ({ ...permission })),
  }))
}

const initialRoleDefinitions: RoleDefinition[] = [
  {
    key: 'admin',
    dataScope: { scope: 'all' },
    permissions: createAllPermissions(),
  },
  {
    key: 'editor',
    dataScope: { scope: 'departmentTree' },
    permissions: [
      createPermission('read', 'Dashboard'),
      createPermission('read', 'User'),
      createPermission('read', 'Content'),
      createPermission('create', 'Content'),
      createPermission('update', 'Content'),
      createPermission('read', 'Analytics'),
      createPermission('read', 'Monitoring'),
      createPermission('read', 'AuditLog'),
    ],
  },
  {
    key: 'viewer',
    dataScope: { scope: 'self' },
    permissions: [
      createPermission('read', 'Dashboard'),
      createPermission('read', 'Content'),
      createPermission('read', 'Analytics'),
      createPermission('read', 'Monitoring'),
    ],
  },
]

const roleDefinitions = copyRoles(initialRoleDefinitions)
let policyRevision = 1

const permissionDomains: Record<PermissionSubject, string> = {
  Analytics: 'analytics:overview',
  AuditLog: 'system:audit-log',
  Content: 'content:administration',
  Dashboard: 'dashboard:overview',
  Monitoring: 'system:monitoring',
  RolePolicy: 'system:role-policy',
  Settings: 'system:settings',
  User: 'system:user',
}

function getAuthorizationGrant(permission: RolePermission): AuthorizationGrant {
  return {
    ...permission,
    permissionIdentifier: `${permissionDomains[permission.subject]}:${permission.action}`,
  }
}

export function getRoleDefinitions(): RoleDefinition[] {
  return copyRoles(roleDefinitions)
}

export function getRolePermissions(roleKey: UserRole): RolePermission[] {
  const role = roleDefinitions.find((candidate) => candidate.key === roleKey)
  return role ? role.permissions.map((permission) => ({ ...permission })) : []
}

export function getRoleDataScope(roleKey: UserRole): RoleDefinition['dataScope'] {
  const role = roleDefinitions.find((candidate) => candidate.key === roleKey)
  const scope = role?.dataScope ?? { scope: 'self' as const }
  // AI modified: return a copy so UI experiments cannot mutate the active authorization policy.
  return {
    ...scope,
    departmentIds: scope.departmentIds ? [...scope.departmentIds] : undefined,
  }
}

export function getRoleAuthorizationSnapshot(roleKey: UserRole): AuthorizationSnapshot {
  // AI modified: Mock authentication emits the same versioned authorization snapshot required from gnester-lite.
  return {
    contractVersion: 1,
    policyVersion: `mock-policy-${policyRevision}`,
    grants: getRolePermissions(roleKey).map(getAuthorizationGrant),
    dataScope: getRoleDataScope(roleKey),
  }
}

export function updateRolePermissions(
  roleKey: UserRole,
  permissions: RolePermission[],
): RoleDefinition | undefined {
  const currentRole = roleDefinitions.find((candidate) => candidate.key === roleKey)
  if (!currentRole) return undefined

  // AI modified: retain this focused API for tests and callers that only change permission grants.
  return updateRolePolicy(roleKey, { permissions, dataScope: currentRole.dataScope })
}

export function updateRolePolicy(
  roleKey: UserRole,
  input: UpdateRolePolicyInput,
): RoleDefinition | undefined {
  const role = roleDefinitions.find((candidate) => candidate.key === roleKey)
  if (!role) return undefined
  // AI modified: keep one built-in recovery path even when callers bypass the HTTP handler.
  if (!hasAdminRoleRecoveryPermissions(roleKey, input.permissions)) return undefined

  role.permissions = input.permissions.map((permission) => ({ ...permission }))
  role.dataScope = copyDataScope(input.dataScope)
  policyRevision += 1
  return {
    ...role,
    dataScope: {
      ...role.dataScope,
      departmentIds: role.dataScope.departmentIds ? [...role.dataScope.departmentIds] : undefined,
    },
    permissions: role.permissions.map((permission) => ({ ...permission })),
  }
}

function copyDataScope(dataScope: DataScopeGrant): DataScopeGrant {
  return {
    ...dataScope,
    departmentIds: dataScope.departmentIds ? [...dataScope.departmentIds] : undefined,
  }
}

export function isRoleKey(value: string): value is UserRole {
  return roleDefinitions.some((role) => role.key === value)
}

export function isAdminRoleRecoveryPermission(
  roleKey: UserRole,
  permission: RolePermission,
): boolean {
  return (
    roleKey === 'admin' &&
    ADMIN_ROLE_RECOVERY_PERMISSIONS.some(
      (requiredPermission) =>
        requiredPermission.action === permission.action &&
        requiredPermission.subject === permission.subject,
    )
  )
}

export function hasAdminRoleRecoveryPermissions(
  roleKey: UserRole,
  permissions: RolePermission[],
): boolean {
  return (
    roleKey !== 'admin' ||
    ADMIN_ROLE_RECOVERY_PERMISSIONS.every((requiredPermission) =>
      permissions.some(
        (permission) =>
          permission.action === requiredPermission.action &&
          permission.subject === requiredPermission.subject,
      ),
    )
  )
}

export function isRolePermission(value: unknown): value is RolePermission {
  if (typeof value !== 'object' || value === null) return false
  const permission = value as Partial<RolePermission>
  return (
    typeof permission.action === 'string' &&
    typeof permission.subject === 'string' &&
    PERMISSION_ACTIONS.includes(permission.action as PermissionAction) &&
    PERMISSION_SUBJECTS.includes(permission.subject as PermissionSubject)
  )
}

export function resetRoleDefinitions(): void {
  roleDefinitions.splice(0, roleDefinitions.length, ...copyRoles(initialRoleDefinitions))
  // AI modified: resetting Mock policy state invalidates snapshots held by an earlier test or session.
  policyRevision += 1
}
