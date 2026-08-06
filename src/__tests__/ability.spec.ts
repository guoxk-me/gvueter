import type { User } from '@/stores/auth'
import { subject } from '@casl/ability'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import {
  appAbility,
  defineAbilityFor as defineAbilityFromSnapshot,
  hasActivePermissionIdentifier,
  updateAbility as updateAbilityFromSnapshot,
} from '@/lib/ability'
import { getTestAuthorization } from './auth-test-helpers'

const adminUser: User = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-01T08:00:00.000Z',
}

const editorUser: User = {
  id: 2,
  name: 'Editor',
  email: 'editor@example.com',
  role: 'editor',
  status: 'active',
  departmentId: 'product',
  departmentPath: 'company/product',
  createdAt: '2026-01-01T08:00:00.000Z',
}

const viewerUser: User = {
  id: 3,
  name: 'Viewer',
  email: 'viewer@example.com',
  role: 'viewer',
  status: 'active',
  createdAt: '2026-01-01T08:00:00.000Z',
}

function defineAbilityFor(user: User | null) {
  return defineAbilityFromSnapshot(user, user ? getTestAuthorization(user) : null)
}

function updateAbility(user: User | null): void {
  updateAbilityFromSnapshot(user, user ? getTestAuthorization(user) : null)
}

describe('defineAbilityFor', () => {
  describe('unauthenticated (null user)', () => {
    it('cannot read Dashboard', () => {
      const ability = defineAbilityFor(null)
      expect(ability.can('read', 'Dashboard')).toBe(false)
    })

    it('cannot read Content', () => {
      const ability = defineAbilityFor(null)
      expect(ability.can('read', 'Content')).toBe(false)
    })
  })

  it('does not infer grants from a display role without a backend snapshot', () => {
    expect(defineAbilityFromSnapshot(adminUser).can('read', 'Dashboard')).toBe(false)
  })

  describe('admin role', () => {
    it('can update Settings', () => {
      const ability = defineAbilityFor(adminUser)
      expect(ability.can('update', 'Settings')).toBe(true)
    })

    it('can read Dashboard', () => {
      const ability = defineAbilityFor(adminUser)
      expect(ability.can('read', 'Dashboard')).toBe(true)
    })

    it('can delete Users', () => {
      const ability = defineAbilityFor(adminUser)
      expect(ability.can('delete', 'User')).toBe(true)
    })

    it('can read Settings', () => {
      const ability = defineAbilityFor(adminUser)
      expect(ability.can('read', 'Settings')).toBe(true)
    })
  })

  describe('editor role', () => {
    it('can read Dashboard', () => {
      const ability = defineAbilityFor(editorUser)
      expect(ability.can('read', 'Dashboard')).toBe(true)
    })

    it('can create Content', () => {
      const ability = defineAbilityFor(editorUser)
      expect(ability.can('create', 'Content')).toBe(true)
    })

    it('can update Content', () => {
      const ability = defineAbilityFor(editorUser)
      expect(ability.can('update', 'Content')).toBe(true)
    })

    it('cannot delete Content', () => {
      const ability = defineAbilityFor(editorUser)
      expect(ability.can('delete', 'Content')).toBe(false)
    })

    it('cannot read Settings', () => {
      const ability = defineAbilityFor(editorUser)
      expect(ability.can('read', 'Settings')).toBe(false)
    })

    it('cannot create User', () => {
      const ability = defineAbilityFor(editorUser)
      expect(ability.can('create', 'User')).toBe(false)
    })

    it('limits readable users to the current department tree', () => {
      const ability = defineAbilityFor(editorUser)

      expect(
        ability.can(
          'read',
          subject('User', {
            ...adminUser,
            departmentId: 'product-design',
            departmentPath: 'company/product/design',
          }),
        ),
      ).toBe(true)
      expect(
        ability.can(
          'read',
          subject('User', {
            ...adminUser,
            departmentId: 'finance',
            departmentPath: 'company/finance',
          }),
        ),
      ).toBe(false)
    })
  })

  describe('viewer role', () => {
    it('can read Dashboard', () => {
      const ability = defineAbilityFor(viewerUser)
      expect(ability.can('read', 'Dashboard')).toBe(true)
    })

    it('can read Content', () => {
      const ability = defineAbilityFor(viewerUser)
      expect(ability.can('read', 'Content')).toBe(true)
    })

    it('cannot create Content', () => {
      const ability = defineAbilityFor(viewerUser)
      expect(ability.can('create', 'Content')).toBe(false)
    })

    it('cannot read Settings', () => {
      const ability = defineAbilityFor(viewerUser)
      expect(ability.can('read', 'Settings')).toBe(false)
    })

    it('cannot read User', () => {
      const ability = defineAbilityFor(viewerUser)
      expect(ability.can('read', 'User')).toBe(false)
    })
  })
})

describe('updateAbility (singleton)', () => {
  beforeEach(() => {
    // Reset to unauthenticated state before each test
    updateAbility(null)
  })

  it('starts with no permissions when null', () => {
    expect(appAbility.can('read', 'Dashboard')).toBe(false)
  })

  it('grants admin permissions after login', () => {
    updateAbility(adminUser)
    expect(appAbility.can('delete', 'User')).toBe(true)
    expect(hasActivePermissionIdentifier('system:monitoring:read')).toBe(true)
  })

  it('grants editor permissions after login', () => {
    updateAbility(editorUser)
    expect(appAbility.can('create', 'Content')).toBe(true)
    expect(appAbility.can('delete', 'Content')).toBe(false)
  })

  it('revokes permissions after logout', () => {
    updateAbility(adminUser)
    expect(appAbility.can('update', 'Settings')).toBe(true)
    updateAbility(null)
    expect(appAbility.can('read', 'Dashboard')).toBe(false)
    expect(hasActivePermissionIdentifier('system:monitoring:read')).toBe(false)
  })
})
