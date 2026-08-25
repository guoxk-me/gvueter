import type { MongoAbility } from '@casl/ability'
import type { ScopedUserRecord } from '@/features/roles/data-scope'
import type { PermissionAction, PermissionSubject } from '@/features/roles/types'
import type { User } from '@/stores/auth'
import type { AuthorizationSnapshot } from '@/types/auth'
import { AbilityBuilder, createMongoAbility } from '@casl/ability'
import { shallowRef } from 'vue'
import { getDataScopeConditions } from '@/features/roles/data-scope'

// ---------------------------------------------------------------------------
// Subjects — the "objects" that can be acted upon
// ---------------------------------------------------------------------------
export type AppSubject = PermissionSubject | 'all'

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
export type AppAction = 'manage' | PermissionAction

// ---------------------------------------------------------------------------
// The combined ability type used throughout the app
// ---------------------------------------------------------------------------
export type AppAbility = MongoAbility<[AppAction, AppSubject | ScopedUserRecord]>

// ---------------------------------------------------------------------------
// defineAbilityFor — call this whenever the logged-in user changes
// ---------------------------------------------------------------------------
export function defineAbilityFor(
  user: User | null,
  authorization: AuthorizationSnapshot | null = null,
): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  if (!user || !authorization) {
    // Unauthenticated — no permissions
    return build()
  }

  // AI modified: CASL is a projection of the backend snapshot; the display role never grants access.
  for (const permission of authorization.grants) {
    if (permission.subject === 'User') {
      const conditions = getDataScopeConditions(authorization.dataScope, user)
      // AI modified: user-record permissions carry backend-issued data-scope conditions for UX checks.
      if (conditions)
        can(permission.action, 'User', conditions)
      else can(permission.action, 'User')
      continue
    }

    can(permission.action, permission.subject)
  }

  return build()
}

// ---------------------------------------------------------------------------
// Singleton ability instance — passed to the @casl/vue plugin and updated
// in-place when the user changes (via updateAbility below).
// ---------------------------------------------------------------------------
export const appAbility = createMongoAbility<[AppAction, AppSubject | ScopedUserRecord]>()
export const abilityRevision = shallowRef(0)
let activePermissionIdentifiers = new Set<string>()

export function canAccess(action: AppAction, subject: AppSubject): boolean {
  // AI modified: read the revision token so computed navigation updates after CASL changes.
  return abilityRevision.value >= 0 && appAbility.can(action, subject)
}

export function getActivePermissionIdentifiers(): ReadonlySet<string> {
  return activePermissionIdentifiers
}

export function hasActivePermissionIdentifier(permissionIdentifier: string): boolean {
  return activePermissionIdentifiers.has(permissionIdentifier)
}

/** Call this after login / logout to sync permissions reactively. */
export function updateAbility(
  user: User | null,
  authorization: AuthorizationSnapshot | null = null,
): void {
  const { rules } = defineAbilityFor(user, authorization)
  appAbility.update(rules)
  activePermissionIdentifiers = new Set(
    authorization?.grants.map(grant => grant.permissionIdentifier) ?? [],
  )
  // AI modified: CASL is not a Vue ref, so expose an update signal for permission-aware UI.
  abilityRevision.value += 1
}
