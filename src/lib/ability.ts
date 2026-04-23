import { AbilityBuilder, createMongoAbility } from '@casl/ability'
import type { MongoAbility } from '@casl/ability'
import type { User } from '@/stores/auth'

// ---------------------------------------------------------------------------
// Subjects — the "objects" that can be acted upon
// ---------------------------------------------------------------------------
export type AppSubject = 'Dashboard' | 'User' | 'Content' | 'Analytics' | 'Settings' | 'all'

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
export type AppAction = 'manage' | 'read' | 'create' | 'update' | 'delete'

// ---------------------------------------------------------------------------
// The combined ability type used throughout the app
// ---------------------------------------------------------------------------
export type AppAbility = MongoAbility<[AppAction, AppSubject]>

// ---------------------------------------------------------------------------
// defineAbilityFor — call this whenever the logged-in user changes
// ---------------------------------------------------------------------------
export function defineAbilityFor(user: User | null): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  if (!user) {
    // Unauthenticated — no permissions
    return build()
  }

  switch (user.role) {
    case 'admin':
      // Full access to everything
      can('manage', 'all')
      break

    case 'editor':
      // Can read all main sections
      can('read', 'Dashboard')
      can('read', 'User')
      can('read', 'Analytics')
      // Full CRUD on content
      can('read', 'Content')
      can('create', 'Content')
      can('update', 'Content')
      // Cannot delete content or touch settings/users
      cannot('delete', 'Content')
      cannot('read', 'Settings')
      cannot('create', 'User')
      cannot('update', 'User')
      cannot('delete', 'User')
      break

    case 'viewer':
      // Read-only access to dashboard and content
      can('read', 'Dashboard')
      can('read', 'Content')
      can('read', 'Analytics')
      break

    default:
      // Unknown role — no permissions
      break
  }

  return build()
}

// ---------------------------------------------------------------------------
// Singleton ability instance — passed to the @casl/vue plugin and updated
// in-place when the user changes (via updateAbility below).
// ---------------------------------------------------------------------------
export const appAbility = createMongoAbility<[AppAction, AppSubject]>()

/** Call this after login / logout to sync permissions reactively. */
export function updateAbility(user: User | null): void {
  const { rules } = defineAbilityFor(user)
  appAbility.update(rules)
}
