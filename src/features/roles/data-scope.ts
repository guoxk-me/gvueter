import type { ForcedSubject, MongoQuery } from '@casl/ability'
import type { DataScopeGrant } from './types'
import type { DepartmentRecord } from '@/features/departments/types'
import type { AdminUser } from '@/features/users/types'
import { getDepartmentDescendantIds } from '@/features/departments/department-tree'

export type ScopedUserRecord = AdminUser & ForcedSubject<'User'>

function getSelfConditions(user: AdminUser): MongoQuery<ScopedUserRecord> {
  return { id: user.id }
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Converts a backend-issued scope grant into CASL conditions for frontend UX.
 * Protected APIs must independently apply the same scope on the server.
 */
export function getDataScopeConditions(
  grant: DataScopeGrant,
  user: AdminUser,
): MongoQuery<ScopedUserRecord> | undefined {
  switch (grant.scope) {
    case 'all':
      return undefined
    case 'self':
      return getSelfConditions(user)
    case 'department':
      return user.departmentId ? { departmentId: user.departmentId } : getSelfConditions(user)
    case 'departmentTree':
      return user.departmentPath
        ? {
            departmentPath: {
              $regex: new RegExp(`^${escapeRegularExpression(user.departmentPath)}(?:/|$)`),
            },
          }
        : user.departmentId
          ? { departmentId: user.departmentId }
          : getSelfConditions(user)
    case 'custom':
      return { departmentId: { $in: grant.departmentIds ?? [] } }
  }
}

export function getDataScopeDepartmentIds(
  grant: DataScopeGrant,
  currentUser: AdminUser,
  departments: readonly DepartmentRecord[],
): ReadonlySet<string> {
  const knownDepartmentIds = new Set(departments.map(department => department.id))

  switch (grant.scope) {
    case 'department':
      return currentUser.departmentId && knownDepartmentIds.has(currentUser.departmentId)
        ? new Set([currentUser.departmentId])
        : new Set()
    case 'departmentTree': {
      if (!currentUser.departmentId || !knownDepartmentIds.has(currentUser.departmentId))
        return new Set()

      // AI modified: resolve hierarchy grants from current IDs so stale display paths cannot authorize records.
      return new Set([
        currentUser.departmentId,
        ...getDepartmentDescendantIds(departments, currentUser.departmentId),
      ])
    }
    case 'custom':
      return new Set(
        (grant.departmentIds ?? []).filter(departmentId => knownDepartmentIds.has(departmentId)),
      )
    case 'all':
    case 'self':
      return new Set()
  }
}

export function isUserInDataScope(
  grant: DataScopeGrant,
  currentUser: AdminUser,
  candidateUser: AdminUser,
  allowedDepartmentIds: ReadonlySet<string>,
): boolean {
  switch (grant.scope) {
    case 'all':
      return true
    case 'self':
      return candidateUser.id === currentUser.id
    case 'department':
      return Boolean(
        candidateUser.departmentId && allowedDepartmentIds.has(candidateUser.departmentId),
      )
    case 'departmentTree':
      return Boolean(
        candidateUser.departmentId && allowedDepartmentIds.has(candidateUser.departmentId),
      )
    case 'custom':
      return Boolean(
        candidateUser.departmentId && allowedDepartmentIds.has(candidateUser.departmentId),
      )
  }
}
